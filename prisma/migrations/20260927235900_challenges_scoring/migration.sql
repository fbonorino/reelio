-- AlterTable
ALTER TABLE "Photo" DROP COLUMN "uploaderName",
ADD COLUMN     "challengeId" TEXT NOT NULL,
ADD COLUMN     "challengePoints" INTEGER NOT NULL,
ADD COLUMN     "instagram" TEXT NOT NULL,
ADD COLUMN     "invalidated" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Photo_instagram_idx" ON "Photo"("instagram");

