CREATE TABLE IF NOT EXISTS "AttendanceWeekMark" (
    "schoolId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "markedById" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "markedDates" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "markedDaysCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceWeekMark_pkey" PRIMARY KEY ("classArmId", "markedById", "weekStartDate"),
    CONSTRAINT "AttendanceWeekMark_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttendanceWeekMark_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttendanceWeekMark_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AttendanceWeekMark_schoolId_classArmId_markedById_weekStartDate_idx"
ON "AttendanceWeekMark" ("schoolId", "classArmId", "markedById", "weekStartDate");
