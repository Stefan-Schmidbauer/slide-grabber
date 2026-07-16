# Chrome Web Store Submission — SlideGrabber

This file contains the text and justifications to paste into the Chrome Web
Store Developer Dashboard when publishing SlideGrabber. It is documentation for
the submitter and is not shipped as part of the extension's runtime.

Every block meant for the dashboard is in a fenced code block and is verbatim
paste-ready: no quote markers, no line wrapping — copy the whole block as is.

---

## Store listing

**Name:** SlideGrabber

**Category:** Productivity

**Summary (short description, max 132 characters):**

```text
Capture a series of screenshots of the current tab, auto-advance the page, and save the images (optionally cropped) locally.
```

**Detailed description:**

```text
SlideGrabber turns any tab into a series of saved images. Set how many screenshots to take, pick the key used to advance the page (spacebar, arrow keys, Page Down, and more), and SlideGrabber captures the visible tab, presses the key, waits, and repeats — automatically saving each frame to your Downloads folder.

Ideal for turning slide decks, flip-book style presentations, or any key-navigated content into an ordered set of PNG or JPG files.

Features:
• Automatic capture loop with a configurable maximum number of shots
• Optional auto-stop when the page stops changing, so a run ends by itself at the end of a deck instead of guessing the exact count
• Choose the advance key (spacebar, Page Up/Down, arrow keys, Enter)
• Configurable delay between shots so the page has time to change
• Optional startup delay so you can focus the right tab first
• Crop the edges of every screenshot — drag the crop lines visually on a live preview
• PNG or JPG output, with a text/image quality mode for JPG
• Sequentially numbered files saved into a subfolder of your Downloads

Privacy first: SlideGrabber collects no data, uses no analytics, and never sends anything to any server. Every image is written straight to your local Downloads folder.
```

**Privacy policy URL:**

```text
https://github.com/Stefan-Schmidbauer/slide-grabber/blob/main/PRIVACY.md
```

The repo is public, so this resolves for reviewers and users — it is the same URL
the About dialog's Privacy link uses. GitHub Pages serves from the repo root, so
`…github.io/slide-grabber/PRIVACY.md` would also resolve, but as raw Markdown
rather than a rendered page; prefer the blob URL above.

---

## Single purpose (required field)

```text
SlideGrabber captures a series of screenshots of the user's active browser tab, advancing the page with a key press between shots, and saves the resulting images to the local Downloads folder.
```

---

## Permission justifications

Paste each justification into the matching field in the dashboard. The blocks are
in the order the dashboard shows the fields (which follows `permissions` in
[manifest.json](manifest.json)).

### `sidePanel`

```text
The entire user interface of the extension is presented in Chrome's side panel, where the user configures and starts/stops a capture run.
```

### `tabs`

```text
Required to identify the active tab and its window so the extension can capture the correct visible tab (chrome.tabs.captureVisibleTab) and target the correct tab for the advance key press. The extension does not read tab URLs or history for any other purpose.
```

### `downloads`

```text
Required to save each captured screenshot as an image file (PNG or JPG) into a subfolder of the user's Downloads folder. This is the extension's core output mechanism. No other use is made of the downloads permission.
```

### `debugger`

```text
The extension uses the chrome.debugger API to dispatch a single real key press (e.g. spacebar or arrow key) to the active tab between screenshots. This is the only reliable way to advance key-navigated content such as slide decks, because synthetic events injected through a content script are marked untrusted and are ignored by most presentation viewers. The debugger is attached only to the tab the user is capturing, only while a capture run is active, and is detached as soon as the run stops. It is never used to inspect, read, or modify page content.
```

### `storage`

```text
Used to remember the user's own settings (file name, target subfolder, format, crop values, delays, chosen advance key) locally between sessions via chrome.storage.local. No data is transmitted; storage is entirely local.
```

### Host permission: `<all_urls>`

```text
The screenshot and page-advance functionality must work on whatever page the user chooses to capture — a presentation could be hosted on any website or served from a local file. captureVisibleTab and attaching the debugger to the active tab both require host access to that tab, and the specific host is not known in advance because it depends entirely on which tab the user is viewing when they press Start. The extension only acts on the single active tab during an explicit, user-initiated capture run; it does not run in the background, on other tabs, or without user action.
```

---

## Remote code

```text
No. SlideGrabber contains no remote code. All logic ships inside the package (background.js, sidepanel.js). No external scripts are loaded or executed.
```

## Data usage disclosures (Privacy practices tab)

**Read this before ticking the boxes.** "Collect" here does *not* mean "sent to
the developer". Google's [User Data
FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
is explicit:

> Extensions are required to disclose how they handle user data, even when data
> is processed or stored locally on a user's device and is not transmitted to
> external servers or third parties.

