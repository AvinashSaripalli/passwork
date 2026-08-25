-- AlterTable
ALTER TABLE "PasswordShare" ADD COLUMN     "reEncryptedFields" TEXT,
ADD COLUMN     "reEncryptedNote" TEXT,
ADD COLUMN     "reEncryptedPassword" TEXT;
