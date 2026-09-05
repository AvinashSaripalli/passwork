-- Schema reconciliation.
-- These schema.prisma declarations were missing (or only partially described)
-- by earlier migrations, so databases provisioned purely via
-- `prisma migrate deploy` drifted from the schema and threw Prisma P2022
-- "ColumnNotFound" -> HTTP 500 on vaults, dashboard, personal vault and
-- password-share endpoints.
--
-- Verified with: prisma migrate diff --from-migrations -> --to-schema
--   (remaining drift after this migration is empty)
--
-- IF NOT EXISTS / IF EXISTS keep this safe on environments that already have
-- some of these changes applied manually or via `prisma db push`.

-- Enum: activity actions introduced with the 2FA / email-verification work
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'ENABLE_2FA';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'DISABLE_2FA';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'VERIFY_EMAIL';

-- CreateIndex for emailVerificationToken is not declared in the schema anymore
DROP INDEX IF EXISTS "User_emailVerificationToken_idx";

-- AlterTable: Vault policy columns
ALTER TABLE "Vault" ADD COLUMN IF NOT EXISTS "minStrengthScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "maxAgeDays" INTEGER,
  ADD COLUMN IF NOT EXISTS "blockCommon" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowedTypes" JSONB;

-- AlterTable: soft-delete support for password items
ALTER TABLE "PasswordEntry" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- CreateIndex: soft-delete lookups
CREATE INDEX IF NOT EXISTS "PasswordEntry_deletedAt_idx" ON "PasswordEntry"("deletedAt");

-- AlterTable: unused-by-code but declared in schema (kept for alignment)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: accessLevel columns are declared NOT NULL in the schema
ALTER TABLE "DepartmentPermission" ALTER COLUMN "accessLevel" SET NOT NULL;
ALTER TABLE "FolderPermission" ALTER COLUMN "accessLevel" SET NOT NULL;
ALTER TABLE "VaultPermission" ALTER COLUMN "accessLevel" SET NOT NULL;