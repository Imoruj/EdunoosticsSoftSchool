-- Fix legacy term backfill: empty terms with no review history should remain draft.
-- These rows were previously marked APPROVED from the parent SOW status even though
-- no term-level review happened and there is no approved snapshot.

UPDATE "SchemeOfWorkTerm" term
SET
  "status" = 'DRAFT',
  "approvedAt" = NULL,
  "approvedById" = NULL,
  "adminNote" = NULL
WHERE term."status" = 'APPROVED'
  AND term."submittedAt" IS NULL
  AND term."approvedSnapshot" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "SchemeOfWorkWeek" week
    WHERE week."schemeOfWorkTermId" = term.id
  );
