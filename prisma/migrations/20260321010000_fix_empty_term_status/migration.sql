-- Fix: migration 20260321000000 incorrectly set all terms of an approved SOW
-- to APPROVED, including terms with 0 weeks that were never reviewed.
-- Reset any APPROVED term that has no weeks back to DRAFT.
UPDATE "SchemeOfWorkTerm" t
SET "status"          = 'DRAFT',
    "approvedAt"      = NULL,
    "approvedById"    = NULL,
    "approvedSnapshot" = NULL
WHERE t.status = 'APPROVED'
  AND NOT EXISTS (
      SELECT 1 FROM "SchemeOfWorkWeek" w
      WHERE w."schemeOfWorkTermId" = t.id
  );
