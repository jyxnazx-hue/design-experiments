document.addEventListener('DOMContentLoaded', () => {
  const viewport = document.getElementById('viewport');
  const track = document.getElementById('readingTrack');
  const cursor = document.getElementById('touchCursor');
  const scrollPill = document.getElementById('scrollIndicator');
  const butterflyPlate = document.getElementById('butterflyPlate');

  // -------------------------------------------------------------
  // 1. TACTILE HAPTIC FEEDBACK
  // -------------------------------------------------------------
  const triggerHaptic = (pattern = 8) => {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };

  // -------------------------------------------------------------
  // 2. PARAGRAPH CHAIN SETUP (1D Continuous Word Beads)
  // -------------------------------------------------------------
  const textContainers = Array.from(document.querySelectorAll('[data-particle-text]'));
  const paragraphChains = [];

  textContainers.forEach((container) => {
    const raw = container.textContent.trim();
    const tokens = raw.split(/\s+/);
    container.innerHTML = '';

    const beads = [];
    tokens.forEach((word, idx) => {
      const span = document.createElement('span');
      span.className = 'word-bead';
      span.textContent = word;
      span.style.display = 'inline-block';
      span.style.willChange = 'transform';
      container.appendChild(span);

      if (idx < tokens.length - 1) {
        container.appendChild(document.createTextNode(' '));
      }

      beads.push({
        el: span,
        width: 0,
        homeX: 0,
        homeY: 0,
        currOffsetX: 0,
        currOffsetY: 0,
        velX: 0,
        velY: 0
      });
    });

    paragraphChains.push({
      container,
      beads,
      isDropCapLead: container.classList.contains('drop-cap-lead'),
      spaceWidth: 4.2
    });
  });

  // -------------------------------------------------------------
  // 3. MEASURE RESTING EDITORIAL POSITIONS & WIDTHS
  // -------------------------------------------------------------
  const getScale = () => {
    const rect = viewport.getBoundingClientRect();
    return rect.height / 852;
  };

  function measureChains() {
    const scale = getScale();
    const trackRect = track.getBoundingClientRect();

    paragraphChains.forEach((chain) => {
      const containerRect = chain.container.getBoundingClientRect();
      chain.leftBound = (containerRect.left - trackRect.left) / scale;
      chain.rightBound = (containerRect.right - trackRect.left) / scale;
      chain.topBound = (containerRect.top - trackRect.top + track.scrollTop) / scale;

      chain.beads.forEach((b) => {
        b.el.style.transform = 'translate3d(0px, 0px, 0px)';
        const r = b.el.getBoundingClientRect();
        b.width = r.width / scale;
        b.homeX = (r.left - trackRect.left) / scale;
        b.homeY = (r.top - trackRect.top + track.scrollTop) / scale;
      });

      // Measure actual space width between first two words on the same line
      if (chain.beads.length >= 2 && Math.abs(chain.beads[1].homeY - chain.beads[0].homeY) < 4) {
        chain.spaceWidth = Math.max(3, chain.beads[1].homeX - (chain.beads[0].homeX + chain.beads[0].width));
      }
    });
  }

  document.fonts.ready.then(() => {
    setTimeout(measureChains, 60);
  });
  window.addEventListener('resize', measureChains);

  // -------------------------------------------------------------
  // 4. POINTER & ONE-FINGER "C"-CURVE GESTURE TRACKING
  // -------------------------------------------------------------
  const pointer = {
    active: false,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    lastLineWrapCount: 0
  };

  function updatePointer(e) {
    const scale = getScale();
    const vpRect = viewport.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();

    cursor.style.left = `${(e.clientX - vpRect.left) / scale}px`;
    cursor.style.top = `${(e.clientY - vpRect.top) / scale}px`;

    pointer.x = (e.clientX - trackRect.left) / scale;
    pointer.y = (e.clientY - trackRect.top + track.scrollTop) / scale;
  }

  viewport.addEventListener('pointerenter', () => cursor.classList.add('active'));
  viewport.addEventListener('pointerleave', () => {
    cursor.classList.remove('active');
    releasePointer();
  });

  viewport.addEventListener('pointerdown', (e) => {
    pointer.active = true;
    updatePointer(e);
    pointer.startX = pointer.x;
    pointer.startY = pointer.y;
    pointer.lastLineWrapCount = 0;

    cursor.classList.add('active');
    triggerHaptic(10);
  });

  window.addEventListener('pointermove', (e) => {
    updatePointer(e);
  });

  function releasePointer() {
    if (pointer.active) {
      triggerHaptic(6);
    }
    pointer.active = false;
  }

  window.addEventListener('pointerup', releasePointer);
  window.addEventListener('pointercancel', releasePointer);

  // Faint Cream Scrollbar Synchronizer
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
  // 5. CONTINUOUS SNAKING CHAIN + "C"-CURVE POCKET SOLVER (120 FPS)
  // -------------------------------------------------------------
  const LINE_HEIGHT = 22;
  const C_CURVE_HEIGHT = 88;     // Vertical span of the "C" curve pocket
  const STIFFNESS = 0.16;        // Critically damped spring stiffness
  const DAMPING = 0.78;          // Zero-bounce damping ratio

  let butterflyCurrX = 0;
  let butterflyCurrY = 0;
  let butterflyVelX = 0;
  let butterflyVelY = 0;

  function renderLoop() {
    const swipeDX = pointer.active ? (pointer.x - pointer.startX) : 0;
    const swipeDY = pointer.active ? (pointer.y - pointer.startY) : 0;
    const isHorizontalGesture = pointer.active && Math.abs(swipeDX) > Math.abs(swipeDY) * 0.9 && Math.abs(swipeDX) > 8;

    let currentWrappedWords = 0;

    for (let c = 0; c < paragraphChains.length; c++) {
      const chain = paragraphChains[c];
      const leftEdge = chain.leftBound;
      const rightEdge = chain.rightBound;

      // Sequential 1D cursor walking along the snaking chain
      let cursorX = leftEdge;
      let cursorY = chain.topBound;

      for (let i = 0; i < chain.beads.length; i++) {
        const b = chain.beads[i];
        let targetX = b.homeX;
        let targetY = b.homeY;

        if (pointer.active) {
          // Check if current line Y falls inside the vertical span of the "C" curve
          const lineCenterY = cursorY + LINE_HEIGHT * 0.5;
          const distY = lineCenterY - pointer.y;
          const absDistY = Math.abs(distY);

          if (absDistY < C_CURVE_HEIGHT) {
            // Smooth cosine bell profile forms a continuous "C" contour across lines
            const normY = absDistY / C_CURVE_HEIGHT; // 0 at center -> 1 at top/bottom tips
            const cProfile = Math.cos(normY * (Math.PI / 2)); // 1.0 at apex, 0.0 at ends
            const smoothCurve = cProfile * cProfile;

            if (isHorizontalGesture) {
              // --- ONE-FINGER HORIZONTAL SWIPE: SINGLE "C" CURVE ---
              const dir = swipeDX >= 0 ? 1 : -1;
              const indentDepth = Math.min(180, Math.abs(swipeDX) * 1.15) * smoothCurve;

              if (dir > 0) {
                // Swiping Left -> Right: Carves a left-side "(" pocket pushing words right & onto next lines
                const pocketRightWall = leftEdge + indentDepth;
                if (cursorX < pocketRightWall) {
                  cursorX = pocketRightWall;
                }
              } else {
                // Swiping Right -> Left: Carves a right-side ")" pocket wrapping words onto next lines early
                const pocketLeftWall = rightEdge - indentDepth;
                if (cursorX + b.width > pocketLeftWall && cursorX > leftEdge + 12) {
                  cursorX = leftEdge;
                  cursorY += LINE_HEIGHT;
                  currentWrappedWords++;
                }
              }
            } else {
              // --- VERTICAL / STATIONARY TOUCH: EXCLUSION POCKET ---
              const pillarRadius = 38 * smoothCurve;
              const gapLeft = pointer.x - pillarRadius;
              const gapRight = pointer.x + pillarRadius;

              if (cursorX + b.width > gapLeft && cursorX < gapRight) {
                cursorX = gapRight;
              }
            }
          }

          // Standard line-wrap check: if word exceeds right margin, wrap cleanly onto next line
          if (cursorX + b.width > rightEdge + 1 && cursorX > leftEdge + 4) {
            cursorX = leftEdge;
            cursorY += LINE_HEIGHT;
            currentWrappedWords++;
          }

          targetX = cursorX;
          targetY = cursorY;

          // Advance 1D ribbon cursor to next word slot
          cursorX += b.width + chain.spaceWidth;
        }

        // Convert absolute target coordinates into relative GPU transform offsets
        const desiredOffsetX = targetX - b.homeX;
        const desiredOffsetY = targetY - b.homeY;

        // Critically Damped Hooke's Spring Integration
        const fx = (desiredOffsetX - b.currOffsetX) * STIFFNESS;
        const fy = (desiredOffsetY - b.currOffsetY) * STIFFNESS;

        b.velX = (b.velX + fx) * DAMPING;
        b.velY = (b.velY + fy) * DAMPING;

        b.currOffsetX += b.velX;
        b.currOffsetY += b.velY;

        // Settle cleanly to exact 0 at rest
        if (!pointer.active && Math.abs(b.currOffsetX) < 0.04 && Math.abs(b.currOffsetY) < 0.04 && Math.abs(b.velX) < 0.04) {
          b.currOffsetX = 0;
          b.currOffsetY = 0;
          b.velX = 0;
          b.velY = 0;
        }

        b.el.style.transform = `translate3d(${b.currOffsetX.toFixed(2)}px, ${b.currOffsetY.toFixed(2)}px, 0)`;
      }
    }

    // Subtle micro-haptic tick each time a word wraps across a line boundary
    if (pointer.active && currentWrappedWords !== pointer.lastLineWrapCount) {
      triggerHaptic(5);
      pointer.lastLineWrapCount = currentWrappedWords;
    }

    // Butterfly Specimen Plate Mass Deflection
    if (butterflyPlate) {
      const scale = getScale();
      const trackRect = track.getBoundingClientRect();
      const bRect = butterflyPlate.getBoundingClientRect();

      const bcx = (bRect.left - trackRect.left + bRect.width / 2) / scale - butterflyCurrX;
      const bcy = (bRect.top - trackRect.top + bRect.height / 2 + track.scrollTop) / scale - butterflyCurrY;

      const bdx = bcx - pointer.x;
      const bdy = bcy - pointer.y;
      const bDist = Math.hypot(bdx, bdy);

      let bTargetX = 0;
      let bTargetY = 0;

      if (pointer.active && bDist < 120) {
        const f = (1 - bDist / 120) * 12;
        const ang = Math.atan2(bdy, bdx);
        bTargetX = Math.cos(ang) * f;
        bTargetY = Math.sin(ang) * f;
      }

      butterflyVelX = (butterflyVelX + (bTargetX - butterflyCurrX) * 0.14) * 0.78;
      butterflyVelY = (butterflyVelY + (bTargetY - butterflyCurrY) * 0.14) * 0.78;
      butterflyCurrX += butterflyVelX;
      butterflyCurrY += butterflyVelY;

      const isPressed = pointer.active && bDist < 100;
      butterflyPlate.style.transform = `translate3d(${butterflyCurrX.toFixed(2)}px, ${butterflyCurrY.toFixed(2)}px, 0) scale(${isPressed ? 0.98 : 1})`;
    }

    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);
});