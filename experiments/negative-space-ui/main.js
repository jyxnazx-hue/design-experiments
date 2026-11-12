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
  // 2. TOKENIZE PARAGRAPHS INTO ELASTIC WORD BEADS
  // -------------------------------------------------------------
  const textContainers = Array.from(document.querySelectorAll('[data-particle-text]'));
  const wordBeads = [];

  textContainers.forEach((container) => {
    const raw = container.textContent.trim();
    const tokens = raw.split(/(\s+)/);
    container.innerHTML = '';

    tokens.forEach((token) => {
      if (!token) return;
      if (/^\s+$/.test(token)) {
        container.appendChild(document.createTextNode(token));
      } else {
        const span = document.createElement('span');
        span.className = 'word-bead';
        span.textContent = token;
        span.style.display = 'inline-block';
        span.style.willChange = 'transform';
        container.appendChild(span);

        wordBeads.push({
          el: span,
          container,
          // Resting screen-relative coordinates inside readingTrack
          homeX: 0,
          homeY: 0,
          width: 0,
          // Current smoothed offset
          currX: 0,
          currY: 0,
          // Velocity for critically damped spring
          velX: 0,
          velY: 0,
          baseWeight: container.classList.contains('font-bold') ? 700 : 400
        });
      }
    });
  });

  // -------------------------------------------------------------
  // 3. CACHE EQUILIBRIUM COORDINATES (Zero-Offset Home)
  // -------------------------------------------------------------
  const getScale = () => {
    const rect = viewport.getBoundingClientRect();
    return rect.height / 852;
  };

  function cacheEquilibrium() {
    const scale = getScale();
    const trackRect = track.getBoundingClientRect();

    wordBeads.forEach((bead) => {
      // Temporarily read true layout position without transform
      bead.el.style.transform = 'translate3d(0px, 0px, 0px)';
      const rect = bead.el.getBoundingClientRect();
      bead.homeX = (rect.left - trackRect.left + rect.width / 2) / scale;
      bead.homeY = (rect.top - trackRect.top + rect.height / 2 + track.scrollTop) / scale;
      bead.width = rect.width / scale;
    });
  }

  // Run after web fonts settle
  document.fonts.ready.then(() => {
    setTimeout(cacheEquilibrium, 50);
  });
  window.addEventListener('resize', cacheEquilibrium);

  // -------------------------------------------------------------
  // 4. POINTER & GESTURE VECTOR TRACKING
  // -------------------------------------------------------------
  const pointer = {
    active: false,
    x: 0,          // Current X inside 393px viewport
    y: 0,          // Current Y inside 852px viewport (scroll-adjusted)
    startX: 0,
    startY: 0,
    vx: 0,         // Horizontal swipe velocity
    lastX: 0
  };

  function updatePointerCoords(e) {
    const scale = getScale();
    const vpRect = viewport.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();

    const relVpX = (e.clientX - vpRect.left) / scale;
    const relVpY = (e.clientY - vpRect.top) / scale;

    cursor.style.left = `${relVpX}px`;
    cursor.style.top = `${relVpY}px`;

    const trackX = (e.clientX - trackRect.left) / scale;
    const trackY = (e.clientY - trackRect.top + track.scrollTop) / scale;

    pointer.vx = trackX - pointer.lastX;
    pointer.lastX = trackX;
    pointer.x = trackX;
    pointer.y = trackY;
  }

  viewport.addEventListener('pointerenter', () => cursor.classList.add('active'));
  viewport.addEventListener('pointerleave', () => {
    cursor.classList.remove('active');
    releaseTouch();
  });

  viewport.addEventListener('pointerdown', (e) => {
    pointer.active = true;
    updatePointerCoords(e);
    pointer.startX = pointer.x;
    pointer.startY = pointer.y;
    pointer.lastX = pointer.x;
    pointer.vx = 0;

    cursor.classList.add('active');
    triggerHaptic(10);
  });

  window.addEventListener('pointermove', (e) => {
    updatePointerCoords(e);
  });

  function releaseTouch() {
    if (pointer.active) {
      triggerHaptic(6);
    }
    pointer.active = false;
    pointer.vx = 0;
  }

  window.addEventListener('pointerup', releaseTouch);
  window.addEventListener('pointercancel', releaseTouch);

  // Whisper-Light Scroll Indicator
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
  // 5. WEIGHTLESS C-CURVE STRING & LINE-SHIFT PHYSICS (120 FPS)
  // -------------------------------------------------------------
  const POCKET_RADIUS = 95;       // Exclusion aperture around touch point
  const LINE_HEIGHT = 22;         // Typography line-height (px)
  const COLUMN_LEFT = 31.5;       // (393 - 330) / 2
  const COLUMN_RIGHT = 361.5;     // 393 - 31.5

  // Critically damped spring constants (Zero bounce/jitter)
  const STIFFNESS = 0.16;
  const DAMPING = 0.78;

  let butterflyCurrX = 0;
  let butterflyCurrY = 0;
  let butterflyVelX = 0;
  let butterflyVelY = 0;

  function renderPhysicsLoop() {
    const swipeDeltaX = pointer.active ? (pointer.x - pointer.startX) : 0;
    const swipeDeltaY = pointer.active ? (pointer.y - pointer.startY) : 0;
    const isHorizontalSwipe = pointer.active && Math.abs(swipeDeltaX) > Math.abs(swipeDeltaY) * 1.15 && Math.abs(swipeDeltaX) > 12;

    for (let i = 0; i < wordBeads.length; i++) {
      const b = wordBeads[i];
      let targetX = 0;
      let targetY = 0;

      if (pointer.active) {
        const dx = b.homeX - pointer.x;
        const dy = b.homeY - pointer.y;
        const dist = Math.hypot(dx, dy);

        if (dist < POCKET_RADIUS) {
          // Normalized proximity: 1.0 at finger center -> 0.0 at boundary edge
          const t = 1 - dist / POCKET_RADIUS;
          // Smooth cubic ease for organic C-curve contour
          const ease = t * t * (3 - 2 * t);

          if (isHorizontalSwipe) {
            // --- MODE A: HORIZONTAL STRING SWIPE (C-Curve + Line Shift) ---
            const dirX = swipeDeltaX >= 0 ? 1 : -1;
            const pushMag = Math.min(115, Math.abs(swipeDeltaX) * 0.85) * ease;
            const rawTargetX = dirX * pushMag;

            const projectedX = b.homeX + rawTargetX;

            // If pushed past right or left margin, wrap cleanly to next/previous line
            if (projectedX > COLUMN_RIGHT - b.width * 0.4) {
              const overflow = projectedX - (COLUMN_RIGHT - b.width * 0.4);
              targetX = (COLUMN_LEFT + overflow) - b.homeX;
              targetY = LINE_HEIGHT * ease; // Step down to next line
            } else if (projectedX < COLUMN_LEFT + b.width * 0.4) {
              const underflow = (COLUMN_LEFT + b.width * 0.4) - projectedX;
              targetX = (COLUMN_RIGHT - underflow) - b.homeX;
              targetY = -LINE_HEIGHT * ease; // Step up to previous line
            } else {
              // Stay on line while bowing into a C-curve pocket around finger
              targetX = rawTargetX;
              const verticalCurve = (dy >= 0 ? 1 : -1) * (ease * 12);
              targetY = verticalCurve;
            }
          } else {
            // --- MODE B: VERTICAL / STATIONARY TOUCH (Pure C-Pocket Clearing) ---
            // Words part outward around the fingertip without gravity sag
            const angle = Math.atan2(dy, dx || 0.001);
            const radialPush = ease * 46;

            targetX = Math.cos(angle) * radialPush * 1.15;
            targetY = Math.sin(angle) * radialPush * 0.85;
          }
        }
      }

      // Critically Damped Hooke's Spring Integration (Smooth, zero-jitter return)
      const forceX = (targetX - b.currX) * STIFFNESS;
      const forceY = (targetY - b.currY) * STIFFNESS;

      b.velX = (b.velX + forceX) * DAMPING;
      b.velY = (b.velY + forceY) * DAMPING;

      b.currX += b.velX;
      b.currY += b.velY;

      // Snap to exact 0 when settled to eliminate sub-pixel shimmer
      if (!pointer.active && Math.abs(b.currX) < 0.04 && Math.abs(b.currY) < 0.04 && Math.abs(b.velX) < 0.04) {
        b.currX = 0;
        b.currY = 0;
        b.velX = 0;
        b.velY = 0;
      }

      b.el.style.transform = `translate3d(${b.currX.toFixed(2)}px, ${b.currY.toFixed(2)}px, 0)`;
    }

    // Butterfly Plate Mass Deflection (High resistance, zero gravity)
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
        const f = (1 - bDist / 120) * 14;
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

    requestAnimationFrame(renderPhysicsLoop);
  }

  requestAnimationFrame(renderPhysicsLoop);
});