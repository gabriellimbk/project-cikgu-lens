import { getSupabaseConfig, supabaseDeleteById, supabaseGet, supabaseInsert } from './supabase.js';

type RepositoryEntry = {
  id: string;
  text: string;
  result: any;
  created_at?: string;
};

const inMemoryRepository: RepositoryEntry[] = [];

const readPayload = (body: unknown): Record<string, unknown> => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') {
    return body as Record<string, unknown>;
  }
  return {};
};

const sortByCreatedAtDesc = (entries: RepositoryEntry[]): RepositoryEntry[] =>
  [...entries].sort((a, b) => {
    const left = a.created_at ? Date.parse(a.created_at) : 0;
    const right = b.created_at ? Date.parse(b.created_at) : 0;
    return right - left;
  });

const getRepository = async (): Promise<RepositoryEntry[]> => {
  const supabaseEnabled = Boolean(getSupabaseConfig());
  if (!supabaseEnabled) {
    return inMemoryRepository;
  }

  const rows = await supabaseGet('repository_entries?select=id,text,result,created_at&order=created_at.desc');
  return (rows ?? []) as RepositoryEntry[];
};

const saveRepositoryEntry = async (entry: RepositoryEntry): Promise<void> => {
  const supabaseEnabled = Boolean(getSupabaseConfig());
  if (!supabaseEnabled) {
    const existingIndex = inMemoryRepository.findIndex((item) => item.id === entry.id);
    if (existingIndex >= 0) {
      inMemoryRepository[existingIndex] = { ...entry, created_at: new Date().toISOString() };
    } else {
      inMemoryRepository.unshift({ ...entry, created_at: new Date().toISOString() });
    }
    return;
  }

  await supabaseInsert(
    'repository_entries',
    {
      id: entry.id,
      text: entry.text,
      result: entry.result,
      created_at: new Date().toISOString()
    },
    'id'
  );
};

const deleteRepositoryEntry = async (entryId: string): Promise<void> => {
  const supabaseEnabled = Boolean(getSupabaseConfig());
  if (!supabaseEnabled) {
    const index = inMemoryRepository.findIndex((item) => item.id === entryId);
    if (index >= 0) {
      inMemoryRepository.splice(index, 1);
    }
    return;
  }

  await supabaseDeleteById('repository_entries', entryId);
};

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const entries = await getRepository();
      res.status(200).json(sortByCreatedAtDesc(entries));
      return;
    }

    if (req.method === 'POST') {
      const payload = readPayload(req.body);
      const id = typeof payload.id === 'string' ? payload.id.trim() : '';
      const text = typeof payload.text === 'string' ? payload.text.trim() : '';
      const result = payload.result;

      if (!id || !text || !result || typeof result !== 'object') {
        res.status(400).json({ error: 'Data repository tidak lengkap.' });
        return;
      }

      await saveRepositoryEntry({ id, text, result });
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      const queryId = typeof req.query?.id === 'string' ? req.query.id : '';
      const payload = readPayload(req.body);
      const bodyId = typeof payload.id === 'string' ? payload.id : '';
      const entryId = (queryId || bodyId).trim();

      if (!entryId) {
        res.status(400).json({ error: 'ID diperlukan untuk padam data.' });
        return;
      }

      await deleteRepositoryEntry(entryId);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Kaedah tidak dibenarkan.' });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Ralat semasa mengurus repository.';
    res.status(500).json({ error: message });
  }
}
