# FunGPT 26.11 🤖

The most generic AI model on the market, and it needs everyone's data. A Halloween costume companion app.

| Route       | Who                     | What                                                                                                                                                      |
| ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`         | Front QR · "Help train me!" | Reverse ChatGPT: the model asks, guests confess. Text, photos, voice notes, any file. Replies stream in with fake citations and a redacted teaser of someone else's secret. |
| `/agi`      | Back QR · "How close are we to AGI?" | Live percentage counter with ominous status lines. At 100% it glitches, announces itself, and turns into a shuffled, anonymous feed of everything. |
| `/operator` | You                     | Password-protected. Read everything live, mark stories as told, hide anything nasty, adjust the AGI target, trigger or undo the reveal, announce the awards, wipe all data. |

## The model's personality (no real AI, nothing leaves the server)

Everything is hand-written lines, word lists and templates in `app/utils/replies.ts`.

- **Openers fit the input:** "What a great secret!", "What a great photo!"; only real questions (ending in `?`) get "What a great question!" plus a confident, wrong answer.
- **Read-back:** it summarises your secret slightly wrong ("you high-fived your pen pal's brother…").
- **Keyword reactions:** mention your ex, boss, mom, pet… and it reacts.
- **Drift:** the more the counter climbs, the stranger it gets: asides, weirder sources, typos, then CAPS.
- **Version bumps:** every entry bumps `26.11.N`; patch notes quote a safe word from an *older* secret, never the one just sent.
- **Ends with a 💡 secret idea**, never a question, so every entry makes sense on its own in the feed.

## Secret Awards

After the reveal, every post in the feed takes reactions: a quick row of favourites, or the full emoji picker (every emoji, search, skin tones; data is bundled, no CDN). One of each emoji per phone, tap again to undo. The reveal itself tells everyone to react to their favourites.

You run the ceremony from `/operator`:

1. **Pick awards:** every emoji people used shows up with how often and who's leading. Tap **＋ Award**. "Most reactions overall" is a candidate too.
2. **Name and order them:** tap a title to rename it, drag ⠿ to reorder. **The last one is the grand finale.**
3. **Reveal them one by one:** hold the reveal button until its ring fills to play a full-screen animation on every open feed (spotlight, emoji drop, gold title, drumroll, golden envelope, confetti). The finale gets velvet curtains, a longer build-up, fireworks and triple confetti, and stays as a big gold card at the top of the feed. Triggering AGI manually uses the same hold-to-confirm interaction. Hold buttons also support holding Space or Enter with the keyboard; letting go early cancels.

The winner is frozen the moment an award is revealed, so late reactions can't change what you've read out. **Undo** and **Reset** are there if you tap too early.

## How the AGI counter works

- Every entry moves it toward a target (default **40**, change it live in `/operator`).
- It's eased: early entries jump, the last few crawl through 97… 98… 99.x.
- Before reveal, progress follows the current target in both directions: raising the target lowers the percentage; lowering it increases the percentage. Once revealed, it stays at 100% until you use **Un-reveal**.
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
