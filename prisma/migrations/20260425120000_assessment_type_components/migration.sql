-- CreateTable
CREATE TABLE "AssessmentTypeComponent" (
    "id" TEXT NOT NULL,
    "assessmentTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentTypeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentTypeComponent_assessmentTypeId_idx" ON "AssessmentTypeComponent"("assessmentTypeId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "AssessmentTypeComponent_assessmentTypeId_name_key" ON "AssessmentTypeComponent"("assessmentTypeId", "name");

-- AddForeignKey
ALTER TABLE "AssessmentTypeComponent" ADD CONSTRAINT "AssessmentTypeComponent_assessmentTypeId_fkey" FOREIGN KEY ("assessmentTypeId") REFERENCES "AssessmentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add componentScores column to Score
ALTER TABLE "Score" ADD COLUMN "componentScores" JSONB NOT NULL DEFAULT '{}';
