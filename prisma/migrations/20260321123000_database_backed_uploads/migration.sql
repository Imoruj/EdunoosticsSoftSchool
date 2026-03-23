CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UploadedFile_schoolId_uploadType_idx" ON "UploadedFile"("schoolId", "uploadType");
CREATE INDEX "UploadedFile_uploadedById_createdAt_idx" ON "UploadedFile"("uploadedById", "createdAt");

ALTER TABLE "UploadedFile"
ADD CONSTRAINT "UploadedFile_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UploadedFile"
ADD CONSTRAINT "UploadedFile_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
