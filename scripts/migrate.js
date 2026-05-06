const { execSync } = require('child_process');

// Neon's pooler URL doesn't support PostgreSQL advisory locks required by prisma migrate deploy.
// Derive the direct (non-pooler) URL by stripping "-pooler" from the hostname.
const directUrl = (process.env.DATABASE_URL || '').replace('-pooler', '');
process.env.DATABASE_URL = directUrl;

execSync('prisma migrate deploy', { stdio: 'inherit' });
