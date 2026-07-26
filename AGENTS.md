# AGENTS.md

## Cursor Cloud specific instructions

MedSecretary (`medical-secretary-platform`) is a single Vite + React 19 + TypeScript SPA. There is no backend in this repo — all data comes from in-browser mocks in `src/services/*`, and auth is a mock JWT stored in `localStorage`.

### Services
- Only one service to run: the Vite dev server on port `3000` (`npm run dev`, opens `http://localhost:3000`). `.env.development` points `VITE_API_URL`/`VITE_WS_URL` at `localhost:3001`, but no backend/WebSocket is wired in yet, so nothing needs to run there.

### Commands (defined in `package.json`)
- Lint: `npm run lint` (ESLint 9, `--max-warnings 0`)
- Build: `npm run build` (`tsc -b && vite build`)
- Dev: `npm run dev`
- No automated test suite is configured (no `test` script, no test files).

### Demo login (mock users, see `src/services/auth.ts`)
All demo accounts use password `123456`: `admin@demo.com`, `doctor@demo.com`, `secretary@demo.com`, `patient@demo.com`. The login page also has quick-login demo buttons.

### Notes
- Mock data is in-memory, so created records (e.g. booked appointments) reset on page reload; some mock lists show inconsistent names, which is expected.
