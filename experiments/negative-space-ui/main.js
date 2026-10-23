document.addEventListener('DOMContentLoaded', () => {
  const viewport = document.getElementById('viewport');
  const touchCursor = document.getElementById('touchCursor');

  // Realistic touch / pointer cursor tracking
  viewport.addEventListener('pointerenter', () => {
    touchCursor.classList.add('active');
  });

  viewport.addEventListener('pointerleave', () => {
    touchCursor.classList.remove('active');
  });

  viewport.addEventListener('pointermove', (e) => {
    const rect = viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    touchCursor.style.left = `${x}px`;
    touchCursor.style.top = `${y}px`;
  });
});