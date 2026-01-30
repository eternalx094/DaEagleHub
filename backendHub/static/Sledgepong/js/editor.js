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
    { label: "Erase", tool: "erase" },
];

const TRIGGER_PALETTE = [
    { label: "Rotate", tool: "rotate" },
    { label: "Spin", tool: "spinaround" },
    { label: "Boost", tool: "boost" },
    { label: "Gravity", tool: "gravity" },
    { label: "Bounce", tool: "bounce" },
];

const PLACEABLE_OBJECT_TOOLS = new Set(OBJECT_PALETTE.filter(item => item.tool !== "erase").map(item => item.tool));
const PLACEABLE_TRIGGER_TOOLS = new Set(TRIGGER_PALETTE.map(item => item.tool));
const TOOL_LABEL_MAP = new Map([...OBJECT_PALETTE, ...TRIGGER_PALETTE].map(item => [item.tool, item.label]));

class Toolbar {
    constructor(editor) {
        this.editor = editor;
        this.width = 220;
        const objectsTab = new UIElement(20, 20, 90, 30, "Objects", () => this.switch("objects"));
        objectsTab.tabKey = "objects";
        objectsTab.active = true;
        const triggersTab = new UIElement(120, 20, 90, 30, "Triggers", () => this.switch("triggers"));
        triggersTab.tabKey = "triggers";
        this.tabs = [objectsTab, triggersTab];
        this.buttons = [];
        this.utilities = [];
        this.activeTab = "objects";
        this.#setupButtons();
        this.onResize();
    }

    #setupButtons() {
        const palette = this.activeTab === "objects" ? OBJECT_PALETTE : TRIGGER_PALETTE;
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

