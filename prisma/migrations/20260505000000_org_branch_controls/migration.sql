-- Add isHeadBranch to School to mark the main/head branch of an organization
ALTER TABLE "School" ADD COLUMN "isHeadBranch" BOOLEAN NOT NULL DEFAULT false;

-- Add canSwitchBranches to User to control branch switcher visibility per user
ALTER TABLE "User" ADD COLUMN "canSwitchBranches" BOOLEAN NOT NULL DEFAULT true;
