export function initCompliantSurface({
  container = document.body,
  selector = '[data-elastic]',
  radius = 120,
  damping = 0.45,
  springStrength = 0.18
} = {}) {
  const elements = Array.from(document.querySelectorAll(selector));
  const touch = { y: 0, active: false };

  container.addEventListener('pointerdown', (e) => {
    touch.active = true;
    touch.y = e.clientY;
  });

  window.addEventListener('pointermove', (e) => {
    if (touch.active) touch.y = e.clientY;
  });

  window.addEventListener('pointerup', () => {
    touch.active = false;
  });

  window.addEventListener('pointercancel', () => {
    touch.active = false;
  });

  function tick() {
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const distY = touch.y - centerY;
      const distance = Math.abs(distY);

      let targetY = 0;

      if (touch.active && distance < radius) {
        const force = (radius - distance) * damping;
        targetY = distY > 0 ? -force : force;
      }

      const currentY = parseFloat(el.dataset.offsetY || '0');
      const nextY = currentY + (targetY - currentY) * springStrength;

      el.dataset.offsetY = nextY;
      el.style.transform = `translate3d(0, ${nextY.toFixed(2)}px, 0)`;
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}