"use strict";

const SETTING_IDS = [
  "filename",
  "directory",
  "format",
  "content",
  "maxCount",
  "startDelaySec",
  "advanceKey",
  "delayMs",
  "autoStopIdentical",
  "changeThreshold",
  "cropTop",
  "cropBottom",
  "cropLeft",
  "cropRight",
];

// Key definitions for the debugger protocol (Input.dispatchKeyEvent).
// Printable keys (spacebar, enter) also set "text".
const KEY_DEFS = {
  Space: {
    key: " ",
    code: "Space",
    keyCode: 32,
    text: " ",
    label: "Spacebar",
  },
  PageDown: {
    key: "PageDown",
    code: "PageDown",
    keyCode: 34,
    label: "Page Down",
  },
  PageUp: {
    key: "PageUp",
    code: "PageUp",
    keyCode: 33,
    label: "Page Up",
  },
  ArrowRight: {
    key: "ArrowRight",
    code: "ArrowRight",
    keyCode: 39,
    label: "Arrow Right",
  },
  ArrowDown: {
    key: "ArrowDown",
    code: "ArrowDown",
    keyCode: 40,
    label: "Arrow Down",
  },
  ArrowUp: {
    key: "ArrowUp",
    code: "ArrowUp",
    keyCode: 38,
    label: "Arrow Up",
  },
  Enter: {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    text: "\r",
    label: "Enter",
  },
};

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const previewBtn = document.getElementById("previewBtn");
const previewWrap = document.getElementById("previewWrap");
const previewImg = document.getElementById("previewImg");
const previewHint = document.getElementById("previewHint");
const cropOverlay = document.getElementById("cropOverlay");

// Minimum width/height of the remaining area in real pixels,
// so dragging can't crop everything away.
const CROP_MIN_KEEP = 10;

// Attaching the debugger shows Chrome's "being debugged by an extension" bar,
// which shrinks the viewport and reflows the page. That happens asynchronously
// after chrome.debugger.attach resolves, so we wait this long before the first
// capture – otherwise frame 1 (old layout) and frame 2 (reflowed layout) differ
// on an unchanged page and slip past the auto-stop compare.
const DEBUGGER_SETTLE_MS = 500;

// Run state
let running = false;
let stopRequested = false;
let attachedTabId = null;

// ---------------------------------------------------------------------------
// Load/save settings
// ---------------------------------------------------------------------------
async function loadSettings() {
  const stored = await chrome.storage.local.get("settings");
  const s = stored.settings || {};
  for (const id of SETTING_IDS) {
    if (s[id] !== undefined) document.getElementById(id).value = s[id];
  }
}

function saveSettings() {
  const s = {};
  for (const id of SETTING_IDS) s[id] = document.getElementById(id).value;
  chrome.storage.local.set({ settings: s });
}

for (const id of SETTING_IDS) {
  document.getElementById(id).addEventListener("change", saveSettings);
}

document.getElementById("format").addEventListener("change", updateContentEnabled);

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function setStatus(text) {
  statusEl.textContent = text;
}

