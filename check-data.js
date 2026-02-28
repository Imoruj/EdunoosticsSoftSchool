
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const schools = await prisma.school.findMany()
        console.log('SCHOOLS:', JSON.stringify(schools, null, 2))

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                roles: true,
                schoolId: true
            }
        })
        console.log('USERS:', JSON.stringify(users, null, 2))
    } catch (err) {
        console.error('DB ERROR:', err)
    }
}

main()
    .finally(async () => await prisma.$disconnect())
