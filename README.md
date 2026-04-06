<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Cikgu Lens

This repo can be run locally with Vite and pushed back to the shared GitHub repository.

## Git setup

Clone the shared repo into your local folder:

```bash
git clone https://github.com/gabriellimbk/project-cikgu-lens .
```

Confirm the remote:

```bash
git remote -v
```

Pull the latest changes before you start work:

```bash
git pull origin main
```

If you prefer SSH for pushing:

```bash
git remote set-url origin git@github.com:gabriellimbk/project-cikgu-lens.git
```

## Run locally

Prerequisite: Node.js 20+ and npm.

1. Install dependencies:
   `npm install`
2. Create your local env file:
   `cp .env.example .env.local`
3. Add your OpenAI key to `.env.local`:
   `OPENAI_API_KEY=your_openai_api_key_here`
4. Run the app:
   `npm run dev`
5. Open `http://localhost:3000`

## Environment variables

Required for local development:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Optional for deployed API routes or Supabase-backed persistence:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
TEACHER_PASSWORD=your_teacher_console_password_here
```

Notes:

- Local Vite development only requires `OPENAI_API_KEY`.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are only needed if you want the server-side API routes to read/write Supabase instead of using local in-memory or file-based storage.
- `TEACHER_PASSWORD` is optional, but if you use Teacher Console it should be set as a server-side secret for local development and in Vercel.
- Keep `.env.local` private. It is ignored by git.

## Verify before pushing

```bash
npm run build
git status
```
