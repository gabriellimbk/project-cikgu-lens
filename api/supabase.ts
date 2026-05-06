const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

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

const parseErrorText = async (response: Response): Promise<string> => {
  try {
    const text = await response.text();
    if (!text) {
      return response.statusText || 'Unknown Supabase error';
    }

    let payload: any = null;
    try {
      payload = JSON.parse(text);
    } catch {
      return text;
    }

    const message =
      payload?.message ||
      payload?.error_description ||
      payload?.error ||
      payload?.hint ||
      JSON.stringify(payload);
    return String(message);
  } catch {
    return response.statusText || 'Unknown Supabase error';
  }
};

const supabaseGet = async (path: string): Promise<any[] | null> => {
  const config = getSupabaseConfig();
  if (!config) return null;

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method: 'GET',
    headers: buildHeaders(config.key)
  });

  if (!response.ok) {
    const detail = await parseErrorText(response);
    throw new Error(`Supabase GET failed (${response.status}): ${detail}`);
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
    const detail = await parseErrorText(response);
    throw new Error(`Supabase INSERT failed (${response.status}): ${detail}`);
  }
};

const supabaseUpdateById = async (table: string, id: string, row: Record<string, unknown>): Promise<void> => {
  const config = getSupabaseConfig();
  if (!config) return;

  const response = await fetch(`${config.url}/rest/v1/${table}?id=eq.${encode(id)}`, {
    method: 'PATCH',
    headers: {
      ...buildHeaders(config.key, true),
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(row)
  });

  if (!response.ok) {
    const detail = await parseErrorText(response);
    throw new Error(`Supabase UPDATE failed (${response.status}): ${detail}`);
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
    const detail = await parseErrorText(response);
    throw new Error(`Supabase DELETE failed (${response.status}): ${detail}`);
  }
};

export { getSupabaseConfig, supabaseDeleteById, supabaseGet, supabaseInsert, supabaseUpdateById, encode };
