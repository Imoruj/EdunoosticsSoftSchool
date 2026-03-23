CREATE TYPE "StudentChangeRequestAction" AS ENUM ('EDIT', 'DELETE');

CREATE TYPE "StudentChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "StudentChangeRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "requesterId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "action" "StudentChangeRequestAction" NOT NULL,
    "status" "StudentChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "classLabel" TEXT,
    "currentData" JSONB,
    "requestedData" JSONB,
    "summary" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentChangeRequest_schoolId_status_createdAt_idx" ON "StudentChangeRequest"("schoolId", "status", "createdAt");
CREATE INDEX "StudentChangeRequest_requesterId_createdAt_idx" ON "StudentChangeRequest"("requesterId", "createdAt");
CREATE INDEX "StudentChangeRequest_studentId_status_idx" ON "StudentChangeRequest"("studentId", "status");

ALTER TABLE "StudentChangeRequest"
ADD CONSTRAINT "StudentChangeRequest_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentChangeRequest"
ADD CONSTRAINT "StudentChangeRequest_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentChangeRequest"
ADD CONSTRAINT "StudentChangeRequest_requesterId_fkey"
FOREIGN KEY ("requesterId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentChangeRequest"
ADD CONSTRAINT "StudentChangeRequest_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
