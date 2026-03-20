-- Migrate SchemeOfWork from arm-level to class-level
-- and add SchemeOfWorkClassArm junction table for multi-arm support

-- Step 1: Add classId (nullable first to populate from existing data)
ALTER TABLE "SchemeOfWork" ADD COLUMN "classId" TEXT;

-- Step 2: Populate classId from existing classArmId via ClassArm
UPDATE "SchemeOfWork" sow
SET "classId" = ca."classId"
FROM "ClassArm" ca
WHERE sow."classArmId" = ca.id;

-- Step 3: For any rows where classArmId was null, default to a safe fallback (shouldn't happen)
-- Make classId NOT NULL
ALTER TABLE "SchemeOfWork" ALTER COLUMN "classId" SET NOT NULL;

-- Step 4: Create the SchemeOfWorkClassArm junction table
CREATE TABLE "SchemeOfWorkClassArm" (
    "id" TEXT NOT NULL,
    "schemeOfWorkId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchemeOfWorkClassArm_pkey" PRIMARY KEY ("id")
);

-- Step 5: Migrate existing single arm into junction table
INSERT INTO "SchemeOfWorkClassArm" ("id", "schemeOfWorkId", "classArmId", "createdAt")
SELECT gen_random_uuid()::text, id, "classArmId", NOW()
FROM "SchemeOfWork"
WHERE "classArmId" IS NOT NULL;

-- Step 6: Drop old constraints and column
ALTER TABLE "SchemeOfWork" DROP CONSTRAINT IF EXISTS "SchemeOfWork_subjectId_classArmId_sessionId_key";
ALTER TABLE "SchemeOfWork" DROP CONSTRAINT IF EXISTS "SchemeOfWork_classArmId_fkey";
ALTER TABLE "SchemeOfWork" DROP COLUMN "classArmId";

-- Step 7: Add new unique constraint and FK for classId
ALTER TABLE "SchemeOfWork" ADD CONSTRAINT "SchemeOfWork_subjectId_classId_sessionId_key" UNIQUE ("subjectId", "classId", "sessionId");
ALTER TABLE "SchemeOfWork" ADD CONSTRAINT "SchemeOfWork_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Indexes and FKs for junction table
CREATE UNIQUE INDEX "SchemeOfWorkClassArm_schemeOfWorkId_classArmId_key" ON "SchemeOfWorkClassArm"("schemeOfWorkId", "classArmId");
CREATE INDEX "SchemeOfWorkClassArm_schemeOfWorkId_idx" ON "SchemeOfWorkClassArm"("schemeOfWorkId");
ALTER TABLE "SchemeOfWorkClassArm" ADD CONSTRAINT "SchemeOfWorkClassArm_schemeOfWorkId_fkey" FOREIGN KEY ("schemeOfWorkId") REFERENCES "SchemeOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemeOfWorkClassArm" ADD CONSTRAINT "SchemeOfWorkClassArm_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
