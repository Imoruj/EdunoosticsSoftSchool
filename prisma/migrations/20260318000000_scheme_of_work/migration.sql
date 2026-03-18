-- CreateEnum
CREATE TYPE "SowStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterTable: add schemesOfWorkEnabled feature flag
ALTER TABLE "SchoolFeatureControl" ADD COLUMN "schemesOfWorkEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: SchemeOfWork
CREATE TABLE "SchemeOfWork" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "SowStatus" NOT NULL DEFAULT 'DRAFT',
    "adminNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemeOfWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SchemeOfWorkTerm
CREATE TABLE "SchemeOfWorkTerm" (
    "id" TEXT NOT NULL,
    "schemeOfWorkId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "termNumber" INTEGER NOT NULL,
    "objectives" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemeOfWorkTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SchemeOfWorkWeek
CREATE TABLE "SchemeOfWorkWeek" (
    "id" TEXT NOT NULL,
    "schemeOfWorkTermId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "content" TEXT,
    "objectives" TEXT,
    "resources" TEXT,
    "teachingMethods" TEXT,
    "assessment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemeOfWorkWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SchemeOfWorkCollaborator
CREATE TABLE "SchemeOfWorkCollaborator" (
    "id" TEXT NOT NULL,
    "schemeOfWorkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchemeOfWorkCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchemeOfWork_subjectId_classArmId_sessionId_key" ON "SchemeOfWork"("subjectId", "classArmId", "sessionId");
CREATE INDEX "SchemeOfWork_schoolId_status_idx" ON "SchemeOfWork"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeOfWorkTerm_schemeOfWorkId_termNumber_key" ON "SchemeOfWorkTerm"("schemeOfWorkId", "termNumber");
CREATE INDEX "SchemeOfWorkTerm_schemeOfWorkId_idx" ON "SchemeOfWorkTerm"("schemeOfWorkId");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeOfWorkWeek_schemeOfWorkTermId_weekNumber_key" ON "SchemeOfWorkWeek"("schemeOfWorkTermId", "weekNumber");
CREATE INDEX "SchemeOfWorkWeek_schemeOfWorkTermId_idx" ON "SchemeOfWorkWeek"("schemeOfWorkTermId");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeOfWorkCollaborator_schemeOfWorkId_userId_key" ON "SchemeOfWorkCollaborator"("schemeOfWorkId", "userId");
CREATE INDEX "SchemeOfWorkCollaborator_schemeOfWorkId_idx" ON "SchemeOfWorkCollaborator"("schemeOfWorkId");

-- AddForeignKey
ALTER TABLE "SchemeOfWork" ADD CONSTRAINT "SchemeOfWork_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemeOfWork" ADD CONSTRAINT "SchemeOfWork_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemeOfWork" ADD CONSTRAINT "SchemeOfWork_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemeOfWork" ADD CONSTRAINT "SchemeOfWork_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemeOfWork" ADD CONSTRAINT "SchemeOfWork_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchemeOfWork" ADD CONSTRAINT "SchemeOfWork_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchemeOfWorkTerm" ADD CONSTRAINT "SchemeOfWorkTerm_schemeOfWorkId_fkey" FOREIGN KEY ("schemeOfWorkId") REFERENCES "SchemeOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemeOfWorkTerm" ADD CONSTRAINT "SchemeOfWorkTerm_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchemeOfWorkWeek" ADD CONSTRAINT "SchemeOfWorkWeek_schemeOfWorkTermId_fkey" FOREIGN KEY ("schemeOfWorkTermId") REFERENCES "SchemeOfWorkTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchemeOfWorkCollaborator" ADD CONSTRAINT "SchemeOfWorkCollaborator_schemeOfWorkId_fkey" FOREIGN KEY ("schemeOfWorkId") REFERENCES "SchemeOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemeOfWorkCollaborator" ADD CONSTRAINT "SchemeOfWorkCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
