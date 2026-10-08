-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "retired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Challenge_retired_position_idx" ON "Challenge"("retired", "position");

-- Seed with the challenges that used to live in src/lib/challenges.ts, in the order guests saw
-- them (most points first). Same ids, so existing photos keep pointing at them.
INSERT INTO "Challenge" ("id", "label", "points", "position", "retired") VALUES
    ('colorado', 'Foto besándole la frente a un/a colorad@', 42, 0, false),
    ('propuesta', 'Foto propuesta de matrimonio', 32, 1, false),
    ('piso', 'Foto acostado en el piso del boliche', 28, 2, false),
    ('patova', 'Foto abrazando un patova', 22, 3, false),
    ('zapato', 'Foto con el zapato de un desconocido', 18, 4, false),
    ('desconocidas', 'Selfie con +5 desconocid@s', 14, 5, false),
    ('vaso', 'Foto haciendo equilibrio con un vaso en la cabeza', 10, 6, false),
    ('pelado', 'Foto con un pelado', 7, 7, false),
    ('chicle', 'Foto globo con chicle', 4, 8, false),
    ('dj', 'Foto con el DJ', 0, 9, true),
    ('cumpleanero', 'Foto con el cumpleañero', 0, 10, true),
    ('labios', 'Foto pintándose los labios', 0, 11, true);