So a category gets **Yes** if the extension *touches* that data at all. "It never
leaves the device" is not an argument for **No** in this checklist — it belongs in
the certifications below and in [PRIVACY.md](PRIVACY.md), which is where local-only
handling actually counts in your favour.

Answer the "What user data do you collect" checklist as follows:

- Personally identifiable information: **No**
- Health information: **No**
- Financial and payment information: **No**
- Authentication information: **No**
- Personal communications: **No**
- Location: **No**
- Web history: **No** *(only `tab.id` is read via chrome.tabs.query; URLs, page
  titles and visit times are never read or stored)*
- User activity: **No** *(the extension sends a key press, it does not log clicks,
  scrolling, mouse position or keystrokes)*
- **Website content: Yes** — a screenshot of the rendered page is website content
  (the dashboard lists "text, images, sounds, videos or hyperlinks" as examples).
  This is the one box that must be ticked.

Justification for the Website content field:

```text
SlideGrabber captures screenshots of the visible area of the tab the user explicitly chooses to capture, because producing those images is the extension's single purpose. The images are written straight to the user's local Downloads folder via chrome.downloads. They are never transmitted to the developer or to any third party, never uploaded to any server, and their contents are not read, inspected, or analysed by the extension. Capture only happens during an explicit, user-initiated run.
```

Certifications (all must be checked / true):

- ☑ I do not sell or transfer user data to third parties, outside of the
  approved use cases.
- ☑ I do not use or transfer user data for purposes that are unrelated to my
  item's single purpose.
- ☑ I do not use or transfer user data to determine creditworthiness or for
  lending purposes.

---

## Promotional images

Ready-to-upload promo tiles live in `store-assets/` (SVG sources + rendered
PNGs, not shipped inside the extension zip):

- **Small promo tile** — `store-assets/small-promo-440x280.png` (440×280)
- **Marquee promo tile** — `store-assets/marquee-1400x560.png` (1400×560)

Regenerate after editing an SVG with, e.g.:

```
inkscape store-assets/marquee-1400x560.svg -o store-assets/marquee-1400x560.png -w 1400 -h 560
inkscape store-assets/small-promo-440x280.svg -o store-assets/small-promo-440x280.png -w 440 -h 280
mogrify -alpha off -define png:color-type=2 store-assets/marquee-1400x560.png store-assets/small-promo-440x280.png
```

The `mogrify` step is not optional: Inkscape exports RGBA, and the store rejects
images that carry an alpha channel. The tiles are fully opaque, so dropping it is
lossless.

## Screenshots

Captured from the running extension (they cannot be generated from source) and
kept in `store-assets/`. Upload order in the listing follows this list:

- `screenshot_slide-grabber.png` — side panel next to the demo deck (also
  embedded in [README.md](README.md))
- `screenshot_running.png` — a capture run in progress
- `screenshot_crop.png` — crop lines on a live preview
- `screenshot_info.png` — the About dialog

Requirements, all met by the files above: **1280×800** (640×400 also allowed but
looks soft in the listing), 24-bit PNG **without** alpha, or JPEG. The image must
fill the frame — no transparent or empty margins. At least one is required, up to
five are allowed.

If a screenshot is re-taken, check it for an alpha channel before uploading:

```
identify -format '%f %wx%h %[channels]\n' store-assets/screenshot_*.png
```

`srgb` is good, `srgba` needs the same `mogrify -alpha off` treatment as above.

## Demo deck

`demo/index.html` is a self-contained slide deck (12 full-screen slides, no
dependencies) to try SlideGrabber on. It reacts to every advance key the
extension can send and ends on an unchanging "The End" slide so the auto-stop
can be tested too. It is published via **GitHub Pages** (branch `main`, folder
`/`) and live at `https://stefan-schmidbauer.github.io/slide-grabber/demo/` — the
URL the About dialog's "Try it out" link points to.

## About dialog links to fill in

The About dialog in the side panel links out to several URLs. Verify/replace
before or shortly after publishing:

- **Source / Privacy** → `github.com/Stefan-Schmidbauer/slide-grabber` (the repo
  is public; Privacy points at `PRIVACY.md` in it).
- **Send Feedback** → `mailto:support@ancroo.com`.
- **Demo** → GitHub Pages URL above (live).
- **Rate on Chrome Web Store** → placeholder `#` in `sidepanel.html`; replace
  with the real store URL (`https://chromewebstore.google.com/detail/<id>`)
  after the listing goes live.

## Building the upload package

Run `./build.sh` to produce `dist/slidegrabber-<version>.zip` (version taken
from `manifest.json`). It packages **only** the runtime files with
`manifest.json` at the archive root — `demo/`, `store-assets/`, docs and dev
files are excluded automatically. Upload that zip to the dashboard. `dist/` is
gitignored. When adding a new runtime file, also add it to `RUNTIME_FILES` in
`build.sh`.


