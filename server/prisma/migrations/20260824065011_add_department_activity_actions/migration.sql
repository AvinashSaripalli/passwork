-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'CREATE_DEPARTMENT';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_DEPARTMENT';
ALTER TYPE "ActivityAction" ADD VALUE 'DELETE_DEPARTMENT';
ALTER TYPE "ActivityAction" ADD VALUE 'ADD_DEPARTMENT_MEMBER';
ALTER TYPE "ActivityAction" ADD VALUE 'REMOVE_DEPARTMENT_MEMBER';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_DEPARTMENT_MEMBER';
ALTER TYPE "ActivityAction" ADD VALUE 'GRANT_DEPARTMENT_ACCESS';
ALTER TYPE "ActivityAction" ADD VALUE 'REVOKE_DEPARTMENT_ACCESS';
