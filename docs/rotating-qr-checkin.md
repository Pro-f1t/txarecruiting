# Rotating QR check-in — design & runbook

**Status:** planned, not built. Written 2026-09-01.
**Project:** Project03 - Texas Accelerate Recruiting

---

## Problem

Today `/admin/attendance` renders one static QR per event pointing at
`/checkin/<eventId>`, and that page records attendance for whoever is signed in.
The URL never changes, so a single screenshot in a group chat checks in people
who never came to the event.

Goal: a QR that rotates every ~5 seconds (the Convergent pattern), so a
screenshot is worthless seconds later.

---

## Design

### Three tiers

| Tier | Mechanism | When it's used |
|---|---|---|
| 1 | Rotating QR on a live display page | Default, every event |
| 2 | Static QR from the admin console, **armed by an exec**, auto-expires 15 min | Wifi dies / laptop dies |
| 3 | Manual roster toggle in `AttendanceManager` | Dead phone, no camera |

Tier 2 is deliberately **break-glass, not always-on**. A permanently valid QR
would defeat the rotation entirely — one screenshot and Tier 1 becomes
decoration. The exec flips it on from their phone, it works exactly like today's
QR, and it closes itself.

### Token mechanics

Tokens are derived, not stored — no database, any instance can verify one:

```
bucket = floor(Date.now() / 5000)
token  = bucket + "." + HMAC_SHA256(CHECKIN_SECRET, eventId + ":" + bucket).slice(0,16)
```

Verification accepts the current bucket ±1, so any given code is valid for
**5–10 seconds**. Validation is entirely server-side; the scanner's phone clock
is irrelevant.

### The intermediate hop — why it exists

If the QR pointed straight at `/checkin/<id>?token=…`, a signed-out student
would scan, get bounced to Google login, spend 20 seconds picking an account,
and return with an expired token. Everyone not already logged in would fail.

So the token is **spent immediately** at a route that does nothing but verify
freshness and issue a longer-lived pass:

```
QR  →  /c/<eventId>/<token>      verify ±10s, set signed pass cookie, 302
    →  /auth/login?next=…         (only if signed out — the pass survives this)
    →  /checkin/<eventId>         requires the pass, then records attendance
```

The pass cookie is ~10 minutes and scoped to one event. Presence was proven in
the 10-second window; the login detour no longer races the clock.

**`/c/…` must be a Route Handler, not a page** — React Server Components cannot
set cookies.

### Route map

| Route | Type | Auth | Purpose |
|---|---|---|---|
| `/live/now` | page | `?k=DISPLAY_KEY` | Full-screen rotating QR + live counter |
| `/c/[eventId]/[token]` | route handler | none | Verify token, set pass, redirect |
| `/checkin/[eventId]` | page | session + pass | Record attendance (exists; needs pass check) |
| `/api/attendance/tokens` | route handler | `?k=DISPLAY_KEY` | Batch of pre-signed tokens |
| `/api/admin/attendance/backup` | route handler | `requireStaff` | Arm/disarm Tier 2 |

### `/live/now` resolves the event itself

Rather than one slide per event with three different links, the display page
picks the currently-live event from `startsAt` in `src/data/events.ts`
(startsAt − 30 min → startsAt + 90 min). One slide, one link, never edited, and
it is structurally impossible to check people into the wrong session. If nothing
is in window the page says so.

### Batched tokens, not 5-second polling

