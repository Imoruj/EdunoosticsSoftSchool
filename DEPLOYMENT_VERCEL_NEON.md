# Deploy on Vercel + Neon (Free Tier)

This guide prepares and deploys the app using:
- Vercel Hobby (app hosting)
- Neon Free (PostgreSQL)

## 1. Create Neon Database

1. Create a Neon project and database.
2. Copy both connection strings:
- `pooled` URL (for app runtime)
- `direct` URL (for migrations from local/CI)

Use pooled URL format like:
`postgresql://.../<db>?sslmode=require&pgbouncer=true&connect_timeout=15`

## 2. Configure Local Environment

1. Copy `.env.example` to `.env.local`.
2. Set:
- `DATABASE_URL` to Neon pooled URL
- `DIRECT_DATABASE_URL` to Neon direct URL
- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- `GEMINI_API_KEY` only if you will use AI comments

## 3. Apply Database Migrations

Run once before first production use:

```bash
npm run db:migrate:deploy
```

If your pooled URL fails for migrations, temporarily point `DATABASE_URL` to direct URL for migration command, then switch back to pooled URL for runtime.

## 4. Deploy to Vercel

1. Push project to GitHub.
2. Import repo into Vercel.
3. In Vercel project settings, add environment variables (Production and Preview):
- `DATABASE_URL` (Neon pooled URL)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (set to your Vercel URL, e.g. `https://your-app.vercel.app`)
- `GEMINI_API_KEY` (optional)
- Any optional integrations you use (`TERMII_*`, `PAYSTACK_*`, `CLOUDINARY_*`)
4. Deploy.

## 5. Post-Deploy Verification

1. Open deployed URL and load login page.
2. Login as admin and confirm:
- dashboard loads
- score entry API works
- report workflow loads
3. Test one teacher login and one class-teacher workflow path.
4. Confirm notifications and report card generation still work.

## 6. Go-Live Notes

- Keep `DATABASE_URL` on pooled connection in Vercel runtime.
- Run schema migrations intentionally (`npm run db:migrate:deploy`) whenever you add migration files.
- Rotate `NEXTAUTH_SECRET` only with planned maintenance (it invalidates active sessions).
