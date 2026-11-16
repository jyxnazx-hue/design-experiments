document.addEventListener("DOMContentLoaded", () => {
  const feedContainer = document.getElementById("feedContainer");
  const scrollThumb = document.getElementById("scrollThumb");
  const scrollTrack = document.querySelector(".scroll-track");
  const likeButtons = document.querySelectorAll(".like-btn");
  const navButtons = document.querySelectorAll(".nav-btn");
  const composerInput = document.querySelector(".composer-input");

  // 1. Proportioned Scrollbar Sync
  function updateScrollbar() {
    const scrollHeight = feedContainer.scrollHeight;
    const clientHeight = feedContainer.clientHeight;
    const scrollTop = feedContainer.scrollTop;

    if (scrollHeight <= clientHeight) {
      scrollThumb.style.opacity = "0";
      return;
    }

    scrollThumb.style.opacity = "1";
    const trackHeight = scrollTrack.clientHeight;
    const thumbHeight = Math.max(96, (clientHeight / scrollHeight) * trackHeight);
    const maxScrollTop = scrollHeight - clientHeight;
    const maxThumbTop = trackHeight - thumbHeight;
    const thumbTop = (scrollTop / maxScrollTop) * maxThumbTop;

    scrollThumb.style.height = `${thumbHeight}px`;
    scrollThumb.style.transform = `translateY(${thumbTop}px)`;
  }

  feedContainer.addEventListener("scroll", updateScrollbar, { passive: true });
  window.addEventListener("resize", updateScrollbar);
  updateScrollbar();

  // 2. Like Toggle Interaction
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

  // 3. Bottom Bar Navigation
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const wasActive = btn.classList.contains("active");
      navButtons.forEach((b) => b.classList.remove("active"));
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