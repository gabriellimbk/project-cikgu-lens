import { createHash } from 'node:crypto';

const TEACHER_SESSION_COOKIE = 'cikgu_teacher_session';
const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

const buildTeacherSessionToken = (password: string): string =>
  createHash('sha256').update(password).digest('hex');

const getConfiguredTeacherPassword = (): string | null => {
  const password = process.env.TEACHER_PASSWORD?.trim();
  return password || null;
};

const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
};

const isTeacherRequestAuthorized = (req: any): boolean => {
  const configuredPassword = getConfiguredTeacherPassword();
  if (!configuredPassword) {
    return false;
  }

  const cookies = parseCookies(req.headers?.cookie);
  return cookies[TEACHER_SESSION_COOKIE] === buildTeacherSessionToken(configuredPassword);
};

const setTeacherSessionCookie = (res: any, password: string): void => {
  const cookieParts = [
    `${TEACHER_SESSION_COOKIE}=${buildTeacherSessionToken(password)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${ONE_DAY_IN_SECONDS}`
  ];

  if (process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
};

export { getConfiguredTeacherPassword, isTeacherRequestAuthorized, setTeacherSessionCookie };
