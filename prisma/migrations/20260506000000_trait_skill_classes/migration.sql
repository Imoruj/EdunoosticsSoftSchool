-- CreateTable
CREATE TABLE "AffectiveTraitClass" (
    "id" TEXT NOT NULL,
    "traitId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "AffectiveTraitClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychomotorSkillClass" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "PsychomotorSkillClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AffectiveTraitClass_traitId_classId_key" ON "AffectiveTraitClass"("traitId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "PsychomotorSkillClass_skillId_classId_key" ON "PsychomotorSkillClass"("skillId", "classId");

-- AddForeignKey
ALTER TABLE "AffectiveTraitClass" ADD CONSTRAINT "AffectiveTraitClass_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "AffectiveTrait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectiveTraitClass" ADD CONSTRAINT "AffectiveTraitClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychomotorSkillClass" ADD CONSTRAINT "PsychomotorSkillClass_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "PsychomotorSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychomotorSkillClass" ADD CONSTRAINT "PsychomotorSkillClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