        for (let u of this.utilities)
            if (u.contains(x, y)) return u.action();
    }

    handleHover(x, y) {
        for (let e of [...this.tabs, ...this.buttons, ...this.utilities])
            e.hovered = e.contains(x, y);
    }
    onResize() {
        const canvasHeight = this.editor.canvas.height;
        const baseY = Math.max(canvasHeight - 210, 260);
        const actions = [
            { label: "Test Level", handler: () => this.editor.testLevel() },
            { label: "Save Level", handler: () => this.editor.saveLevel() },
            { label: "Load Level", handler: () => this.editor.promptLoadLevel() },
            { label: "Clear Level", handler: () => this.editor.clearEntities() },
        ];
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
        for (let u of this.utilities) {
            u.active = false;
            u.draw(ctx);
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
        ctx.fillStyle = "cornflowerblue";
        ctx.fillRect(this.x, this.y, this.size, this.size);
        if (this.type === "killblock") {
            this.#drawKillIcon(ctx);
        }
        if (this.selected) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.size, this.size);
        }
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
    spinaround: "#8A2BE2",
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
        this.toolbar = new Toolbar(this);
        this.currentTool = "block";
        this.dragging = false;
        this.selectedEntity = null;
        this.gridSize = 40;
        this.message = null;
        this.messageExpires = 0;
        this.fileInput = this.#createFileInput();

        this.resize();
        window.addEventListener("resize", () => this.resize());
        this.setTool("block", TOOL_LABEL_MAP.get("block"));
        this.#bindEvents();
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
        const toolLabel = label ?? this.#toolLabel(tool);
        this.showMessage(`${toolLabel} ${tool === "erase" ? "tool ready" : "selected"}`);
    }

    showMessage(text) {
        if (!text) return;
        this.#setMessage(text);
    }

    testLevel() {
       const level = this.saveLevel()
       localStorage.setItem("sledgepong_current_level", level)
        window.open("http://127.0.0.1:8000/sledgepong/playpage/levels/game", "_blank");
    }
    saveLevel() {
        const serializedEntities = this.entities
            .map(entity => (typeof entity.serialize === "function" ? entity.serialize() : null))
            .filter(Boolean);
        
        if (serializedEntities.length === 0) {
            this.showMessage("Cannot save empty level");
            return;
        }

        const levelName = prompt("Enter level name:", `Level ${Date.now()}`);
        if (!levelName) {
            this.showMessage("Save cancelled");
            return;
        }

        const levelData = {
            name: levelName,
            version: 1,
            gridSize: this.gridSize,
            entities: serializedEntities,
            timestamp: Date.now()
        };

        // Save to localStorage for levels page
        try {
            let savedLevels = [];
            const saved = localStorage.getItem("sledgepong_levels");
            if (saved) {
                savedLevels = JSON.parse(saved);
            }
            savedLevels.push(levelData);
            localStorage.setItem("sledgepong_levels", JSON.stringify(savedLevels));
            localStorage.setItem("sledgepong_recent_level", JSON.stringify(levelData));
            this.showMessage(`Level "${levelName}" saved!`);
        } catch (e) {
            console.error("Failed to save to localStorage:", e);
            this.showMessage("Failed to save to browser storage");
        }

        // Also download as JSON file
        const blob = new Blob([JSON.stringify(levelData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `sledgepong-level-${levelName.replace(/\s+/g, "-")}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return JSON.stringify(levelData)
    }

    promptLoadLevel() {
        this.fileInput.value = "";
        this.fileInput.click();
        this.showMessage("Select a level file to load");
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

    #bindEvents() {
        this.canvas.addEventListener("mousedown", (e) => {
            const { x, y } = this.#getMouse(e);
            if (x < this.toolbar.width) {
                this.toolbar.handleClick(x, y);
                return;
            }
            this.#placeOrSelectEntity(x, y);
        });

        this.canvas.addEventListener("mousemove", (e) => {
            const { x, y } = this.#getMouse(e);
            this.toolbar.handleHover(x, y);
            if (this.dragging && this.selectedEntity) {
                const snapped = this.#snapToGrid(x, y);
                if (this.selectedEntity instanceof Trigger) {
                    const centered = this.#centerOnGrid(snapped);
                    this.selectedEntity.x = centered.x;
                    this.selectedEntity.y = centered.y;
                } else {
                    this.selectedEntity.x = snapped.x;
                    this.selectedEntity.y = snapped.y;
                }
            }
        });

        this.canvas.addEventListener("mouseup", () => this.dragging = false);
        this.canvas.addEventListener("mouseleave", () => {
            this.dragging = false;
            this.toolbar.handleHover(-1, -1);
        });
        window.addEventListener("mouseup", () => this.dragging = false);
        window.addEventListener("keydown", (e) => this.#handleKeydown(e));

        this.canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const { x, y } = this.#getMouse(e);
            const target = this.#findEntityAt(x, y);
            if (target) {
                this.#removeEntity(target);
            }
        });
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
                this.#deselectEntities();
            } else {
                this.showMessage("Nothing selected");
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
        this.entities = data.entities.map(item => {
            if (item.category === "trigger" || PLACEABLE_TRIGGER_TOOLS.has(item.type)) {
                const trigger = new Trigger(item.x, item.y, item.type);
                if (typeof item.radius === "number") {
                    trigger.radius = item.radius;
                }
                return trigger;
            }
            const gameObject = new GameObject(item.x, item.y, item.type ?? "block");
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

    #getMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    #snapToGrid(x, y) {
        const gx = Math.floor((x - this.toolbar.width) / this.gridSize) * this.gridSize + this.toolbar.width;
        const gy = Math.floor(y / this.gridSize) * this.gridSize;
        return { x: gx, y: gy };
    }

    #centerOnGrid(snapped) {
        return {
            x: snapped.x + this.gridSize / 2,
            y: snapped.y + this.gridSize / 2
        };
    }

    #placeOrSelectEntity(x, y) {
        const target = this.#findEntityAt(x, y);
        if (target) {
            if (this.currentTool === "erase") {
                this.#removeEntity(target);
                return;
            }
            this.#selectEntity(target, { startDragging: true });
            return;
        }

        this.#deselectEntities({ silent: true });

        if (this.currentTool === "erase") {
            return;
        }

        const snapped = this.#snapToGrid(x, y);

        if (PLACEABLE_OBJECT_TOOLS.has(this.currentTool)) {
            const object = new GameObject(snapped.x, snapped.y, this.currentTool);
            this.entities.push(object);
            this.#selectEntity(object, { silent: true });
            this.showMessage(`${this.#toolLabel(this.currentTool)} placed`);
            return;
        }

        if (PLACEABLE_TRIGGER_TOOLS.has(this.currentTool)) {
            const centered = this.#centerOnGrid(snapped);
            const trigger = new Trigger(centered.x, centered.y, this.currentTool);
            this.entities.push(trigger);
            this.#selectEntity(trigger, { silent: true });
            this.showMessage(`${this.#toolLabel(this.currentTool)} trigger placed`);
            return;
        }

        this.showMessage("Select a tool to place items");
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

    #selectEntity(entity, { startDragging = false, silent = false } = {}) {
        this.#deselectEntities({ silent: true });
        entity.selected = true;
        this.selectedEntity = entity;
        this.dragging = !!startDragging;
        if (!silent) {
            const suffix = entity instanceof Trigger ? " trigger" : "";
            this.showMessage(`${this.#toolLabel(entity.type)}${suffix} selected`);
        }
    }

    #deselectEntities({ silent = false } = {}) {
        for (const entity of this.entities) {
            entity.selected = false;
        }
        this.selectedEntity = null;
        this.dragging = false;
        if (!silent) {
            this.showMessage("Selection cleared");
        }
    }

    #removeEntity(entity, { silent = false } = {}) {
        const index = this.entities.indexOf(entity);
        if (index === -1) return;
        this.entities.splice(index, 1);
        if (this.selectedEntity === entity) {
            this.selectedEntity = null;
            this.dragging = false;
        }
        if (!silent) {
            const suffix = entity instanceof Trigger ? " trigger removed" : " removed";
            this.showMessage(`${this.#toolLabel(entity.type)}${suffix}`);
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
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath();
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            ctx.moveTo(this.toolbar.width, y);
            ctx.lineTo(this.canvas.width, y);
        }
        for (let x = this.toolbar.width; x <= this.canvas.width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
        }
        ctx.stroke();
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
        this.drawGrid();
        for (const entity of this.entities) entity.draw(this.ctx);
        this.#drawOverlay();
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        this.draw();
    }
}

window.addEventListener("DOMContentLoaded", () => {
    new Editor(document.getElementById("editorCanvas"));
});
