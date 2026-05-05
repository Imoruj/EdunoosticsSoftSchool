-- CreateTable: Organization
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- AlterTable School: add organizationId and branchCode
ALTER TABLE "School" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "School" ADD COLUMN "branchCode" TEXT;
CREATE INDEX "School_organizationId_idx" ON "School"("organizationId");

-- AddForeignKey School -> Organization
ALTER TABLE "School" ADD CONSTRAINT "School_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: UserBranch
CREATE TABLE "UserBranch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "roles" "UserRole"[] DEFAULT ARRAY[]::"UserRole"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,
    CONSTRAINT "UserBranch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserBranch_userId_schoolId_key" ON "UserBranch"("userId", "schoolId");
CREATE INDEX "UserBranch_userId_idx" ON "UserBranch"("userId");
CREATE INDEX "UserBranch_schoolId_idx" ON "UserBranch"("schoolId");

-- AddForeignKeys UserBranch
ALTER TABLE "UserBranch" ADD CONSTRAINT "UserBranch_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBranch" ADD CONSTRAINT "UserBranch_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBranch" ADD CONSTRAINT "UserBranch_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed UserBranch: every existing user with a schoolId gets one UserBranch row
INSERT INTO "UserBranch" ("id", "userId", "schoolId", "roles", "isActive", "assignedAt")
SELECT
    'ub_' || left(md5(u."id" || '_' || u."schoolId"), 24),
    u."id",
    u."schoolId",
    u."roles",
    true,
    NOW()
FROM "User" u
WHERE u."schoolId" IS NOT NULL
ON CONFLICT ("userId", "schoolId") DO NOTHING;

-- CreateTable: StudentTransfer
CREATE TABLE "StudentTransfer" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromBranchId" TEXT NOT NULL,
    "toBranchId" TEXT NOT NULL,
    "fromClassArmId" TEXT,
    "toClassArmId" TEXT,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "transferredById" TEXT NOT NULL,
    CONSTRAINT "StudentTransfer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudentTransfer_studentId_idx" ON "StudentTransfer"("studentId");
CREATE INDEX "StudentTransfer_fromBranchId_idx" ON "StudentTransfer"("fromBranchId");
CREATE INDEX "StudentTransfer_toBranchId_idx" ON "StudentTransfer"("toBranchId");

-- AddForeignKeys StudentTransfer
ALTER TABLE "StudentTransfer" ADD CONSTRAINT "StudentTransfer_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentTransfer" ADD CONSTRAINT "StudentTransfer_fromBranchId_fkey"
    FOREIGN KEY ("fromBranchId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTransfer" ADD CONSTRAINT "StudentTransfer_toBranchId_fkey"
    FOREIGN KEY ("toBranchId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTransfer" ADD CONSTRAINT "StudentTransfer_fromClassArmId_fkey"
    FOREIGN KEY ("fromClassArmId") REFERENCES "ClassArm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentTransfer" ADD CONSTRAINT "StudentTransfer_toClassArmId_fkey"
    FOREIGN KEY ("toClassArmId") REFERENCES "ClassArm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentTransfer" ADD CONSTRAINT "StudentTransfer_transferredById_fkey"
    FOREIGN KEY ("transferredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