function log(text, isError = false) {
  const line = document.createElement("div");
  if (isError) line.className = "err";
  const time = new Date().toLocaleTimeString();
  line.textContent = `[${time}] ${text}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function setRunningUi(isRunning) {
  running = isRunning;
  startBtn.disabled = isRunning;
  stopBtn.disabled = !isRunning;
  previewBtn.disabled = isRunning;
  for (const id of SETTING_IDS) document.getElementById(id).disabled = isRunning;
  if (!isRunning) updateContentEnabled();
}

// "Content" only affects JPG quality – disable and dim it for PNG.
function updateContentEnabled() {
  const isJpeg = document.getElementById("format").value === "jpeg";
  const content = document.getElementById("content");
  content.disabled = running || !isJpeg;
  document.getElementById("contentLabel").classList.toggle("disabled", !isJpeg);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function cropVal(id) {
  return Math.max(0, parseInt(document.getElementById(id).value, 10) || 0);
}

// ---------------------------------------------------------------------------
// Preview with draggable crop lines
// ---------------------------------------------------------------------------

// Sets the overlay's CSS variables from the current edge values.
// Converts real pixels to display pixels via the scale factor.
function renderCropOverlay() {
  if (previewWrap.hidden) return;
  const natW = previewImg.naturalWidth;
  const natH = previewImg.naturalHeight;
  if (!natW || !natH) return;
  const sx = previewImg.clientWidth / natW;
  const sy = previewImg.clientHeight / natH;
  cropOverlay.style.setProperty("--t", cropVal("cropTop") * sy + "px");
  cropOverlay.style.setProperty("--b", cropVal("cropBottom") * sy + "px");
  cropOverlay.style.setProperty("--l", cropVal("cropLeft") * sx + "px");
  cropOverlay.style.setProperty("--r", cropVal("cropRight") * sx + "px");
}

// Captures the visible tab once and shows it as a preview.
// The debugger is attached during the capture so the preview shows the same
// shrunken viewport (and reflow) as the real run – otherwise crop lines set
// here wouldn't line up with the captured frames.
async function takePreview() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    log("No active tab found for the preview.", true);
    return;
  }
  const cfg = readConfig();
  const opts = { format: cfg.format };
  if (cfg.format === "jpeg") opts.quality = cfg.jpegQuality;

  previewBtn.disabled = true;
  setStatus("Preview …");
  try {
    await attachDebugger(tab.id);
    // Let the debugger bar appear and its viewport reflow settle first.
    await sleep(DEBUGGER_SETTLE_MS);
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, opts);
    previewImg.onload = () => {
      previewWrap.hidden = false;
      previewHint.hidden = false;
      renderCropOverlay();
    };
    previewImg.src = dataUrl;
    setStatus("Preview captured.");
  } catch (err) {
    setStatus("Error.");
    log(err.message || String(err), true);
  } finally {
    await detachDebugger();
    previewBtn.disabled = false;
  }
}

// Dragging a crop line: updates the corresponding number field live.
function startDrag(e) {
  const handle = e.currentTarget;
  const edge = handle.dataset.edge;
  const natW = previewImg.naturalWidth;
  const natH = previewImg.naturalHeight;
  if (!natW || !natH) return;
  e.preventDefault();
  handle.setPointerCapture(e.pointerId);

  function onMove(ev) {
    const rect = previewImg.getBoundingClientRect();
    const sx = rect.width / natW;
    const sy = rect.height / natH;
    let field, val;
    if (edge === "top") {
      const max = Math.max(0, natH - cropVal("cropBottom") - CROP_MIN_KEEP);
      val = clamp(Math.round((ev.clientY - rect.top) / sy), 0, max);
      field = "cropTop";
    } else if (edge === "bottom") {
      const max = Math.max(0, natH - cropVal("cropTop") - CROP_MIN_KEEP);
      val = clamp(Math.round((rect.bottom - ev.clientY) / sy), 0, max);
      field = "cropBottom";
    } else if (edge === "left") {
      const max = Math.max(0, natW - cropVal("cropRight") - CROP_MIN_KEEP);
      val = clamp(Math.round((ev.clientX - rect.left) / sx), 0, max);
      field = "cropLeft";
    } else {
      const max = Math.max(0, natW - cropVal("cropLeft") - CROP_MIN_KEEP);
      val = clamp(Math.round((rect.right - ev.clientX) / sx), 0, max);
      field = "cropRight";
    }
    document.getElementById(field).value = val;
    renderCropOverlay();
  }

  function onUp() {
    handle.releasePointerCapture(e.pointerId);
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    saveSettings();
  }

  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onUp);
}

// ---------------------------------------------------------------------------
// Crop image
// ---------------------------------------------------------------------------
function cropImage(dataUrl, crop, mime, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.width - crop.left - crop.right;
      const h = img.height - crop.top - crop.bottom;
      if (w <= 0 || h <= 0) {
        reject(
          new Error(
            `Crop edges too large: image ${img.width}×${img.height}px, remaining ${w}×${h}px.`
          )
        );
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, crop.left, crop.top, w, h, 0, 0, w, h);
      resolve(canvas.toDataURL(mime, quality));
    };
    img.onerror = () => reject(new Error("Screenshot could not be loaded."));
    img.src = dataUrl;
  });
}

// ---------------------------------------------------------------------------
// Compare two frames (for auto-stop when the page no longer changes)
// ---------------------------------------------------------------------------

// Both frames are drawn onto a small canvas of this width before comparing,
// so antialiasing noise and tiny rendering jitter don't count as a change –
// and only a few thousand pixels are compared instead of millions.
const DIFF_SAMPLE_W = 160;
// Per-channel (0..255) difference a pixel may have before it counts as changed.
const DIFF_CHANNEL_TOL = 16;
// Default fraction of changed pixels above which frames count as "different".
// Overridable per run via the "Sensitivity (%)" field (see readConfig).
const DIFF_FRACTION = 0.003;

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Screenshot could not be loaded."));
    img.src = dataUrl;
  });
}

// Draws an image scaled down to DIFF_SAMPLE_W and returns its pixel data.
function frameToImageData(img) {
  const w = DIFF_SAMPLE_W;
  const h = Math.max(1, Math.round((img.height / img.width) * w));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

// True if two frames look the same within tolerance (page didn't change).
async function framesLookIdentical(dataUrlA, dataUrlB, maxFraction = DIFF_FRACTION) {
  const [a, b] = await Promise.all([loadImage(dataUrlA), loadImage(dataUrlB)]);
  const da = frameToImageData(a);
  const db = frameToImageData(b);
  // Different dimensions -> definitely a different page.
  if (da.width !== db.width || da.height !== db.height) return false;
  const pa = da.data;
  const pb = db.data;
  let diffPixels = 0;
  for (let i = 0; i < pa.length; i += 4) {
    if (
      Math.abs(pa[i] - pb[i]) > DIFF_CHANNEL_TOL ||
      Math.abs(pa[i + 1] - pb[i + 1]) > DIFF_CHANNEL_TOL ||
      Math.abs(pa[i + 2] - pb[i + 2]) > DIFF_CHANNEL_TOL
    ) {
      diffPixels++;
    }
  }
  return diffPixels / (da.width * da.height) <= maxFraction;
}

// ---------------------------------------------------------------------------
// Capture screenshot + save
// ---------------------------------------------------------------------------

// Captures the visible tab and applies cropping. Returns the final dataUrl.
async function captureFrame(windowId, cfg) {
  const captureOpts = { format: cfg.format };
  if (cfg.format === "jpeg") captureOpts.quality = cfg.jpegQuality;
  let dataUrl = await chrome.tabs.captureVisibleTab(windowId, captureOpts);

  const noCrop =
    cfg.crop.top === 0 &&
    cfg.crop.bottom === 0 &&
    cfg.crop.left === 0 &&
    cfg.crop.right === 0;
  if (!noCrop) dataUrl = await cropImage(dataUrl, cfg.crop, cfg.mime, cfg.jpegQuality / 100);

  return dataUrl;
}

// Saves an already-captured (and cropped) frame to disk.
async function saveFrame(dataUrl, cfg, index) {
  const num = String(index).padStart(cfg.pad, "0");
  const dir = cfg.directory ? cfg.directory.replace(/^\/+|\/+$/g, "") + "/" : "";
  const filename = `${dir}${cfg.filename}_${num}.${cfg.ext}`;

  await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs: false,
    conflictAction: "uniquify",
  });

  return filename;
}

// ---------------------------------------------------------------------------
// Press a key via the debugger protocol (a real key press)
// ---------------------------------------------------------------------------
async function pressKey(tabId, keyName) {
  const def = KEY_DEFS[keyName] || KEY_DEFS.Space;
  const base = {
    key: def.key,
    code: def.code,
    windowsVirtualKeyCode: def.keyCode,
    nativeVirtualKeyCode: def.keyCode,
  };
  if (def.text !== undefined) {
    base.text = def.text;
    base.unmodifiedText = def.text;
  }
  await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", {
    // Non-printable keys need "rawKeyDown", printable ones "keyDown".
    type: def.text !== undefined ? "keyDown" : "rawKeyDown",
    ...base,
  });
  await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", {
    type: "keyUp",
    ...base,
  });
}

async function attachDebugger(tabId) {
  await chrome.debugger.attach({ tabId }, "1.3");
  attachedTabId = tabId;
}

async function detachDebugger() {
  if (attachedTabId === null) return;
  try {
    await chrome.debugger.detach({ tabId: attachedTabId });
  } catch (e) {
    // Tab may already be closed – ignore
  }
  attachedTabId = null;
}

// ---------------------------------------------------------------------------
// Read configuration from the fields
// ---------------------------------------------------------------------------
function readConfig() {
  const num = (id) => Math.max(0, parseInt(document.getElementById(id).value, 10) || 0);
  const maxCount = Math.max(1, parseInt(document.getElementById("maxCount").value, 10) || 1);
  const format = document.getElementById("format").value === "jpeg" ? "jpeg" : "png";
  // JPEG quality depends on content: text needs sharper edges than photos.
  const isText = document.getElementById("content").value === "text";
  return {
    filename: (document.getElementById("filename").value || "screenshot").trim(),
    directory: document.getElementById("directory").value.trim(),
    format,
    ext: format === "jpeg" ? "jpg" : "png",
    mime: format === "jpeg" ? "image/jpeg" : "image/png",
    jpegQuality: isText ? 98 : 82,
    maxCount,
    startDelaySec: num("startDelaySec"),
    advanceKey: document.getElementById("advanceKey").value,
    delayMs: num("delayMs"),
    autoStopIdentical: num("autoStopIdentical"),
    // "Sensitivity (%)" -> fraction of changed pixels for the auto-stop compare.
    diffFraction:
      Math.max(0, parseFloat(document.getElementById("changeThreshold").value) || 0) / 100,
    pad: Math.max(3, String(maxCount).length),
    crop: {
      top: num("cropTop"),
      bottom: num("cropBottom"),
      left: num("cropLeft"),
      right: num("cropRight"),
    },
  };
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------
async function start() {
  const cfg = readConfig();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    log("No active tab found.", true);
    return;
  }

  setRunningUi(true);
  stopRequested = false;
  logEl.textContent = "";
  log(`Start – up to ${cfg.maxCount} screenshots.`);

  try {
    // Delay before the first screenshot (with countdown, cancelable via Stop)
    for (let sec = cfg.startDelaySec; sec > 0 && !stopRequested; sec--) {
      setStatus(`First screenshot in ${sec} s …`);
      await sleep(1000);
    }

    if (stopRequested) {
      setStatus("Stopped.");
      log("Stopped before the first screenshot.");
      return;
    }

    await attachDebugger(tab.id);
    // Let the debugger bar appear and its viewport reflow settle before the
    // first capture, so all frames share the same (shrunken) layout.
    await sleep(DEBUGGER_SETTLE_MS);

    const autoStop = cfg.autoStopIdentical; // 0 = off
    let prevFrame = null; // dataUrl of the last saved frame
    let identicalCount = 0;
    let savedCount = 0;
    let autoStopped = false;

    for (let i = 1; i <= cfg.maxCount; i++) {
      if (stopRequested) break;

      setStatus(`Screenshot ${savedCount + 1} (page ${i} of max ${cfg.maxCount}) …`);
      const frame = await captureFrame(tab.windowId, cfg);

      if (
        autoStop > 0 &&
        prevFrame !== null &&
        (await framesLookIdentical(frame, prevFrame, cfg.diffFraction))
      ) {
        // Page didn't change – don't save; only advance and count.
        identicalCount++;
        log(`Page unchanged (${identicalCount}/${autoStop}) – not saved.`);
        if (identicalCount >= autoStop) {
          autoStopped = true;
          break;
        }
      } else {
        identicalCount = 0;
        savedCount++;
        const name = await saveFrame(frame, cfg, savedCount);
        prevFrame = frame;
        log(`Saved: ${name}`);
      }

      if (i === cfg.maxCount) break;
      if (stopRequested) break;

      await pressKey(tab.id, cfg.advanceKey);
      await sleep(cfg.delayMs);
    }

    if (stopRequested) {
      setStatus("Stopped.");
      log("Stopped by user.");
    } else if (autoStopped) {
      setStatus("Done (auto-stop).");
      log(`Auto-stop: ${autoStop} identical pages in a row – ${savedCount} saved.`);
    } else {
      setStatus("Done.");
      log(`All screenshots captured – ${savedCount} saved.`);
    }
  } catch (err) {
    setStatus("Error.");
    log(err.message || String(err), true);
  } finally {
    await detachDebugger();
    setRunningUi(false);
  }
}

function stop() {
  if (!running) return;
  stopRequested = true;
  setStatus("Stopping …");
}

startBtn.addEventListener("click", start);
stopBtn.addEventListener("click", stop);
previewBtn.addEventListener("click", takePreview);

// About dialog: version comes straight from the manifest so it never drifts.
const infoDialog = document.getElementById("infoDialog");
document.getElementById("infoVersion").textContent =
  chrome.runtime.getManifest().version;
document.getElementById("infoBtn").addEventListener("click", () => {
  infoDialog.showModal();
});
document.getElementById("infoClose").addEventListener("click", () => {
  infoDialog.close();
});
// Click on the backdrop (outside the dialog box) closes it.
infoDialog.addEventListener("click", (e) => {
  if (e.target === infoDialog) infoDialog.close();
});

for (const handle of cropOverlay.querySelectorAll(".handle")) {
  handle.addEventListener("pointerdown", startDrag);
}

// Number field typed -> redraw lines; panel width changed -> rescale.
for (const id of ["cropTop", "cropBottom", "cropLeft", "cropRight"]) {
  document.getElementById(id).addEventListener("input", renderCropOverlay);
}
window.addEventListener("resize", renderCropOverlay);

// In case the debugger is detached unexpectedly (e.g. tab closed)
chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId === attachedTabId) {
    attachedTabId = null;
    if (running) {
      stopRequested = true;
      log("Debugger detached (tab closed?) – stopping.", true);
    }
  }
});

loadSettings().then(updateContentEnabled);
