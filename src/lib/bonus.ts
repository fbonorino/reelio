/**
 * Bonus track: a time window with secret extra challenges worth BONUS_MULTIPLIER times their points.
 * Pure functions with the current time passed in, shared by the API routes, the client and the tests.
 */

/** Bonus challenges score their base points times this. Likes still add POINTS_PER_LIKE, unmultiplied. */
export const BONUS_MULTIPLIER = 2;

/** Bonus photos each guest can upload, on top of (and not counting against) MAX_PHOTOS_PER_USER. */
export const BONUS_EXTRA_PHOTOS = 3;

/** An upload that started while the window was open is still accepted this long after it closes. */
export const BONUS_GRACE_MS = 60_000;

/** How old the "upload started" ticket can be: covers a slow video upload over the club's signal. */
export const BONUS_TICKET_MAX_AGE_MS = 15 * 60_000;

/** Shown with the bonus challenges and on the upload screen when one is picked. */
export const BONUS_CONSENT = "Siempre con el OK de los que salen en la foto";

/** Sunday 11/10/2026, 3:00 to 4:00 in Buenos Aires (UTC-3). */
export const DEFAULT_BONUS_STARTS_AT = new Date("2026-10-11T03:00:00-03:00");
export const DEFAULT_BONUS_ENDS_AT = new Date("2026-10-11T04:00:00-03:00");

export type BonusOverride = "AUTO" | "OPEN" | "CLOSED";

/** "before": secret, only a teaser. "open": pickable. "closed": visible but disabled. */
export type BonusPhase = "before" | "open" | "closed";

export type BonusSettings = {
  startsAt: Date;
  endsAt: Date;
  override: BonusOverride;
  /** When `override` last changed. */
  overrideAt: Date | null;
  /** First time the host forced it open: the challenges are public from then on. */
  revealedAt: Date | null;
};

export const DEFAULT_BONUS_SETTINGS: BonusSettings = {
  startsAt: DEFAULT_BONUS_STARTS_AT,
  endsAt: DEFAULT_BONUS_ENDS_AT,
  override: "AUTO",
  overrideAt: null,
  revealedAt: null,
};

/** The window's scheduled end, never past the game's close. */
export function bonusEndsAt(settings: BonusSettings, eventEnd: Date | null): Date {
  return eventEnd && eventEnd < settings.endsAt ? eventEnd : settings.endsAt;
}

export function bonusPhase(settings: BonusSettings, eventEnd: Date | null, now: number): BonusPhase {
  const gameOver = eventEnd !== null && now >= eventEnd.getTime();
  if (settings.override === "OPEN" && !gameOver) return "open";
  // Secret until it opens on schedule or the host forces it open, whatever else happened.
  const revealed = now >= settings.startsAt.getTime() || settings.revealedAt !== null;
  if (!revealed) return "before";
  if (settings.override === "CLOSED" || gameOver) return "closed";
  return now < bonusEndsAt(settings, eventEnd).getTime() ? "open" : "closed";
}

/**
 * When the window closes (or closed): what the guests' countdown runs to, and where the upload
 * grace period starts. Null when nothing will close it (forced open with no game close set).
 */
export function bonusClosesAt(settings: BonusSettings, eventEnd: Date | null): Date | null {
  switch (settings.override) {
    case "OPEN":
      return eventEnd;
    case "CLOSED":
      return settings.overrideAt ?? settings.startsAt;
    case "AUTO":
      return bonusEndsAt(settings, eventEnd);
  }
}

/**
 * Whether a bonus upload can be saved at `now` (server time). `ticketIssuedAt` is the server time
 * the guest's upload started, from a signed ticket (see bonus-ticket.ts), or null without one.
 * `late` marks an upload let in by the grace period after the close.
 */
export function checkBonusWindow(
  settings: BonusSettings,
  eventEnd: Date | null,
  now: number,
  ticketIssuedAt: number | null
): { ok: true; late: boolean } | { ok: false; error: string; hidden: boolean } {
  const phase = bonusPhase(settings, eventEnd, now);
  if (phase === "open") return { ok: true, late: false };
  // `hidden`: answer exactly as for an id that doesn't exist, so nothing leaks before it opens.
  if (phase === "before") return { ok: false, error: "Esa consigna ya no está, elegí otra", hidden: true };

  const closesAt = bonusClosesAt(settings, eventEnd)?.getTime();
  if (
    closesAt !== undefined &&
    ticketIssuedAt !== null &&
    ticketIssuedAt < closesAt &&
    now - ticketIssuedAt <= BONUS_TICKET_MAX_AGE_MS &&
    now - closesAt <= BONUS_GRACE_MS
  ) {
    return { ok: true, late: true };
  }
  return { ok: false, error: "El bonus track ya cerró: esta consigna no se puede subir más", hidden: false };
}

/** Points a photo for this challenge is worth, before likes. The host types the base. */
export function effectivePoints(challenge: { points: number; isBonus: boolean }) {
  return challenge.isBonus ? challenge.points * BONUS_MULTIPLIER : challenge.points;
}

/** A challenge as guests get it: bonus ones with their points already multiplied. */
export type GuestChallenge = { id: string; label: string; points: number; bonus: boolean };

/**
 * What /api/challenges sends guests. Before the window opens the bonus list is empty, so neither
 * the ids nor the texts of the bonus challenges reach a phone.
 */
export function guestChallenges(
  challenges: { id: string; label: string; points: number }[],
  bonusChallenges: { id: string; label: string; points: number }[],
  phase: BonusPhase
): { challenges: GuestChallenge[]; bonus: GuestChallenge[] } {
  return {
    challenges: challenges.map((c) => ({ ...c, bonus: false })),
    bonus:
      phase === "before"
        ? []
        : bonusChallenges.map((c) => ({ ...c, points: effectivePoints({ ...c, isBonus: true }), bonus: true })),
  };
}

const BA_TIME = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "3:00", in Buenos Aires time whatever the phone's time zone. */
export function formatBonusTime(date: Date | number) {
  const parts = BA_TIME.formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${Number(part("hour"))}:${part("minute")}`;
}

/** "12:05" / "1:02:05" until `target`, from server time. */
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

/** What /api/event-status returns. */
export type EventStatus = {
  phase: BonusPhase;
  /** Server clock, ms: the countdowns run off this, never off the phone's clock. */
  serverNow: number;
  startsAt: string;
  /** ISO, or null when nothing will close the window. */
  closesAt: string | null;
  multiplier: number;
};
