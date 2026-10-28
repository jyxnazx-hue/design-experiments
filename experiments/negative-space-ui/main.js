// --- Custom Cursor Logic ---
const cursor = document.getElementById('cursor');
const appContainer = document.querySelector('.app-container');

// Hide default cursor on the app container
appContainer.style.cursor = 'none';

let mouseX = 0;
let mouseY = 0;
let cursorX = 0;
let cursorY = 0;

// Smooth follow settings
const speed = 0.15;

appContainer.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
});

appContainer.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
});

appContainer.addEventListener('mousemove', (e) => {
    // Get mouse position relative to viewport
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Animation loop for smooth cursor movement
function animateCursor() {
    // Linear interpolation for smooth follow
    cursorX += (mouseX - cursorX) * speed;
    cursorY += (mouseY - cursorY) * speed;

    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;

    requestAnimationFrame(animateCursor);
}

animateCursor();

// Add some interactive hover states for elements
const interactiveElements = document.querySelectorAll('.tab, .menu-icon');

interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursor.style.width = '40px';
        cursor.style.height = '40px';
        cursor.style.background = 'rgba(194, 65, 12, 0.2)';
    });
    el.addEventListener('mouseleave', () => {
        cursor.style.width = '20px';
        cursor.style.height = '20px';
        cursor.style.background = '#C2410C';
    });
});