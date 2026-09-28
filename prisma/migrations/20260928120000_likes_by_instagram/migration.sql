-- Likes were keyed by device id and carry no handle, so they can't be migrated: drop them
-- and reset the denormalized counters to match.
DELETE FROM "Like";
UPDATE "Photo" SET "likeCount" = 0;

-- DropIndex
DROP INDEX "Like_photoId_deviceId_key";

-- AlterTable
ALTER TABLE "Like" DROP COLUMN "deviceId",
ADD COLUMN     "instagram" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Like_instagram_idx" ON "Like"("instagram");

-- CreateIndex
CREATE UNIQUE INDEX "Like_photoId_instagram_key" ON "Like"("photoId", "instagram");
