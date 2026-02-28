
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        select: { email: true, schoolId: true, school: { select: { name: true } } }
    })
    console.log('--- USERS ---')
    console.log(JSON.stringify(users, null, 2))

    const schools = await prisma.school.findMany()
    console.log('--- SCHOOLS ---')
    console.log(JSON.stringify(schools, null, 2))
}

main().finally(() => prisma.$disconnect())
