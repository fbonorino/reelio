# Reelio — Live Party Photo Sharing & Voting

Guests scan a QR code, upload photos/videos with no login, watch them appear live in a
shared feed, and like their favorites. The most-liked photo at the end of the night wins.

## Stack

- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + SQLite (metadata: photos, likes)
- Cloudinary (media storage/delivery, unsigned direct-from-browser uploads)
- SWR (polling-based live feed), sonner (toasts), lucide-react (icons)

## Setup

1. Install dependencies (already done if you're reading this after scaffold):

   ```bash
   npm install
   ```

2. **Create a Cloudinary account** (free tier is plenty for one event) at
   https://cloudinary.com and grab your Cloud Name, API Key, and API Secret from the
   dashboard.

3. **Create an unsigned upload preset** (required so guest browsers can upload directly
   to Cloudinary without a signed request):
   - Cloudinary Dashboard → Settings → Upload → Upload presets → Add upload preset
   - Set **Signing Mode** to `Unsigned`
   - Optionally restrict allowed formats / set a folder name
   - Save and copy the preset name

4. Fill in `.env`:

   ```bash
   DATABASE_URL="file:./dev.db"

   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"

   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your-unsigned-preset-name"

   NEXT_PUBLIC_EVENT_NAME="Jane & Sam's Wedding"
   HOST_SECRET="pick-a-long-random-string"
   ```

5. Run migrations and start the dev server:

   ```bash
   npm run db:migrate
   npm run dev
   ```

## Pages

- `/` — the guest-facing app: upload button, live feed (polls every 4s), "Top photos"
  leaderboard tab, tap-to-open lightbox, like/unlike with device-based dedup
  (no login — a random ID is stored in `localStorage`).
- `/host?key=YOUR_HOST_SECRET` — hidden moderation view with a delete button on every
  photo. Share this link only with yourself/co-hosts.

## Deploying for the night of

- Deploy to Vercel (or any Next.js host) and point a QR code at the production URL.
- SQLite is fine for a single-event, single-instance deployment — if you deploy to a
  platform with an ephemeral filesystem (like Vercel's default), swap `DATABASE_URL`
  for a hosted Postgres/SQLite-compatible database (e.g. Turso, Neon) before the event
  so photo metadata survives redeploys/restarts. Cloudinary media itself is durable
  regardless.
