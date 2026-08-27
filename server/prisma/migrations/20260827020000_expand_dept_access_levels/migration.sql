-- Create new enum type with 6 levels
CREATE TYPE "DepartmentAccessLevel_new" AS ENUM ('NOT_SET', 'FORBIDDEN', 'READ_ONLY', 'READ_WRITE', 'FULL_ACCESS', 'ADMINISTRATOR');

-- Migrate DepartmentPermission data
ALTER TABLE "DepartmentPermission" ADD COLUMN "accessLevel_new" "DepartmentAccessLevel_new";

UPDATE "DepartmentPermission" SET "accessLevel_new" = CASE
  WHEN "accessLevel" = 'VIEWER' THEN 'READ_ONLY'::"DepartmentAccessLevel_new"
  WHEN "accessLevel" = 'EDITOR' THEN 'READ_WRITE'::"DepartmentAccessLevel_new"
  WHEN "accessLevel" = 'MANAGER' THEN 'FULL_ACCESS'::"DepartmentAccessLevel_new"
  WHEN "accessLevel" = 'ADMIN' THEN 'ADMINISTRATOR'::"DepartmentAccessLevel_new"
  ELSE 'READ_ONLY'::"DepartmentAccessLevel_new"
END;

-- Drop old column and rename
ALTER TABLE "DepartmentPermission" DROP COLUMN "accessLevel";
ALTER TABLE "DepartmentPermission" RENAME COLUMN "accessLevel_new" TO "accessLevel";

-- Drop old enum type and rename new
DROP TYPE "DepartmentAccessLevel";
ALTER TYPE "DepartmentAccessLevel_new" RENAME TO "DepartmentAccessLevel";
