const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
};

const buildHeaders = (key: string, includeJson = false) => {
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`
  };

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

const encode = (value: string) => encodeURIComponent(value);

const supabaseGet = async (path: string): Promise<any[] | null> => {
  const config = getSupabaseConfig();
  if (!config) return null;

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method: 'GET',
    headers: buildHeaders(config.key)
  });

  if (!response.ok) {
    throw new Error(`Supabase GET failed: ${response.status}`);
  }

  return (await response.json()) as any[];
};

const supabaseInsert = async (table: string, row: Record<string, unknown>, onConflict?: string): Promise<void> => {
  const config = getSupabaseConfig();
  if (!config) return;

  const query = onConflict ? `?on_conflict=${encode(onConflict)}` : '';
  const response = await fetch(`${config.url}/rest/v1/${table}${query}`, {
    method: 'POST',
    headers: {
      ...buildHeaders(config.key, true),
      Prefer: onConflict ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal'
    },
    body: JSON.stringify(row)
  });

  if (!response.ok) {
    throw new Error(`Supabase INSERT failed: ${response.status}`);
  }
};

const supabaseDeleteById = async (table: string, id: string): Promise<void> => {
  const config = getSupabaseConfig();
  if (!config) return;

  const response = await fetch(`${config.url}/rest/v1/${table}?id=eq.${encode(id)}`, {
    method: 'DELETE',
    headers: {
      ...buildHeaders(config.key),
      Prefer: 'return=minimal'
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase DELETE failed: ${response.status}`);
  }
};

export { getSupabaseConfig, supabaseDeleteById, supabaseGet, supabaseInsert, encode };
