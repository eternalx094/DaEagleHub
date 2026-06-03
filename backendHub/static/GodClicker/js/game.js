/* God Clicker — core engine
 * Catalogue + initial state are injected from the Django template as JSON.
 * The client owns the live simulation and periodically POSTs state to the server.
 */
(function () {
  "use strict";

  const cfg = window.GODCLICKER || {};

  const GENERATORS = JSON.parse(document.getElementById("generators-data").textContent);
  const UPGRADES = JSON.parse(document.getElementById("upgrades-data").textContent);
  const REBIRTH = JSON.parse(document.getElementById("rebirth-data").textContent || "{}");

  // ---- Game state -----------------------------------------------------------
  const state = Object.assign(
    { faith: 0, total_faith: 0, click_power: 1, generators: {}, upgrades: [], rebirths: 0 },
    JSON.parse(document.getElementById("state-data").textContent || "{}")
  );
  state.generators = state.generators || {};
  state.upgrades = state.upgrades || [];
  state.rebirths = state.rebirths || 0;

  // Transient (not saved): temporary buffs granted by Boons.
  let buffs = []; // [{id, name, prod, click, until}]

  // ---- Helpers --------------------------------------------------------------
  const owned = (id) => state.generators[id] || 0;
  const hasUpgrade = (id) => state.upgrades.indexOf(id) !== -1;
  const reqMet = (up) => !up.req || owned(up.req.gen) >= up.req.count;

  // Rebirth (ascension): each rebirth permanently multiplies all Faith gains
  // and unlocks content tagged with a higher `rebirth` tier.
  const rebirthMultiplier = () => Math.pow(REBIRTH.mult || 1, state.rebirths);
  const rebirthThreshold = () => (REBIRTH.base || Infinity) * Math.pow(REBIRTH.growth || 1, state.rebirths);
  const genUnlocked = (gen) => (gen.rebirth || 0) <= state.rebirths;
  const upgradeUnlocked = (up) => (up.rebirth || 0) <= state.rebirths;

  function generatorCost(gen) {
    return Math.ceil(gen.base_cost * Math.pow(gen.growth, owned(gen.id)));
  }

  // Product of "gen" upgrades that target this generator.
  function genUpgradeMult(genId) {
    let m = 1;
    UPGRADES.forEach((u) => {
      if (u.kind === "gen" && u.target === genId && hasUpgrade(u.id)) m *= u.mult;
    });
    return m;
  }

  // Product of all "global" production upgrades.
  function globalUpgradeMult() {
    let m = 1;
    UPGRADES.forEach((u) => {
      if (u.kind === "global" && hasUpgrade(u.id)) m *= u.mult;
    });
    return m;
  }

  const prodBuffMult = () => buffs.reduce((m, b) => m * (b.prod || 1), 1);
  const clickBuffMult = () => buffs.reduce((m, b) => m * (b.click || 1), 1);

  // Base Faith-per-click from flat/multiplier upgrades (saved value, no buffs).
  function computeClickPower() {
    let add = 1, mult = 1;
    UPGRADES.forEach((u) => {
      if (u.kind !== "click" || !hasUpgrade(u.id)) return;
      if (u.click_add) add += u.click_add;
      if (u.click_mult) mult *= u.click_mult;
    });
    return add * mult;
  }
  // Fraction of Faith/sec that each click also grants (Cookie-Clicker style).
  function clickCpsPct() {
    let pct = 0;
    UPGRADES.forEach((u) => {
      if (u.kind === "click" && u.click_cps_pct && hasUpgrade(u.id)) pct += u.click_cps_pct;
    });
    return pct;
  }
  const effectiveClick = () =>
    state.click_power * clickBuffMult() * rebirthMultiplier() + clickCpsPct() * computePerSecond();

  // Total Faith produced per second by all generators (incl. globals + buffs).
  function computePerSecond() {
    let base = 0;
    GENERATORS.forEach((g) => { base += g.cps * owned(g.id) * genUpgradeMult(g.id); });
    return base * globalUpgradeMult() * prodBuffMult() * rebirthMultiplier();
  }

  // Compact number formatting (1.23K, 4.56M, ...).
  const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  function fmt(n) {
    if (n < 1000) return Number.isInteger(n) ? String(n) : n.toFixed(1);
    const tier = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
    return (n / Math.pow(10, tier * 3)).toFixed(2) + SUFFIXES[tier];
  }

  // ---- DOM refs -------------------------------------------------------------
  const el = {
    faith: document.getElementById("faith"),
    perSecond: document.getElementById("perSecond"),
    totalFaith: document.getElementById("totalFaith"),
    rebirthInfo: document.getElementById("rebirthInfo"),
    rebirthBtn: document.getElementById("rebirthBtn"),
    deity: document.getElementById("deity"),
    clickInfo: document.getElementById("clickInfo"),
    generators: document.getElementById("generators"),
    upgrades: document.getElementById("upgrades"),
    upTooltip: document.getElementById("upTooltip"),
    noUpgrades: document.getElementById("noUpgrades"),
    saveBtn: document.getElementById("saveBtn"),
    resetBtn: document.getElementById("resetBtn"),
    saveStatus: document.getElementById("saveStatus"),
    muteBtn: document.getElementById("muteBtn"),
    buffBar: document.getElementById("buffBar"),
    game: document.querySelector(".game"),
  };

  // ==========================================================================
  // Sound — synthesized via WebAudio (no asset files needed)
  // ==========================================================================
  let audioCtx = null;
  let muted = localStorage.getItem("godclicker_muted") === "1";

  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (_) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }
  function tone(freq, start, dur, type, peak) {
    if (muted || !audioCtx) return;
    const t = audioCtx.currentTime + start;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak || 0.12, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  const sfx = {
    click: () => tone(180 + Math.random() * 40, 0, 0.08, "triangle", 0.08),
    buy:   () => { tone(523, 0, 0.12, "triangle", 0.1); tone(784, 0.06, 0.16, "triangle", 0.1); },
    boon:  () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.25, "sine", 0.12)),
    error: () => tone(120, 0, 0.12, "square", 0.07),
  };

  function updateMuteBtn() {
    el.muteBtn.textContent = muted ? "🔇" : "🔊";
    el.muteBtn.classList.toggle("muted", muted);
  }
  el.muteBtn.addEventListener("click", () => {
    muted = !muted;
    localStorage.setItem("godclicker_muted", muted ? "1" : "0");
    updateMuteBtn();
    if (!muted) { ensureAudio(); sfx.click(); }
  });

  // ==========================================================================
  // Visual effects
  // ==========================================================================
  function floatNum(x, y, text) {
    const f = document.createElement("div");
    f.className = "float-num";
    f.textContent = text;
    f.style.left = x + "px";
    f.style.top = y + "px";
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  function burst(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const ang = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 60;
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      if (color) p.style.background = color;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 720);
    }
  }

  function shake() {
    el.game.classList.remove("shake");
    void el.game.offsetWidth; // restart animation
    el.game.classList.add("shake");
  }

  function banner(text) {
    const b = document.createElement("div");
    b.className = "banner";
    b.textContent = text;
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 1800);
  }

  function centerOf(node) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================
  // Upgrade tiles render cheapest-first so the grid fills left-to-right.
  const UPGRADES_SORTED = UPGRADES.slice().sort((a, b) => a.cost - b.cost);

  function buildList() {
    el.generators.innerHTML = "";
    GENERATORS.forEach((gen) => {
      const item = document.createElement("div");
      item.className = "item";
      item.dataset.gen = gen.id;
      item.innerHTML =
        '<span class="gen-glyph">' + (gen.glyph || "") + '</span>' +
        '<div class="item-info">' +
          '<span class="item-name">' + gen.name + '</span>' +
          '<span class="item-blurb">' + gen.blurb + '</span>' +
          '<span class="item-effect">+' + fmt(gen.cps) + ' / sec each</span>' +
        '</div>' +
        '<div class="item-meta"><div class="item-cost"></div><div class="item-count">0</div></div>';
      item.addEventListener("click", () => buyGenerator(gen, item));
      el.generators.appendChild(item);
    });

    el.upgrades.innerHTML = "";
    UPGRADES_SORTED.forEach((up) => {
      const tile = document.createElement("button");
      tile.className = "up-tile hidden kind-" + up.kind;
      tile.dataset.upgrade = up.id;
      tile.textContent = up.glyph || "?";
      tile.addEventListener("click", () => buyUpgrade(up, tile));
      tile.addEventListener("mouseenter", () => showTooltip(up, tile));
      tile.addEventListener("mouseleave", hideTooltip);
      el.upgrades.appendChild(tile);
    });
  }

  // ---- Upgrade tooltip ----
  function showTooltip(up, tile) {
    const affordable = state.faith >= up.cost;
    el.upTooltip.innerHTML =
      '<div class="tt-name">' + up.name + '</div>' +
      '<div class="tt-blurb">' + up.blurb + '</div>' +
      '<div class="tt-cost ' + (affordable ? "ok" : "no") + '">Cost: ' + fmt(up.cost) + ' Faith</div>';
    el.upTooltip.hidden = false;
    const r = tile.getBoundingClientRect();
    const tw = el.upTooltip.offsetWidth;
    const th = el.upTooltip.offsetHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    let top = r.top - th - 10;
    if (top < 8) top = r.bottom + 10; // flip below if no room above
    el.upTooltip.style.left = left + "px";
    el.upTooltip.style.top = top + "px";
  }
  function hideTooltip() { el.upTooltip.hidden = true; }

  function refresh() {
    el.faith.textContent = fmt(Math.floor(state.faith));
    el.perSecond.textContent = fmt(computePerSecond()) + " / sec";
    el.totalFaith.textContent = fmt(Math.floor(state.total_faith)) + " prayed in total";
    el.clickInfo.textContent = "+" + fmt(effectiveClick()) + " per prayer";

    GENERATORS.forEach((gen) => {
      const node = el.generators.querySelector('[data-gen="' + gen.id + '"]');
      const unlocked = genUnlocked(gen);
      node.classList.toggle("hidden", !unlocked);
      if (!unlocked) return;
      const cost = generatorCost(gen);
      node.querySelector(".item-cost").textContent = fmt(cost);
      node.querySelector(".item-count").textContent = owned(gen.id);
      node.classList.toggle("affordable", state.faith >= cost);
      node.classList.toggle("locked", state.faith < cost);
    });

    let anyUpgrade = false;
    UPGRADES.forEach((up) => {
      const node = el.upgrades.querySelector('[data-upgrade="' + up.id + '"]');
      const show = !hasUpgrade(up.id) && reqMet(up) && upgradeUnlocked(up);
      node.classList.toggle("hidden", !show);
      if (show) {
        anyUpgrade = true;
        node.classList.toggle("affordable", state.faith >= up.cost);
        node.classList.toggle("locked", state.faith < up.cost);
      }
    });
    el.noUpgrades.style.display = anyUpgrade ? "none" : "block";

    updateRebirthUI();
  }

  function updateRebirthUI() {
    el.rebirthInfo.textContent = state.rebirths > 0
      ? "Rebirths: " + state.rebirths + "  (×" + fmt(rebirthMultiplier()) + " Faith)"
      : "";
    const thr = rebirthThreshold();
    const progress = state.total_faith; // rebirth is gated on lifetime Faith this run
    const ready = progress >= thr;
    el.rebirthBtn.disabled = !ready;
    if (ready) {
      el.rebirthBtn.textContent = "★ Rebirth → ×" + fmt(REBIRTH.mult || 1) + " Faith forever";
    } else {
      const pct = Math.min(100, (progress / thr) * 100);
      el.rebirthBtn.textContent =
        "Rebirth: " + fmt(Math.floor(progress)) + " / " + fmt(thr) + " total prayed (" + pct.toFixed(1) + "%)";
    }
  }

  // ==========================================================================
  // Actions
  // ==========================================================================
  function earn(amount) {
    state.faith += amount;
    state.total_faith += amount;
  }

  function buyGenerator(gen, node) {
    const cost = generatorCost(gen);
    if (state.faith < cost) { sfx.error(); return; }
    state.faith -= cost;
    state.generators[gen.id] = owned(gen.id) + 1;
    ensureAudio(); sfx.buy();
    const c = centerOf(node);
    burst(c.x, c.y, 10);
    node.classList.remove("bought"); void node.offsetWidth; node.classList.add("bought");
    if (cost >= 1_000_000) shake();
    refresh();
  }

  function buyUpgrade(up, node) {
    if (hasUpgrade(up.id) || state.faith < up.cost) { if (state.faith < up.cost) sfx.error(); return; }
    state.faith -= up.cost;
    state.upgrades.push(up.id);
    state.click_power = computeClickPower();
    ensureAudio(); sfx.buy();
    const c = centerOf(node);
    burst(c.x, c.y, 16, "#fff6cf");
    shake();
    banner(up.name);
    hideTooltip();
    refresh();
  }

  el.deity.addEventListener("click", (e) => {
    ensureAudio();
    const gain = effectiveClick();
    earn(gain);
    floatNum(e.clientX - 10, e.clientY - 20, "+" + fmt(gain));
    burst(e.clientX, e.clientY, 6);
    sfx.click();
    el.deity.classList.remove("clicked"); void el.deity.offsetWidth; el.deity.classList.add("clicked");
    const ring = document.createElement("div");
    ring.className = "ring";
    el.deity.appendChild(ring);
    setTimeout(() => ring.remove(), 600);
    refresh();
  });

  // ==========================================================================
  // Boon of the Gods — random golden clickable -> temporary buffs
  // ==========================================================================
  const BOONS = [
    { weight: 5, make: () => ({ id: "frenzy_" + Date.now(), name: "Divine Frenzy!", prod: 7, dur: 30, glyph: "⚡" }) },
    { weight: 4, make: () => ({ id: "click_" + Date.now(),  name: "Click Frenzy!",  click: 10, dur: 15, glyph: "👏" }) },
    { weight: 6, make: () => ({ id: "plenty", instant: true, name: "Boon of Plenty!", glyph: "🏺" }) },
  ];

  function applyBoon() {
    const total = BOONS.reduce((s, b) => s + b.weight, 0);
    let r = Math.random() * total;
    const pick = BOONS.find((b) => (r -= b.weight) < 0) || BOONS[0];
    const boon = pick.make();
    sfx.boon();
    banner(boon.name);

    if (boon.instant) {
      const reward = Math.max(computePerSecond() * 15, effectiveClick() * 13, 13);
      earn(reward);
      const c = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      burst(c.x, c.y, 24, "#fff6cf");
      floatNum(c.x, c.y, "+" + fmt(reward));
    } else {
      buffs.push({ id: boon.id, name: boon.name, prod: boon.prod || 1, click: boon.click || 1, until: Date.now() + boon.dur * 1000 });
      renderBuffs();
    }
    refresh();
  }

  function spawnBoon() {
    const btn = document.createElement("button");
    btn.className = "boon";
    btn.title = "A Boon of the Gods! Click it!";
    btn.textContent = "✨";
    const pad = 90;
    btn.style.left = (pad + Math.random() * (window.innerWidth - pad * 2)) + "px";
    btn.style.top = (pad + Math.random() * (window.innerHeight - pad * 2)) + "px";
    let alive = true;
    const remove = () => { if (alive) { alive = false; btn.remove(); } };
    btn.addEventListener("click", () => { if (!alive) return; ensureAudio(); applyBoon(); remove(); });
    document.body.appendChild(btn);
    setTimeout(remove, 13000); // despawns if ignored
    scheduleBoon();
  }

  function scheduleBoon() {
    const delay = 60000 + Math.random() * 90000; // 60–150s
    setTimeout(spawnBoon, delay);
  }

  function renderBuffs() {
    el.buffBar.innerHTML = "";
    buffs.forEach((b) => {
      const node = document.createElement("div");
      node.className = "buff";
      node.dataset.buff = b.id;
      el.buffBar.appendChild(node);
    });
  }

  function tickBuffs() {
    const now = Date.now();
    const before = buffs.length;
    buffs = buffs.filter((b) => b.until > now);
    if (buffs.length !== before) renderBuffs();
    buffs.forEach((b) => {
      const node = el.buffBar.querySelector('[data-buff="' + b.id + '"]');
      if (node) node.textContent = b.name + " " + Math.ceil((b.until - now) / 1000) + "s";
    });
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================
  const LOCAL_KEY = "godclicker_save";
  const getCsrf = () => {
    const i = document.querySelector('input[name="csrfmiddlewaretoken"]');
    return i ? i.value : "";
  };
  const snapshot = () => ({
    faith: state.faith, total_faith: state.total_faith, click_power: state.click_power,
    generators: state.generators, upgrades: state.upgrades, rebirths: state.rebirths,
  });
  function saveLocal() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshot())); } catch (_) {}
  }
  function flashStatus(msg, isError) {
    el.saveStatus.textContent = msg;
    el.saveStatus.style.color = isError ? "var(--red)" : "var(--green)";
    setTimeout(() => { el.saveStatus.textContent = ""; }, 2500);
  }
  function saveServer(silent) {
    saveLocal();
    if (!cfg.isAuthenticated || !cfg.saveUrl) { if (!silent) flashStatus("Saved locally"); return; }
    fetch(cfg.saveUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify(snapshot()),
    })
      .then((r) => { if (!silent) flashStatus(r.ok ? "Saved" : "Save failed", !r.ok); })
      .catch(() => { if (!silent) flashStatus("Save failed (offline)", true); });
  }
  function resetGame() {
    if (!window.confirm("Abandon EVERYTHING — Faith, followers, blessings and rebirths — and start completely over?")) return;
    state.faith = 0; state.total_faith = 0; state.click_power = 1;
    state.generators = {}; state.upgrades = []; state.rebirths = 0; buffs = [];
    renderBuffs(); saveLocal();
    if (cfg.isAuthenticated && cfg.resetUrl) {
      fetch(cfg.resetUrl, { method: "POST", headers: { "X-CSRFToken": getCsrf() } });
    }
    refresh();
    flashStatus("Pantheon reset");
  }

  // ---- Rebirth (ascension) ----
  function celebrateRebirth() {
    buffs = []; renderBuffs();
    ensureAudio(); sfx.boon();
    banner("Rebirth " + state.rebirths + "!  ×" + fmt(rebirthMultiplier()) + " Faith");
    burst(window.innerWidth / 2, window.innerHeight / 2, 30, "#d9b3ff");
    shake();
    saveLocal();
    refresh();
  }

  function doRebirth() {
    if (state.total_faith < rebirthThreshold()) { sfx.error(); return; }
    if (!window.confirm(
      "Rebirth now? You will lose all Faith, followers and blessings, but gain a " +
      "permanent ×" + (REBIRTH.mult || 1) + " to all Faith and unlock new gods.\n\n" +
      "This will be rebirth #" + (state.rebirths + 1) + "."
    )) return;

    if (cfg.isAuthenticated && cfg.rebirthUrl) {
      fetch(cfg.rebirthUrl, { method: "POST", headers: { "X-CSRFToken": getCsrf() } })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((s) => {
          Object.assign(state, s);
          state.generators = state.generators || {};
          state.upgrades = state.upgrades || [];
          celebrateRebirth();
        })
        .catch(() => flashStatus("Rebirth failed", true));
    } else {
      state.rebirths += 1;
      state.faith = 0; state.total_faith = 0; state.click_power = 1;
      state.generators = {}; state.upgrades = [];
      celebrateRebirth();
    }
  }

  el.saveBtn.addEventListener("click", () => saveServer(false));
  el.resetBtn.addEventListener("click", resetGame);
  el.rebirthBtn.addEventListener("click", doRebirth);

  // ==========================================================================
  // Loops + boot
  // ==========================================================================
  const TICK_MS = 100;
  setInterval(() => {
    const ps = computePerSecond();
    if (ps > 0) earn(ps * (TICK_MS / 1000));
    tickBuffs();
    refresh();
  }, TICK_MS);

  setInterval(() => saveServer(true), 20000);
  window.addEventListener("beforeunload", saveLocal);

  if (!cfg.isAuthenticated && state.total_faith === 0) {
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
      if (local) Object.assign(state, local);
    } catch (_) {}
  }
  state.click_power = computeClickPower();
  updateMuteBtn();
  buildList();
  refresh();
  scheduleBoon();
})();
