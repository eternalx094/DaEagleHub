// ===== Canvas =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ===== Constants =====
const WORLD_GRAVITY = 0.5;
const BASE_SPEED = 1.0;
const PLAYER_W = 90;
const PLAYER_H = 30;
const BOUNCE_FORCE = 14;
const GRAVITY_FLIP_KICK = 7;
const BOOST_MULTIPLIER = 1.7;
const BOOST_DURATION_FRAMES = 96;
const CAMERA_LERP = 0.12;
const CAMERA_LEAD = 240;
const CAMERA_VERTICAL_LOOK = 70;
const RESPAWN_DELAY_FRAMES = 36;
const MIN_LEVEL_SPEED = 0.5;
const MAX_LEVEL_SPEED = 12;
const MAX_LEVEL_DURATION_SECONDS = 7200;

const TRIGGER_COLORS = {
  rotate: "#FFA500",
  boost: "#00CED1",
  gravity: "#FF1493",
  bounce: "#7CFC00",
};

const TRIGGER_LABELS = {
  rotate: "R",
  boost: "B",
  gravity: "G",
  bounce: "J",
};

const KNOWN_TRIGGER_TYPES = new Set(Object.keys(TRIGGER_COLORS));
const KNOWN_OBJECT_TYPES = new Set(["block", "killblock", "startline", "finishline"]);
const MANUAL_TRIGGER_TYPES = new Set(Object.keys(TRIGGER_COLORS));

// ===== Utils =====
const clamp = (value, min, max) => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return value;
  if (min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  return Math.min(max, Math.max(min, value));
};

const overlapRect = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const asNumber = (value, fallback) => (Number.isFinite(value) ? value : fallback);

const normalizeObjectType = (rawType) => {
  const t = typeof rawType === "string" ? rawType.trim().toLowerCase() : "block";
  if (t === "start" || t === "start-line" || t === "start_line") return "startline";
  if (
    t === "finish" ||
    t === "finish-line" ||
    t === "finish_line" ||
    t === "end" ||
    t === "endline" ||
    t === "end-line" ||
    t === "end_line"
  ) {
    return "finishline";
  }
  if (t === "kill" || t === "kill-block" || t === "kill_block" || t === "hazard") return "killblock";
  return t;
};

const normalizeTriggerType = (rawType) => {
  const t = typeof rawType === "string" ? rawType.trim().toLowerCase() : "bounce";
  return t === "spinaround" ? "rotate" : t;
};

const seededRandom = (seed) => {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};

// ===== World Objects =====
class WorldObject {
  constructor(x, y, size = 40, type = "block") {
    this.x = x;
    this.y = y;
    this.width = size;
    this.height = size;
    this.type = type;
  }

  get centerX() {
    return this.x + this.width * 0.5;
  }

  isSolid() {
    return this.type === "block";
  }

  isHazard() {
    return this.type === "killblock";
  }

  isStartLine() {
    return this.type === "startline";
  }

  isFinishLine() {
    return this.type === "finishline";
  }

  draw(ctx, now) {
    if (this.isHazard()) {
      this.drawKillBlock(ctx, now);
      return;
    }

    if (this.isStartLine()) {
      this.drawStartLine(ctx, now);
      return;
    }

    if (this.isFinishLine()) {
      this.drawFinishLine(ctx, now);
      return;
    }

    this.drawBlock(ctx, now);
  }

  drawBlock(ctx, now) {
    ctx.save();
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    gradient.addColorStop(0, "#66B9FF");
    gradient.addColorStop(1, "#2A45CC");
    ctx.fillStyle = gradient;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    const shimmer = 0.2 + 0.14 * Math.sin(now * 0.003 + this.x * 0.03);
    ctx.fillStyle = `rgba(255,255,255,${shimmer.toFixed(3)})`;
    ctx.fillRect(this.x + 3, this.y + 3, this.width - 6, 5);

    ctx.strokeStyle = "rgba(200,235,255,0.7)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.width - 1, this.height - 1);
    ctx.restore();
  }

