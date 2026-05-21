(function () {
  const STORAGE_KEYS = {
    visitors: "portal_visitor_count",
    plays: "portal_play_counts",
    settings: "portal_admin_settings",
  };

  const DEFAULT_SETTINGS = {
    showVisitor: false,
    showPlayCount: false,
  };

  const els = {
    visitorCount: document.getElementById("visitorCount"),
    totalPlayCount: document.getElementById("totalPlayCount"),
    portalStats: document.getElementById("portalStats"),
    visitorStat: document.getElementById("visitorStat"),
    playStat: document.getElementById("playStat"),
    gameGrid: document.getElementById("gameGrid"),
    adminOpenBtn: document.getElementById("adminOpenBtn"),
    adminCloseBtn: document.getElementById("adminCloseBtn"),
    adminSaveBtn: document.getElementById("adminSaveBtn"),
    adminModal: document.getElementById("adminModal"),
    toggleVisitor: document.getElementById("toggleVisitor"),
    togglePlayCount: document.getElementById("togglePlayCount"),
  };

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getVisitorCount() {
    const n = parseInt(localStorage.getItem(STORAGE_KEYS.visitors), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function setVisitorCount(count) {
    localStorage.setItem(STORAGE_KEYS.visitors, String(count));
  }

  function incrementVisitorCount() {
    const next = getVisitorCount() + 1;
    setVisitorCount(next);
    return next;
  }

  function getPlayCounts() {
    return readJSON(STORAGE_KEYS.plays, {});
  }

  function setPlayCounts(counts) {
    writeJSON(STORAGE_KEYS.plays, counts);
  }

  function incrementPlayCount(gameId) {
    const counts = getPlayCounts();
    counts[gameId] = (counts[gameId] || 0) + 1;
    setPlayCounts(counts);
    return counts[gameId];
  }

  function getTotalPlays(counts) {
    return Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);
  }

  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...readJSON(STORAGE_KEYS.settings, {}) };
  }

  function saveSettings(settings) {
    writeJSON(STORAGE_KEYS.settings, settings);
  }

  function updateStatsDisplay() {
    const settings = getSettings();
    const visitorTotal = getVisitorCount();
    const playCounts = getPlayCounts();
    const totalPlays = getTotalPlays(playCounts);

    els.visitorCount.textContent = String(visitorTotal);
    els.totalPlayCount.textContent = String(totalPlays);

    const showAny = settings.showVisitor || settings.showPlayCount;
    els.portalStats.hidden = !showAny;
    els.visitorStat.hidden = !settings.showVisitor;
    els.playStat.hidden = !settings.showPlayCount;

    document.querySelectorAll(".game-card").forEach((card) => {
      const gameId = card.dataset.gameId;
      const display = card.querySelector("[data-play-display]");
      const count = playCounts[gameId] || 0;
      if (display) {
        display.querySelector("strong").textContent = String(count);
        display.hidden = !settings.showPlayCount;
      }
    });
  }

  function openModal() {
    const settings = getSettings();
    els.toggleVisitor.checked = settings.showVisitor;
    els.togglePlayCount.checked = settings.showPlayCount;
    els.adminModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    els.adminModal.hidden = true;
    document.body.style.overflow = "";
  }

  function applySettingsFromModal() {
    saveSettings({
      showVisitor: els.toggleVisitor.checked,
      showPlayCount: els.togglePlayCount.checked,
    });
    updateStatsDisplay();
    closeModal();
  }

  function onGamePlay(card) {
    const gameId = card.dataset.gameId;
    incrementPlayCount(gameId);
    updateStatsDisplay();

    const url = card.dataset.gameUrl;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function init() {
    incrementVisitorCount();
    updateStatsDisplay();

    els.adminOpenBtn.addEventListener("click", openModal);
    els.adminCloseBtn.addEventListener("click", closeModal);
    els.adminSaveBtn.addEventListener("click", applySettingsFromModal);

    els.adminModal.addEventListener("click", (e) => {
      if (e.target === els.adminModal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !els.adminModal.hidden) closeModal();
    });

    els.gameGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".game-play-btn");
      if (!btn) return;
      const card = btn.closest(".game-card");
      if (!card) return;
      onGamePlay(card);
    });
  }

  init();
})();
