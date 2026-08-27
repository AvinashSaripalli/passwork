-- Create new enum types
CREATE TYPE "FolderAccessLevel_new" AS ENUM ('VIEWER', 'CONTRIBUTOR', 'EDITOR', 'MANAGER', 'ADMIN');
CREATE TYPE "VaultAccessLevel_new" AS ENUM ('VIEWER', 'EDITOR', 'MANAGER', 'ADMIN');
CREATE TYPE "DepartmentAccessLevel_new" AS ENUM ('VIEWER', 'EDITOR', 'MANAGER', 'ADMIN');

-- Migrate FolderPermission data
ALTER TABLE "FolderPermission" ADD COLUMN "accessLevel_new" "FolderAccessLevel_new";

UPDATE "FolderPermission" SET "accessLevel_new" = CASE
  WHEN "accessLevel" = 'READ_ONLY' THEN 'VIEWER'::"FolderAccessLevel_new"
  WHEN "accessLevel" = 'EDIT_ONLY' THEN 'CONTRIBUTOR'::"FolderAccessLevel_new"
  WHEN "accessLevel" = 'FULL_ACCESS' THEN 'EDITOR'::"FolderAccessLevel_new"
  WHEN "accessLevel" = 'ADMINISTRATOR' THEN 'ADMIN'::"FolderAccessLevel_new"
  ELSE 'VIEWER'::"FolderAccessLevel_new"
END;

-- Migrate VaultPermission data
ALTER TABLE "VaultPermission" ADD COLUMN "accessLevel_new" "VaultAccessLevel_new";

UPDATE "VaultPermission" SET "accessLevel_new" = CASE
  WHEN "accessLevel" = 'READ_ONLY' THEN 'VIEWER'::"VaultAccessLevel_new"
  WHEN "accessLevel" = 'READ_WRITE' THEN 'EDITOR'::"VaultAccessLevel_new"
  WHEN "accessLevel" = 'DELETE' THEN 'MANAGER'::"VaultAccessLevel_new"
  WHEN "accessLevel" = 'ADMIN' THEN 'ADMIN'::"VaultAccessLevel_new"
  ELSE 'VIEWER'::"VaultAccessLevel_new"
END;

-- Migrate DepartmentPermission data
ALTER TABLE "DepartmentPermission" ADD COLUMN "accessLevel_new" "DepartmentAccessLevel_new";

UPDATE "DepartmentPermission" SET "accessLevel_new" = CASE
  WHEN "accessLevel" = 'READ_ONLY' THEN 'VIEWER'::"DepartmentAccessLevel_new"
  WHEN "accessLevel" = 'READ_WRITE' THEN 'EDITOR'::"DepartmentAccessLevel_new"
  WHEN "accessLevel" = 'DELETE' THEN 'MANAGER'::"DepartmentAccessLevel_new"
  WHEN "accessLevel" = 'ADMIN' THEN 'ADMIN'::"DepartmentAccessLevel_new"
  ELSE 'VIEWER'::"DepartmentAccessLevel_new"
END;

-- Drop old columns and rename new ones
ALTER TABLE "FolderPermission" DROP COLUMN "accessLevel";
ALTER TABLE "FolderPermission" RENAME COLUMN "accessLevel_new" TO "accessLevel";

ALTER TABLE "VaultPermission" DROP COLUMN "accessLevel";
ALTER TABLE "VaultPermission" RENAME COLUMN "accessLevel_new" TO "accessLevel";

ALTER TABLE "DepartmentPermission" DROP COLUMN "accessLevel";
ALTER TABLE "DepartmentPermission" RENAME COLUMN "accessLevel_new" TO "accessLevel";

-- Drop old enum types
DROP TYPE "FolderAccessLevel";
DROP TYPE "VaultAccessLevel";
DROP TYPE "DepartmentAccessLevel";

-- Rename new enum types
ALTER TYPE "FolderAccessLevel_new" RENAME TO "FolderAccessLevel";
ALTER TYPE "VaultAccessLevel_new" RENAME TO "VaultAccessLevel";
ALTER TYPE "DepartmentAccessLevel_new" RENAME TO "DepartmentAccessLevel";
