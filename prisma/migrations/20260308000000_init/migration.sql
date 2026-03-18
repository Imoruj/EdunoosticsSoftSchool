-- CreateEnum
CREATE TYPE "SchoolCategory" AS ENUM ('PRIMARY', 'JUNIOR_SECONDARY', 'SENIOR_SECONDARY');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'CLASS_TEACHER', 'SUBJECT_TEACHER', 'PARENT', 'STUDENT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ClassLevel" AS ENUM ('NURSERY', 'PRIMARY', 'JUNIOR_SECONDARY', 'SENIOR_SECONDARY');

-- CreateEnum
CREATE TYPE "SubjectCategory" AS ENUM ('CORE', 'SCIENCE', 'ARTS', 'COMMERCIAL', 'VOCATIONAL', 'LANGUAGE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD', 'ONLINE');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('SMS', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ScoreUploadStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScoreWorkflowStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'BROADCASTED');

-- CreateEnum
CREATE TYPE "ScoreWorkflowActionType" AS ENUM ('SAVED', 'APPROVED', 'REJECTED', 'BROADCASTED', 'REOPENED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('HALF_TERM', 'END_TERM');

-- CreateEnum
CREATE TYPE "ClassReportWorkflowStatus" AS ENUM ('WAITING_SUBJECT_BROADCAST', 'RESULT_BROADCASTED', 'COMMENTS_GENERATED', 'READY_FOR_ADMIN_REVIEW', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "StudentReportWorkflowStatus" AS ENUM ('COMMENTS_PENDING', 'COMMENTS_READY', 'CLASS_APPROVED', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SCORE_SUBMITTED', 'SCORE_APPROVED', 'SCORE_REJECTED', 'SCORE_BROADCASTED', 'RESULT_BROADCASTED', 'COMMENTS_GENERATED', 'STUDENT_REPORT_CLASS_APPROVED', 'STUDENT_REPORT_ADMIN_APPROVED', 'STUDENT_REPORT_ADMIN_REJECTED', 'RESULT_PUBLISHED', 'RESULT_UNPUBLISHED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "motto" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#16a34a',
    "slug" TEXT,
    "principalSignatureUrl" TEXT,
    "stampUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "roles" "UserRole"[],
    "avatarUrl" TEXT,
    "signatureUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "AcademicSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "termNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "resumptionDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "totalSchoolDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "ClassLevel" NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassArm" (
    "id" TEXT NOT NULL,
    "armName" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classId" TEXT NOT NULL,
    "classTeacherId" TEXT,

    CONSTRAINT "ClassArm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" "SubjectCategory" NOT NULL DEFAULT 'CORE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectClassArm" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subjectId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,

    CONSTRAINT "SubjectClassArm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSubject" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,

    CONSTRAINT "TeacherSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "occupation" TEXT,
    "relationship" TEXT NOT NULL DEFAULT 'guardian',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "otherNames" TEXT,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "parentName" TEXT,
    "parentPhone" TEXT,
    "parentEmail" TEXT,
    "address" TEXT,
    "stateOfOrigin" TEXT,
    "religion" TEXT,
    "bloodGroup" TEXT,
    "photoUrl" TEXT,
    "admissionDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classArmId" TEXT,
    "parentId" TEXT,
    "userId" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectEnrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "ca1" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ca2" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ca3" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "exam" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "grade" TEXT,
    "remark" TEXT,
    "subjectPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCard" (
    "id" TEXT NOT NULL,
    "totalScore" DECIMAL(10,2),
    "totalObtainable" INTEGER,
    "average" DECIMAL(5,2),
    "classPosition" INTEGER,
    "classSize" INTEGER,
    "daysPresent" INTEGER,
    "daysAbsent" INTEGER,
    "totalSchoolDays" INTEGER,
    "classTeacherComment" TEXT,
    "principalComment" TEXT,
    "accessPin" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,

    CONSTRAINT "ReportCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychomotorSkill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" TEXT,

    CONSTRAINT "PsychomotorSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychomotorRating" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportCardId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "PsychomotorRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffectiveTrait" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" TEXT,

    CONSTRAINT "AffectiveTrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffectiveRating" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportCardId" TEXT NOT NULL,
    "traitId" TEXT NOT NULL,

    CONSTRAINT "AffectiveRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "markedById" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingRule" (
    "id" TEXT NOT NULL,
    "minScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "remark" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" TEXT,
    "schoolCategory" "SchoolCategory",

    CONSTRAINT "GradingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "maxScore" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "AssessmentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "feeType" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "reference" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "receivedById" TEXT,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientId" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSettings" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherPrompt" TEXT NOT NULL DEFAULT 'Generate a professional and encouraging class teacher''s comment for a student based on these details:
Name: {{name}}
Gender: {{gender}}
Term: {{term}}
Average Score: {{average}}%
Class Position: {{position}}
Attendance: {{attendance}}
Traits: {{traits}}

The comment should be around 2-3 sentences.',
    "principalPrompt" TEXT NOT NULL DEFAULT 'Generate a concise principal''s closing remark for a student based on their overall performance:
Average Score: {{average}}%
Class Position: {{position}}
Attendance: {{attendance}}.

Keep it professional and focused on growth.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreUploadRequest" (
    "id" TEXT NOT NULL,
    "status" "ScoreUploadStatus" NOT NULL DEFAULT 'PENDING',
    "scoreData" JSONB NOT NULL,
    "fileName" TEXT,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "uploaderId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "reviewedById" TEXT,

    CONSTRAINT "ScoreUploadRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreSheetWorkflow" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectTeacherId" TEXT,
    "classTeacherId" TEXT,
    "status" "ScoreWorkflowStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "broadcastedAt" TIMESTAMP(3),
    "broadcastedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreSheetWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreSheetActionLog" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "ScoreWorkflowActionType" NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreSheetActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassReportWorkflow" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "status" "ClassReportWorkflowStatus" NOT NULL DEFAULT 'WAITING_SUBJECT_BROADCAST',
    "resultBroadcastedAt" TIMESTAMP(3),
    "resultBroadcastedById" TEXT,
    "commentsGeneratedAt" TIMESTAMP(3),
    "commentsGeneratedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "unpublishedAt" TIMESTAMP(3),
    "unpublishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassReportWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentReportWorkflow" (
    "id" TEXT NOT NULL,
    "classReportWorkflowId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "status" "StudentReportWorkflowStatus" NOT NULL DEFAULT 'COMMENTS_PENDING',
    "classTeacherComment" TEXT,
    "principalComment" TEXT,
    "classTeacherApprovedAt" TIMESTAMP(3),
    "classTeacherApprovedById" TEXT,
    "adminReviewedAt" TIMESTAMP(3),
    "adminReviewedById" TEXT,
    "adminReviewNote" TEXT,
    "publishedAt" TIMESTAMP(3),
    "downloadExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentReportWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCardConfig" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "activeTemplateId" TEXT,
    "activeTemplate" TEXT NOT NULL DEFAULT 'classic',
    "colorScheme" TEXT NOT NULL DEFAULT 'blue',
    "showAttendance" BOOLEAN NOT NULL DEFAULT true,
    "showTraits" BOOLEAN NOT NULL DEFAULT true,
    "showSkills" BOOLEAN NOT NULL DEFAULT true,
    "showComments" BOOLEAN NOT NULL DEFAULT true,
    "showPhoto" BOOLEAN NOT NULL DEFAULT true,
    "showPosition" BOOLEAN NOT NULL DEFAULT true,
    "showBehaviourGradeKey" BOOLEAN NOT NULL DEFAULT true,
    "displayOptions" JSONB,
    "customTemplates" JSONB,
    "termMappings" JSONB,
    "customTitles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCardConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationConfig" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "smsProvider" TEXT NOT NULL DEFAULT 'termii',
    "smsApiKey" TEXT,
    "smsSenderId" TEXT,
    "emailProvider" TEXT NOT NULL DEFAULT 'smtp',
    "emailHost" TEXT,
    "emailPort" INTEGER,
    "emailUser" TEXT,
    "emailPassword" TEXT,
    "emailFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolFeatureControl" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "teachersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "scoreEntryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "scoreReviewsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "subjectsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lessonsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quizzesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "assignmentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "classesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "broadsheetEnabled" BOOLEAN NOT NULL DEFAULT true,
    "transcriptsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reportCardsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "legacyRecordsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "uploadRequestsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "attendanceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "behaviourEnabled" BOOLEAN NOT NULL DEFAULT true,
    "communicationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "feesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "settingsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolFeatureControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadsheetConfig" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "activeTemplateId" TEXT,
    "activeTemplate" TEXT NOT NULL DEFAULT 'standard',
    "colorScheme" TEXT NOT NULL DEFAULT 'blue',
    "showCA1" BOOLEAN NOT NULL DEFAULT true,
    "showCA2" BOOLEAN NOT NULL DEFAULT true,
    "showExam" BOOLEAN NOT NULL DEFAULT true,
    "showSubjectTotal" BOOLEAN NOT NULL DEFAULT true,
    "showGrade" BOOLEAN NOT NULL DEFAULT true,
    "showPosition" BOOLEAN NOT NULL DEFAULT true,
    "displayOptions" JSONB,
    "customTemplates" JSONB,
    "customTitles" JSONB,
    "termMappings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BroadsheetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "resultUrl" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "identityPublicKey" TEXT NOT NULL,
    "signingPublicKey" TEXT NOT NULL,
    "preKeys" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncMetadata" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vectorClock" JSONB NOT NULL,

    CONSTRAINT "SyncMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncryptedBlob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blobType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "encryptedData" BYTEA NOT NULL,
    "iv" TEXT NOT NULL,
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "EncryptedBlob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalingMessage" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "signal" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SignalingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicSession_schoolId_name_key" ON "AcademicSession"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Term_sessionId_termNumber_key" ON "Term"("sessionId", "termNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_name_key" ON "Class"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ClassArm_classId_armName_key" ON "ClassArm"("classId", "armName");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_name_key" ON "Subject"("schoolId", "name");

-- CreateIndex
CREATE INDEX "SubjectClassArm_subjectId_idx" ON "SubjectClassArm"("subjectId");

-- CreateIndex
CREATE INDEX "SubjectClassArm_classArmId_idx" ON "SubjectClassArm"("classArmId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectClassArm_subjectId_classArmId_key" ON "SubjectClassArm"("subjectId", "classArmId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubject_teacherId_subjectId_classArmId_key" ON "TeacherSubject"("teacherId", "subjectId", "classArmId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubject_subjectId_classArmId_key" ON "TeacherSubject"("subjectId", "classArmId");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_admissionNumber_key" ON "Student"("schoolId", "admissionNumber");

-- CreateIndex
CREATE INDEX "SubjectEnrollment_subjectId_classArmId_termId_idx" ON "SubjectEnrollment"("subjectId", "classArmId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectEnrollment_studentId_subjectId_termId_key" ON "SubjectEnrollment"("studentId", "subjectId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_studentId_subjectId_termId_key" ON "Score"("studentId", "subjectId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCard_studentId_termId_key" ON "ReportCard"("studentId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "PsychomotorSkill_schoolId_name_key" ON "PsychomotorSkill"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PsychomotorRating_reportCardId_skillId_key" ON "PsychomotorRating"("reportCardId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "AffectiveTrait_schoolId_name_key" ON "AffectiveTrait"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AffectiveRating_reportCardId_traitId_key" ON "AffectiveRating"("reportCardId", "traitId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_date_key" ON "Attendance"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GradingRule_schoolId_grade_schoolCategory_key" ON "GradingRule"("schoolId", "grade", "schoolCategory");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentType_schoolId_name_key" ON "AssessmentType"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "FeeStructure_schoolId_classId_termId_feeType_key" ON "FeeStructure"("schoolId", "classId", "termId", "feeType");

-- CreateIndex
CREATE UNIQUE INDEX "AiSettings_schoolId_key" ON "AiSettings"("schoolId");

-- CreateIndex
CREATE INDEX "ScoreUploadRequest_schoolId_status_idx" ON "ScoreUploadRequest"("schoolId", "status");

-- CreateIndex
CREATE INDEX "ScoreSheetWorkflow_schoolId_status_idx" ON "ScoreSheetWorkflow"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreSheetWorkflow_termId_classArmId_subjectId_key" ON "ScoreSheetWorkflow"("termId", "classArmId", "subjectId");

-- CreateIndex
CREATE INDEX "ScoreSheetActionLog_workflowId_createdAt_idx" ON "ScoreSheetActionLog"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassReportWorkflow_schoolId_status_idx" ON "ClassReportWorkflow"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClassReportWorkflow_termId_classArmId_reportType_key" ON "ClassReportWorkflow"("termId", "classArmId", "reportType");

-- CreateIndex
CREATE INDEX "StudentReportWorkflow_schoolId_status_idx" ON "StudentReportWorkflow"("schoolId", "status");

-- CreateIndex
CREATE INDEX "StudentReportWorkflow_studentId_termId_reportType_idx" ON "StudentReportWorkflow"("studentId", "termId", "reportType");

-- CreateIndex
CREATE UNIQUE INDEX "StudentReportWorkflow_classReportWorkflowId_studentId_key" ON "StudentReportWorkflow"("classReportWorkflowId", "studentId");

-- CreateIndex
CREATE INDEX "UserNotification_userId_isRead_createdAt_idx" ON "UserNotification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "UserNotification_schoolId_createdAt_idx" ON "UserNotification"("schoolId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCardConfig_schoolId_key" ON "ReportCardConfig"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationConfig_schoolId_key" ON "CommunicationConfig"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolFeatureControl_schoolId_key" ON "SchoolFeatureControl"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "BroadsheetConfig_schoolId_key" ON "BroadsheetConfig"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceKey_deviceId_key" ON "DeviceKey"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceKey_userId_idx" ON "DeviceKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceKey_userId_deviceId_key" ON "DeviceKey"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "SyncMetadata_userId_entityType_idx" ON "SyncMetadata"("userId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "SyncMetadata_userId_deviceId_entityType_entityId_key" ON "SyncMetadata"("userId", "deviceId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "EncryptedBlob_userId_blobType_idx" ON "EncryptedBlob"("userId", "blobType");

-- CreateIndex
CREATE INDEX "EncryptedBlob_expiresAt_idx" ON "EncryptedBlob"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EncryptedBlob_userId_blobType_entityId_key" ON "EncryptedBlob"("userId", "blobType", "entityId");

-- CreateIndex
CREATE INDEX "SignalingMessage_toUserId_isRead_idx" ON "SignalingMessage"("toUserId", "isRead");

-- CreateIndex
CREATE INDEX "SignalingMessage_createdAt_idx" ON "SignalingMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicSession" ADD CONSTRAINT "AcademicSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassArm" ADD CONSTRAINT "ClassArm_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassArm" ADD CONSTRAINT "ClassArm_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectClassArm" ADD CONSTRAINT "SubjectClassArm_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectClassArm" ADD CONSTRAINT "SubjectClassArm_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectEnrollment" ADD CONSTRAINT "SubjectEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectEnrollment" ADD CONSTRAINT "SubjectEnrollment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectEnrollment" ADD CONSTRAINT "SubjectEnrollment_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectEnrollment" ADD CONSTRAINT "SubjectEnrollment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychomotorSkill" ADD CONSTRAINT "PsychomotorSkill_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychomotorRating" ADD CONSTRAINT "PsychomotorRating_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "ReportCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychomotorRating" ADD CONSTRAINT "PsychomotorRating_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "PsychomotorSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectiveTrait" ADD CONSTRAINT "AffectiveTrait_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectiveRating" ADD CONSTRAINT "AffectiveRating_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "ReportCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectiveRating" ADD CONSTRAINT "AffectiveRating_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "AffectiveTrait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingRule" ADD CONSTRAINT "GradingRule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentType" ADD CONSTRAINT "AssessmentType_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSettings" ADD CONSTRAINT "AiSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreUploadRequest" ADD CONSTRAINT "ScoreUploadRequest_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreUploadRequest" ADD CONSTRAINT "ScoreUploadRequest_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreUploadRequest" ADD CONSTRAINT "ScoreUploadRequest_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreUploadRequest" ADD CONSTRAINT "ScoreUploadRequest_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreUploadRequest" ADD CONSTRAINT "ScoreUploadRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetWorkflow" ADD CONSTRAINT "ScoreSheetWorkflow_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetWorkflow" ADD CONSTRAINT "ScoreSheetWorkflow_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetWorkflow" ADD CONSTRAINT "ScoreSheetWorkflow_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetWorkflow" ADD CONSTRAINT "ScoreSheetWorkflow_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetWorkflow" ADD CONSTRAINT "ScoreSheetWorkflow_subjectTeacherId_fkey" FOREIGN KEY ("subjectTeacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetWorkflow" ADD CONSTRAINT "ScoreSheetWorkflow_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetWorkflow" ADD CONSTRAINT "ScoreSheetWorkflow_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetWorkflow" ADD CONSTRAINT "ScoreSheetWorkflow_broadcastedById_fkey" FOREIGN KEY ("broadcastedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetActionLog" ADD CONSTRAINT "ScoreSheetActionLog_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ScoreSheetWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetActionLog" ADD CONSTRAINT "ScoreSheetActionLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReportWorkflow" ADD CONSTRAINT "ClassReportWorkflow_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReportWorkflow" ADD CONSTRAINT "ClassReportWorkflow_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReportWorkflow" ADD CONSTRAINT "ClassReportWorkflow_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReportWorkflow" ADD CONSTRAINT "ClassReportWorkflow_resultBroadcastedById_fkey" FOREIGN KEY ("resultBroadcastedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReportWorkflow" ADD CONSTRAINT "ClassReportWorkflow_commentsGeneratedById_fkey" FOREIGN KEY ("commentsGeneratedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReportWorkflow" ADD CONSTRAINT "ClassReportWorkflow_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReportWorkflow" ADD CONSTRAINT "ClassReportWorkflow_unpublishedById_fkey" FOREIGN KEY ("unpublishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReportWorkflow" ADD CONSTRAINT "StudentReportWorkflow_classReportWorkflowId_fkey" FOREIGN KEY ("classReportWorkflowId") REFERENCES "ClassReportWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReportWorkflow" ADD CONSTRAINT "StudentReportWorkflow_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReportWorkflow" ADD CONSTRAINT "StudentReportWorkflow_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReportWorkflow" ADD CONSTRAINT "StudentReportWorkflow_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReportWorkflow" ADD CONSTRAINT "StudentReportWorkflow_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReportWorkflow" ADD CONSTRAINT "StudentReportWorkflow_classTeacherApprovedById_fkey" FOREIGN KEY ("classTeacherApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReportWorkflow" ADD CONSTRAINT "StudentReportWorkflow_adminReviewedById_fkey" FOREIGN KEY ("adminReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardConfig" ADD CONSTRAINT "ReportCardConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationConfig" ADD CONSTRAINT "CommunicationConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolFeatureControl" ADD CONSTRAINT "SchoolFeatureControl_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadsheetConfig" ADD CONSTRAINT "BroadsheetConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceKey" ADD CONSTRAINT "DeviceKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncMetadata" ADD CONSTRAINT "SyncMetadata_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncryptedBlob" ADD CONSTRAINT "EncryptedBlob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalingMessage" ADD CONSTRAINT "SignalingMessage_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalingMessage" ADD CONSTRAINT "SignalingMessage_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
