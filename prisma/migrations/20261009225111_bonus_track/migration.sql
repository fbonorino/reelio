-- CreateEnum
CREATE TYPE "BonusOverride" AS ENUM ('AUTO', 'OPEN', 'CLOSED');

-- DropIndex
DROP INDEX "Challenge_retired_position_idx";

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "isBonus" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "isBonus" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EventSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "bonusStartsAt" TIMESTAMP(3) NOT NULL,
    "bonusEndsAt" TIMESTAMP(3) NOT NULL,
    "bonusOverride" "BonusOverride" NOT NULL DEFAULT 'AUTO',
    "bonusOverrideAt" TIMESTAMP(3),
    "bonusRevealedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Challenge_isBonus_retired_position_idx" ON "Challenge"("isBonus", "retired", "position");
