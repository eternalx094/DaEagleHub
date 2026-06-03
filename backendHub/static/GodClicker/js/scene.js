/* God Clicker — shared animated backdrop driver.
 * Seeds twinkling stars into #stars and periodically flashes #lightning.
 * Self-initializing and guarded, so it works on both the menu and the game. */
(function () {
  "use strict";

  function seedStars(host) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 80; i++) {
      const s = document.createElement("div");
      s.className = "star";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 60 + "%";
      const size = 1 + Math.random() * 2;
      s.style.width = s.style.height = size + "px";
      s.style.animationDelay = Math.random() * 3 + "s";
      frag.appendChild(s);
    }
    host.appendChild(frag);
  }

  function lightningLoop(bolt) {
    bolt.classList.remove("flash");
    void bolt.offsetWidth; // restart animation
    bolt.classList.add("flash");
    setTimeout(() => lightningLoop(bolt), 8000 + Math.random() * 14000);
  }

  function init() {
    const stars = document.getElementById("stars");
    if (stars) seedStars(stars);
    const bolt = document.getElementById("lightning");
    if (bolt) setTimeout(() => lightningLoop(bolt), 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
