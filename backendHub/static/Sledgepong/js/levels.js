document.addEventListener("DOMContentLoaded", () => {
    const localLevels = document.getElementById("localLevels");
    const publishedLevels = document.getElementById("publishedLevels");
    const publishedDataElement = document.getElementById("publishedLevelsData");
    let publishedLevelsData = [];

    if (publishedDataElement) {
        try {
            publishedLevelsData = JSON.parse(publishedDataElement.textContent || "[]");
        } catch (error) {
            console.error("Failed to parse published levels:", error);
        }
    }

    // Load local saved levels from localStorage
    let savedLevelsData = [];
    try {
        const saved = localStorage.getItem("sledgepong_levels");
        if (saved) {
            savedLevelsData = JSON.parse(saved);
        }
    } catch (error) {
        console.error("Failed to load saved levels:", error);
        savedLevelsData = [];
    }

    // Also check for recently saved level
    try {
        const recentLevel = localStorage.getItem("sledgepong_recent_level");
        if (recentLevel) {
            const levelData = JSON.parse(recentLevel);
            if (levelData.name || levelData.entities) {
                savedLevelsData.unshift({
                    name: levelData.name || "Recent Level",
                    data: levelData,
                    timestamp: Date.now()
                });
            }
        }
    } catch (error) {
        console.error("Failed to load recent level:", error);
    }

    if (savedLevelsData.length > 0) {
        savedLevelsData.forEach((level, index) => {
            const btn = document.createElement("button");
            btn.className = "level-item";
            btn.textContent = level.name || `Level ${index + 1}`;
            btn.addEventListener("click", () => {
                const levelData = level.data || level;
                localStorage.setItem("sledgepong_current_level", JSON.stringify(levelData));
                window.location.href = "/sledgepong/playpage/levels/game";
            });
            localLevels.appendChild(btn);
        });
    } else {
        const empty = document.createElement("p");
        empty.textContent = "No local levels yet. Create one in the editor!";
        empty.style.opacity = 0.7;
        localLevels.appendChild(empty);
    }

    if (publishedLevelsData.length > 0) {
        publishedLevelsData.forEach((level, index) => {
            const btn = document.createElement("button");
            btn.className = "level-item level-item--detail";

            const name = document.createElement("div");
            name.className = "level-name";
            name.textContent = level.name || `Level ${index + 1}`;

            const meta = document.createElement("div");
            meta.className = "level-meta";
            const parts = [];
            if (level.created_at) parts.push(`Created: ${level.created_at}`);
            if (typeof level.plays === "number") parts.push(`Plays: ${level.plays}`);
            if (typeof level.likes === "number") parts.push(`Likes: ${level.likes}`);
            if (level.is_public === false) parts.push("Private");
            meta.textContent = parts.length > 0 ? parts.join(" • ") : "Published level";

            btn.appendChild(name);
            btn.appendChild(meta);

            btn.addEventListener("click", () => {
                localStorage.setItem("sledgepong_current_level", JSON.stringify(level.data));
                window.location.href = "/sledgepong/playpage/levels/game";
            });

            publishedLevels.appendChild(btn);
        });
    } else {
        const empty = document.createElement("p");
        empty.textContent = "No published levels yet.";
        empty.style.opacity = 0.7;
        publishedLevels.appendChild(empty);
    }
});
