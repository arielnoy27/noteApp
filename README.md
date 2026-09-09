# Notes

A simple, private notes app built with plain HTML, CSS, and JavaScript — no frameworks, no build step. It's also an installable PWA (see below), which does need real hosting.

## Run it

Just open `index.html` in any modern browser (double-click it, or drag it into a browser tab). To run it as a local "site" instead of a `file://` page, you can also serve the folder:

```bash
cd notes-app
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Installing it as an app (PWA)

The app ships with everything a browser needs to treat it as an installable Progressive Web App — `manifest.webmanifest`, `sw.js` (a service worker that caches the whole app for offline use), and an `icons/` set generated from the same Notes icon used inside the app.

The one thing that can't be skipped: **it has to be served over `https://`** (or `http://localhost` on the same device) for a phone's browser to offer installing it. Opening `index.html` straight from a file, or from a plain `http://` address on your local network, will run the app fine but Chrome won't offer the install option — that's a security rule browsers enforce for every PWA, not something specific to this app. A few easy ways to get it onto `https://` with zero backend needed, since it's just static files:

- **Netlify Drop** (`app.netlify.com/drop`) — drag the whole `notes-app` folder onto the page, get a live `https://` URL in seconds, no account required for a quick one.
- **GitHub Pages** — push the folder to a GitHub repo and turn on Pages in its settings; free, and the URL stays stable long-term.
- **Vercel** or **Cloudflare Pages** — similar drag-and-drop or git-based static hosting, also free.

Once it's live on an `https://` URL, install it on Android:

1. Open that URL in Chrome on the phone.
2. Chrome shows an **Install** prompt (or tap the **⋮** menu → **Install app** / **Add to Home screen**).
3. Confirm — it installs with the red Notes icon, runs in its own window with no address bar, and behaves like any other installed app from then on (including working offline, since the service worker caches everything on first load).

If you ever change the app's files after it's installed, bump `CACHE_NAME` at the top of `sw.js` (e.g. `notes-app-v3`) — that's what tells an already-installed copy to fetch the new version instead of serving the cached one forever.

Two things are handled automatically so the installed app looks right on a real phone, whatever its screen shape:

