-- AlterTable
ALTER TABLE "PasswordShare" ADD COLUMN     "encryptedItemKey" TEXT;

-- CreateTable
CREATE TABLE "UserKeyPair" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedPrivateKey" JSONB NOT NULL,
    "publicKey" JSONB NOT NULL,
    "salt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKeyPair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserKeyPair_userId_key" ON "UserKeyPair"("userId");

-- AddForeignKey
ALTER TABLE "UserKeyPair" ADD CONSTRAINT "UserKeyPair_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