  drawKillBlock(ctx, now) {
    const cx = this.x + this.width * 0.5;
    const cy = this.y + this.height * 0.5;
    const radius = Math.min(this.width, this.height) * 0.42;
    const pulse = 0.8 + 0.18 * Math.sin(now * 0.007 + this.x * 0.03);

    ctx.save();
    ctx.shadowColor = "rgba(255, 80, 80, 0.9)";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = `rgba(255,95,95,${pulse.toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(44, 0, 6, 0.62)";
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.64, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 220, 220, 0.95)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.44, cy - radius * 0.44);
    ctx.lineTo(cx + radius * 0.44, cy + radius * 0.44);
    ctx.moveTo(cx + radius * 0.44, cy - radius * 0.44);
    ctx.lineTo(cx - radius * 0.44, cy + radius * 0.44);
    ctx.stroke();
    ctx.restore();
  }

  drawStartLine(ctx, now) {
    const beamWidth = Math.max(4, this.width * 0.22);
    const beamX = this.centerX - beamWidth * 0.5;
    const pulse = 0.3 + 0.25 * Math.sin(now * 0.004 + this.y * 0.02);
    const top = this.y - this.height * 1.2;
    const bottom = this.y + this.height * 2.2;

    ctx.save();
    ctx.shadowColor = "#7BFFEE";
    ctx.shadowBlur = 16;
    ctx.fillStyle = `rgba(80,245,220,${(0.7 + pulse).toFixed(3)})`;
    ctx.fillRect(beamX, top, beamWidth, bottom - top);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(198,255,248,0.95)";
    ctx.lineWidth = 2;
    ctx.strokeRect(beamX, this.y, beamWidth, this.height);
    ctx.restore();
  }

  drawFinishLine(ctx, now) {
    const beamWidth = Math.max(4, this.width * 0.22);
    const beamX = this.centerX - beamWidth * 0.5;
    const pulse = 0.28 + 0.22 * Math.sin(now * 0.004 + this.y * 0.02);
    const top = this.y - this.height * 1.2;
    const bottom = this.y + this.height * 2.2;

    ctx.save();
    ctx.shadowColor = "#FFE176";
    ctx.shadowBlur = 16;
    ctx.fillStyle = `rgba(255,220,92,${(0.68 + pulse).toFixed(3)})`;
    ctx.fillRect(beamX, top, beamWidth, bottom - top);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(255, 246, 210, 0.95)";
    ctx.lineWidth = 2;
    ctx.strokeRect(beamX, this.y, beamWidth, this.height);
    ctx.restore();
  }
}

// ===== Trigger =====
class Trigger {
  constructor(x, y, type = "bounce", radius = 30) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = Math.max(14, radius);
    this.cooldown = 0;
    this.locked = false;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  tick() {
    if (this.cooldown > 0) this.cooldown--;
  }

  isManual() {
    return MANUAL_TRIGGER_TYPES.has(this.type);
  }

  touching(player) {
    const cx = player.x + player.width * 0.5;
    const cy = player.y + player.height * 0.5;
    const reach = this.radius + player.height * 0.5;
    return Math.hypot(cx - this.x, cy - this.y) <= reach;
  }

  shouldActivate(input) {
    if (this.isManual()) {
      return input.justPressed;
    }
    return true;
  }

  activate(player, effects) {
    if (this.cooldown > 0) return false;

    const color = TRIGGER_COLORS[this.type] || "#B1B9F5";
    switch (this.type) {
      case "bounce":
        player.vy = -player.gravityDir * BOUNCE_FORCE;
        player.y += -player.gravityDir * 3;
        effects.announce("Bounce", color);
        break;
      case "gravity":
        player.gravityDir *= -1;
        player.vy = -player.gravityDir * GRAVITY_FLIP_KICK;
        effects.announce("Gravity Flip", color);
        break;
      case "boost":
        player.boostFrames = Math.max(player.boostFrames, BOOST_DURATION_FRAMES);
        effects.announce("Boost", color);
        break;
      case "rotate":
        if (!player.rotateQuarterTurn()) return false;
        effects.announce("Rotate 90", color);
        break;
      default:
        player.vy = -player.gravityDir * (BOUNCE_FORCE * 0.8);
        effects.announce("Trigger", color);
        break;
    }

    this.cooldown = this.isManual() ? 4 : 12;
    this.locked = true;
    effects.spawnBurst(this.x, this.y, color, 14);
    return true;
  }

  draw(ctx, now) {
    const color = TRIGGER_COLORS[this.type] || "#B9A7FF";
    const pulse = 1 + 0.1 * Math.sin(now * 0.007 + this.pulsePhase);
    const drawRadius = this.radius * pulse;

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, drawRadius + 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = this.cooldown > 0 ? 26 : 18;
    ctx.strokeStyle = color;
    ctx.lineWidth = this.cooldown > 0 ? 5.5 : 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, drawRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    const coreGradient = ctx.createRadialGradient(
      this.x - this.radius * 0.2,
      this.y - this.radius * 0.2,
      this.radius * 0.2,
      this.x,
      this.y,
      this.radius * 0.72
    );
    coreGradient.addColorStop(0, "rgba(32, 44, 86, 0.9)");
    coreGradient.addColorStop(1, "rgba(8, 12, 26, 0.7)");
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.62, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#F6FBFF";
    ctx.font = "bold 18px 'Jersey 15', Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(TRIGGER_LABELS[this.type] || "?", this.x, this.y + 1);
    ctx.restore();
  }
}

// ===== Particles =====
class Particle {
  constructor(x, y, vx, vy, life, size, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.vy += 0.04;
    this.life--;
  }

  get alive() {
    return this.life > 0;
  }

  draw(ctx) {
    if (!this.alive) return;
    const alpha = clamp(this.life / this.maxLife, 0, 1);
    ctx.save();
    ctx.fillStyle = this.toRGBA(alpha * 0.95);
    ctx.fillRect(this.x - this.size * 0.5, this.y - this.size * 0.5, this.size, this.size);
    ctx.restore();
  }

  toRGBA(alpha) {
    const hex = this.color.replace("#", "");
    if (hex.length !== 6) {
      return `rgba(255,255,255,${alpha.toFixed(3)})`;
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
  }
}

// ===== Player =====
class Player {
  constructor(x, y, baseSpeed = BASE_SPEED) {
    this.trail = [];
    this.spawn(x, y, baseSpeed);
  }

  spawn(x, y, baseSpeed = BASE_SPEED) {
    this.x = x;
    this.y = y;
    this.width = PLAYER_W;
    this.height = PLAYER_H;
    this.verticalOrientation = false;
    this.rotateLockFrames = 0;
    this.baseSpeed = clamp(asNumber(baseSpeed, BASE_SPEED), MIN_LEVEL_SPEED, MAX_LEVEL_SPEED);
    this.vx = this.baseSpeed;
    this.vy = 0;
    this.dead = false;
    this.invFrames = 8;
    this.gravityDir = 1;
    this.boostFrames = 0;
    this.previousX = x;
    this.previousY = y;
    this.previousWidth = this.width;
    this.previousHeight = this.height;
    this.onSurface = false;
    this.trail.length = 0;
  }

  die() {
    this.dead = true;
  }

  rotateQuarterTurn() {
    // Allow rotate-back even if the forward-rotation lock is still active.
    if (this.rotateLockFrames > 0 && !this.verticalOrientation) return false;
    const centerX = this.x + this.width * 0.5;
    const centerY = this.y + this.height * 0.5;
    this.verticalOrientation = !this.verticalOrientation;
    this.width = this.verticalOrientation ? PLAYER_H : PLAYER_W;
    this.height = this.verticalOrientation ? PLAYER_W : PLAYER_H;
    this.x = centerX - this.width * 0.5;
    this.y = centerY - this.height * 0.5;
    this.rotateLockFrames = 8;
    return true;
  }

  update(level, input, effects) {
    if (this.dead) return;

    this.previousX = this.x;
    this.previousY = this.y;
    this.previousWidth = this.width;
    this.previousHeight = this.height;
    if (this.invFrames > 0) this.invFrames--;

    const boostMul = this.boostFrames > 0 ? BOOST_MULTIPLIER : 1;
    this.vx = this.baseSpeed * boostMul;
    if (this.boostFrames > 0) this.boostFrames--;
    if (this.rotateLockFrames > 0) this.rotateLockFrames--;

    this.vy += WORLD_GRAVITY * this.gravityDir;
    this.x += this.vx;
    this.y += this.vy;

    for (const trigger of level.triggers) {
      trigger.tick();
      const touching = trigger.touching(this);
      if (!touching) {
        trigger.locked = false;
        continue;
      }

      if (trigger.isManual()) {
        if (!trigger.locked && trigger.shouldActivate(input) && trigger.activate(this, effects)) {
          input.consumeBufferedPress();
        }
        continue;
      }

      if (!trigger.locked && trigger.shouldActivate(input)) {
        trigger.activate(this, effects);
      }
    }

    this.resolveCollisions(level);

    if (this.y > level.bounds.maxY + 600 || this.y < level.bounds.minY - 600) {
      this.die();
    }

    this.updateTrail();
  }

  resolveCollisions(level) {
    for (const hazard of level.hazards) {
      if (overlapRect(this, hazard) && this.invFrames === 0) {
        this.die();
        return;
      }
    }

    this.onSurface = false;
    for (const block of level.solids) {
      if (!overlapRect(this, block)) continue;

      const cameFromLeft = this.previousX + this.previousWidth <= block.x;
      const cameFromRight = this.previousX >= block.x + block.width;
      const cameFromAbove = this.previousY + this.previousHeight <= block.y;
      const cameFromBelow = this.previousY >= block.y + block.height;
      const verticalOverlap = Math.min(this.y + this.height, block.y + block.height) - Math.max(this.y, block.y);
      const killOverlapThreshold = Math.min(this.height, block.height) * 0.5;
      const verticalOverlapSafe = verticalOverlap > killOverlapThreshold;
      const landingTolerance = 6;
      const likelyLandingContact =
        this.gravityDir > 0
          ? this.previousY + this.previousHeight <= block.y + landingTolerance
          : this.previousY >= block.y + block.height - landingTolerance;

      if ((cameFromLeft || cameFromRight) && this.invFrames === 0) {
        if (!likelyLandingContact && verticalOverlapSafe) {
          this.die();
          return;
        }
      }

      if (this.gravityDir > 0) {
        if (cameFromAbove && this.vy >= 0) {
          this.y = block.y - this.height;
          this.vy = 0;
          this.onSurface = true;
          continue;
        }
        if (cameFromBelow && this.vy < 0) {
          this.y = block.y + block.height;
          this.vy = 0;
          continue;
        }
      } else {
        if (cameFromBelow && this.vy <= 0) {
          this.y = block.y + block.height;
          this.vy = 0;
          this.onSurface = true;
          continue;
        }
        if (cameFromAbove && this.vy > 0) {
          this.y = block.y - this.height;
          this.vy = 0;
          continue;
        }
      }

      const penetrationLeft = this.x + this.width - block.x;
      const penetrationRight = block.x + block.width - this.x;
      const penetrationTop = this.y + this.height - block.y;
      const penetrationBottom = block.y + block.height - this.y;
      const minHorizontal = Math.min(penetrationLeft, penetrationRight);
      const minVertical = Math.min(penetrationTop, penetrationBottom);

      if (minHorizontal < minVertical && this.invFrames === 0) {
        if (!likelyLandingContact && verticalOverlapSafe) {
          this.die();
          return;
        }
      }

      if (this.gravityDir > 0) {
        if (penetrationTop <= penetrationBottom) {
          this.y = block.y - this.height;
          this.onSurface = true;
        } else {
          this.y = block.y + block.height;
        }
      } else {
        if (penetrationBottom <= penetrationTop) {
          this.y = block.y + block.height;
          this.onSurface = true;
        } else {
          this.y = block.y - this.height;
        }
      }
      this.vy = 0;
    }
  }

  updateTrail() {
    this.trail.push({
      x: this.x + this.width * 0.5,
      y: this.y + this.height * 0.5,
    });
    if (this.trail.length > 20) this.trail.shift();
  }

  draw(ctx) {
    if (this.dead) return;

    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const alpha = ((i + 1) / this.trail.length) * 0.22;
      const width = this.width * 0.86;
      const height = this.height * 0.86;
      ctx.save();
      ctx.fillStyle = `rgba(112, 182, 255, ${alpha.toFixed(3)})`;
      ctx.fillRect(p.x - width * 0.5, p.y - height * 0.5, width, height);
      ctx.restore();
    }

    ctx.save();
    const bodyW = this.width;
    const bodyH = this.height;
    const left = this.x;
    const top = this.y;

    const glowColor = this.boostFrames > 0 ? "rgba(120, 255, 255, 0.85)" : "rgba(120, 190, 255, 0.65)";
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = this.boostFrames > 0 ? 22 : 14;
    ctx.fillStyle = "rgba(90, 140, 255, 0.3)";
    ctx.fillRect(left - 3, top - 3, bodyW + 6, bodyH + 6);
    ctx.restore();

    const gradient = ctx.createLinearGradient(left, top, left + bodyW, top);
    gradient.addColorStop(0, "#5D9CFF");
    gradient.addColorStop(0.5, "#85D5FF");
    gradient.addColorStop(1, "#4672E8");
    ctx.fillStyle = gradient;
    ctx.fillRect(left, top, bodyW, bodyH);

    ctx.fillStyle = "rgba(245, 252, 255, 0.75)";
    ctx.fillRect(left + bodyW * 0.06, top + bodyH * 0.14, bodyW * 0.55, bodyH * 0.2);

    ctx.strokeStyle = "rgba(238, 248, 255, 0.95)";
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, bodyW, bodyH);

    ctx.fillStyle = this.gravityDir > 0 ? "rgba(125, 248, 255, 0.95)" : "rgba(255, 165, 224, 0.95)";
    ctx.beginPath();
    if (this.gravityDir > 0) {
      const arrowX = left + bodyW - 12;
      const arrowY = top + bodyH - 3;
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - 8, arrowY - 9);
      ctx.lineTo(arrowX + 8, arrowY - 9);
    } else {
      const arrowX = left + bodyW - 12;
      const arrowY = top + 3;
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - 8, arrowY + 9);
      ctx.lineTo(arrowX + 8, arrowY + 9);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ===== Input =====
class Input {
  constructor(canvas) {
    this.pressed = false;
    this.justPressed = false;
    this.bufferedPressFrames = 0;

    const press = () => {
      if (!this.pressed) {
        this.justPressed = true;
        this.bufferedPressFrames = 8;
      }
      this.pressed = true;
    };
    const release = () => {
      this.pressed = false;
    };

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        press();
      }
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") release();
    });

    canvas.addEventListener("mousedown", (e) => {
      e.preventDefault();
      press();
    });
    window.addEventListener("mouseup", release);

    canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        press();
      },
      { passive: false }
    );
    window.addEventListener("touchend", release);
    window.addEventListener("touchcancel", release);
    window.addEventListener("blur", release);
  }

  hasBufferedPress() {
    return this.justPressed || this.bufferedPressFrames > 0;
  }

  consumeBufferedPress() {
    this.justPressed = false;
    this.bufferedPressFrames = 0;
  }

  endFrame() {
    this.justPressed = false;
    if (this.bufferedPressFrames > 0) this.bufferedPressFrames--;
  }
}

// ===== Game =====
class Game {
  constructor() {
    this.level = this.createEmptyLevel();
    this.player = null;
    this.input = new Input(canvas);
    this.particles = [];
    this.camera = { x: 0, y: 0 };
    this.respawnCounter = -1;
    this.hudMessage = null;
    this.stars = [];
    this.elapsedFrames = 0;
    this.startMarkerX = null;
    this.finishMarkerX = null;
    this.completed = false;
    this.songAudio = null;
    this.songUrl = null;

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.loadLevel();
    this.setupAudio();
    this.loop();
  }

  setupAudio() {
    if (!this.songUrl) return;
    const audio = document.createElement("audio");
    audio.preload = "auto";
    audio.style.display = "none";
    audio.addEventListener("error", () => {
      console.error("[game audio] error:", audio.error, audio.currentSrc);
    });
    document.body.appendChild(audio);
    audio.src = this.songUrl;
    audio.load();
    this.songAudio = audio;
    const tryStart = () => {
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.catch((err) => {
          console.warn("[game audio] autoplay blocked, will retry on input:", err);
          const onUserInput = () => {
            audio.play().catch((e2) => console.error("[game audio] retry failed:", e2));
            window.removeEventListener("pointerdown", onUserInput);
            window.removeEventListener("keydown", onUserInput);
          };
          window.addEventListener("pointerdown", onUserInput, { once: true });
          window.addEventListener("keydown", onUserInput, { once: true });
        });
      }
    };
    if (audio.readyState >= 2) tryStart();
    else audio.addEventListener("canplay", tryStart, { once: true });
  }

  restartAudio() {
    if (!this.songAudio) return;
    try {
      this.songAudio.currentTime = 0;
      const p = this.songAudio.play();
      if (p && typeof p.then === "function") p.catch(() => {});
    } catch (_) {}
  }

  createEmptyLevel() {
    return {
      solids: [],
      hazards: [],
      startLines: [],
      finishLines: [],
      finishLine: null,
      triggers: [],
      baseSpeed: BASE_SPEED,
      durationSeconds: 0,
      endX: null,
      bounds: {
        minX: -400,
        maxX: canvas.width + 400,
        minY: -300,
        maxY: canvas.height + 300,
      },
    };
  }

  resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    this.generateStars();
    if (this.player) this.snapCameraToPlayer();
  }

  generateStars() {
    this.stars = Array.from({ length: 110 }, (_, i) => ({
      x: seededRandom(i + 7),
      y: seededRandom(i * 11 + 31),
      size: 1 + seededRandom(i * 19 + 67) * 1.9,
      depth: 0.06 + seededRandom(i * 17 + 53) * 0.28,
    }));
  }

  loadLevel() {
    const urlData = new URLSearchParams(window.location.search).get("data");
    if (urlData) {
      try {
        const parsedUrlLevel = JSON.parse(decodeURIComponent(urlData));
        if (this.parse(parsedUrlLevel)) return;
      } catch (error) {
        console.warn("Could not parse URL level data:", error);
      }
    }

    const saved = localStorage.getItem("sledgepong_current_level");
    if (saved) {
      try {
        const parsedSavedLevel = JSON.parse(saved);
        if (this.parse(parsedSavedLevel)) return;
      } catch (error) {
        console.warn("Could not parse saved level data:", error);
      }
    }

    this.loadFallback();
  }

  parse(data) {
    if (!data || !Array.isArray(data.entities)) return false;

    const level = this.createEmptyLevel();
    const levelSpeed = asNumber(data.baseSpeed ?? data.speed, BASE_SPEED);
    level.baseSpeed = clamp(levelSpeed, MIN_LEVEL_SPEED, MAX_LEVEL_SPEED);
    const durationSeconds = asNumber(data.durationSeconds ?? data.lengthSeconds, 0);
    level.durationSeconds = clamp(durationSeconds, 0, MAX_LEVEL_DURATION_SECONDS);

    const songCandidate = (typeof data.songObjectUrl === "string" && data.songObjectUrl)
      || (typeof data.song_url === "string" && data.song_url)
      || (typeof data.songUrl === "string" && data.songUrl)
      || null;
    if (songCandidate) this.songUrl = songCandidate;
    const bounds = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    };

    const expandBounds = (left, top, right, bottom) => {
      bounds.minX = Math.min(bounds.minX, left);
      bounds.maxX = Math.max(bounds.maxX, right);
      bounds.minY = Math.min(bounds.minY, top);
      bounds.maxY = Math.max(bounds.maxY, bottom);
    };

    for (const item of data.entities) {
      const typeRaw = typeof item.type === "string" ? item.type : "block";
      const objectTypeNormalized = normalizeObjectType(typeRaw);
      const triggerTypeNormalized = normalizeTriggerType(typeRaw);
      const x = asNumber(item.x, 0);
      const y = asNumber(item.y, 0);

      if (item.category === "trigger" || KNOWN_TRIGGER_TYPES.has(triggerTypeNormalized)) {
        const triggerType = KNOWN_TRIGGER_TYPES.has(triggerTypeNormalized) ? triggerTypeNormalized : "bounce";
        const radius = Math.max(14, asNumber(item.radius, 30));
        const trigger = new Trigger(x, y, triggerType, radius);
        level.triggers.push(trigger);
        expandBounds(x - radius, y - radius, x + radius, y + radius);
        continue;
      }

      const objectType = KNOWN_OBJECT_TYPES.has(objectTypeNormalized) ? objectTypeNormalized : "block";
      const size = Math.max(20, asNumber(item.size, 40));
      const object = new WorldObject(x, y, size, objectType);
      if (object.isHazard()) {
        level.hazards.push(object);
      } else if (object.isStartLine()) {
        level.startLines.push(object);
      } else if (object.isFinishLine()) {
        level.finishLines.push(object);
      } else {
        level.solids.push(object);
      }
      expandBounds(x, y, x + size, y + size);
    }

    let chosenStartLine = null;
    if (level.startLines.length > 0) {
      chosenStartLine = level.startLines.reduce((best, line) => (line.x < best.x ? line : best), level.startLines[0]);
    }

    let chosenFinishLine = null;
    if (level.finishLines.length > 0) {
      if (chosenStartLine) {
        const afterStart = level.finishLines.filter((line) => line.x >= chosenStartLine.x);
        const candidates = afterStart.length > 0 ? afterStart : level.finishLines;
        chosenFinishLine = candidates.reduce((best, line) => (line.x < best.x ? line : best), candidates[0]);
      } else {
        chosenFinishLine = level.finishLines.reduce((best, line) => (line.x < best.x ? line : best), level.finishLines[0]);
      }
    }

    if (chosenStartLine && chosenFinishLine && chosenFinishLine.x <= chosenStartLine.x) {
      chosenFinishLine = null;
    }

    const startCutoffX = chosenStartLine ? chosenStartLine.x - 2 : -Infinity;
    const finishCutoffX = chosenFinishLine ? chosenFinishLine.x + chosenFinishLine.width + 2 : Infinity;

    if (Number.isFinite(startCutoffX) || Number.isFinite(finishCutoffX)) {
      level.solids = level.solids.filter(
        (object) => object.x + object.width >= startCutoffX && object.x <= finishCutoffX
      );
      level.hazards = level.hazards.filter(
        (object) => object.x + object.width >= startCutoffX && object.x <= finishCutoffX
      );
      level.triggers = level.triggers.filter(
        (trigger) => trigger.x + trigger.radius >= startCutoffX && trigger.x - trigger.radius <= finishCutoffX
      );
    }

    if (Number.isFinite(startCutoffX)) {
      bounds.minX = Math.max(bounds.minX, startCutoffX - 500);
    }
    if (Number.isFinite(finishCutoffX)) {
      bounds.maxX = Math.min(bounds.maxX, finishCutoffX + 500);
    }

    if (!Number.isFinite(bounds.minX)) {
      bounds.minX = -400;
      bounds.maxX = canvas.width + 700;
      bounds.minY = -300;
      bounds.maxY = canvas.height + 300;
    } else {
      bounds.minX -= 500;
      bounds.maxX += 800;
      bounds.minY -= 500;
      bounds.maxY += 500;
    }
    level.bounds = bounds;

    const spawn = this.resolveSpawn(level);
    this.level = level;
    this.level.finishLine = chosenFinishLine || null;
    this.player = new Player(spawn.x, spawn.y, level.baseSpeed);
    this.particles.length = 0;
    this.hudMessage = null;
    this.respawnCounter = -1;
    this.elapsedFrames = 0;
    this.completed = false;
    this.startMarkerX = chosenStartLine ? chosenStartLine.centerX : null;
    this.finishMarkerX = chosenFinishLine ? chosenFinishLine.centerX : null;
    level.endX = this.finishMarkerX;
    this.snapCameraToPlayer();
    return true;
  }

  resolveSpawn(level) {
    let spawnX = 100;
    let spawnY = canvas.height * 0.5 - PLAYER_H * 0.5;

    if (level.startLines.length > 0) {
      const start = level.startLines.reduce((best, item) => (item.x < best.x ? item : best), level.startLines[0]);
      spawnX = start.centerX - PLAYER_W * 0.5;
      spawnY = start.y - PLAYER_H;
    } else if (level.solids.length > 0) {
      const first = level.solids.reduce((best, item) => (item.x < best.x ? item : best), level.solids[0]);
      spawnX = first.x - PLAYER_W - 120;
      spawnY = first.y - PLAYER_H - 14;
    }

    return {
      x: spawnX,
      y: clamp(spawnY, level.bounds.minY + 50, level.bounds.maxY - 50),
    };
  }

  loadFallback() {
    const baseY = Math.floor(canvas.height * 0.68 / 40) * 40;
    const entities = [];

    for (let i = 0; i < 34; i++) {
      entities.push({ category: "object", type: "block", x: 220 + i * 40, y: baseY, size: 40 });
    }

    for (let i = 0; i < 8; i++) {
      entities.push({ category: "object", type: "block", x: 740 + i * 40, y: baseY - 240, size: 40 });
    }

    entities.push({ category: "object", type: "startline", x: 260, y: baseY - 40, size: 40 });
    entities.push({ category: "object", type: "finishline", x: 1440, y: baseY - 40, size: 40 });
    entities.push({ category: "object", type: "killblock", x: 580, y: baseY - 40, size: 40 });
    entities.push({ category: "object", type: "killblock", x: 980, y: baseY - 200, size: 40 });

    entities.push({ category: "trigger", type: "bounce", x: 460, y: baseY - 42, radius: 30 });
    entities.push({ category: "trigger", type: "gravity", x: 690, y: baseY - 54, radius: 30 });
    entities.push({ category: "trigger", type: "boost", x: 820, y: baseY - 58, radius: 30 });
    entities.push({ category: "trigger", type: "rotate", x: 1040, y: baseY - 212, radius: 30 });
    entities.push({ category: "trigger", type: "bounce", x: 1210, y: baseY - 214, radius: 30 });

    this.parse({
      name: "Fallback Demo",
      version: 1,
      gridSize: 40,
      baseSpeed: BASE_SPEED,
      durationSeconds: 90,
      entities,
    });
  }

  spawnBurst(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.36;
      const speed = 2.2 + Math.random() * 2.8;
      const life = 18 + Math.floor(Math.random() * 14);
      const size = 2 + Math.random() * 2.2;
      this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, life, size, color));
    }
  }

  announce(text, color) {
    this.hudMessage = {
      text,
      color,
      ttl: 54,
    };
  }

  update() {
    if (!this.player) return;

    if (!this.completed) {
      this.player.update(this.level, this.input, {
        spawnBurst: (x, y, color, count) => this.spawnBurst(x, y, color, count),
        announce: (text, color) => this.announce(text, color),
      });

      if (!this.player.dead && this.level.durationSeconds > 0) {
        this.elapsedFrames++;
      }

      const finishLine = this.level.finishLine;
      if (!this.player.dead && finishLine) {
        const crossedFinishX = this.player.x + this.player.width >= finishLine.x;
        if (crossedFinishX) {
          this.completed = true;
          this.player.baseSpeed = 0;
          this.player.vx = 0;
          this.player.vy = 0;
          this.announce("Finish!", "#9AFFF0");
          this.spawnBurst(finishLine.centerX, this.player.y + this.player.height * 0.5, "#9AFFF0", 24);
        }
      }
    }

    this.particles = this.particles.filter((p) => {
      p.update();
      return p.alive;
    });

    if (this.hudMessage) {
      this.hudMessage.ttl--;
      if (this.hudMessage.ttl <= 0) this.hudMessage = null;
    }

    this.updateCamera();

    if (!this.completed && this.player.dead) {
      if (this.respawnCounter < 0) {
        this.respawnCounter = RESPAWN_DELAY_FRAMES;
      } else {
        this.respawnCounter--;
        if (this.respawnCounter <= 0) {
          this.loadLevel();
          this.restartAudio();
        }
      }
    } else {
      this.respawnCounter = -1;
    }

    this.input.endFrame();
  }

  updateCamera() {
    if (!this.player) return;

    const targetX = this.player.x - canvas.width * 0.35 + CAMERA_LEAD;
    const targetY =
      this.player.y -
      canvas.height * 0.5 +
      (this.player.gravityDir > 0 ? CAMERA_VERTICAL_LOOK : -CAMERA_VERTICAL_LOOK);

    this.camera.x += (targetX - this.camera.x) * CAMERA_LERP;
    this.camera.y += (targetY - this.camera.y) * CAMERA_LERP;

    this.camera.x = clamp(
      this.camera.x,
      this.level.bounds.minX - 240,
      this.level.bounds.maxX - canvas.width + 240
    );
    this.camera.y = clamp(
      this.camera.y,
      this.level.bounds.minY - 260,
      this.level.bounds.maxY - canvas.height + 260
    );
  }

  snapCameraToPlayer() {
    if (!this.player) return;

    this.camera.x = this.player.x - canvas.width * 0.35 + CAMERA_LEAD;
    this.camera.y =
      this.player.y -
      canvas.height * 0.5 +
      (this.player.gravityDir > 0 ? CAMERA_VERTICAL_LOOK : -CAMERA_VERTICAL_LOOK);

    this.camera.x = clamp(
      this.camera.x,
      this.level.bounds.minX - 240,
      this.level.bounds.maxX - canvas.width + 240
    );
    this.camera.y = clamp(
      this.camera.y,
      this.level.bounds.minY - 260,
      this.level.bounds.maxY - canvas.height + 260
    );
  }

  drawBackground(now) {
    const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, "#060a18");
    background.addColorStop(0.5, "#101942");
    background.addColorStop(1, "#1a0a2f");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(130, 230, 255, 0.9)";
    for (const star of this.stars) {
      const x = ((star.x * canvas.width - this.camera.x * star.depth) % canvas.width + canvas.width) % canvas.width;
      const y =
        ((star.y * canvas.height - this.camera.y * star.depth) % canvas.height + canvas.height) % canvas.height;
      ctx.globalAlpha = 0.45 + 0.45 * Math.sin(now * 0.0015 + x * 0.01);
      ctx.fillRect(x, y, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(120, 190, 255, 0.12)";
    ctx.lineWidth = 1;
    const spacing = 76;
    const offsetX = ((-this.camera.x * 0.28) % spacing + spacing) % spacing;
    for (let x = -spacing; x < canvas.width + spacing; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x + offsetX, 0);
      ctx.lineTo(x + offsetX, canvas.height);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 220, 180, 0.06)";
    const offsetY = ((-this.camera.y * 0.2 + now * 0.03) % spacing + spacing) % spacing;
    for (let y = -spacing; y < canvas.height + spacing; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y + offsetY);
      ctx.lineTo(canvas.width, y + offsetY);
      ctx.stroke();
    }

    this.drawSpeedStreaks(now);
    this.drawBeatPulse(now);
    this.drawAurora(now);

    const vignette = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.2,
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.8
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawSpeedStreaks(now) {
    if (!this.player) return;
    const speed = clamp(this.player.vx / 8, 0.35, 2.4);
    const count = 22;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < count; i++) {
      const seed = i * 97.3;
      const y = seededRandom(seed) * canvas.height;
      const length = 90 + seededRandom(seed + 11) * 160;
      const thickness = 1 + seededRandom(seed + 3) * 1.8;
      const phase = (now * 0.08 * speed + seededRandom(seed + 7) * canvas.width * 2.4) % (canvas.width + length);
      const x = canvas.width - phase;
      ctx.strokeStyle = `rgba(120, 200, 255, ${(0.16 + 0.1 * speed).toFixed(3)})`;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBeatPulse(now) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.003);
    const radius = canvas.width * (0.25 + 0.08 * pulse);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const grad = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.55,
      radius * 0.2,
      canvas.width * 0.5,
      canvas.height * 0.55,
      radius
    );
    grad.addColorStop(0, `rgba(120, 220, 255, ${(0.06 + 0.04 * pulse).toFixed(3)})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  drawAurora(now) {
    const width = canvas.width;
    const height = canvas.height;
    const bands = [
      { y: height * 0.28, amp: 38, colorA: "rgba(120,220,255,0.22)", colorB: "rgba(160,120,255,0.18)" },
      { y: height * 0.52, amp: 52, colorA: "rgba(120,255,220,0.18)", colorB: "rgba(90,140,255,0.2)" },
      { y: height * 0.74, amp: 34, colorA: "rgba(180,140,255,0.18)", colorB: "rgba(120,220,255,0.18)" },
    ];

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      const offset = Math.sin(now * 0.0004 + i) * band.amp;
      const gradient = ctx.createLinearGradient(0, band.y, width, band.y);
      gradient.addColorStop(0, band.colorA);
      gradient.addColorStop(0.5, band.colorB);
      gradient.addColorStop(1, band.colorA);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.moveTo(-120, band.y + offset);
      ctx.bezierCurveTo(
        width * 0.25,
        band.y - band.amp,
        width * 0.7,
        band.y + band.amp,
        width + 120,
        band.y - offset
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHud() {
    if (!this.player) return;

    ctx.save();
    const hudGradient = ctx.createLinearGradient(14, 14, 14, 166);
    hudGradient.addColorStop(0, "rgba(8, 18, 36, 0.86)");
    hudGradient.addColorStop(1, "rgba(10, 12, 26, 0.7)");
    ctx.fillStyle = hudGradient;
    ctx.shadowColor = "rgba(110, 200, 255, 0.28)";
    ctx.shadowBlur = 14;
    ctx.fillRect(14, 14, 300, 152);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(130, 210, 255, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(14.5, 14.5, 299, 151);

    ctx.fillStyle = "#E9F6FF";
    ctx.font = "22px 'Jersey 15', Arial";
    ctx.fillText("Rect Session", 28, 40);

    ctx.font = "16px 'Jersey 15', Arial";
    ctx.fillText(`Speed ${this.player.vx.toFixed(2)} (base ${this.player.baseSpeed.toFixed(2)})`, 28, 64);
    ctx.fillText(`Gravity: ${this.player.gravityDir > 0 ? "Down" : "Up"}`, 28, 84);
    const inputState = this.input.pressed ? "held" : this.input.hasBufferedPress() ? "tap buffered" : "idle";
    const startText = this.startMarkerX === null ? "none" : `x=${Math.round(this.startMarkerX)}`;
    const finishText = this.finishMarkerX === null ? "none" : `x=${Math.round(this.finishMarkerX)}`;
    ctx.fillText(`Markers: S ${startText}  F ${finishText}`, 28, 104);
    ctx.fillText(`Icon: ${this.player.verticalOrientation ? "90deg" : "0deg"}  Input: ${inputState}`, 28, 124);
    if (this.level.durationSeconds > 0) {
      const remaining = Math.max(0, this.level.durationSeconds - Math.floor(this.elapsedFrames / 60));
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      const formatted = `${minutes}:${String(seconds).padStart(2, "0")}`;
      ctx.fillText(`Length: ${formatted}`, 28, 144);
    } else {
      ctx.fillText("Length: unlimited", 28, 144);
    }

    ctx.strokeStyle = "rgba(120, 200, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, 152);
    ctx.lineTo(300, 152);
    ctx.stroke();

    const speedPct = clamp(this.player.vx / MAX_LEVEL_SPEED, 0, 1);
    ctx.fillStyle = "rgba(120, 220, 255, 0.8)";
    ctx.fillRect(24, 156, 260 * speedPct, 6);
    ctx.strokeStyle = "rgba(120, 210, 255, 0.3)";
    ctx.strokeRect(24, 156, 260, 6);
    ctx.restore();

    if (this.hudMessage) {
      ctx.save();
      const alpha = clamp(this.hudMessage.ttl / 54, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(8, 12, 28, 0.7)";
      const width = 220;
      const x = canvas.width * 0.5 - width * 0.5;
      const y = 22;
      ctx.fillRect(x, y, width, 36);
      ctx.strokeStyle = this.hudMessage.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 35);
      ctx.fillStyle = "#F8FCFF";
      ctx.font = "24px 'Jersey 15', Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.hudMessage.text, canvas.width * 0.5, y + 18);
      ctx.restore();
    }
  }

  drawRespawnOverlay() {
    if (!this.player || !this.player.dead) return;
    ctx.save();
    ctx.fillStyle = "rgba(20, 0, 10, 0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255, 210, 220, 0.95)";
    ctx.font = "34px 'Jersey 15', Arial";
    ctx.textAlign = "center";
    ctx.fillText("CRASH", canvas.width * 0.5, canvas.height * 0.44);
    ctx.font = "22px 'Jersey 15', Arial";
    ctx.fillText("Respawning...", canvas.width * 0.5, canvas.height * 0.5);
    ctx.restore();
  }

  drawFinishOverlay() {
    if (!this.completed) return;
    ctx.save();
    ctx.fillStyle = "rgba(6, 24, 20, 0.32)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(216, 255, 246, 0.96)";
    ctx.font = "36px 'Jersey 15', Arial";
    ctx.textAlign = "center";
    ctx.fillText("LEVEL COMPLETE", canvas.width * 0.5, canvas.height * 0.46);
    ctx.restore();
  }

  draw() {
    const now = performance.now();
    this.drawBackground(now);

    ctx.save();
    ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

    for (const object of this.level.solids) object.draw(ctx, now);
    for (const object of this.level.hazards) object.draw(ctx, now);
    for (const trigger of this.level.triggers) trigger.draw(ctx, now);
    for (const particle of this.particles) particle.draw(ctx);

    if (this.player) this.player.draw(ctx);
    ctx.restore();

    this.drawHud();
    this.drawRespawnOverlay();
    this.drawFinishOverlay();
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

// ===== Start =====
new Game();
