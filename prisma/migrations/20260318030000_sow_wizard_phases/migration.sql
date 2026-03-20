-- Add wizard-phase fields to SchemeOfWorkWeek
ALTER TABLE "SchemeOfWorkWeek" ADD COLUMN "waecObjectives" TEXT;
ALTER TABLE "SchemeOfWorkWeek" ADD COLUMN "jambObjectives" TEXT;
ALTER TABLE "SchemeOfWorkWeek" ADD COLUMN "igcseObjectives" TEXT;
ALTER TABLE "SchemeOfWorkWeek" ADD COLUMN "objectivesApproved" BOOLEAN NOT NULL DEFAULT false;

-- Create SchemeOfWorkWeekReference
CREATE TABLE "SchemeOfWorkWeekReference" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "fileKey" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchemeOfWorkWeekReference_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SchemeOfWorkWeekReference" ADD CONSTRAINT "SchemeOfWorkWeekReference_weekId_fkey"
    FOREIGN KEY ("weekId") REFERENCES "SchemeOfWorkWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SchemeOfWorkWeekReference_weekId_idx" ON "SchemeOfWorkWeekReference"("weekId");

-- Create SchemeOfWorkWeekSdg
CREATE TABLE "SchemeOfWorkWeekSdg" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "sdgNumber" INTEGER NOT NULL,
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchemeOfWorkWeekSdg_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SchemeOfWorkWeekSdg_weekId_sdgNumber_key" UNIQUE ("weekId", "sdgNumber")
);

ALTER TABLE "SchemeOfWorkWeekSdg" ADD CONSTRAINT "SchemeOfWorkWeekSdg_weekId_fkey"
    FOREIGN KEY ("weekId") REFERENCES "SchemeOfWorkWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SchemeOfWorkWeekSdg_weekId_idx" ON "SchemeOfWorkWeekSdg"("weekId");
