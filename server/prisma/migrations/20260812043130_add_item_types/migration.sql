-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('LOGIN', 'CARD', 'BANK_ACCOUNT', 'IDENTITY', 'SECURE_NOTE');

-- AlterTable
ALTER TABLE "PasswordEntry" ADD COLUMN     "encryptedFields" TEXT,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "type" "ItemType" NOT NULL DEFAULT 'LOGIN';

-- CreateIndex
CREATE INDEX "PasswordEntry_parentId_idx" ON "PasswordEntry"("parentId");

-- AddForeignKey
ALTER TABLE "PasswordEntry" ADD CONSTRAINT "PasswordEntry_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PasswordEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
