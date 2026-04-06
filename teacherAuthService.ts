const API_URL = '/api/auth/teacher';

const parseJsonSafe = async (response: Response): Promise<any> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const verifyTeacherPassword = async (password: string): Promise<void> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    const message = payload?.error || 'Pengesahan Teacher Console gagal.';
    throw new Error(message);
  }
};
