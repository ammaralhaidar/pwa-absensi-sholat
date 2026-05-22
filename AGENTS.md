<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Aplikasi Alhamra - PWA Absensi Sholat

Next.js 16 PWA for prayer attendance tracking at Islamic boarding school. Uses Supabase (PostgreSQL + Auth), barcode scanning, and automated absence marking.

## Commands

```bash
npm run dev      # Dev server (--webpack flag required, PWA disabled)
npm run build    # Production build (--webpack flag required)
npm start        # Production server
npm run lint     # ESLint (no args needed)
```

**No typecheck script exists.** If needed, run `npx tsc --noEmit`.

## Architecture

- **Next.js 16 App Router** with TypeScript 5, Tailwind CSS 4
- **Path alias**: `@/*` → `./src/*`
- **Supabase clients**:
  - `src/utils/supabase/client.ts` - browser
  - `src/utils/supabase/server.ts` - server/API routes
  - `src/utils/supabase/middleware.ts` - auth protection
- **PWA**: Disabled in dev mode (intentional). Service worker only active in production.
- **Routes**: All protected by auth middleware except `/login`

## Environment Variables

Required in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
CRON_SECRET=<random-secret>  # Production only, for cron endpoint
```

## Database

- **Supabase PostgreSQL** - schema in `database_schema.sql`
- **Tables**: `data_santri` (students), `sesi_sholat` (prayer schedules), `log_absensi` (attendance logs)
- Setup: Run `database_schema.sql` in Supabase SQL Editor

## Key Features & Quirks

- **Barcode scanner** (html5-qrcode): Requires HTTPS in production for camera access
- **Cron job**: GitHub Actions workflow (`.github/workflows/mark-ghoib.yml`) runs hourly to mark absent students via `/api/cron/mark-ghoib`
- **Excel export**: Uses xlsx library for attendance reports
- **Mobile-first**: PWA installable on smartphones, responsive design

## Testing

No test framework configured. Manual testing only.

## Deployment

- **Vercel recommended** for HTTPS (required for camera)
- Set environment variables in Vercel dashboard
- Configure cron job to call `/api/cron/mark-ghoib` with `Authorization: Bearer <CRON_SECRET>` header
