// ===== Canvas =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ===== Constants =====
const GRAVITY = 0.6;
const SPEED = 6;
const PLAYER_W = 90;
const PLAYER_H = 30;
const BOUNCE_FORCE = 14;

// ===== Utils =====
const overlap = (a, b) =>
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;

// ===== Block =====
class Block {
  constructor(x, y, size = 40) {
    this.x = x;
    this.y = y;
    this.width = size;
    this.height = size;
  }

  draw(ctx) {
    ctx.fillStyle = "cornflowerblue";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// ===== Trigger (GD Yellow Orb) =====
class Trigger {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 22;
    this.used = false;
  }

  draw(ctx) {
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  touching(player) {
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    return Math.hypot(cx - this.x, cy - this.y) < this.radius + player.height / 2;
  }
}

// ===== Player =====
class Player {
  constructor(x, y) {
    this.spawn(x, y);
  }

  spawn(x, y) {
    this.x = x;
    this.y = y;
    this.width = PLAYER_W;
    this.height = PLAYER_H;
    this.vx = SPEED;
    this.vy = 0;
    this.dead = false;
    this.invFrames = 6;
  }

  update(blocks, triggers, input) {
    if (this.dead) return;

    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    if (this.invFrames > 0) this.invFrames--;

    // ---- Triggers ----
    for (const t of triggers) {
      if (t.touching(this)) {
        if (input.pressed && !t.used) {
          this.vy = -BOUNCE_FORCE;
          t.used = true;
        }
      } else {
        t.used = false;
      }
    }

    // ---- Collision ----
    for (const b of blocks) {
      if (!overlap(this, b)) continue;

      const frontHit =
          this.x + this.width >= b.x &&
          this.x + this.width - SPEED < b.x;

      if (frontHit && this.invFrames === 0) {
        this.dead = true;
        return;
      }

      if (this.vy > 0) {
        this.y = b.y - this.height;
        this.vy = 0;
      }
    }

    if (this.y > canvas.height + 300) this.dead = true;
  }

  draw(ctx) {
    if (this.dead) return;
    ctx.fillStyle = "cornflowerblue";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// ===== Input =====
class Input {
  constructor() {
    this.pressed = false;
    window.addEventListener("keydown", e => {
      if (e.code === "Space") this.pressed = true;
    });
    window.addEventListener("keyup", e => {
      if (e.code === "Space") this.pressed = false;
    });
    canvas.addEventListener("mousedown", () => {
      this.pressed = true;
      setTimeout(() => (this.pressed = false), 100);
    });
  }
}

// ===== Game =====
class Game {
  constructor() {
    this.blocks = [];
    this.triggers = [];
    this.input = new Input();

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.loadLevel();
    this.loop();
  }

  resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  loadLevel() {
    // 1️⃣ URL param (Django preview)
    const urlData = new URLSearchParams(location.search).get("data");
    if (urlData) {
      this.parse(JSON.parse(decodeURIComponent(urlData)));
      return;
    }

    // 2️⃣ localStorage (editor save)
    const saved = localStorage.getItem("sledgepong_current_level");
    if (saved) {
      this.parse(JSON.parse(saved));
      return;
    }

    // 3️⃣ fallback ONLY if nothing exists
    this.loadFallback();
  }

  parse(data) {
    this.blocks = [];
    this.triggers = [];

    for (const e of data.entities) {
      if (e.category === "object") {
        this.blocks.push(new Block(e.x, e.y, e.size ?? 40));
      }
      if (e.category === "trigger" && e.type === "bounce") {
        this.triggers.push(new Trigger(e.x, e.y));
      }
    }

    this.player = new Player(100, canvas.height / 2);
  }

  loadFallback() {
    this.blocks = [new Block(400, canvas.height - 100)];
    this.triggers = [];
    this.player = new Player(100, canvas.height / 2);
  }

  update() {
    this.player.update(this.blocks, this.triggers, this.input);
    if (this.player.dead) setTimeout(() => this.loadLevel(), 400);
  }

  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.blocks.forEach(b => b.draw(ctx));
    this.triggers.forEach(t => t.draw(ctx));
    this.player.draw(ctx);
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

// ===== Start =====
new Game();
