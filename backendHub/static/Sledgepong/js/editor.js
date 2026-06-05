class UIElement {
    constructor(x, y, width, height, label, action) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.label = label;
        this.action = action;
        this.hovered = false;
        this.active = false;
    }

    contains(px, py) {
        return px >= this.x && px <= this.x + this.width &&
            py >= this.y && py <= this.y + this.height;
    }

    draw(ctx) {
        ctx.save();
        const background = this.active
            ? "rgba(90,120,200,0.95)"
            : (this.hovered ? "rgba(80,80,80,0.9)" : "rgba(50,50,50,0.8)");
        ctx.fillStyle = background;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = this.active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)";
        ctx.lineWidth = this.active ? 2 : 1.5;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = "white";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height / 2);
        ctx.restore();
    }
}

const OBJECT_PALETTE = [
    { label: "Block", tool: "block" },
    { label: "KillBlock", tool: "killblock" },
    { label: "StartLine", tool: "startline" },
    { label: "FinishLine", tool: "finishline" },
    { label: "Erase", tool: "erase" },
];

const TRIGGER_PALETTE = [
    { label: "Rotate", tool: "rotate" },
    { label: "Boost", tool: "boost" },
    { label: "Gravity", tool: "gravity" },
    { label: "Bounce", tool: "bounce" },
];

