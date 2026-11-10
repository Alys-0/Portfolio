import * as THREE from 'three';

/* =========================================================
   1. INITIALISATION THREE.JS (MÉDUSE EN ARRIÈRE-PLAN)
========================================================= */

const canvas = document.getElementById('jelly-canvas');
let jellyField = null;
let camera = null;
let renderer = null;
let scene = null;

const clock = new THREE.Clock();

async function init3D() {
  if (!canvas) return;

  try {
    const { JellyfishField } = await import('./jellyfishfield.js');

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 15);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lumières adaptées pour un rendu néon bioluminescent
    const ambientLight = new THREE.AmbientLight(0x1a0033, 1.8);
    scene.add(ambientLight);

    const topLight = new THREE.DirectionalLight(0x00f3ff, 2.5);
    topLight.position.set(5, 15, 10);
    scene.add(topLight);

    const innerPointLight = new THREE.PointLight(0xff00aa, 3, 10);
    innerPointLight.position.set(0, 0, 0);
    scene.add(innerPointLight);

    // Instancier la méduse
    jellyField = new JellyfishField(scene, camera, { count: 5 });

    // Lancement de la boucle d'animation
    requestAnimationFrame(animate);

  } catch (err) {
    console.warn('Erreur Rendu 3D :', err);
  }
}

/* =========================================================
   2. BOUCLE D'ANIMATION 3D
========================================================= */

function animate() {
  const delta = clock.getDelta();

  if (jellyField) jellyField.update(delta);
  if (renderer && scene && camera) renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

// Lancement de l'initialisation 3D
init3D();

/* =========================================================
   3. BULLES & LISTENERS
========================================================= */

function createBubbles(count = 18) {
  for (let k = 0; k < count; k++) {
    const size = 4 + Math.random() * 14;
    const xPct = Math.random() * 100;
    const startY = 40 + Math.random() * 60;
    const drift = (Math.random() - 0.5) * 60;
    const dur = 14 + Math.random() * 16;
    const delay = -(Math.random() * dur);

    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    bubble.style.cssText = `
      width:${size}px; height:${size}px;
      left:${xPct}vw; top:${startY}vh;
      --drift:${drift.toFixed(0)}px;
      animation: bubbleRise ${dur.toFixed(1)}s ${delay.toFixed(1)}s linear infinite;
    `;
    document.body.appendChild(bubble);
  }
}
createBubbles(18);

window.addEventListener('resize', () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});