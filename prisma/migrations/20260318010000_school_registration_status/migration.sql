-- CreateEnum
CREATE TYPE "SchoolRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "School"
ADD COLUMN "registrationStatus" "SchoolRegistrationStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "registrationRejectionReason" TEXT;
