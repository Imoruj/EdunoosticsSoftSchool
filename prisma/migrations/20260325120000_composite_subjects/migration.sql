-- CreateEnum
CREATE TYPE "SubjectKind" AS ENUM ('STANDARD', 'COMPOSITE_PARENT', 'COMPOSITE_COMPONENT');

-- AlterTable
ALTER TABLE "Subject"
ADD COLUMN "subjectKind" "SubjectKind" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "defaultParentSubjectId" TEXT;

-- AlterTable
ALTER TABLE "SubjectEnrollment"
ADD COLUMN "isDerived" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN "derivedFromSubjectId" TEXT;

-- AlterTable
ALTER TABLE "Score"
ADD COLUMN "isDerived" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN "derivedFromCompositeConfigId" TEXT;

-- CreateTable
CREATE TABLE "CompositeSubjectConfig" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "parentSubjectId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompositeSubjectConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompositeSubjectComponent" (
    "id" TEXT NOT NULL,
    "compositeConfigId" TEXT NOT NULL,
    "componentSubjectId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "ca1Max" INTEGER NOT NULL DEFAULT 0,
    "ca2Max" INTEGER NOT NULL DEFAULT 0,
    "ca3Max" INTEGER NOT NULL DEFAULT 0,
    "examMax" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompositeSubjectComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompositeSubjectConfig_schoolId_sessionId_classId_idx" ON "CompositeSubjectConfig"("schoolId", "sessionId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "CompositeSubjectConfig_sessionId_classId_parentSubjectId_key" ON "CompositeSubjectConfig"("sessionId", "classId", "parentSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "CompositeSubjectComponent_compositeConfigId_componentSubjectI_key" ON "CompositeSubjectComponent"("compositeConfigId", "componentSubjectId");

-- CreateIndex
CREATE INDEX "CompositeSubjectComponent_componentSubjectId_idx" ON "CompositeSubjectComponent"("componentSubjectId");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_defaultParentSubjectId_fkey" FOREIGN KEY ("defaultParentSubjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositeSubjectConfig" ADD CONSTRAINT "CompositeSubjectConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositeSubjectConfig" ADD CONSTRAINT "CompositeSubjectConfig_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositeSubjectConfig" ADD CONSTRAINT "CompositeSubjectConfig_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositeSubjectConfig" ADD CONSTRAINT "CompositeSubjectConfig_parentSubjectId_fkey" FOREIGN KEY ("parentSubjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositeSubjectComponent" ADD CONSTRAINT "CompositeSubjectComponent_compositeConfigId_fkey" FOREIGN KEY ("compositeConfigId") REFERENCES "CompositeSubjectConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositeSubjectComponent" ADD CONSTRAINT "CompositeSubjectComponent_componentSubjectId_fkey" FOREIGN KEY ("componentSubjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectEnrollment" ADD CONSTRAINT "SubjectEnrollment_derivedFromSubjectId_fkey" FOREIGN KEY ("derivedFromSubjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_derivedFromCompositeConfigId_fkey" FOREIGN KEY ("derivedFromCompositeConfigId") REFERENCES "CompositeSubjectConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
