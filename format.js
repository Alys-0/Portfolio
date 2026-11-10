// =========================================================
//   2. ÉLÉMENTS DU DOM & TIMELINE SVG
// =========================================================

const items = document.querySelectorAll('.timeline-item');
const wavePath = document.getElementById('wavePath');
const lineEl = document.querySelector('.timeline-line');
const svg = wavePath ? wavePath.parentElement : null;
const blobEls = document.querySelectorAll('.blob');

/* ── Alternance Gauche / Droite ── */
items.forEach((item, i) => {
  item.classList.add(i % 2 === 0 ? 'left' : 'right');
});

/* ── Couleurs ── */
const colors = ['#c084fc', '#f472b6', '#60a5fa', '#34d399', '#fbbf24'];

items.forEach((item, i) => {
  item.style.setProperty('--color', colors[i % colors.length]);
});

/* ── SVG Gradient ── */
if (svg && wavePath) {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="energyGradient" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%"   stop-color="#fbbf24"/>
      <stop offset="25%"  stop-color="#34d399"/>
      <stop offset="50%"  stop-color="#60a5fa"/>
      <stop offset="75%"  stop-color="#f472b6"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
  `;
  svg.prepend(defs);

  let energyPath = document.getElementById('energyPath');
  if (!energyPath) {
    energyPath = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    energyPath.setAttribute('id', 'energyPath');
    svg.appendChild(energyPath);
  }
}

const energyPath = document.getElementById('energyPath');

function currentHeight() {
  return lineEl ? lineEl.offsetHeight : 1000;
}

function syncViewBox() {
  const h = currentHeight();
  if (svg) {
    svg.setAttribute('viewBox', `0 0 100 ${h}`);
  }
  
  if (wavePath && energyPath) {
    const d = generateWave(0, h);
    wavePath.setAttribute('d', d);
    energyPath.setAttribute('d', d);
  }
  
  return h;
}

/* ── Vague (Wave) ── */
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

/* ── Dots ── */
const dotEls = [];

items.forEach((item, i) => {
  item.querySelector('.dot')?.remove();

  const dot = document.createElement('span');
  dot.classList.add('dot');
  dot.style.setProperty('--color', colors[i % colors.length]);
  dot.dataset.index = i;
  document.body.appendChild(dot);
  dotEls.push(dot);

  const targetUrl = item.getAttribute('data-url');
  const content = item.querySelector('.content');

  if (!content) return;
  content.style.cursor = 'pointer';

  // Redirections au clic
  if (targetUrl) {
    content.addEventListener('click', () => { window.location.href = targetUrl; });
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = targetUrl;
    });
  }
});

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

/* =========================================================
   3. ANIMATION DU FLOTTEMENT NATUREL & CARTES AU SCROLL
========================================================= */

function updateJellyFloating(t) {
  if (wavePath && energyPath) {
    const total = wavePath.getTotalLength();
    if (total) {
      const progress = 1 - ((t * 0.00015) % 1);
      const trailLength = 95;
      const current = progress * total;
      energyPath.style.strokeDasharray = `${trailLength} ${total}`;
      energyPath.style.strokeDashoffset = `${current}`;
    }
  }

  const scrollCenter = window.scrollY + window.innerHeight / 2;

  items.forEach((item, i) => {
    const dot = dotEls[i];
    const itemRect = item.getBoundingClientRect();
    const itemCenterY = itemRect.top + window.scrollY + itemRect.height / 2;
    const distance = Math.abs(scrollCenter - itemCenterY);
    
    const threshold = 150; 
    const isClose = distance < threshold;

    item.classList.toggle('active', isClose);
    dot?.classList.toggle('active', isClose);
  });
}

/* =========================================================
   4. SCROLL, PARALLAX, LUCIOLES & BULLES
========================================================= */

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

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

function updateParallax() {
  const y = window.scrollY;
  blobEls.forEach((blob, i) => {
    const speed = i % 2 === 0 ? 0.08 : 0.05;
    blob.style.transform = `translateY(${y * speed}px)`;
  });
}
window.addEventListener('scroll', updateParallax, { passive: true });

/* ── Lucioles ── */
const floatAnims = ['float-a', 'float-b', 'float-c', 'float-d'];
const orbPalette = [
  { core: 'rgba(115, 245, 255', halo: 'rgba(25,  195, 245' },
  { core: 'rgba(155, 255, 205', halo: 'rgba(35,  215, 140' },
  { core: 'rgba(205, 125, 255', halo: 'rgba(115,  35, 245' },
  { core: 'rgba(255, 155, 230', halo: 'rgba(225,  55, 195' },
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
      width:${haloSize}px; height:${haloSize}px;
      left:${xPct}vw; top:${yPx}px;
      background:radial-gradient(circle, ${pal.halo},0.60) 0%, ${pal.halo},0.00) 72%);
      filter:blur(${(haloSize * blurR).toFixed(1)}px);
      z-index:${z};
      animation: ${anim} ${dur.toFixed(1)}s ${delay.toFixed(1)}s ease-in-out infinite,
                 orb-pulse ${pDur.toFixed(1)}s ${pDelay.toFixed(1)}s ease-in-out infinite;
    `;
    document.body.appendChild(halo);

    const core = document.createElement('div');
    const off = (haloSize - coreSize) / 2;
    const cBlur = (0.5 + coreSize * 0.12).toFixed(1);
    core.classList.add('firefly');
    core.style.cssText = `
      width:${coreSize}px; height:${coreSize}px;
      left:calc(${xPct}vw + ${off}px); top:${(yPx + off).toFixed(1)}px;
      background:${pal.core},1);
      filter:blur(${cBlur}px); z-index:${z + 1};
      box-shadow: 0 0 ${(coreSize * 1.8).toFixed(1)}px ${pal.core},0.95),
                  0 0 ${(coreSize * 5.0).toFixed(1)}px ${pal.core},0.55);
      animation: ${anim} ${dur.toFixed(1)}s ${delay.toFixed(1)}s ease-in-out infinite,
                 core-pulse ${pDur.toFixed(1)}s ${(pDelay - 0.5).toFixed(1)}s ease-in-out infinite;
    `;
    document.body.appendChild(core);
  }
}
createFireflies(14);

/* =========================================================
   5. BOUCLE D'ANIMATION
========================================================= */

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
    updateJellyFloating(t);
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

/* =========================================================
   6. LISTENERS
========================================================= */

window.addEventListener('scroll', () => placeDots(), { passive: true });

window.addEventListener('resize', () => {
  cachedHeight = syncViewBox();
  placeDots();
});

window.addEventListener('load', () => {
  setTimeout(() => {
    cachedHeight = syncViewBox();
    placeDots();
    updateJellyFloating(performance.now());
  }, 20);
});