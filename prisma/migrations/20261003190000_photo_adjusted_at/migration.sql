-- When the host last invalidated or restored the photo. Null for photos never adjusted.
ALTER TABLE "Photo" ADD COLUMN "adjustedAt" TIMESTAMP(3);
