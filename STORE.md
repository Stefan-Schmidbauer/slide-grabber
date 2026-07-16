# Chrome Web Store Submission — SlideGrabber

This file contains the text and justifications to paste into the Chrome Web
Store Developer Dashboard when publishing SlideGrabber. It is documentation for
the submitter and is not shipped as part of the extension's runtime.

---

## Store listing

**Name:** SlideGrabber

**Category:** Productivity

**Summary (short description, max 132 characters):**

> Capture a series of screenshots of the current tab, auto-advance the page, and save the images (optionally cropped) locally.

**Detailed description:**

> SlideGrabber turns any tab into a series of saved images. Set how many
> screenshots to take, pick the key used to advance the page (spacebar, arrow
> keys, Page Down, and more), and SlideGrabber captures the visible tab, presses
> the key, waits, and repeats — automatically saving each frame to your
> Downloads folder.
>
> Ideal for turning slide decks, flip-book style presentations, or any
> key-navigated content into an ordered set of PNG or JPG files.
>
> Features:
> • Automatic capture loop with a configurable maximum number of shots
> • Optional auto-stop when the page stops changing, so a run ends by itself
>   at the end of a deck instead of guessing the exact count
> • Choose the advance key (spacebar, Page Up/Down, arrow keys, Enter)
> • Configurable delay between shots so the page has time to change
> • Optional startup delay so you can focus the right tab first
> • Crop the edges of every screenshot — drag the crop lines visually on a
>   live preview
> • PNG or JPG output, with a text/image quality mode for JPG
> • Sequentially numbered files saved into a subfolder of your Downloads
>
> Privacy first: SlideGrabber collects no data, uses no analytics, and never
> sends anything to any server. Every image is written straight to your local
> Downloads folder.

**Privacy policy URL:** *(host PRIVACY.md publicly and paste the URL here — e.g.
via GitHub Pages or your own domain)*

---

## Single purpose (required field)

> SlideGrabber captures a series of screenshots of the user's active browser
> tab, advancing the page with a key press between shots, and saves the
> resulting images to the local Downloads folder.

---

## Permission justifications

Paste each justification into the matching field in the dashboard.

### `debugger`

> The extension uses the chrome.debugger API to dispatch a single real key
> press (e.g. spacebar or arrow key) to the active tab between screenshots. This
> is the only reliable way to advance key-navigated content such as slide decks,
> because synthetic events injected through a content script are marked
> untrusted and are ignored by most presentation viewers. The debugger is
> attached only to the tab the user is capturing, only while a capture run is
> active, and is detached as soon as the run stops. It is never used to inspect,
> read, or modify page content.

### `downloads`

> Required to save each captured screenshot as an image file (PNG or JPG) into a
> subfolder of the user's Downloads folder. This is the extension's core output
> mechanism. No other use is made of the downloads permission.

### `tabs`

> Required to identify the active tab and its window so the extension can capture
> the correct visible tab (chrome.tabs.captureVisibleTab) and target the correct
> tab for the advance key press. The extension does not read tab URLs or history
> for any other purpose.

### `storage`

> Used to remember the user's own settings (file name, target subfolder, format,
> crop values, delays, chosen advance key) locally between sessions via
> chrome.storage.local. No data is transmitted; storage is entirely local.

### `sidePanel`

> The entire user interface of the extension is presented in Chrome's side panel,
> where the user configures and starts/stops a capture run.

### Host permission: `<all_urls>`

> The screenshot and page-advance functionality must work on whatever page the
> user chooses to capture — a presentation could be hosted on any website or
> served from a local file. captureVisibleTab and attaching the debugger to the
> active tab both require host access to that tab, and the specific host is not
> known in advance because it depends entirely on which tab the user is viewing
> when they press Start. The extension only acts on the single active tab during
> an explicit, user-initiated capture run; it does not run in the background, on
> other tabs, or without user action.

---

## Remote code

> No. SlideGrabber contains no remote code. All logic ships inside the package
> (background.js, sidepanel.js). No external scripts are loaded or executed.

## Data usage disclosures (Privacy practices tab)

Answer the "What user data do you collect" checklist as follows:

- Personally identifiable information: **No**
- Health information: **No**
- Financial and payment information: **No**
- Authentication information: **No**
- Personal communications: **No**
- Location: **No**
- Web history: **No**
- User activity: **No**
- Website content: **No** *(images are saved locally to the user's device and
  are never transmitted to or accessed by the developer)*

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
```

Screenshots (1280×800 or 640×400) must still be captured from the running
extension — they cannot be generated from source.

## Demo deck

`demo/index.html` is a self-contained slide deck (12 full-screen slides, no
dependencies) to try SlideGrabber on. It reacts to every advance key the
extension can send and ends on an unchanging "The End" slide so the auto-stop
can be tested too. Publish it via **GitHub Pages** (serve `main` from the repo
root); it is then reachable at
`https://stefan-schmidbauer.github.io/slide-grabber/demo/` — the URL the About
dialog's "Try it out" link points to.

## About dialog links to fill in

The About dialog in the side panel links out to several URLs. Verify/replace
before or shortly after publishing:

- **Source / Privacy** → `github.com/Stefan-Schmidbauer/slide-grabber` (works
  once the repo is pushed; Privacy points at `PRIVACY.md` in the repo).
- **Send Feedback** → `mailto:support@ancroo.com`.
- **Demo** → GitHub Pages URL above (works once Pages is enabled).
- **Rate on Chrome Web Store** → placeholder `#` in `sidepanel.html`; replace
  with the real store URL (`https://chromewebstore.google.com/detail/<id>`)
  after the listing goes live.

## Pre-submission checklist

- [ ] Host `PRIVACY.md` at a public URL and enter it in the listing.
- [ ] Provide at least one screenshot (1280×800 or 640×400) of the side panel.
- [ ] Provide a 128×128 store icon (icon-128.png is included).
- [ ] Upload promo tiles from `store-assets/` (small 440×280, marquee 1400×560).
- [ ] Enable GitHub Pages so the demo deck and "Try it out" link resolve.
- [ ] Replace the Chrome Web Store URL placeholder in the About dialog once live.
- [ ] Fill in the single-purpose description.
- [ ] Paste each permission justification above.
- [ ] Complete the data-usage disclosures and certifications.
- [ ] Zip the extension folder (excluding README.md, PRIVACY.md, STORE.md is
      optional but harmless) and upload.
