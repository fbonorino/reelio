/**
 * Loads the initial bonus track challenges. Idempotent: skips any that already exist (same text,
 * still in the game), so running it twice changes nothing. Points are the BASE: guests see and
 * score them times BONUS_MULTIPLIER (15 → 30, 20 → 40, 25 → 50).
 *
 *   DATABASE_URL="postgresql://…" npm run db:seed-bonus
 *
 * Prints which database it's about to write to. It's the one in DATABASE_URL (or .env), so check
 * before running it against production; the same challenges can also be added by hand from /host.
 */
import { PrismaClient } from "@prisma/client";

const BONUS_CHALLENGES = [
  { label: "Foto con el más lindx de la noche", points: 15 },
  { label: "Foto con tu chamuyo de la noche", points: 20 },
  { label: "Foto pico con alguien", points: 25 },
];

const prisma = new PrismaClient();

async function main() {
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").host || "(sin host)";
    } catch {
      return "(DATABASE_URL inválida)";
    }
  })();
  console.log(`Base de datos: ${host}`);

  for (const { label, points } of BONUS_CHALLENGES) {
    const existing = await prisma.challenge.findFirst({ where: { label, isBonus: true, retired: false } });
    if (existing) {
      console.log(`  ya existe: ${label}`);
      continue;
    }
    const last = await prisma.challenge.aggregate({ where: { isBonus: true }, _max: { position: true } });
    await prisma.challenge.create({
      data: { label, points, isBonus: true, position: (last._max.position ?? -1) + 1 },
    });
    console.log(`  creada:    ${label} (base ${points})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
