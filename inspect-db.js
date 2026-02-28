
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Checking Enums and Types...')
        const enums = await prisma.$queryRaw`SELECT t.typname FROM pg_type t JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e';`;
        console.log('ENUMS:', JSON.stringify(enums, null, 2))

        console.log('Checking columns of User table...')
        const columns = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'User' AND table_schema = 'public';`;
        console.log('USER COLUMNS:', JSON.stringify(columns, null, 2))
    } catch (err) {
        console.error('INSPECTION ERROR:', err)
    }
}

main()
    .finally(async () => await prisma.$disconnect())
