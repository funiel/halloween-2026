# FunGPT 26.11 🤖

The most generic AI model on the market, and it needs everyone's data. A Halloween costume companion app.

| Route       | Who                     | What                                                                                                                                                      |
| ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`         | Front QR · "Help train me!" | Reverse ChatGPT: the model asks, guests confess. Text, photos, voice notes, any file. Replies stream in with fake citations and a redacted teaser of someone else's secret. |
| `/agi`      | Back QR · "How close are we to AGI?" | Live percentage counter with ominous status lines. At 100% it glitches, announces itself, and turns into a shuffled, anonymous feed of everything. |
| `/operator` | You                     | Password-protected. Read everything live, mark stories as told, hide anything nasty, adjust the AGI target, trigger or undo the reveal, wipe all data.    |

## How the AGI counter works

- Every entry moves it toward a target (default **40**, change it live in `/operator`).
- It's eased: early entries jump, the last few crawl through 97… 98… 99.x.
- It never goes backwards, even if you raise the target. It just stalls.
- Reaching the target reveals the feed for everyone who has `/agi` open. Nothing is readable through the API before that.
- Hidden entries still count toward AGI but never show up in the feed or in teasers.

## Privacy, for real

- No accounts, names, cookies for guests, or stored IPs. The submit cooldown (4 s) only keeps IPs in memory.
- Photos are re-encoded in the browser (EXIF/GPS gone). The server additionally strips JPEG/PNG metadata and zeroes the GPS location in videos and audio.
- Uploads are served sandboxed, and anything that isn't an image, audio or video file is download-only, so an uploaded HTML file can't run on anyone's phone.
- The Terms of Service contain an honest §47 that says all of the above, including that entries may be shown anonymously later.
- After the party: `/operator`, then Danger zone, then type `WIPE`. Or delete the volume.

## Development

```bash
bun install
echo "NUXT_OPERATOR_PASSWORD=spooky" > .env
bun run dev            # http://localhost:3000
```

Data goes to `.data/fungpt/` (gitignored). Voice notes need HTTPS or `localhost`.

## Deploy on Coolify

1. **New resource → Public/Private repository** → pick this repo. Build pack: **Dockerfile**.
2. **Port:** `3000`. Set your domain, e.g. `https://fungpt.example.com`. Coolify handles HTTPS.
3. **Environment variables:**
   - `NUXT_OPERATOR_PASSWORD`: something long
   - `NUXT_AGI_TARGET`: optional, default `40`
4. **Persistent storage:** add a volume mounted at **`/data`**. Without it, every redeploy wipes all secrets.
5. Deploy, then open `/operator` once to make sure the password works.
6. Make the QR codes: front → `https://your-domain/`, back → `https://your-domain/agi`.

### Party checklist

- [ ] Test both QR codes on a phone **on mobile data**, not your Wi-Fi.
- [ ] Record a voice note on an iPhone and an Android, then check it plays in `/operator`.
- [ ] Wipe the test entries before the party (`/operator` → Danger zone).
- [ ] Log in to `/operator` on your phone and add it to your home screen.
- [ ] Decide on the target: ~1.3 × guests is a good start; tune it live.
