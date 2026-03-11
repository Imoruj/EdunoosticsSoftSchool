import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = process.env.SUPER_ADMIN_EMAIL ?? "superadmin@edunostics.ng";
    const password = process.env.SUPER_ADMIN_PASSWORD ?? "Admin@1234";
    const firstName = process.env.SUPER_ADMIN_FIRST_NAME ?? "Super";
    const lastName = process.env.SUPER_ADMIN_LAST_NAME ?? "Admin";

    const passwordHash = await bcrypt.hash(password, 12);

    const superAdmin = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash,
            firstName,
            lastName,
            roles: ["SUPER_ADMIN"],
            isActive: true,
            mustChangePassword: false,
        },
        create: {
            email,
            passwordHash,
            firstName,
            lastName,
            roles: ["SUPER_ADMIN"],
            schoolId: null,
            isActive: true,
            mustChangePassword: false,
        },
    });

    console.log(`✅ Super Admin seeded: ${superAdmin.email}`);
    console.log(`   Name: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log(`   Roles: ${superAdmin.roles.join(", ")}`);
    console.log(
        `\n⚠️  IMPORTANT: Change the default password immediately after first login!`
    );
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
