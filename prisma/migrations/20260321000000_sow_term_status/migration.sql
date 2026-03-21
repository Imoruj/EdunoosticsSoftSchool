-- Migration: per-term approval workflow for Scheme of Work
-- Each term can be independently submitted, approved, or rejected.
-- approvedSnapshot stores a frozen copy of week data at approval time,
-- used exclusively by the lesson builder (teacher edits don't affect it).

ALTER TABLE "SchemeOfWorkTerm"
  ADD COLUMN "status"          "SowStatus"  NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "adminNote"       TEXT,
  ADD COLUMN "submittedAt"     TIMESTAMP(3),
  ADD COLUMN "approvedAt"      TIMESTAMP(3),
  ADD COLUMN "approvedById"    TEXT,
  ADD COLUMN "approvedSnapshot" JSONB;

CREATE INDEX "SchemeOfWorkTerm_schemeOfWorkId_status_idx"
  ON "SchemeOfWorkTerm"("schemeOfWorkId", "status");

-- Migrate existing approved SOWs: mark their terms as APPROVED too
UPDATE "SchemeOfWorkTerm" t
SET    "status" = 'APPROVED',
       "approvedAt" = sow."approvedAt"
FROM   "SchemeOfWork" sow
WHERE  t."schemeOfWorkId" = sow.id
  AND  sow."status" = 'APPROVED'
  AND  sow."approvedAt" IS NOT NULL;
