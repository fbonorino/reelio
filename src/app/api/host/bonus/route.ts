import { NextRequest, NextResponse } from "next/server";
import { isHost } from "@/lib/host";
import { getPublicAppUrl } from "@/lib/public-url";
import { BONUS_MULTIPLIER, bonusEndsAt, type BonusOverride } from "@/lib/bonus";
import { getBonusState, saveBonusSettings } from "@/lib/bonus-db";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const OVERRIDES: BonusOverride[] = ["AUTO", "OPEN", "CLOSED"];

/** Host-only: the bonus window, its override and where it stands now, plus the link for the WhatsApp messages. */
export async function GET(request: NextRequest) {
  if (!isHost(request)) return unauthorized();

  const now = Date.now();
  const { settings, eventEnd, phase, closesAt } = await getBonusState(now);
  const publicUrl = getPublicAppUrl();
  return NextResponse.json(
    {
      serverNow: now,
      phase,
      startsAt: settings.startsAt.toISOString(),
      endsAt: settings.endsAt.toISOString(),
      // What actually applies once capped at the game's close.
      effectiveEndsAt: bonusEndsAt(settings, eventEnd).toISOString(),
      closesAt: closesAt?.toISOString() ?? null,
      eventEnd: eventEnd?.toISOString() ?? null,
      override: settings.override,
      overrideAt: settings.overrideAt?.toISOString() ?? null,
      multiplier: BONUS_MULTIPLIER,
      publicUrl: "url" in publicUrl ? publicUrl.url : null,
      publicUrlError: "error" in publicUrl ? publicUrl.error : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

function parseDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Host-only: `{ startsAt?, endsAt? }` (ISO with offset; stored in UTC) and/or `{ override? }`.
 * The end can't be before the start nor past the game's close.
 */
export async function PUT(request: NextRequest) {
  if (!isHost(request)) return unauthorized();

  const body = (await request.json().catch(() => null)) ?? {};
  const now = Date.now();
  const { settings, eventEnd } = await getBonusState(now);
  const next = { ...settings };

  if (body.startsAt !== undefined || body.endsAt !== undefined) {
    const startsAt = body.startsAt === undefined ? settings.startsAt : parseDate(body.startsAt);
    const endsAt = body.endsAt === undefined ? settings.endsAt : parseDate(body.endsAt);
    if (!startsAt || !endsAt) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    if (endsAt <= startsAt) {
      return NextResponse.json({ error: "El cierre tiene que ser después de la apertura" }, { status: 400 });
    }
    if (eventEnd && endsAt > eventEnd) {
      return NextResponse.json(
        { error: "El bonus no puede cerrar después del cierre del juego" },
        { status: 400 }
      );
    }
    next.startsAt = startsAt;
    next.endsAt = endsAt;
  }

  if (body.override !== undefined) {
    if (!OVERRIDES.includes(body.override)) {
      return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
    }
    if (body.override !== settings.override) {
      next.override = body.override;
      next.overrideAt = new Date(now);
      // Forcing it open makes the challenges public for good: closing it again doesn't un-reveal them.
      if (body.override === "OPEN") next.revealedAt ??= new Date(now);
    }
  }

  await saveBonusSettings(next);
  return NextResponse.json({ success: true });
}
