-- Migration: Replace fixed ca1/ca2/ca3/exam columns with a single JSONB scoreValues column.
-- This enables schools to configure unlimited assessment components per class.

-- Step 1: Add the new scoreValues column (JSONB, not null, default empty object)
ALTER TABLE "Score" ADD COLUMN "scoreValues" JSONB NOT NULL DEFAULT '{}';

-- Step 2: Migrate existing score data into the new JSON column using the same positional keys
UPDATE "Score"
SET "scoreValues" = jsonb_build_object(
  'ca1', ca1,
  'ca2', ca2,
  'ca3', ca3,
  'exam', exam
);

-- Step 3: Drop the old individual columns
ALTER TABLE "Score" DROP COLUMN "ca1";
ALTER TABLE "Score" DROP COLUMN "ca2";
ALTER TABLE "Score" DROP COLUMN "ca3";
ALTER TABLE "Score" DROP COLUMN "exam";
