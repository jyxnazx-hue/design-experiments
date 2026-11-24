document.addEventListener("DOMContentLoaded", () => {
  const feedContainer = document.getElementById("feedContainer");
  const topBar = document.getElementById("topBar");
  const brandLockup = document.getElementById("brandLockup");
  const headerIconBtns = document.querySelectorAll(".header-icon-btn");
  const navButtons = document.querySelectorAll(".nav-btn");
  const composerInput = document.querySelector(".composer-input");

  // 1. Render Consistent Rounded Threads Reaction Icons across all posts
  const actionRows = document.querySelectorAll(".action-row");
  actionRows.forEach((row) => {
    const likes = row.dataset.likes;
    const comments = row.dataset.comments;
    const reposts = row.dataset.reposts;
    const shares = row.dataset.shares;

    row.innerHTML = `
      <button class="action-btn like-btn" aria-label="Like">
        <svg class="heart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20.5C12 20.5 3.3 15.1 3.3 8.8C3.3 5.9 5.6 3.7 8.4 3.7C10.1 3.7 11.4 4.5 12 5.6C12.6 4.5 13.9 3.7 15.6 3.7C18.4 3.7 20.7 5.9 20.7 8.8C20.7 15.1 12 20.5 12 20.5Z"/>
        </svg>
        <span>${likes}</span>
      </button>

      <button class="action-btn" aria-label="Reply">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.4 11.8C20.4 16.3 16.6 19.9 12 19.9C10.4 19.9 8.9 19.5 7.7 18.8L3.6 20.1L4.9 16C4.1 14.8 3.6 13.3 3.6 11.8C3.6 7.3 7.4 3.6 12 3.6C16.6 3.6 20.4 7.3 20.4 11.8Z"/>
        </svg>
        <span>${comments}</span>
      </button>

      <button class="action-btn" aria-label="Repost">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16.2 4.2L19.5 7.5L16.2 10.8"/>
          <path d="M4.5 12V10.5C4.5 8.8 5.8 7.5 7.5 7.5H19.5"/>
          <path d="M7.8 19.8L4.5 16.5L7.8 13.2"/>
          <path d="M19.5 12V13.5C19.5 15.2 18.2 16.5 16.5 16.5H4.5"/>
        </svg>
        <span>${reposts}</span>
      </button>

      <button class="action-btn" aria-label="Share">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.5 11.2L4.5 4.2C3.8 3.9 3.2 4.6 3.5 5.2L6.5 12L3.5 18.8C3.2 19.4 3.8 20.1 4.5 19.8L20.5 12.8C21.2 12.5 21.2 11.5 20.5 11.2Z"/>
          <line x1="6.5" y1="12" x2="13.2" y2="12"/>
        </svg>
        <span>${shares}</span>
      </button>
    `;
  });

  // 2. Like Toggle Interaction
  document.querySelectorAll(".like-btn").forEach((btn) => {
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

  // 3. Morph '@ threads' into '@' & compact header on scroll
  feedContainer.addEventListener(
    "scroll",
    () => {
      if (feedContainer.scrollTop > 14) {
        topBar.classList.add("scrolled");
      } else {
        topBar.classList.remove("scrolled");
      }
    },
    { passive: true }
  );

  brandLockup.addEventListener("click", () => {
    feedContainer.scrollTo({ top: 0, behavior: "smooth" });
  });

  // 4. Header Icons Active/Idle Toggle
  headerIconBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const wasActive = btn.classList.contains("active");
      headerIconBtns.forEach((b) => b.classList.remove("active"));
      if (!wasActive) btn.classList.add("active");
    });
  });

  // 5. Bottom Navigation Bar
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
