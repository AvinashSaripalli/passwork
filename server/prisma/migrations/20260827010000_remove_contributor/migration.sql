-- Create new enum types without CONTRIBUTOR
CREATE TYPE "FolderAccessLevel_new" AS ENUM ('VIEWER', 'EDITOR', 'MANAGER', 'ADMIN');

-- Migrate FolderPermission data (CONTRIBUTOR → VIEWER)
ALTER TABLE "FolderPermission" ADD COLUMN "accessLevel_new" "FolderAccessLevel_new";

UPDATE "FolderPermission" SET "accessLevel_new" = CASE
  WHEN "accessLevel" = 'CONTRIBUTOR' THEN 'VIEWER'::"FolderAccessLevel_new"
  ELSE "accessLevel"::text::"FolderAccessLevel_new"
END;

-- Drop old column and rename
ALTER TABLE "FolderPermission" DROP COLUMN "accessLevel";
ALTER TABLE "FolderPermission" RENAME COLUMN "accessLevel_new" TO "accessLevel";

-- Drop old enum type and rename new
DROP TYPE "FolderAccessLevel";
ALTER TYPE "FolderAccessLevel_new" RENAME TO "FolderAccessLevel";
