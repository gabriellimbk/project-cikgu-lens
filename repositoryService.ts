import { RepositoryEntry } from './types';

const API_URL = '/api/repository';

const parseJsonSafe = async (response: Response): Promise<any> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const fetchRepositoryEntries = async (): Promise<RepositoryEntry[]> => {
  const response = await fetch(API_URL, { method: 'GET' });
  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    const message = payload?.error || 'Gagal memuatkan repository.';
    throw new Error(message);
  }

  return Array.isArray(payload) ? (payload as RepositoryEntry[]) : [];
};

export const saveRepositoryEntry = async (entry: RepositoryEntry): Promise<void> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(entry)
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    const message = payload?.error || 'Gagal menyimpan ke repository.';
    throw new Error(message);
  }
};

export const deleteRepositoryEntry = async (entryId: string): Promise<void> => {
  const response = await fetch(`${API_URL}?id=${encodeURIComponent(entryId)}`, {
    method: 'DELETE'
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    const message = payload?.error || 'Gagal memadam rekod repository.';
    throw new Error(message);
  }
};
