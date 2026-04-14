document.addEventListener("DOMContentLoaded", () => {
    const onlineLevels = document.getElementById("onlineLevels");
    const dataElement = document.getElementById("onlineLevelsData");
    let levels = [];

    if (dataElement) {
        try {
            levels = JSON.parse(dataElement.textContent || "[]");
        } catch (error) {
            console.error("Failed to parse online levels:", error);
        }
    }

    if (!levels || levels.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No public levels yet. Be the first to publish!";
        empty.style.opacity = 0.7;
        onlineLevels.appendChild(empty);
        return;
    }

    levels.forEach((level, index) => {
        const btn = document.createElement("button");
        btn.className = "level-item level-item--detail";

        const name = document.createElement("div");
        name.className = "level-name";
        name.textContent = level.name || `Level ${index + 1}`;

        const meta = document.createElement("div");
        meta.className = "level-meta";
        const parts = [];
        if (level.creator) parts.push(`Creator: ${level.creator}`);
        if (level.created_at) parts.push(`Created: ${level.created_at}`);
        if (typeof level.plays === "number") parts.push(`Plays: ${level.plays}`);
        if (typeof level.likes === "number") parts.push(`Likes: ${level.likes}`);
        if (level.song_url) parts.push("Song attached");
        meta.textContent = parts.length > 0 ? parts.join(" • ") : "Community level";

        btn.appendChild(name);
        btn.appendChild(meta);

        btn.addEventListener("click", () => {
            localStorage.setItem("sledgepong_current_level", JSON.stringify(level.data));
            window.location.href = "/sledgepong/playpage/levels/game";
        });

        onlineLevels.appendChild(btn);
    });
});
