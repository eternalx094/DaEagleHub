document.addEventListener("DOMContentLoaded", () => {
    const originalLevels = document.getElementById("originalLevels");
    const savedLevels = document.getElementById("savedLevels");
    
    // Original levels section - empty for now
    const emptyOriginal = document.createElement("p");
    emptyOriginal.textContent = "No original levels available yet.";
    emptyOriginal.style.opacity = 0.7;
    originalLevels.appendChild(emptyOriginal);
    
    // Load saved levels from localStorage
    let savedLevelsData = [];
    try {
        const saved = localStorage.getItem("sledgepong_levels");
        if (saved) {
            savedLevelsData = JSON.parse(saved);
        }
    } catch (e) {
        console.error("Failed to load saved levels:", e);
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
    } catch (e) {
        console.error("Failed to load recent level:", e);
    }

    if (savedLevelsData.length > 0) {
        savedLevelsData.forEach((level, index) => {
            const btn = document.createElement("button");
            btn.textContent = level.name || `Level ${index + 1}`;
            btn.className = "level-item";
            btn.onclick = () => {
                // Save level data to localStorage for game to load
                const levelData = level.data || level;
                localStorage.setItem("sledgepong_current_level", JSON.stringify(levelData));
                
                // Navigate to game
                window.location.href = `http://127.0.0.1:8000/sledgepong/playpage/levels/game`;
            };
            savedLevels.appendChild(btn);
        });
    } else {
        const empty = document.createElement("p");
        empty.textContent = "No saved levels yet. Create one in the editor!";
        empty.style.opacity = 0.7;
        savedLevels.appendChild(empty);
    }
});
