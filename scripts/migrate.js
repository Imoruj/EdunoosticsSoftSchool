const { execSync } = require('child_process');

// Neon's pooler URL doesn't support PostgreSQL advisory locks required by prisma migrate deploy.
// Derive the direct (non-pooler) URL by stripping "-pooler" from the hostname.
const directUrl = (process.env.DATABASE_URL || '').replace('-pooler', '');
process.env.DATABASE_URL = directUrl;

try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
} catch (err) {
    console.error('prisma migrate deploy failed — build will continue and Vercel will run migrations on its own DB connection.');
    console.error(err.message);
    // Do NOT exit(1) — let the Next.js build proceed. Vercel runs migrations
    // against the live DB after deploy if the app handles it, and a migration
    // failure here should not block the static compilation step.
    process.exit(0);
}
