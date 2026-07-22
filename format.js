let smoothProgress = 0;

/* ── Sélecteurs ── */
const travelerEl = document.getElementById('traveler');
const timeline = document.querySelector('.timeline');
const items = document.querySelectorAll('.timeline-item');
const wavePath = document.getElementById('wavePath');
const lineEl = document.querySelector('.timeline-line');
const svg = wavePath ? wavePath.parentElement : null;
const blobEls = document.querySelectorAll('.blob');

/* =========================
   ALTERNANCE GAUCHE / DROITE
========================= */
items.forEach((item, i) => {
  item.classList.add(i % 2 === 0 ? 'left' : 'right');
});

/* =========================
   COULEURS
========================= */
const colors = ['#c084fc', '#f472b6', '#60a5fa', '#34d399', '#fbbf24'];

items.forEach((item, i) => {
  item.style.setProperty('--color', colors[i % colors.length]);
});

/* =========================
   SVG — defs + energyPath
========================= */
if (svg && wavePath) {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="energyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#c084fc"/>
      <stop offset="25%"  stop-color="#f472b6"/>
      <stop offset="50%"  stop-color="#60a5fa"/>
      <stop offset="75%"  stop-color="#34d399"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  `;
  svg.prepend(defs);

  const energyPath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  );
  energyPath.setAttribute('id', 'energyPath');
  svg.appendChild(energyPath);
}

const energyPath = document.getElementById('energyPath');

/* =========================
   VIEWBOX DYNAMIQUE
========================= */
function currentHeight() {
  return lineEl ? lineEl.offsetHeight : 1000;
}

function syncViewBox() {
  const h = currentHeight();
  if (svg) {
    svg.setAttribute('viewBox', `0 0 100 ${h}`);
  }
  return h;
}

/* =========================
   WAVE (Vague)
========================= */
function xAt(y, t) {
  return (
    50 +
    Math.sin(y * 0.011 + t * 0.00032) * 16 +
    Math.sin(y * 0.028 + t * 0.00021) * 9 +
    Math.sin(y * 0.055 + t * 0.00013) * 3
  );
}

function generateWave(t, h) {
  const x0 = xAt(0, t);
  let d = `M${x0} 0`;

  for (let y = 0; y <= h; y += 60) {
    const x = xAt(y, t);
    const nx = xAt(y + 60, t);
    d += ` C ${x - 14} ${y + 20}, ${nx + 14} ${y + 40}, ${nx} ${y + 60}`;
  }
  return d;
}

/* =========================
   DOTS
========================= */
const dotEls = [];

items.forEach((item, i) => {
  item.querySelector('.dot')?.remove();

  const dot = document.createElement('span');
  dot.classList.add('dot');
  dot.style.setProperty('--color', colors[i % colors.length]);
  dot.dataset.index = i;
  document.body.appendChild(dot);
  dotEls.push(dot);

  const content = item.querySelector('.content');
  const c = colors[i % colors.length];

  if (!content) return;

  dot.addEventListener('mouseenter', () => {
    content.style.transform = 'scale(1.045) translateY(-3px)';
    content.style.boxShadow = `0 0 36px color-mix(in srgb,${c} 32%,transparent)`;
    content.style.borderColor = `color-mix(in srgb,${c} 52%,transparent)`;
  });
  dot.addEventListener('mouseleave', () => {
    content.style.transform = '';
    content.style.boxShadow = '';
    content.style.borderColor = '';
  });

  content.addEventListener('mouseenter', () => {
    if (!dot.matches(':hover')) {
      dot.style.width = '14px';
      dot.style.height = '14px';
      dot.style.background = c;
      dot.style.boxShadow = `0 0 12px ${c}, 0 0 28px ${c}, 0 0 55px ${c}`;
    }
  });
  content.addEventListener('mouseleave', () => {
    dot.style.width = '';
    dot.style.height = '';
    dot.style.background = '';
    dot.style.boxShadow = '';
  });
});

/* =========================
   PLACE DOTS
========================= */
function placeDots() {
  if (!lineEl || !wavePath) return;

  const lineRect = lineEl.getBoundingClientRect();
  const pathLen = wavePath.getTotalLength();
  const svgW = lineEl.offsetWidth;
  const svgH = lineEl.offsetHeight;

  if (!pathLen || !svgH) return;

  items.forEach((item, i) => {
    const dot = dotEls[i];
    if (!dot) return;

    const itemCy = item.offsetTop + item.offsetHeight / 2;
    const relY = itemCy - lineEl.offsetTop;
    const ratio = Math.max(0, Math.min(relY / svgH, 1));

    const pt = wavePath.getPointAtLength(pathLen * ratio);

    const pageX = lineRect.left + window.scrollX + (pt.x / 100) * svgW;
    const pageY = lineRect.top + window.scrollY + pt.y;

    dot.style.left = `${pageX}px`;
    dot.style.top = `${pageY}px`;
  });
}

/* ==============================================
   MÉDUSE EN NAGE LIBRE EN ARRIÈRE-PLAN
============================================== */
let isHovered = false;

let jellyX = window.innerWidth * 0.2;
let jellyY = window.innerHeight * 0.3;
let targetX = jellyX;
let targetY = jellyY;
let smoothAngle = 0;

function pickNewTarget() {
  const margin = 100;
  targetX = margin + Math.random() * (window.innerWidth - margin * 2);
  targetY = margin + Math.random() * (window.innerHeight - margin * 2);
}

pickNewTarget();

function updateTravelerAuto(t) {
  if (!isHovered && travelerEl) {
    const dx = targetX - jellyX;
    const dy = targetY - jellyY;
    const dist = Math.hypot(dx, dy);

    if (dist < 50) {
      pickNewTarget();
    }

    // Déplacement fluide en eau douce
    jellyX += dx * 0.0025;
    jellyY += dy * 0.0025;

    // Directivité de la tête
    const angleRad = Math.atan2(dy, dx);
    const targetAngle = angleRad * (180 / Math.PI) - 90;

    smoothAngle += (targetAngle - smoothAngle) * 0.03;
    const wobble = Math.sin(t * 0.0016) * 4;

    travelerEl.style.transform = `
      translate3d(${jellyX}px, ${jellyY}px, 0)
      translate(-50%, -30%)
      rotate(${(smoothAngle + wobble).toFixed(2)}deg)
    `;

    /* Animation continue de la traînée lumineuse */
    if (wavePath && energyPath) {
      const total = wavePath.getTotalLength();
      if (total) {
        const progress = (t * 0.00015) % 1;
        const trailLength = 90;
        const current = progress * total;
        energyPath.style.strokeDasharray = `${trailLength} ${total}`;
        energyPath.style.strokeDashoffset = `${-(current - trailLength)}`;
      }
    }

    /* Activation des dots au scroll */
    const scrollRatio =
      window.scrollY /
      (document.documentElement.scrollHeight - window.innerHeight || 1);
    items.forEach((item, i) => {
      const dot = dotEls[i];
      const itemCy = item.offsetTop + item.offsetHeight / 2;
      const ratio = itemCy / document.documentElement.scrollHeight;
      const active = Math.abs(scrollRatio - ratio) < 0.1;

      item.classList.toggle('active', active);
      dot?.classList.toggle('active', active);
    });
  }
}

/* ==============================================
   PAUSE AU HOVER (MÉDUSE + DOTS + BLOCS + NAV)
============================================== */
function setupHoverEvents() {
  const targets = document.querySelectorAll('.content, .dot, nav.nav-tool a');
  targets.forEach((target) => {
    target.addEventListener('mouseenter', () => {
      isHovered = true;
      if (travelerEl) travelerEl.classList.add('paused');
    });
    target.addEventListener('mouseleave', () => {
      isHovered = false;
      if (travelerEl) travelerEl.classList.remove('paused');
    });
  });
}
setupHoverEvents();

/* =========================
   APPARITION AU SCROLL (.reveal)
========================= */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.25, rootMargin: '0px 0px -60px 0px' }
);

document
  .querySelectorAll('.reveal')
  .forEach((el) => revealObserver.observe(el));

/* =========================
   PARALLAX DE BACKGROUND
========================= */
function updateParallax() {
  const y = window.scrollY;
  blobEls.forEach((blob, i) => {
    const speed = i % 2 === 0 ? 0.08 : 0.05;
    blob.style.transform = `translateY(${y * speed}px)`;
  });
}
window.addEventListener('scroll', updateParallax, { passive: true });

/* =========================
   LUCIOLES
========================= */
const floatAnims = ['float-a', 'float-b', 'float-c', 'float-d'];

const orbPalette = [
  { core: 'rgba(115, 245, 255', halo: 'rgba(25,  195, 245' },
  { core: 'rgba(155, 255, 205', halo: 'rgba(35,  215, 140' },
  { core: 'rgba(205, 125, 255', halo: 'rgba(115,  35, 245' },
  { core: 'rgba(255, 155, 230', halo: 'rgba(225,  55, 195' },
  { core: 'rgba( 90, 255, 248', halo: 'rgba( 10, 205, 225' },
  { core: 'rgba(255, 248,  75', halo: 'rgba(170, 135,   8' },
  { core: 'rgba(120, 255, 140', halo: 'rgba( 20, 205,  65' },
  { core: 'rgba( 70, 195, 255', halo: 'rgba( 10, 115, 235' },
  { core: 'rgba(255, 205, 110', halo: 'rgba(200,  95,  12' },
  { core: 'rgba(195, 255, 175', halo: 'rgba( 75, 225,  95' },
  { core: 'rgba(255, 140, 180', halo: 'rgba(215,  45, 120' },
  { core: 'rgba(140, 220, 255', halo: 'rgba( 40, 145, 230' },
];

const zLayers = [-4, -3, -2, -1, 0, 2, 5, 8, 14, 20];

function createFireflies(count = 14) {
  const pageH = document.documentElement.scrollHeight;

  for (let k = 0; k < count; k++) {
    const pal = orbPalette[Math.floor(Math.random() * orbPalette.length)];
    const coreSize = 1.5 + Math.random() * 5.5;
    const haloMult = 7 + Math.random() * 12;
    const haloSize = coreSize * haloMult;
    const blurR = 0.38 + Math.random() * 0.22;
    const anim = floatAnims[Math.floor(Math.random() * floatAnims.length)];
    const dur = 9 + Math.random() * 20;
    const delay = -(Math.random() * dur);
    const pDur = 2.2 + Math.random() * 5;
    const pDelay = -(Math.random() * pDur);
    const xPct = Math.random() * 100;
    const yPx = Math.random() * pageH;
    const z = zLayers[Math.floor(Math.random() * zLayers.length)];

    const halo = document.createElement('div');
    halo.classList.add('firefly');
    halo.style.cssText = `
      width:${haloSize}px;
      height:${haloSize}px;
      left:${xPct}vw;
      top:${yPx}px;
      background:radial-gradient(circle,
        ${pal.halo},0.60) 0%,
        ${pal.halo},0.00) 72%);
      filter:blur(${(haloSize * blurR).toFixed(1)}px);
      z-index:${z};
      animation:
        ${anim} ${dur.toFixed(1)}s ${delay.toFixed(1)}s ease-in-out infinite,
        orb-pulse ${pDur.toFixed(1)}s ${pDelay.toFixed(1)}s ease-in-out infinite;
    `;
    document.body.appendChild(halo);

    const core = document.createElement('div');
    const off = (haloSize - coreSize) / 2;
    const cBlur = (0.5 + coreSize * 0.12).toFixed(1);
    core.classList.add('firefly');
    core.style.cssText = `
      width:${coreSize}px;
      height:${coreSize}px;
      left:calc(${xPct}vw + ${off}px);
      top:${(yPx + off).toFixed(1)}px;
      background:${pal.core},1);
      filter:blur(${cBlur}px);
      z-index:${z + 1};
      box-shadow:
        0 0 ${(coreSize * 1.8).toFixed(1)}px ${pal.core},0.95),
        0 0 ${(coreSize * 5.0).toFixed(1)}px ${pal.core},0.55),
        0 0 ${(coreSize * 12).toFixed(1)}px ${pal.core},0.20);
      animation:
        ${anim} ${dur.toFixed(1)}s ${delay.toFixed(1)}s ease-in-out infinite,
        core-pulse ${pDur.toFixed(1)}s ${(pDelay - 0.5).toFixed(1)}s ease-in-out infinite;
    `;
    document.body.appendChild(core);
  }
}

createFireflies(14);

/* =========================
   BULLES
========================= */
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
      width:${size}px;
      height:${size}px;
      left:${xPct}vw;
      top:${startY}vh;
      --drift:${drift.toFixed(0)}px;
      animation: bubbleRise ${dur.toFixed(1)}s ${delay.toFixed(1)}s linear infinite;
    `;
    document.body.appendChild(bubble);
  }
}

createBubbles(18);

/* =========================
   BOUCLE D'ANIMATION
========================= */
let lastT = 0;
let lastWaveUpdate = 0;
let cachedHeight = syncViewBox();

function animate(t) {
  if (t - lastT >= 16) {
    lastT = t;

    if (t - lastWaveUpdate > 40) {
      lastWaveUpdate = t;
      if (wavePath && energyPath) {
        const d = generateWave(t, cachedHeight);
        wavePath.setAttribute('d', d);
        energyPath.setAttribute('d', d);
      }
    }

    placeDots();
    updateTravelerAuto(t);
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

/* =========================
   ÉVÉNEMENTS
========================= */
window.addEventListener(
  'scroll',
  () => {
    placeDots();
  },
  { passive: true }
);

window.addEventListener('resize', () => {
  cachedHeight = syncViewBox();
  placeDots();
});

window.addEventListener('load', () => {
  cachedHeight = syncViewBox();
  placeDots();
});
