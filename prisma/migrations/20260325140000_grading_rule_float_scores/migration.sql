-- AlterTable: change minScore and maxScore from INTEGER to DOUBLE PRECISION to support decimal scores
ALTER TABLE "GradingRule"
  ALTER COLUMN "minScore" TYPE DOUBLE PRECISION,
  ALTER COLUMN "maxScore" TYPE DOUBLE PRECISION;
