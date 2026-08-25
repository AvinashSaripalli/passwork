/*
  Warnings:

  - Changed the type of `accessLevel` on the `DepartmentPermission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "DepartmentAccessLevel" AS ENUM ('READ_ONLY', 'READ_WRITE', 'DELETE', 'ADMIN');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DEPARTMENT';

-- AlterTable
ALTER TABLE "DepartmentPermission" DROP COLUMN "accessLevel",
ADD COLUMN     "accessLevel" "DepartmentAccessLevel" NOT NULL;