- **The system status bar** stays plain black while the intro screen or the phone-screenshot pages are showing (matching the blacked-out status-bar strip baked into `icons1/2/3.png`, so the phone's own live clock/battery reads naturally on top of it), then switches to match the notes app's own background — light or dark — the instant the app actually opens, and switches back to black when you return to the intro screen. This is driven by JS updating the `theme-color` meta tag at each transition, not a fixed color.
- **The phone-screenshot pages fill the screen edge-to-edge** on any device, cropping in slightly on whichever dimension doesn't match the screenshots' own 1080×2340 shape rather than leaving black letterboxing bars — the same way a photo app "fills" a screen instead of "fitting" it. Because that crop shifts each icon's on-screen position slightly depending on the device's exact aspect ratio, the invisible tap zones aren't fixed percentages: they're recalculated to match the crop every time the app loads and whenever the window resizes.

## Features

- Create, edit, and delete notes with a rich-ish text editor (bold, italic, underline, bullet/numbered lists)
- Tag notes and filter by tag from the sidebar
- Full-text search across titles, content, and tags
- Pin important notes to the top of the list
- Light/dark theme toggle (remembers your choice, respects system preference on first load)
- Autosaves as you type — everything is stored in your browser's `localStorage`, nothing leaves your machine
- Export all notes to a JSON file, and import them back in (handy for backups or moving to another browser)
- Responsive layout with a collapsible sidebar on mobile

## Keyboard shortcuts

- `Ctrl/Cmd + N` — new note
- `Ctrl/Cmd + F` — jump to search

## Force lists

Opening the app leads to an intro screen with a "Force a Number" button. From there it goes to a full-screen sequence of three pages that look exactly like real phone home screens — no numbers, no visible buttons, nothing added on top.

Under the hood each page is actually two image layers, not one flat photo. A single stationary wallpaper image sits underneath and never moves. On top of it, each of the three home-screen pages is its own image with that same wallpaper knocked out to transparent — leaving just the icons, the weather widget, the search bar, the dots — so swiping between them looks exactly like a real home-screen swipe: the icons glide across a background that stays put, instead of the whole photo (wallpaper included) shifting together. The status bar (clock/battery) is also removed from every layer, so nothing showing a stale time or battery level is ever displayed.

Pages 1 and 2 each have ten invisible tap zones sitting over specific app icons, standing in for the digits 0–9. Digits 1–9 sit in the same 3×3 block on both pages; 0 sits just to their left, over the very first icon in that row:

- **Page 1** (main screen, weather widget): Claude=0, DeepSeek=1, Gemini=2, ChatGPT=3, Clock=4, Gallery=5, WhatsApp=6, Translate=7, Calculator=8, Play Store=9.
- **Page 2** (Amazon/bit/Udemy screen): Notes=0, Calendar=1, Spotify=2, Flic=3, Tfilon=4, Moovit=5, egg=6, Bank Hapoalim=7, Microsoft=8, PalGate=9.

Page 3 is different: it doesn't capture a digit at all — by the time you reach it, the number is already forced. It's just a real-looking last home screen, and among its icons is a **Notes** app. A plain tap on that icon (not a swipe — the same way you'd tap open any app) is what actually opens it — and it opens the way a real app does: it pops out and grows from the icon you tapped until it fills the screen, rather than sliding in from the side.

The gesture through pages 1 and 2 is a single natural motion — touch down on an icon, then drag left, like flicking to the next home screen — and it visually tracks your finger the whole way, exactly like swiping between real home screens: the icons slide with the pointer in real time, eases the rest of the way in if you carry it far enough, or eases back if you don't, while the wallpaper underneath stays fixed the whole time. Wherever the touch started is the digit that gets pressed, captured the instant the drag commits: press+drag left on page 1 past the halfway point records the first digit and slides the rest of the way into page 2; press+drag left on page 2 records the second digit, combines it with the first into the forced number, applies it to every force list immediately, and slides the rest of the way into page 3 — where tapping the Notes icon opens the app. A plain tap on a digit zone (no drag) also silently records its digit without moving on, in case you want to settle on an icon before committing to the swipe.

Dragging right backs out a step, the same live-tracking way, and each step back un-does exactly the capture tied to the page you're leaving: page 1 back out to the intro screen cancels the whole capture; page 2 back to page 1 drops both digits so they can be redone from scratch; page 3 back to page 2 reverts the force that was just applied back to every list's saved order and drops the second digit only, keeping the first one so you don't have to redo that part.

Any note tagged **force** is a force list: a plain line-by-line list whose *last* line is the item that gets forced. The instant both digits are captured (the moment the second press+swipe completes), the same swap is applied to **every** force-tagged note in the app at once — each one swaps its own position N with its own last line, independently. Entering 57 opens up Israel in Countries and whatever's at position 57 in Foods simultaneously; you don't need to open each list for its swap to happen.

If each line starts with a number (`57. Israel`), only the *name* after the number swaps — the numbering itself never moves. So forcing 57 turns line 57 into `57. Israel`, not `100. Israel`; line 100 becomes `100. <whatever used to be at 57>`. Lines with no leading number just swap whole, so unnumbered force lists still work the same as before. A force list shorter than the captured number (fewer than N lines) is silently skipped — nothing breaks, it just isn't affected by that particular number.

Every force list has a **saved order** — whatever you last typed into it yourself and let autosave, or the shipped default if you've never touched it. Forcing a number never changes that saved order; it only changes what's currently *showing*, as a temporary detour on top of it. If you want the saved order itself to change, just edit the list the normal way (retype it, reorder lines, whatever) and let it autosave like any other note — that new text becomes the saved order from then on, force or no force.

Pressing the **logo** on the note page returns to the intro screen, resets the captured number, *and* resets every force list back to its saved order — regardless of how it got to its current state, whether that's one swap, several, or nothing at all. So if you never touched a list's text yourself, the logo undoes the swap; if you *did* edit and save it, the logo brings back your edited version, not the original shipped list.

Two ready-made examples ship with the app, both tagged `force` and numbered 1–100: **Countries** (Israel at line 100) and **Foods** (Pizza at line 100). Enter 57 and both lists react to the same number, each against its own content.

To build your own: create a note, type one item per line (numbered or not), tag it `force`, and put your target item last — it'll automatically join in on every future capture alongside Countries and Foods. Force-list notes store as plain text rather than rich formatting, so bold/italic/lists won't be preserved on these specific notes — keep them simple.

The `force` tag itself never shows up anywhere in the sidebar — not as a mini-tag on the note in the list, not in the tag filter row — so a force list looks exactly like any other list at a glance. It's still there under the hood (that's what actually marks a note as a force list), so it still shows up in the **tags** field if you open that note to edit it directly — that's the one place you'd manage it.

## Files

- `index.html` — page structure
- `style.css` — all styling, including the light/dark theme variables
- `script.js` — app logic (storage, rendering, editing, search, import/export, service worker registration)
- `images/` — `wallpaper.png` (the stationary background), `icons1.png` / `icons2.png` / `icons3.png` (the three home-screen pages, icons only, transparent everywhere else), and `app-logo.png` (the Notes icon, also used as the sidebar's brand logo)
- `manifest.webmanifest` — the PWA manifest (name, icons, colors, standalone display mode)
- `sw.js` — the service worker that caches the app shell for offline use once installed
- `icons/` — the manifest/favicon/apple-touch icon set, all generated from `images/app-logo.png`

## Notes on data

Notes are stored under the `notes-app.notes` key in `localStorage`, scoped to whatever origin you open the file from. If you open it via `file://`, your data stays tied to that local file context in your browser. If you want your notes to persist reliably and be portable, use **Export** occasionally to save a JSON backup.
