-- AlterTable
ALTER TABLE "PasswordEntry" ADD COLUMN     "isAtRisk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isOld" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isWeak" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "lastViewedAt" TIMESTAMP(3),
ADD COLUMN     "strengthScore" INTEGER;
