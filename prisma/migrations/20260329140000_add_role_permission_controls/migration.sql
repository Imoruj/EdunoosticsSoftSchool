CREATE TABLE "RolePermissionControl" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermissionControl_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RolePermissionControl_schoolId_role_key" ON "RolePermissionControl"("schoolId", "role");
CREATE INDEX "RolePermissionControl_schoolId_idx" ON "RolePermissionControl"("schoolId");

ALTER TABLE "RolePermissionControl"
ADD CONSTRAINT "RolePermissionControl_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
