import { RepositoryEntry, RepositoryTheme } from './types';

type Categorization = {
  id: string;
  theme: RepositoryTheme;
};

export const categoriseEntries = async (
  entries: RepositoryEntry[]
): Promise<Categorization[]> => {
  const body = {
    entries: entries.map((e) => ({
      id: e.id,
      title: e.result?.title || e.id,
      textSnippet: e.text.slice(0, 400)
    })),
    // Pass full results so the server can persist themes to Supabase via PATCH
    fullResults: Object.fromEntries(entries.map((e) => [e.id, e.result]))
  };

  const response = await fetch('/api/categorise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Gagal mengkategorikan rekod.');
  }

  return (payload?.categorizations ?? []) as Categorization[];
};
