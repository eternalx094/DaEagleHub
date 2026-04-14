const STORAGE_KEY = "sledgepong_options";

const defaults = {
    volume: 80,
    refreshRate: "60",
    graphics: "high",
    ldm: false
};

const loadSettings = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...defaults };
        const parsed = JSON.parse(raw);
        return { ...defaults, ...parsed };
    } catch (error) {
        console.error("Failed to load options:", error);
        return { ...defaults };
    }
};

const saveSettings = (settings) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save options:", error);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const volumeInput = document.getElementById("optVolume");
    const volumeValue = document.getElementById("optVolumeValue");
    const refreshSelect = document.getElementById("optRefresh");
    const graphicsSelect = document.getElementById("optGraphics");
    const ldmToggle = document.getElementById("optLdm");

    const settings = loadSettings();

    volumeInput.value = String(settings.volume);
    volumeValue.textContent = `${settings.volume}%`;
    refreshSelect.value = settings.refreshRate;
    graphicsSelect.value = settings.graphics;
    ldmToggle.checked = Boolean(settings.ldm);

    volumeInput.addEventListener("input", () => {
        settings.volume = Number(volumeInput.value);
        volumeValue.textContent = `${settings.volume}%`;
        saveSettings(settings);
    });

    refreshSelect.addEventListener("change", () => {
        settings.refreshRate = refreshSelect.value;
        saveSettings(settings);
    });

    graphicsSelect.addEventListener("change", () => {
        settings.graphics = graphicsSelect.value;
        saveSettings(settings);
    });

    ldmToggle.addEventListener("change", () => {
        settings.ldm = ldmToggle.checked;
        saveSettings(settings);
    });
});
