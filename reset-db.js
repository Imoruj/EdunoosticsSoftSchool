
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Dropping all tables...')
        await prisma.$executeRawUnsafe(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
        console.log('Success: Schema public reset.')
    } catch (err) {
        console.error('RESET ERROR:', err)
    }
}

main()
    .finally(async () => await prisma.$disconnect())