const PLACEABLE_OBJECT_TOOLS = new Set(OBJECT_PALETTE.filter(item => item.tool !== "erase").map(item => item.tool));
const PLACEABLE_TRIGGER_TOOLS = new Set(TRIGGER_PALETTE.map(item => item.tool));
const TOOL_LABEL_MAP = new Map([...OBJECT_PALETTE, ...TRIGGER_PALETTE].map(item => [item.tool, item.label]));
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
const DEFAULT_LEVEL_SPEED = 1.0;
const MIN_LEVEL_SPEED = 2;
const MAX_LEVEL_SPEED = 12;
const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));
const sanitizeLevelSpeed = (value, fallback = DEFAULT_LEVEL_SPEED) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const clamped = clampNumber(numeric, MIN_LEVEL_SPEED, MAX_LEVEL_SPEED);
    return Math.round(clamped * 100) / 100;
};
const DEFAULT_LEVEL_DURATION_SECONDS = 90;
const MIN_LEVEL_DURATION_SECONDS = 5;
const MAX_LEVEL_DURATION_SECONDS = 7200;
const sanitizeLevelDuration = (value, fallback = DEFAULT_LEVEL_DURATION_SECONDS) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const clamped = clampNumber(numeric, MIN_LEVEL_DURATION_SECONDS, MAX_LEVEL_DURATION_SECONDS);
    return Math.round(clamped);
};
const formatDuration = (totalSeconds) => {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const SAVE_FOLDER_DB_NAME = "sledgepong_editor";
const SAVE_FOLDER_STORE = "handles";
const SAVE_FOLDER_KEY = "save_folder";
const SAVE_SUBFOLDER_NAME = "Sledgepong Levels";

const openHandleDB = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(SAVE_FOLDER_DB_NAME, 1);
    request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SAVE_FOLDER_STORE)) {
            db.createObjectStore(SAVE_FOLDER_STORE);
        }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const idbGetHandle = async (key) => {
    try {
        const db = await openHandleDB();
        return await new Promise((resolve) => {
            const tx = db.transaction(SAVE_FOLDER_STORE, "readonly");
            const store = tx.objectStore(SAVE_FOLDER_STORE);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (error) {
        console.error("Failed to read handle from DB:", error);
        return null;
    }
};

const idbSetHandle = async (key, value) => {
    try {
        const db = await openHandleDB();
        return await new Promise((resolve) => {
            const tx = db.transaction(SAVE_FOLDER_STORE, "readwrite");
            const store = tx.objectStore(SAVE_FOLDER_STORE);
            const req = store.put(value, key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    } catch (error) {
        console.error("Failed to write handle to DB:", error);
        return false;
    }
};

class Toolbar {
    constructor(editor) {
        this.editor = editor;
        this.width = 220;
        const tabDefs = [
            { key: "objects", label: "Objects" },
            { key: "triggers", label: "Triggers" },
            { key: "settings", label: "Settings" },
        ];
        this.tabs = tabDefs.map((tab, index) => {
            const element = new UIElement(8 + index * 68, 20, 66, 30, tab.label, () => this.switch(tab.key));
            element.tabKey = tab.key;
            element.active = tab.key === "objects";
            return element;
        });
        this.buttons = [];
        this.utilities = [];
        this.activeTab = "objects";
        this.#setupButtons();
        this.onResize();
    }

    #setupButtons() {
        let palette = [];
        if (this.activeTab === "objects") {
            palette = OBJECT_PALETTE;
        } else if (this.activeTab === "triggers") {
            palette = TRIGGER_PALETTE;
        }
        this.buttons = palette.map((item, index) => {
            const column = index % 2;
            const row = Math.floor(index / 2);
            const x = 20 + column * 100;
            const y = 70 + row * 100;
            const element = new UIElement(x, y, 80, 80, item.label, () => this.editor.setTool(item.tool, item.label));
            element.tool = item.tool;
            return element;
        });
    }

    switch(tab) {
        this.activeTab = tab;
        for (let t of this.tabs) {
            t.active = t.tabKey === tab;
        }
        this.#setupButtons();
        if (this.buttons.length) {
            const active = this.buttons.find(button => button.tool === this.editor.currentTool);
            if (!active) {
                const first = this.buttons[0];
                this.editor.setTool(first.tool, first.label);
            }
        }
    }

    handleClick(x, y) {
        for (let t of this.tabs)
            if (t.contains(x, y)) return t.action();

        for (let b of this.buttons)
            if (b.contains(x, y)) return b.action();

        if (this.activeTab !== "settings") return;
        for (let u of this.utilities)
            if (u.contains(x, y)) return u.action();
    }

    handleHover(x, y) {
        const interactive = this.activeTab === "settings"
            ? [...this.tabs, ...this.buttons, ...this.utilities]
            : [...this.tabs, ...this.buttons];
        for (let e of interactive)
            e.hovered = e.contains(x, y);
    }
    onResize() {
        const canvasHeight = this.editor.canvas.height;
        const actions = [
            { label: this.editor.getSongLabel(), handler: () => this.editor.promptLoadSong() },
            { label: this.editor.getMusicLabel(), handler: () => this.editor.toggleMusic() },
            { label: "Rewind Music", handler: () => this.editor.rewindMusic() },
            { label: "Test Level", handler: () => this.editor.testLevel() },
            { label: "Save Level", handler: () => this.editor.saveLevel() },
            { label: `Visibility: ${this.editor.getVisibilityLabel()}`, handler: () => this.editor.toggleVisibility() },
            { label: this.editor.getSaveFolderLabel(), handler: () => this.editor.promptSaveFolder() },
            { label: "Load Level", handler: () => this.editor.promptLoadLevel() },
            { label: "My Cloud Levels", handler: () => this.editor.loadFromCloud() },
            { label: `AutoSnap: ${this.editor.autoSnap ? "On" : "Off"}`, handler: () => this.editor.toggleAutoSnap() },
            { label: "Level Speed", handler: () => this.editor.promptLevelSpeed() },
            { label: "Level Time", handler: () => this.editor.promptLevelDuration() },
            { label: "Clear Level", handler: () => this.editor.clearEntities() },
        ];
        const panelHeight = actions.length * 50;
        const baseY = Math.max(canvasHeight - panelHeight - 24, 230);
        this.utilities = actions.map((item, index) => {
            const util = new UIElement(20, baseY + index * 50, 180, 40, item.label, item.handler);
            util.tool = null;
            return util;
        });
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, this.width, this.editor.canvas.height);
        ctx.restore();

        for (let t of this.tabs) {
            t.active = t.tabKey === this.activeTab;
            t.draw(ctx);
        }
        const activeTool = this.editor.currentTool;
        for (let b of this.buttons) {
            b.active = b.tool === activeTool;
            b.draw(ctx);
        }
        if (this.activeTab === "settings") {
            for (let u of this.utilities) {
                u.active = false;
                u.draw(ctx);
            }
        }
    }
}

class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.selected = false;
    }
}

class GameObject extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type;
        this.size = 40;
    }

    draw(ctx) {
        ctx.save();
        if (this.type === "killblock") {
            this.#drawKillHazard(ctx);
        } else if (this.type === "startline") {
            const startGradient = ctx.createLinearGradient(this.x, this.y, this.x + this.size, this.y);
            startGradient.addColorStop(0, "#1abec6");
            startGradient.addColorStop(1, "#0b6472");
            ctx.fillStyle = startGradient;
            ctx.fillRect(this.x, this.y, this.size, this.size);
            ctx.strokeStyle = "rgba(235, 248, 255, 0.65)";
            ctx.lineWidth = 1.4;
            ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.size - 1, this.size - 1);
            this.#drawStartIcon(ctx);
        } else if (this.type === "finishline") {
            this.#drawFinishMarker(ctx);
            this.#drawFinishIcon(ctx);
        } else {
            const blockGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.size);
            blockGradient.addColorStop(0, "#66b9ff");
            blockGradient.addColorStop(1, "#2a45cc");
            ctx.fillStyle = blockGradient;
            ctx.fillRect(this.x, this.y, this.size, this.size);
            ctx.strokeStyle = "rgba(235, 248, 255, 0.65)";
            ctx.lineWidth = 1.4;
            ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.size - 1, this.size - 1);
        }
        if (this.selected) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.size, this.size);
        }
        ctx.restore();
    }

    #drawKillHazard(ctx) {
        const centerX = this.x + this.size / 2;
        const centerY = this.y + this.size / 2;
        const radius = this.size * 0.42;
        ctx.save();
        ctx.shadowColor = "rgba(255, 80, 80, 0.9)";
        ctx.shadowBlur = 12;
        ctx.strokeStyle = "rgba(255, 112, 112, 0.95)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        this.#drawKillIcon(ctx);
        ctx.restore();
    }

    #drawKillIcon(ctx) {
        const centerX = this.x + this.size / 2;
        const centerY = this.y + this.size / 2;

        ctx.save();
        ctx.strokeStyle = "white";
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.lineWidth = 2;

        // Head
        ctx.beginPath();
        ctx.arc(centerX, centerY - 4, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Jaw
        ctx.beginPath();
        ctx.rect(centerX - 9, centerY - 2, 18, 10);
        ctx.fill();
        ctx.stroke();

        // Eyes
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(centerX - 4, centerY - 4, 2, 0, Math.PI * 2);
        ctx.arc(centerX + 4, centerY - 4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Nose
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 1);
        ctx.lineTo(centerX - 2, centerY + 2);
        ctx.lineTo(centerX + 2, centerY + 2);
        ctx.closePath();
        ctx.fill();

        // Teeth lines
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(centerX - 6, centerY + 3);
        ctx.lineTo(centerX + 6, centerY + 3);
        ctx.moveTo(centerX - 3, centerY + 3);
        ctx.lineTo(centerX - 3, centerY + 7);
        ctx.moveTo(centerX, centerY + 3);
        ctx.lineTo(centerX, centerY + 7);
        ctx.moveTo(centerX + 3, centerY + 3);
        ctx.lineTo(centerX + 3, centerY + 7);
        ctx.stroke();

        ctx.restore();
    }

    #drawStartIcon(ctx) {
        const centerX = this.x + this.size / 2;
        ctx.save();
        ctx.strokeStyle = "rgba(225, 255, 250, 0.95)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(centerX, this.y + 6);
        ctx.lineTo(centerX, this.y + this.size - 6);
        ctx.stroke();

        ctx.fillStyle = "rgba(225, 255, 250, 0.95)";
        ctx.beginPath();
        ctx.moveTo(centerX + 8, this.y + this.size / 2);
        ctx.lineTo(centerX - 2, this.y + this.size / 2 - 7);
        ctx.lineTo(centerX - 2, this.y + this.size / 2 + 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    #drawFinishIcon(ctx) {
        const poleX = this.x + this.size * 0.34;
        const topY = this.y + 6;
        const bottomY = this.y + this.size - 6;
        const flagTop = this.y + this.size * 0.28;
        const flagBottom = this.y + this.size * 0.72;
        const flagWidth = this.size * 0.36;

        ctx.save();
        ctx.strokeStyle = "rgba(255, 250, 230, 0.95)";
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        ctx.moveTo(poleX, topY);
        ctx.lineTo(poleX, bottomY);
        ctx.stroke();

        const cols = 2;
        const rows = 2;
        const cellW = flagWidth / cols;
        const cellH = (flagBottom - flagTop) / rows;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const dark = (row + col) % 2 === 0;
                ctx.fillStyle = dark ? "rgba(18, 22, 28, 0.9)" : "rgba(245, 245, 245, 0.95)";
                ctx.fillRect(poleX + col * cellW, flagTop + row * cellH, cellW, cellH);
            }
        }
        ctx.strokeStyle = "rgba(255, 250, 230, 0.9)";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(poleX, flagTop, flagWidth, flagBottom - flagTop);
        ctx.restore();
    }

    #drawFinishMarker(ctx) {
        const beamWidth = Math.max(4, this.size * 0.2);
        const beamX = this.x + this.size * 0.3;
        const top = this.y - this.size * 0.2;
        const bottom = this.y + this.size * 1.2;
        ctx.save();
        ctx.shadowColor = "rgba(255, 225, 120, 0.9)";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "rgba(255, 220, 92, 0.85)";
        ctx.fillRect(beamX, top, beamWidth, bottom - top);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 246, 210, 0.95)";
        ctx.lineWidth = 1.8;
        ctx.strokeRect(beamX, this.y, beamWidth, this.size);
        ctx.restore();
    }

    contains(x, y) {
        return x >= this.x && x <= this.x + this.size &&
            y >= this.y && y <= this.y + this.size;
    }

    serialize() {
        return {
            category: "object",
            type: this.type,
            x: this.x,
            y: this.y,
            size: this.size
        };
    }
}

