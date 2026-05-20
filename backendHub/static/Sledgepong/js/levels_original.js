document.addEventListener("DOMContentLoaded", () => {
    const originalLevels = document.getElementById("originalLevels");
    const dataElement = document.getElementById("originalLevelsData");
    let levels = [];

    if (dataElement) {
        try {
            levels = JSON.parse(dataElement.textContent || "[]");
        } catch (error) {
            console.error("Failed to parse original levels:", error);
        }
    }

    const formatDifficulty = (difficulty) => {
        if (!difficulty) return null;
        return difficulty.replace(/_/g, " ");
    };

    if (!levels || levels.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No original levels available yet.";
        empty.style.opacity = 0.7;
        originalLevels.appendChild(empty);
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
        const difficulty = formatDifficulty(level.difficulty);
        if (difficulty) parts.push(`Difficulty: ${difficulty}`);
        if (level.duration) parts.push(`Duration: ${level.duration}s`);
        if (level.soundtrack) {
            const artist = level.artist ? ` by ${level.artist}` : "";
            parts.push(`Song: ${level.soundtrack}${artist}`);
        }
        meta.textContent = parts.length > 0 ? parts.join(" • ") : "Official campaign level";

        btn.appendChild(name);
        btn.appendChild(meta);

        btn.addEventListener("click", () => {
            const payload = { ...(level.data || {}), song_url: level.song_url || null };
            localStorage.setItem("sledgepong_current_level", JSON.stringify(payload));
            window.location.href = "/sledgepong/playpage/levels/game";
        });

        originalLevels.appendChild(btn);
    });
});
