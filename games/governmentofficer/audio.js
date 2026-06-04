const STORAGE_KEY = "governmentofficer-bgm-muted";

let bgmEl = null;
let started = false;

export function initBgm() {
  bgmEl = document.getElementById("bgm");
  if (!bgmEl) return;

  bgmEl.volume = 0.35;

  let btn = document.getElementById("bgm-toggle");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bgm-toggle";
    btn.id = "bgm-toggle";
    btn.setAttribute("aria-label", "배경음악 켜기/끄기");
    document.body.appendChild(btn);
  }

  const muted = localStorage.getItem(STORAGE_KEY) === "1";
  bgmEl.muted = muted;
  updateToggle(btn, muted);

  btn.addEventListener("click", () => {
    if (!started) startBgm();
    bgmEl.muted = !bgmEl.muted;
    localStorage.setItem(STORAGE_KEY, bgmEl.muted ? "1" : "0");
    updateToggle(btn, bgmEl.muted);
    if (!bgmEl.muted && bgmEl.paused) {
      bgmEl.play().catch(() => {});
    }
  });
}

export function startBgm() {
  if (!bgmEl || started) return;
  if (bgmEl.muted) {
    started = true;
    return;
  }
  started = true;
  bgmEl.play().catch(() => {
    started = false;
  });
}

function updateToggle(btn, muted) {
  btn.textContent = muted ? "🔇" : "🔊";
  btn.title = muted ? "배경음악 켜기" : "배경음악 끄기";
}