const TRIGGER_COLORS = {
    rotate: "#FFA500",
    boost: "#00CED1",
    gravity: "#FF1493",
    bounce: "#7CFC00"
};

class Trigger extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type;
        this.radius = 30;
    }

    draw(ctx) {
        ctx.save();
        const strokeColor = TRIGGER_COLORS[this.type] ?? "#9370DB";
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        const label = (TOOL_LABEL_MAP.get(this.type) ?? this.type).charAt(0).toUpperCase();
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, this.x, this.y);

        if (this.selected) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    contains(x, y) {
        const dx = x - this.x, dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius;
    }

    serialize() {
        return {
            category: "trigger",
            type: this.type,
            x: this.x,
            y: this.y,
            radius: this.radius
        };
    }
}

class Editor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.entities = [];
        this.currentTool = "block";
        this.dragging = false;
        this.selectedEntity = null;
        this.gridSize = 40;
        this.autoSnap = true;
        this.levelSpeed = DEFAULT_LEVEL_SPEED;
        this.levelDurationSeconds = DEFAULT_LEVEL_DURATION_SECONDS;
        this.viewX = 0;
        this.isPanning = false;
        this.panStartClientX = 0;
        this.panStartViewX = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.message = null;
        this.messageExpires = 0;
        this.saveFolderHandle = null;
        this.csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
        this.isSuperuser = document.querySelector('meta[name="is-superuser"]')?.content === 'true';
        this.visibility = 'private';
        this.lastSongUrl = '';
        this.audioElement = null;
        this.audioObjectUrl = null;
        this.audioFile = null;
        this.audioContext = null;
        this.audioSongName = null;
        this.audioIsPlaying = false;
        this.audioDurationSeconds = 0;
        this.waveformPeaks = null;
        this.waveformSamplesPerSecond = 60;
        this.fileInput = this.#createFileInput();
        this.audioFileInput = this.#createAudioFileInput();
        this.toolbar = new Toolbar(this);

        this.resize();
        window.addEventListener("resize", () => this.resize());
        this.setTool("block", TOOL_LABEL_MAP.get("block"));
        this.#bindEvents();
        this.#loadSaveFolderHandle();
        this.loop();
    }

    resize() {
        this.canvas.width = window.innerWidth * 0.9;
        this.canvas.height = window.innerHeight * 0.75;
        this.toolbar.onResize();
    }

    setTool(tool, label = null) {
        this.currentTool = tool;
        this.dragging = false;
        if (tool === "erase") {
            this.#deselectEntities({ silent: true });
        }
    }

    showMessage(text) {
        if (!text) return;
        this.#setMessage(text);
    }

    testLevel() {
        const serializedEntities = this.entities
            .map(entity => (typeof entity.serialize === "function" ? entity.serialize() : null))
            .filter(Boolean);
        if (serializedEntities.length === 0) {
            this.showMessage("Cannot test empty level");
            return;
        }
        const levelData = {
            name: "__test__",
            version: 1,
            gridSize: this.gridSize,
            baseSpeed: this.levelSpeed,
            durationSeconds: this.levelDurationSeconds,
            entities: serializedEntities,
            songObjectUrl: this.audioObjectUrl || null,
            songName: this.audioSongName || null,
            timestamp: Date.now(),
        };
        try {
            localStorage.setItem("sledgepong_current_level", JSON.stringify(levelData));
        } catch (e) {
            console.error("Failed to stash test level:", e);
            this.showMessage("Could not start test");
            return;
        }
        window.open("/sledgepong/playpage/levels/game", "_blank");
    }
    async saveLevel() {
        const serializedEntities = this.entities
            .map(entity => (typeof entity.serialize === "function" ? entity.serialize() : null))
            .filter(Boolean);

        if (serializedEntities.length === 0) {
            this.showMessage("Cannot save empty level");
            return null;
        }

        if (!this.audioFile) {
            this.showMessage("Load a song first — save cancelled");
            return null;
        }

        const levelNameRaw = prompt("Enter level name:", `Level ${Date.now()}`);
        const levelName = levelNameRaw ? levelNameRaw.trim() : "";
        if (!levelName) {
            this.showMessage("Save cancelled");
            return null;
        }

        const levelData = {
            name: levelName,
            version: 1,
            gridSize: this.gridSize,
            baseSpeed: this.levelSpeed,
            durationSeconds: this.levelDurationSeconds,
            entities: serializedEntities,
            timestamp: Date.now()
        };

        const formData = new FormData();
        formData.append("name", levelName);
        formData.append("visibility", this.visibility);
        formData.append("level_data", JSON.stringify(levelData));
        formData.append("song_file", this.audioFile, this.audioSongName || this.audioFile.name);

        try {
            const response = await fetch("/sledgepong/playpage/editor/save/", {
                method: "POST",
                headers: { "X-CSRFToken": this.csrfToken },
                body: formData,
            });
            if (!response.ok) {
                const text = await response.text();
                this.showMessage(`Save failed: ${text}`);
                return null;
            }
        } catch (e) {
            console.error("Failed to save to server:", e);
            this.showMessage("Failed to reach server");
            return null;
        }

        this.showMessage(`Level "${levelName}" saved!`);
        return JSON.stringify(levelData);
    }

    async #saveLevelFile(levelData, levelName) {
        const payload = JSON.stringify(levelData, null, 2);
        const safeName = (levelName || "level")
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-zA-Z0-9_-]/g, "");
        const suggestedName = `sledgepong-level-${safeName || "level"}-${Date.now()}.json`;

        const saveDirHandle = await this.#getSaveDirectoryHandle();
        if (saveDirHandle) {
            try {
                const fileHandle = await saveDirHandle.getFileHandle(suggestedName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(payload);
                await writable.close();
                return "saved";
            } catch (error) {
                console.error("Failed to save into folder:", error);
            }
        }

        if (typeof window.showSaveFilePicker === "function") {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName,
                    types: [
                        {
                            description: "Sledgepong Level",
                            accept: { "application/json": [".json"] }
                        }
                    ]
                });
                const writable = await handle.createWritable();
                await writable.write(payload);
                await writable.close();
                return "saved";
            } catch (error) {
                if (error && error.name === "AbortError") {
                    return "cancelled";
                }
                console.error("Failed to save level file:", error);
                return "failed";
            }
        }

        try {
            const blob = new Blob([payload], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = suggestedName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return "saved";
        } catch (error) {
            console.error("Failed to download level file:", error);
            return "failed";
        }
    }

    promptLoadLevel() {
        this.fileInput.value = "";
        this.fileInput.click();
    }

    async loadFromCloud() {
        let levels = [];
        try {
            const response = await fetch("/sledgepong/playpage/editor/list/");
            if (!response.ok) {
                this.showMessage(response.status === 401 ? "Login required" : "Could not fetch levels");
                return;
            }
            const json = await response.json();
            levels = Array.isArray(json.levels) ? json.levels : [];
        } catch (e) {
            console.error("Failed to fetch cloud levels:", e);
            this.showMessage("Could not reach server");
            return;
        }
        if (levels.length === 0) {
            this.showMessage("No saved levels yet");
            return;
        }
        const lines = levels.map((lvl, i) =>
            `${i + 1}. ${lvl.name} [${lvl.visibility}] (${lvl.created_at})`
        );
        const choice = prompt(`Pick a level (1-${levels.length}):\n\n${lines.join("\n")}`, "1");
        if (choice === null) return;
        const idx = parseInt(choice, 10) - 1;
        if (!Number.isInteger(idx) || idx < 0 || idx >= levels.length) {
            this.showMessage("Invalid selection");
            return;
        }
        const chosen = levels[idx];
        try {
            this.#loadFromData(chosen.level_data);
            this.lastSongUrl = chosen.song_url || this.lastSongUrl;
            this.showMessage(`Loaded "${chosen.name}"`);
        } catch (e) {
            console.error("Failed to load cloud level:", e);
            this.showMessage("Level data invalid");
        }
    }

    promptLevelSpeed() {
        const raw = prompt(
            `Set level base speed (${MIN_LEVEL_SPEED} - ${MAX_LEVEL_SPEED})`,
            this.levelSpeed.toFixed(2)
        );
        if (raw === null) return;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
            this.showMessage("Invalid speed value");
            return;
        }
        this.levelSpeed = sanitizeLevelSpeed(parsed, this.levelSpeed);
    }

    promptLevelDuration() {
        const currentMinutes = Math.floor(this.levelDurationSeconds / 60);
        const currentSeconds = this.levelDurationSeconds % 60;
        const minuteRaw = prompt("Set level minutes:", String(currentMinutes));
        if (minuteRaw === null) return;
        const secondRaw = prompt("Set level seconds (0-59):", String(currentSeconds));
        if (secondRaw === null) return;

        const minutes = Number(minuteRaw);
        const seconds = Number(secondRaw);
        if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
            this.showMessage("Invalid level time");
            return;
        }

        const safeMinutes = Math.max(0, Math.floor(minutes));
        const safeSeconds = clampNumber(Math.floor(seconds), 0, 59);
        const total = safeMinutes * 60 + safeSeconds;
        this.levelDurationSeconds = sanitizeLevelDuration(total, this.levelDurationSeconds);
    }

    clearEntities() {
        if (!this.entities.length) {
            this.showMessage("Level already empty");
            return;
        }
        this.entities = [];
        this.#deselectEntities({ silent: true });
        this.showMessage("Level cleared");
    }

    switchTab(tab) {
        this.toolbar.switch(tab);
    }

    toggleAutoSnap() {
        this.autoSnap = !this.autoSnap;
        this.toolbar.onResize();
        this.showMessage(`AutoSnap ${this.autoSnap ? "enabled" : "disabled"}`);
    }

    getVisibilityLabel() {
        return this.visibility.charAt(0).toUpperCase() + this.visibility.slice(1);
    }

    toggleVisibility() {
        const cycle = this.isSuperuser ? ['private', 'online', 'original'] : ['private', 'online'];
        const idx = cycle.indexOf(this.visibility);
        this.visibility = cycle[(idx + 1) % cycle.length];
        this.toolbar.onResize();
        this.showMessage(`Visibility: ${this.getVisibilityLabel()}`);
    }

    getSaveFolderLabel() {
        if (!this.saveFolderHandle) return "Save Folder";
        const name = this.saveFolderHandle.name || "Set";
        return `Save Folder: ${name}`;
    }

    async promptSaveFolder() {
        if (typeof window.showDirectoryPicker !== "function") {
            this.showMessage("Folder picker not supported");
            return;
        }
        try {
            const handle = await window.showDirectoryPicker();
            this.saveFolderHandle = handle || null;
            await idbSetHandle(SAVE_FOLDER_KEY, handle);
            this.toolbar.onResize();
            const name = handle?.name ? `${handle.name}/${SAVE_SUBFOLDER_NAME}` : SAVE_SUBFOLDER_NAME;
            this.showMessage(`Save folder set: ${name}`);
        } catch (error) {
            if (error && error.name === "AbortError") {
                return;
            }
            console.error("Failed to set save folder:", error);
            this.showMessage("Failed to set save folder");
        }
    }

    pxPerSec() {
        return Math.max(10, this.levelSpeed * 60);
    }

    timeToX(t) {
        return t * this.pxPerSec();
    }

    xToTime(x) {
        return Math.max(0, x / this.pxPerSec());
    }

    getSongLabel() {
        if (!this.audioSongName) return "Load Song";
        const name = this.audioSongName.length > 14
            ? this.audioSongName.slice(0, 13) + "…"
            : this.audioSongName;
        return `Song: ${name}`;
    }

    getMusicLabel() {
        if (!this.audioElement) return "Play Music";
        return this.audioIsPlaying ? "Pause Music" : "Play Music";
    }

    promptLoadSong() {
        this.audioFileInput.value = "";
        this.audioFileInput.click();
    }

    toggleMusic() {
        if (!this.audioElement) {
            this.showMessage("Load a song first");
            return;
        }
        if (this.audioIsPlaying) {
            this.audioElement.pause();
            this.audioIsPlaying = false;
            this.toolbar.onResize();
            return;
        }
        const a = this.audioElement;
        console.log("[music] play attempt", {
            readyState: a.readyState,
            duration: a.duration,
            currentTime: a.currentTime,
            paused: a.paused,
            muted: a.muted,
            volume: a.volume,
            src: a.currentSrc,
            error: a.error,
        });
        a.muted = false;
        a.volume = 1.0;
        if (a.duration && a.currentTime >= a.duration - 0.05) {
            try { a.currentTime = 0; } catch (_) {}
        }
        const playPromise = a.play();
        if (playPromise && typeof playPromise.then === "function") {
            playPromise
                .then(() => {
                    console.log("[music] playing");
                    this.audioIsPlaying = true;
                    this.toolbar.onResize();
                })
                .catch((e) => {
                    console.error("[music] play rejected:", e);
                    const reason = e?.name || e?.message || "blocked";
                    this.showMessage(`Play failed: ${reason}`);
                    this.audioIsPlaying = false;
                    this.toolbar.onResize();
                });
        } else {
            this.audioIsPlaying = true;
            this.toolbar.onResize();
        }
    }

    rewindMusic() {
        if (!this.audioElement) {
            this.showMessage("Load a song first");
            return;
        }
        this.seekMusic(0);
        this.showMessage("Rewound to start");
    }

    seekMusic(timeSeconds) {
        if (!this.audioElement) return;
        const dur = this.audioDurationSeconds || this.audioElement.duration || 0;
        const max = dur > 0 ? dur - 0.05 : timeSeconds;
        const safe = Math.max(0, Math.min(max, timeSeconds));
        try { this.audioElement.currentTime = safe; } catch (e) {
            console.warn("[music] seek failed:", e);
        }
        const playheadX = safe * this.pxPerSec();
        const centerOffset = (this.canvas.width - this.toolbar.width) / 2;
        this.viewX = Math.max(0, playheadX - centerOffset);
    }

    #isPointInWaveformBand(canvasY) {
        if (!this.audioElement) return false;
        return canvasY >= 8 && canvasY <= 8 + 54;
    }

    #createAudioFileInput() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/*";
        input.style.display = "none";
        document.body.appendChild(input);
        input.addEventListener("change", (event) => this.#onAudioFileSelected(event));
        return input;
    }

    async #onAudioFileSelected(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        await this.#loadSongFromFile(file);
    }

    async #loadSongFromFile(file) {
        try {
            if (this.audioElement) {
                try { this.audioElement.pause(); } catch (_) {}
                this.audioElement.src = "";
                if (this.audioElement.parentNode) {
                    this.audioElement.parentNode.removeChild(this.audioElement);
                }
            }
            if (this.audioObjectUrl) {
                URL.revokeObjectURL(this.audioObjectUrl);
                this.audioObjectUrl = null;
            }
            this.audioIsPlaying = false;
            this.waveformPeaks = null;
            this.audioDurationSeconds = 0;

            this.audioFile = file;
            const objectUrl = URL.createObjectURL(file);
            this.audioObjectUrl = objectUrl;

            const audio = document.createElement("audio");
            audio.preload = "auto";
            audio.style.display = "none";
            audio.controls = false;
            audio.addEventListener("ended", () => {
                this.audioIsPlaying = false;
                this.toolbar.onResize();
            });
            audio.addEventListener("error", () => {
                const err = audio.error;
                console.error("Audio element error:", err, "src:", audio.currentSrc);
                const codeMap = { 1: "ABORTED", 2: "NETWORK", 3: "DECODE", 4: "FORMAT_UNSUPPORTED" };
                const reason = err ? (codeMap[err.code] || `code ${err.code}`) : "unknown";
                this.showMessage(`Audio error: ${reason}`);
            });
            audio.addEventListener("canplay", () => {
                console.log("Audio canplay; duration =", audio.duration);
            });
            document.body.appendChild(audio);
            audio.src = objectUrl;
            audio.load();

            this.audioElement = audio;
            this.audioSongName = file.name;

            try {
                if (!this.audioContext) {
                    const Ctor = window.AudioContext || window.webkitAudioContext;
                    if (Ctor) this.audioContext = new Ctor();
                }
                if (this.audioContext) {
                    const arrayBuf = await file.arrayBuffer();
                    const decoded = await this.audioContext.decodeAudioData(arrayBuf.slice(0));
                    this.audioDurationSeconds = decoded.duration;
                    this.waveformPeaks = this.#computeWaveform(decoded, this.waveformSamplesPerSecond);
                }
            } catch (decodeError) {
                console.error("Waveform decode failed:", decodeError);
            }

            if (!this.audioDurationSeconds) {
                await new Promise((resolve) => {
                    if (Number.isFinite(audio.duration) && audio.duration > 0) return resolve();
                    const done = () => { audio.removeEventListener("loadedmetadata", done); resolve(); };
                    audio.addEventListener("loadedmetadata", done);
                    setTimeout(resolve, 3000);
                });
                if (Number.isFinite(audio.duration) && audio.duration > 0) {
                    this.audioDurationSeconds = audio.duration;
                }
            }

            this.toolbar.onResize();
            this.showMessage(`Song loaded: ${file.name}`);
        } catch (error) {
            console.error("Failed to load song:", error);
            this.showMessage("Could not load song");
        }
    }

    #computeWaveform(audioBuffer, samplesPerSecond) {
        const duration = audioBuffer.duration;
        const totalSamples = Math.max(1, Math.ceil(duration * samplesPerSecond));
        const peaks = new Float32Array(totalSamples);
        const channels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const samplesPerBin = Math.max(1, Math.floor(sampleRate / samplesPerSecond));
        for (let ch = 0; ch < channels; ch++) {
            const data = audioBuffer.getChannelData(ch);
            for (let i = 0; i < totalSamples; i++) {
                const start = i * samplesPerBin;
                const end = Math.min(start + samplesPerBin, data.length);
                let peak = 0;
                for (let j = start; j < end; j++) {
                    const v = Math.abs(data[j]);
                    if (v > peak) peak = v;
                }
                if (peak > peaks[i]) peaks[i] = peak;
            }
        }
        return peaks;
    }

    drawWaveform(ctx) {
        if (!this.waveformPeaks || !this.audioDurationSeconds) return;
        const bandTop = 8;
        const bandHeight = 54;
        const centerY = bandTop + bandHeight / 2;
        const samplesPerSecond = this.waveformSamplesPerSecond;
        const peakSlotSeconds = 1 / samplesPerSecond;
        const pxPerSec = this.pxPerSec();
        const worldLeft = this.viewX;
        const worldRight = this.viewX + (this.canvas.width - this.toolbar.width);
        const startTime = Math.max(0, worldLeft / pxPerSec);
        const endTime = Math.min(this.audioDurationSeconds, worldRight / pxPerSec);
        if (endTime <= startTime) return;
        const startIdx = Math.max(0, Math.floor(startTime * samplesPerSecond));
        const endIdx = Math.min(this.waveformPeaks.length - 1, Math.ceil(endTime * samplesPerSecond));
        const barWidth = Math.max(1, pxPerSec * peakSlotSeconds - 0.5);
        ctx.save();
        ctx.fillStyle = "rgba(10, 20, 40, 0.7)";
        ctx.fillRect(worldLeft, bandTop, worldRight - worldLeft, bandHeight);
        ctx.strokeStyle = "rgba(120, 180, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(worldLeft, centerY);
        ctx.lineTo(worldRight, centerY);
        ctx.stroke();
        ctx.fillStyle = "rgba(140, 220, 255, 0.9)";
        for (let i = startIdx; i <= endIdx; i++) {
            const peak = this.waveformPeaks[i] || 0;
            if (peak <= 0) continue;
            const x = i * peakSlotSeconds * pxPerSec;
            const h = peak * (bandHeight * 0.5);
            ctx.fillRect(x, centerY - h, barWidth, h * 2);
        }
        ctx.restore();
    }

    drawPlayhead(ctx) {
        if (!this.audioElement) return;
        const t = this.audioElement.currentTime || 0;
        if (!Number.isFinite(t)) return;
        const x = t * this.pxPerSec();
        ctx.save();
        ctx.strokeStyle = "rgba(255, 90, 120, 0.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.canvas.height);
        ctx.stroke();
        ctx.restore();
    }

    #bindEvents() {
        this.canvas.addEventListener("mousedown", (e) => {
            const { x, y } = this.#getMouse(e);
            if (x < this.toolbar.width && e.button === 0) {
                this.toolbar.handleClick(x, y);
                return;
            }
            if (x < this.toolbar.width) return;

            if (e.button === 1) {
                e.preventDefault();
                this.isPanning = true;
                this.panStartClientX = e.clientX;
                this.panStartViewX = this.viewX;
                return;
            }

            if (e.button !== 0) return;
            const world = this.#toWorld(x, y);
            if (this.#isPointInWaveformBand(y)) {
                this.seekMusic(this.xToTime(world.x));
                return;
            }
            this.#placeOrSelectEntity(world.x, world.y, e.shiftKey);
        });

        this.canvas.addEventListener("mousemove", (e) => {
            const { x, y } = this.#getMouse(e);
            this.toolbar.handleHover(x, y);

            if (this.isPanning) {
                const deltaX = e.clientX - this.panStartClientX;
                this.viewX = Math.max(0, this.panStartViewX - deltaX);
                return;
            }

            if (this.dragging && this.selectedEntity) {
                const world = this.#toWorld(x, y);
                const freeMove = e.shiftKey || !this.autoSnap;
                if (this.selectedEntity instanceof Trigger) {
                    const desiredX = world.x - this.dragOffsetX;
                    const desiredY = world.y - this.dragOffsetY;
                    if (!freeMove) {
                        const snapped = this.#centerOnGrid(this.#snapToGrid(desiredX - this.gridSize / 2, desiredY - this.gridSize / 2));
                        this.selectedEntity.x = snapped.x;
                        this.selectedEntity.y = snapped.y;
                    } else {
                        this.selectedEntity.x = desiredX;
                        this.selectedEntity.y = desiredY;
                    }
                } else {
                    const desiredX = world.x - this.dragOffsetX;
                    const desiredY = world.y - this.dragOffsetY;
                    if (!freeMove) {
                        const snapped = this.#snapToGrid(desiredX, desiredY);
                        this.selectedEntity.x = snapped.x;
                        this.selectedEntity.y = snapped.y;
                    } else {
                        this.selectedEntity.x = desiredX;
                        this.selectedEntity.y = desiredY;
                    }
                }
            }
        });

        this.canvas.addEventListener("mouseup", () => {
            this.dragging = false;
            this.isPanning = false;
        });
        this.canvas.addEventListener("mouseleave", () => {
            this.dragging = false;
            this.isPanning = false;
            this.toolbar.handleHover(-1, -1);
        });
        window.addEventListener("mouseup", () => {
            this.dragging = false;
            this.isPanning = false;
        });
        window.addEventListener("keydown", (e) => this.#handleKeydown(e));

        this.canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const { x, y } = this.#getMouse(e);
            if (x < this.toolbar.width) return;
            const world = this.#toWorld(x, y);
            const target = this.#findEntityAt(world.x, world.y);
            if (target) {
                this.#removeEntity(target);
            }
        });

        this.canvas.addEventListener("wheel", (e) => {
            const { x } = this.#getMouse(e);
            if (x < this.toolbar.width) return;
            e.preventDefault();
            this.viewX = Math.max(0, this.viewX + e.deltaY);
        }, { passive: false });
    }

    #handleKeydown(e) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag && ["INPUT", "TEXTAREA"].includes(activeTag)) return;

        if ((e.key === "Delete" || e.key === "Backspace") && this.selectedEntity) {
            e.preventDefault();
            this.#removeEntity(this.selectedEntity);
            return;
        }

        if (e.key === "Escape") {
            if (this.selectedEntity) {
                this.#deselectEntities({ silent: true });
            }
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            this.saveLevel();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
            e.preventDefault();
            this.promptLoadLevel();
        }
    }

    #handleFileSelection(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                this.#loadFromData(data);
                this.showMessage(`Loaded ${file.name}`);
            } catch (error) {
                console.error("Failed to load level:", error);
                this.showMessage("Could not load level file");
            }
        };
        reader.readAsText(file);
    }

    #loadFromData(data) {
        if (!data || !Array.isArray(data.entities)) {
            throw new Error("Invalid level data");
        }
        this.gridSize = data.gridSize || this.gridSize;
        this.levelSpeed = sanitizeLevelSpeed(data.baseSpeed ?? data.speed, DEFAULT_LEVEL_SPEED);
        this.levelDurationSeconds = sanitizeLevelDuration(
            data.durationSeconds ?? data.lengthSeconds,
            DEFAULT_LEVEL_DURATION_SECONDS
        );
        this.entities = data.entities.map(item => {
            const triggerTypeCandidate = normalizeTriggerType(item.type);
            const objectTypeCandidate = normalizeObjectType(item.type);

            if (item.category === "trigger" || PLACEABLE_TRIGGER_TOOLS.has(triggerTypeCandidate)) {
                const triggerType = PLACEABLE_TRIGGER_TOOLS.has(triggerTypeCandidate) ? triggerTypeCandidate : "bounce";
                const trigger = new Trigger(item.x, item.y, triggerType);
                if (typeof item.radius === "number") {
                    trigger.radius = item.radius;
                }
                return trigger;
            }
            const objectType = PLACEABLE_OBJECT_TOOLS.has(objectTypeCandidate) ? objectTypeCandidate : "block";
            const gameObject = new GameObject(item.x, item.y, objectType);
            if (typeof item.size === "number") {
                gameObject.size = item.size;
            }
            return gameObject;
        });
        this.#deselectEntities({ silent: true });
    }

    #createFileInput() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.style.display = "none";
        document.body.appendChild(input);
        input.addEventListener("change", (event) => this.#handleFileSelection(event));
        return input;
    }

    async #loadSaveFolderHandle() {
        const handle = await idbGetHandle(SAVE_FOLDER_KEY);
        if (handle) {
            this.saveFolderHandle = handle;
            this.toolbar.onResize();
        }
    }

    async #ensureFolderPermission(handle) {
        if (!handle || typeof handle.queryPermission !== "function") return true;
        try {
            const opts = { mode: "readwrite" };
            const status = await handle.queryPermission(opts);
            if (status === "granted") return true;
            const requested = await handle.requestPermission(opts);
            return requested === "granted";
        } catch (error) {
            console.error("Failed to request folder permission:", error);
            return false;
        }
    }

    async #getSaveDirectoryHandle() {
        if (!this.saveFolderHandle) return null;
        const hasPermission = await this.#ensureFolderPermission(this.saveFolderHandle);
        if (!hasPermission) return null;
        try {
            return await this.saveFolderHandle.getDirectoryHandle(SAVE_SUBFOLDER_NAME, { create: true });
        } catch (error) {
            console.error("Failed to access save subfolder:", error);
            return null;
        }
    }

    #getMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    #toWorld(screenX, screenY) {
        return {
            x: screenX + this.viewX,
            y: screenY
        };
    }

    #snapToGrid(x, y) {
        const gx = Math.round(x / this.gridSize) * this.gridSize;
        const gy = Math.round(y / this.gridSize) * this.gridSize;
        return { x: gx, y: gy };
    }

    #centerOnGrid(snapped) {
        return {
            x: snapped.x + this.gridSize / 2,
            y: snapped.y + this.gridSize / 2
        };
    }

    #placeOrSelectEntity(x, y, shiftHeld = false) {
        const target = this.#findEntityAt(x, y);
        if (target) {
            if (this.currentTool === "erase") {
                this.#removeEntity(target);
                return;
            }
            this.dragOffsetX = x - target.x;
            this.dragOffsetY = y - target.y;
            this.#selectEntity(target, { startDragging: true });
            return;
        }

        this.#deselectEntities({ silent: true });

        if (this.currentTool === "erase") {
            return;
        }

        const freeMove = shiftHeld || !this.autoSnap;

        if (PLACEABLE_OBJECT_TOOLS.has(this.currentTool)) {
            const topLeft = freeMove
                ? { x: x - this.gridSize / 2, y: y - this.gridSize / 2 }
                : this.#snapToGrid(x - this.gridSize / 2, y - this.gridSize / 2);
            const object = new GameObject(topLeft.x, topLeft.y, this.currentTool);
            this.entities.push(object);
            this.dragOffsetX = object.size / 2;
            this.dragOffsetY = object.size / 2;
            this.#selectEntity(object, { silent: true });
            return;
        }

        if (PLACEABLE_TRIGGER_TOOLS.has(this.currentTool)) {
            const center = freeMove
                ? { x, y }
                : this.#centerOnGrid(this.#snapToGrid(x - this.gridSize / 2, y - this.gridSize / 2));
            const trigger = new Trigger(center.x, center.y, this.currentTool);
            this.entities.push(trigger);
            this.dragOffsetX = 0;
            this.dragOffsetY = 0;
            this.#selectEntity(trigger, { silent: true });
            return;
        }
    }

    #findEntityAt(x, y) {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            if (entity.contains(x, y)) {
                return entity;
            }
        }
        return null;
    }

    #selectEntity(entity, { startDragging = false } = {}) {
        this.#deselectEntities({ silent: true });
        entity.selected = true;
        this.selectedEntity = entity;
        this.dragging = !!startDragging;
    }

    #deselectEntities() {
        for (const entity of this.entities) {
            entity.selected = false;
        }
        this.selectedEntity = null;
        this.dragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
    }

    #removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index === -1) return;
        this.entities.splice(index, 1);
        if (this.selectedEntity === entity) {
            this.selectedEntity = null;
            this.dragging = false;
            this.dragOffsetX = 0;
            this.dragOffsetY = 0;
        }
    }

    #toolLabel(tool) {
        return TOOL_LABEL_MAP.get(tool) ?? (tool ? tool.charAt(0).toUpperCase() + tool.slice(1) : "Tool");
    }

    #setMessage(text, duration = 2400) {
        this.message = text;
        this.messageExpires = performance.now() + duration;
    }

    drawGrid() {
        const { ctx, gridSize } = this;
        const worldLeft = this.viewX + this.toolbar.width;
        const worldRight = this.viewX + this.canvas.width;
        const firstX = Math.floor(worldLeft / gridSize) * gridSize;
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath();
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            ctx.moveTo(worldLeft, y);
            ctx.lineTo(worldRight, y);
        }
        for (let x = firstX; x <= worldRight; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
        }
        ctx.stroke();
    }

    #drawStatus() {
        const ctx = this.ctx;
        const x = this.toolbar.width + 20;
        const y = this.canvas.height - 40;
        const width = 460;
        const height = 26;
        ctx.save();
        ctx.fillStyle = "rgba(8, 15, 38, 0.72)";
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = "rgba(110, 176, 235, 0.7)";
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = "#f6fbff";
        ctx.font = "17px 'Jersey 15', Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(
            `Snap ${this.autoSnap ? "On" : "Off"}  Speed ${this.levelSpeed.toFixed(2)}  Length ${formatDuration(this.levelDurationSeconds)}  X ${Math.round(this.viewX)}`,
            x + 12,
            y + height / 2
        );
        ctx.restore();
    }

    #drawOverlay() {
        if (!this.message) return;
        const now = performance.now();
        if (now > this.messageExpires) {
            this.message = null;
            return;
        }
        const ctx = this.ctx;
        const width = 320;
        const height = 32;
        const centerX = this.toolbar.width + (this.canvas.width - this.toolbar.width) / 2;
        const x = centerX - width / 2;
        const y = 16;
        ctx.save();
        ctx.fillStyle = "rgba(12, 18, 48, 0.7)";
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = "rgba(100, 160, 220, 0.7)";
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = "#f6fbff";
        ctx.font = "18px 'Jersey 15', Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.message, centerX, y + height / 2);
        ctx.restore();
    }


    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.toolbar.draw(this.ctx);
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(this.toolbar.width, 0, this.canvas.width - this.toolbar.width, this.canvas.height);
        this.ctx.clip();
        this.ctx.translate(-this.viewX, 0);
        this.drawWaveform(this.ctx);
        this.drawGrid();
        for (const entity of this.entities) entity.draw(this.ctx);
        this.drawPlayhead(this.ctx);
        this.ctx.restore();
        this.#drawStatus();
        this.#drawOverlay();
    }

    #syncViewToAudio() {
        if (!this.audioIsPlaying || !this.audioElement) return;
        if (this.isPanning) return;
        const t = this.audioElement.currentTime;
        if (!Number.isFinite(t)) return;
        const playheadX = t * this.pxPerSec();
        const centerOffset = (this.canvas.width - this.toolbar.width) / 2;
        this.viewX = Math.max(0, playheadX - centerOffset);
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        this.#syncViewToAudio();
        this.draw();
    }
}

window.addEventListener("DOMContentLoaded", () => {
    new Editor(document.getElementById("editorCanvas"));
});
