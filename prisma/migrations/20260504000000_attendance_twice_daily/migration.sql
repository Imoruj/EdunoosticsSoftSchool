-- CreateEnum
CREATE TYPE "AttendancePeriod" AS ENUM ('MORNING', 'AFTERNOON');

-- AlterTable: add period column with MORNING default (preserves all existing records as morning sessions)
ALTER TABLE "Attendance" ADD COLUMN "period" "AttendancePeriod" NOT NULL DEFAULT 'MORNING';

-- DropIndex: remove old unique constraint (studentId, date)
DROP INDEX "Attendance_studentId_date_key";

-- CreateIndex: new unique constraint (studentId, date, period)
CREATE UNIQUE INDEX "Attendance_studentId_date_period_key" ON "Attendance"("studentId", "date", "period");
