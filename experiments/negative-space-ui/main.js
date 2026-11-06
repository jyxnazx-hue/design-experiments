document.addEventListener('DOMContentLoaded', () => {
  const viewport = document.getElementById('viewport');
  const track = document.getElementById('readingTrack');
  const cursor = document.getElementById('touchCursor');
  const scrollPill = document.getElementById('scrollIndicator');
  const butterflyPlate = document.getElementById('butterflyPlate');

  // -------------------------------------------------------------
  // 1. HAPTIC ENGINE
  // -------------------------------------------------------------
  const triggerHaptic = (pattern = 10) => {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };

  // -------------------------------------------------------------
  // 2. PARAGRAPH TOKENIZATION & INLINE-SLOT MAPPING
  // -------------------------------------------------------------
  const paragraphElements = Array.from(document.querySelectorAll('[data-particle-text]'));
  const allWordItems = [];

  paragraphElements.forEach((pEl) => {
    const rawText = pEl.textContent.trim();
    const tokens = rawText.split(/(\s+)/);
    pEl.innerHTML = '';

    tokens.forEach((token) => {
      if (!token) return;
      if (/^\s+$/.test(token)) {
        // Normal spacing between words
        pEl.appendChild(document.createTextNode(token));
      } else {
        // Individual word bead
        const span = document.createElement('span');
        span.className = 'word-bead';
        span.textContent = token;
        span.style.display = 'inline-block';
        span.style.position = 'relative';
        span.style.willChange = 'transform, padding';
        pEl.appendChild(span);

        allWordItems.push({
          el: span,
          parent: pEl,
          offsetX: 0,
          offsetY: 0,
          currentS: 0, // Continuous 1D displacement along thread
          targetS: 0,
          velocityS: 0,
          baseWeight: pEl.classList.contains('font-bold') ? 700 : 400
        });
      }
    });
  });

  // -------------------------------------------------------------
  // 3. POINTER STATE & HIT DETECTION
  // -------------------------------------------------------------
  const state = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    activeItem: null,
    activeIndex: -1,
    lineHeight: 22,    // From Figma inspect: 22px line-height
    containerWidth: 330 // Content frame width
  };

  const getScale = () => {
    const rect = viewport.getBoundingClientRect();
    return rect.height / 852;
  };

  viewport.addEventListener('pointerenter', () => cursor.classList.add('active'));
  viewport.addEventListener('pointerleave', () => {
    cursor.classList.remove('active');
    handleRelease();
  });

  viewport.addEventListener('pointerdown', (e) => {
    state.active = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.currentX = e.clientX;
    state.currentY = e.clientY;
    cursor.classList.add('active');

    const scale = getScale();
    let bestMatch = null;
    let bestIndex = -1;
    let minDistance = 35 * scale;

    // Detect touched word
    for (let i = 0; i < allWordItems.length; i++) {
      const item = allWordItems[i];
      const rect = item.el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(cx - e.clientX, cy - e.clientY);

      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = item;
        bestIndex = i;
      }
    }

    state.activeItem = bestMatch;
    state.activeIndex = bestIndex;

    if (bestMatch) {
      // Tactile touch feedback: +1.5px text pressure & weight bump
      bestMatch.el.style.fontSize = '17.5px';
      bestMatch.el.style.fontWeight = '700';
      triggerHaptic(12);
    }
  });

  window.addEventListener('pointermove', (e) => {
    const scale = getScale();
    const rect = viewport.getBoundingClientRect();

    cursor.style.left = `${(e.clientX - rect.left) / scale}px`;
    cursor.style.top = `${(e.clientY - rect.top) / scale}px`;

    if (state.active) {
      state.currentX = e.clientX;
      state.currentY = e.clientY;
    }
  });

  const handleRelease = () => {
    if (state.activeItem) {
      state.activeItem.el.style.fontSize = '';
      state.activeItem.el.style.fontWeight = `${state.activeItem.baseWeight}`;
      triggerHaptic(8);
    }
    state.active = false;
    state.activeItem = null;
    state.activeIndex = -1;
  };

  window.addEventListener('pointerup', handleRelease);
  window.addEventListener('pointercancel', handleRelease);

  // Scrollbar synchronizer
  let scrollTimer;
  track.addEventListener('scroll', () => {
    const maxScroll = track.scrollHeight - track.clientHeight;
    if (maxScroll <= 0) return;

    const available = 852 - 108 - 70 - 28;
    const progress = track.scrollTop / maxScroll;
    scrollPill.style.transform = `translateY(${(progress * available).toFixed(1)}px)`;
    scrollPill.classList.add('active');

    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => scrollPill.classList.remove('active'), 400);
  });

  // -------------------------------------------------------------
  // 4. CONTINUOUS THREAD (SNAKE PATH) PHYSICS ENGINE
  // -------------------------------------------------------------
  const SPRING_TENSION = 0.22;
  const SPRING_DAMPING = 0.74;

  function physicsTick() {
    const scale = getScale();
    const activeItem = state.activeItem;
    const activeIndex = state.activeIndex;

    // 1. Calculate thread offset (1D path translation)
    if (state.active && activeItem) {
      const deltaX = (state.currentX - state.startX) / scale;
      const deltaY = (state.currentY - state.startY) / scale;

      // Map 2D pointer pull into 1D scalar ribbon flow:
      // Dragging right moves forward along the line; dragging down jumps lines
      const lineMultiplier = (deltaY / state.lineHeight) * state.containerWidth;
      const totalFlowDistance = deltaX + lineMultiplier;

      activeItem.targetS = totalFlowDistance;

      // Propagate displacement to neighboring beads along the string
      for (let i = 0; i < allWordItems.length; i++) {
        if (i === activeIndex) continue;
        const item = allWordItems[i];
        const stringDistance = Math.abs(i - activeIndex);

        // Only adjacent words within a 6-word radius on the thread react
        if (stringDistance <= 6) {
          const falloff = Math.max(0, 1 - stringDistance / 6);
          // Words ahead get pushed forward; words behind pull along
          if (i > activeIndex) {
            item.targetS = Math.max(0, totalFlowDistance * falloff * 0.75);
          } else {
            item.targetS = Math.min(0, totalFlowDistance * falloff * 0.4);
          }
        } else {
          item.targetS = 0;
        }
      }
    } else {
      // Resting equilibrium: all displacements reset to 0
      for (let i = 0; i < allWordItems.length; i++) {
        allWordItems[i].targetS = 0;
      }
    }

    // 2. Resolve 1D scalar offsets into 2D line wrapping coordinates
    for (let i = 0; i < allWordItems.length; i++) {
      const item = allWordItems[i];

      // Hooke's Spring Integration: F = -k*(s - target) - c*v
      const forceS = (item.targetS - item.currentS) * SPRING_TENSION;
      item.velocityS = (item.velocityS + forceS) * SPRING_DAMPING;
      item.currentS += item.velocityS;

      const s = item.currentS;

      // Project scalar offset along line-wrap bounds:
      // When s exceeds container width, word wraps to next/previous line
      const linesWrapped = Math.floor(s / state.containerWidth);
      const remainderX = s - (linesWrapped * state.containerWidth);

      item.offsetX = remainderX;
      item.offsetY = linesWrapped * state.lineHeight;

      // Direct GPU transform update (zero DOM reflow)
      item.el.style.transform = `translate3d(${item.offsetX.toFixed(2)}px, ${item.offsetY.toFixed(2)}px, 0)`;
    }

    // 3. Butterfly Plate Elastic Deflection
    if (butterflyPlate) {
      const bRect = butterflyPlate.getBoundingClientRect();
      const bcx = bRect.left + bRect.width / 2;
      const bcy = bRect.top + bRect.height / 2;
      const bDist = Math.hypot(bcx - state.currentX, bcy - state.currentY) / scale;

      let bTargetX = 0;
      let bTargetY = 0;

      if (state.active && bDist < 120) {
        const force = (120 - bDist) * 0.12;
        const ang = Math.atan2(bcy - state.currentY, bcx - state.currentX);
        bTargetX = Math.cos(ang) * force;
        bTargetY = Math.sin(ang) * force;
      }

      butterflyPlate.style.transform = `translate3d(${bTargetX.toFixed(2)}px, ${bTargetY.toFixed(2)}px, 0) scale(${state.active && bDist < 100 ? 0.98 : 1})`;
    }

    requestAnimationFrame(physicsTick);
  }

  requestAnimationFrame(physicsTick);
});