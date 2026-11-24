document.addEventListener("DOMContentLoaded", () => {
  const feedContainer = document.getElementById("feedContainer");
  const brandLockup = document.getElementById("brandLockup");
  const headerIconBtns = document.querySelectorAll(".header-icon-btn");
  const likeButtons = document.querySelectorAll(".like-btn");
  const navButtons = document.querySelectorAll(".nav-btn");
  const composerInput = document.querySelector(".composer-input");

  // 1. Collapse '@ threads' into '@' only when scrolling down
  feedContainer.addEventListener(
    "scroll",
    () => {
      if (feedContainer.scrollTop > 16) {
        brandLockup.classList.add("collapsed");
      } else {
        brandLockup.classList.remove("collapsed");
      }
    },
    { passive: true }
  );

  // Tapping the '@' logo scrolls back to top cleanly
  brandLockup.addEventListener("click", () => {
    feedContainer.scrollTo({ top: 0, behavior: "smooth" });
  });

  // 2. Top Menu / Search Icon Active States
  headerIconBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const wasActive = btn.classList.contains("active");
      headerIconBtns.forEach((b) => b.classList.remove("active"));
      if (!wasActive) btn.classList.add("active");
    });
  });

  // 3. Like Toggle Interaction
  likeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const countSpan = btn.querySelector("span");
      const rawText = countSpan.textContent;
      const isLiked = btn.classList.toggle("liked");

      if (!rawText.includes("K") && !rawText.includes("k")) {
        const current = parseInt(rawText, 10);
        countSpan.textContent = isLiked ? current + 1 : current - 1;
      }
    });
  });

  // 4. Bottom Bar Navigation
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const wasActive = btn.classList.contains("active");
      navButtons.forEach((b) => b.classList.remove("active"));
      headerIconBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const label = btn.getAttribute("aria-label");

      if (label === "Home" && wasActive) {
        feedContainer.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (label === "New Thread") {
        feedContainer.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => composerInput.focus(), 250);
      }
    });
  });
});