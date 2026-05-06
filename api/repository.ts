import { getConfiguredTeacherPassword, isTeacherRequestAuthorized } from './teacherAuth.js';
import { getSupabaseConfig, supabaseDeleteById, supabaseGet, supabaseInsert, supabaseUpdateById } from './supabase.js';

type RepositoryEntry = {
  id: string;
  text: string;
  result: any;
  created_at?: string;
};

const inMemoryRepository: RepositoryEntry[] = [];
const REPOSITORY_TABLE = 'MTL_CIKGU_LENS';
const LEGACY_REPOSITORY_TABLE = 'repository_entries';

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

  try {
    const rows = await supabaseGet(`${REPOSITORY_TABLE}?select=id,text,result,created_at&order=created_at.desc`);
    return (rows ?? []) as RepositoryEntry[];
  } catch (error) {
    console.warn(`Repository fetch from ${REPOSITORY_TABLE} failed; falling back to ${LEGACY_REPOSITORY_TABLE}`, error);
  }

  const rows = await supabaseGet(`${LEGACY_REPOSITORY_TABLE}?select=id,text,result,created_at&order=created_at.desc`);
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

  const payload = {
    id: entry.id,
    text: entry.text,
    result: entry.result,
    created_at: new Date().toISOString()
  };

  try {
    await supabaseInsert(REPOSITORY_TABLE, payload, 'id');
  } catch (error) {
    console.warn(`Repository save to ${REPOSITORY_TABLE} failed; falling back to ${LEGACY_REPOSITORY_TABLE}`, error);
    await supabaseInsert(LEGACY_REPOSITORY_TABLE, payload, 'id');
  }
};

const updateRepositoryEntry = async (entry: RepositoryEntry): Promise<void> => {
  const payload = {
    text: entry.text,
    result: entry.result
  };

  const supabaseEnabled = Boolean(getSupabaseConfig());
  if (!supabaseEnabled) {
    const existingIndex = inMemoryRepository.findIndex((item) => item.id === entry.id);
    if (existingIndex >= 0) {
      inMemoryRepository[existingIndex] = {
        ...inMemoryRepository[existingIndex],
        ...payload
      };
    }
    return;
  }

  try {
    await supabaseUpdateById(REPOSITORY_TABLE, entry.id, payload);
  } catch (error) {
    console.warn(`Repository update in ${REPOSITORY_TABLE} failed; falling back to ${LEGACY_REPOSITORY_TABLE}`, error);
    await supabaseUpdateById(LEGACY_REPOSITORY_TABLE, entry.id, payload);
  }
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

  try {
    await supabaseDeleteById(REPOSITORY_TABLE, entryId);
  } catch (error) {
    console.warn(`Repository delete from ${REPOSITORY_TABLE} failed; falling back to ${LEGACY_REPOSITORY_TABLE}`, error);
    await supabaseDeleteById(LEGACY_REPOSITORY_TABLE, entryId);
  }
};

const ensureTeacherAccess = (req: any, res: any): boolean => {
  if (!getConfiguredTeacherPassword()) {
    res.status(503).json({ error: 'TEACHER_PASSWORD belum disetkan.' });
    return false;
  }

  if (!isTeacherRequestAuthorized(req)) {
    res.status(401).json({ error: 'Akses Teacher Console diperlukan.' });
    return false;
  }

  return true;
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

    if (req.method === 'PUT' || req.method === 'PATCH') {
      if (!ensureTeacherAccess(req, res)) {
        return;
      }

      const payload = readPayload(req.body);
      const id = typeof payload.id === 'string' ? payload.id.trim() : '';
      const text = typeof payload.text === 'string' ? payload.text.trim() : '';
      const result = payload.result;

      if (!id || !text || !result || typeof result !== 'object') {
        res.status(400).json({ error: 'Data repository tidak lengkap untuk dikemaskini.' });
        return;
      }

      await updateRepositoryEntry({ id, text, result });
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      if (!ensureTeacherAccess(req, res)) {
        return;
      }

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
