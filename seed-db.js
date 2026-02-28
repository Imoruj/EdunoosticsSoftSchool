
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Seeding Database...')

        // 1. Create School
        const school = await prisma.school.create({
            data: {
                name: 'EduCare Academy',
                motto: 'Excellence in Education',
                country: 'Nigeria',
            }
        })
        console.log('Created School:', school.id)

        // 2. Create Admin User
        const passwordHash = await bcrypt.hash('password123', 12)
        const admin = await prisma.user.create({
            data: {
                email: 'admin@educare.com',
                passwordHash,
                firstName: 'System',
                lastName: 'Admin',
                roles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
                schoolId: school.id,
                isActive: true
            }
        })
        console.log('Created Admin:', admin.email)

        console.log('Seed complete!')
    } catch (err) {
        console.error('SEED ERROR:', err)
    }
}

main()
    .finally(async () => await prisma.$disconnect())
