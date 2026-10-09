import { prisma } from "@/lib/prisma";
import { getEventEnd } from "@/lib/event";
import {
  bonusClosesAt,
  bonusPhase,
  DEFAULT_BONUS_SETTINGS,
  type BonusPhase,
  type BonusSettings,
} from "@/lib/bonus";

const SETTINGS_ID = 1;

/** The bonus window as the host left it, or the defaults until they touch it. */
export async function getBonusSettings(): Promise<BonusSettings> {
  const row = await prisma.eventSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return DEFAULT_BONUS_SETTINGS;
  return {
    startsAt: row.bonusStartsAt,
    endsAt: row.bonusEndsAt,
    override: row.bonusOverride,
    overrideAt: row.bonusOverrideAt,
    revealedAt: row.bonusRevealedAt,
  };
}

export async function saveBonusSettings(settings: BonusSettings) {
  const data = {
    bonusStartsAt: settings.startsAt,
    bonusEndsAt: settings.endsAt,
    bonusOverride: settings.override,
    bonusOverrideAt: settings.overrideAt,
    bonusRevealedAt: settings.revealedAt,
  };
  await prisma.eventSettings.upsert({ where: { id: SETTINGS_ID }, create: { id: SETTINGS_ID, ...data }, update: data });
}

export type BonusState = {
  settings: BonusSettings;
  eventEnd: Date | null;
  phase: BonusPhase;
  closesAt: Date | null;
};

/** Where the bonus track stands at `now` (server time). */
export async function getBonusState(now: number): Promise<BonusState> {
  const settings = await getBonusSettings();
  const eventEnd = getEventEnd();
  return {
    settings,
    eventEnd,
    phase: bonusPhase(settings, eventEnd, now),
    closesAt: bonusClosesAt(settings, eventEnd),
  };
}