The display fetches ~60 pre-signed tokens covering the next 5 minutes in one
request (plus the server's `now`, so the client can correct clock offset), then
rotates locally. Requests drop from 1-per-5s to 1-per-5min, and — the real
win — **the display keeps rotating through a wifi dropout**. A lecture hall with
60 phones on one AP is exactly where a 5-second poll loop dies on stage. Also
sidesteps Vercel function-duration limits that an SSE stream would hit.

The check-in **counter** polls separately and slower (20–30s). It calls
`getAllUsers()`, which reads the entire users collection; at 5s intervals over a
90-minute event that's ~200k document reads for no perceptible benefit.

---

## Constraints found in the codebase

These are load-bearing. Changing them breaks the design.

1. **`src/proxy.ts` matcher is `["/dashboard/:path*", "/apply/:path*", "/admin/:path*", "/auth/login"]`.**
   - `/c/…` is **not** matched, which is the only reason the hop works — under a
     matched path the proxy would redirect a signed-out scanner to login
     *before* the route handler ran, and the token would die during the Google
     flow.
   - `/live/…` must likewise stay **outside `/admin/`**, or the AV laptop with no
     session gets bounced to login.
   - (Unrelated: the comment on line 21 references `/attend/…`, a route that
     doesn't exist. Stale.)

2. **`getBaseUrl()` prefers `VERCEL_PROJECT_PRODUCTION_URL`**, which Vercel sets
   on *every* deployment including previews. Preview deploys therefore emit QR
   codes pointing at **production**, which won't have `/c/` until promoted. Test
   on production, or set `NEXT_PUBLIC_SITE_URL` per environment.

3. **Two of the four check-in events have no projector** — Coffee Chat #1 (Gong
   Cha) and #2 (Lucky Lab). `/live/now` must work on a phone or iPad held at the
   table, not just a 4K projector.

4. **Google Slides cannot embed live web content.** No iframes, no add-in
   platform; `Insert → Image → By URL` copies the image once at insert time.
   Hence the hyperlinked slide below.

5. **Force the token routes dynamic** (`export const dynamic = "force-dynamic"`)
   or Vercel's CDN may cache a token response and freeze the QR on a dead code
   mid-event.

---

## Setup — once, ~20 minutes

**1. Generate two secrets.** Run twice:

```bash
openssl rand -hex 32
```

First → `CHECKIN_SECRET` (signs tokens). Second → `DISPLAY_KEY` (lets the AV
laptop display QR codes without logging in; display only, no roster access).

**2. Add three env vars** in Vercel → Settings → Environment Variables:

| Name | Value | Environments |
|---|---|---|
| `CHECKIN_SECRET` | first secret | Production, Preview |
| `DISPLAY_KEY` | second secret | Production, Preview |
| `NEXT_PUBLIC_SITE_URL` | the real domain | Production only |

**3. Deploy to production, open `/live/now?k=<DISPLAY_KEY>`.** Verify: QR swaps
every 5s with a timer bar; scanning it checks you in; scanning a 20-second-old
screenshot says "expired." That's the whole system tested in a minute.

**4. Build the deck slide** (Google Slides):
- New slide, blank layout
- `Insert → Shape → Rounded rectangle`, drag it to fill most of the slide
- Type `SCAN TO CHECK IN →`
- Select the shape, press **⌘K**, paste `https://<domain>/live/now?k=<DISPLAY_KEY>`, Apply

In presentation mode, clicking the shape opens the live QR in a new tab; Slides
keeps presenting in the original tab, so ⌘W returns you exactly where you were.

> ⚠️ The display key is visible to anyone with edit access to the deck. Keep the
> check-in slide in an **exec-only deck**, or rotate the key each semester. Worst
> case if leaked: someone can display a QR, not read applicant data.

**5. Dry-run steps 3–4 the day before Sep 1**, on the actual presenting laptop.

---

## Day-of runbook

### Info sessions — Sep 1 (PAI 2.48), Sep 7 (CAL 100), Sep 10 (virtual)

1. Before the room fills, click the check-in slide once to confirm the page
   loads on that wifi. Close the tab.
2. Present normally.
3. At the check-in moment: **click the panel** → new tab opens → press `F` for
   fullscreen.
4. Leave it up ~2 minutes. Call out the climbing counter — it makes people scan
   now rather than "later."
5. **⌘W** → back to the deck.

**If the page won't load:** open `/admin/attendance` on your phone, tap **Open
backup check-in** on that event's card, project or walk around the static QR. It
disarms itself after 15 minutes.

### Coffee chats — Sep 2 (Gong Cha), Sep 8 (Lucky Lab)

No deck. Open `/live/now?k=…` on a phone or iPad and prop it on the table. Same
page, same rotation.

---

## What an applicant experiences

Camera at the QR → tap the banner → browser opens.

| Situation | Result |
|---|---|
| Already signed in | "You're checked in ✓", ~1 second |
| Not signed in | Google sign-in → confirmation. Token was spent at scan time, so the login detour can take as long as it needs |
| Stale screenshot | "That code expired — scan the code on screen" |
| Opened inside Instagram/TikTok | Existing in-app-browser detection in `src/app/auth/login/page.tsx` tells them to open in Safari |

---

## Known limits

- **A live relay still works.** Someone can AirDrop a screenshot to a friend who
  scans within 10 seconds. No URL-based scheme fixes this; it raises the cost
  from "share once, works all night" to "coordinate in real time, repeatedly."
- **Tuning.** 5s rotate / ±1 bucket is the default. If phones focus slowly from
  the back of the room, 10s rotate / ±1 (10–20s valid) trades tightness for
  fewer "expired" complaints.
- **Secret leak** = anyone can mint tokens. Rotate `CHECKIN_SECRET` per season.

---

## Files to create / change

**New**
- `src/lib/attendance/token.ts` — mint/verify token + pass (node `crypto`, no new deps)
- `src/app/c/[eventId]/[token]/route.ts` — the intermediate hop
- `src/app/live/now/page.tsx` — full-screen rotating display
- `src/app/api/attendance/tokens/route.ts` — batched pre-signed tokens
- `src/app/api/admin/attendance/backup/route.ts` — arm/disarm Tier 2

**Changed**
- `src/app/checkin/[eventId]/page.tsx` — require a valid pass **or** armed backup
- `src/app/admin/attendance/page.tsx` — add the backup arm/disarm control
- `src/data/events.ts` — helper resolving the currently-live event
- `src/proxy.ts` — comment noting `/c/` and `/live/` must stay unmatched

**Projector QR settings** (differ from the desk-sized admin cards): `margin: 4`
not `1` — the white quiet zone is what lets a phone lock on from 40 feet. Keep
the `/c/` path short so the QR stays a low version with fat modules. Dark on
white, never on `#08050f`. No `DarkVeil` behind the live page — WebGL plus a
repaint loop on a shared AV laptop is asking for jank, and a moving background
hurts scan lock.
