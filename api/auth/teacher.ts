import { getConfiguredTeacherPassword, setTeacherSessionCookie } from '../teacherAuth.js';

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Kaedah tidak dibenarkan.' });
    return;
  }

  const configuredPassword = getConfiguredTeacherPassword();
  if (!configuredPassword) {
    res.status(503).json({ error: 'TEACHER_PASSWORD belum disetkan.' });
    return;
  }

  const payload = readPayload(req.body);
  const submittedPassword = typeof payload.password === 'string' ? payload.password : '';

  if (!submittedPassword) {
    res.status(400).json({ error: 'Kata laluan diperlukan.' });
    return;
  }

  if (submittedPassword !== configuredPassword) {
    res.status(401).json({ error: 'Kata laluan tidak tepat.' });
    return;
  }

  setTeacherSessionCookie(res, configuredPassword);
  res.status(200).json({ ok: true });
}
