let current = 0;
/* ── sélecteurs ── */
const timeline = document.querySelector('.timeline');
const items = document.querySelectorAll('.timeline-item');
const wavePath = document.getElementById('wavePath');
const lineEl = document.querySelector('.timeline-line');

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

const svg = wavePath.parentElement;
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

/* =========================
   WAVE
   Deux fréquences superposées, vitesse douce
========================= */

function xAt(y, t) {
  return (
    40 +
    Math.sin(y * 0.011 + t * 0.00085) * 16 +
    Math.sin(y * 0.028 + t * 0.00055) * 9 +
    Math.sin(y * 0.055 + t * 0.00035) * 3 /* micro-variation organique */
  );
}

function generateWave(t) {
  const h = lineEl.offsetHeight;
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
   DOTS — position:absolute dans <body>
   (retirés de .timeline-item pour éviter
    tout décalage lié au repère parent)
========================= */

const dotEls = [];

items.forEach((item, i) => {
  /* supprimer éventuel dot HTML */
  item.querySelector('.dot')?.remove();

  const dot = document.createElement('span');
  dot.classList.add('dot');
  dot.style.setProperty('--color', colors[i % colors.length]);
  dot.dataset.index = i;
  document.body.appendChild(dot);
  dotEls.push(dot);

  /* ── interactions dot ↔ content ── */
  const content = item.querySelector('.content');
  const c = colors[i % colors.length];

  if (!content) return;

  /* hover dot → réaction du bloc */
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

  /* hover content → réaction du dot */
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
   Calcul en coordonnées absolues dans la page.
   Ratio = centre vertical de l'item / hauteur SVG (viewBox)
   point = getPointAtLength sur wavePath
   scaleX/scaleY = conversion viewBox → px écran
========================= */

function placeDots() {
  const lineRect = lineEl.getBoundingClientRect();
  const pathLen = wavePath.getTotalLength();
  const svgW = lineEl.offsetWidth;
  const svgH = lineEl.offsetHeight;
  const vbH = lineEl.offsetHeight; /* viewBox height = timeline height */
  const scaleX = svgW / 80; /* viewBox width = 80 (centre à 40) */
  const scaleY = svgH / vbH;

  items.forEach((item, i) => {
    const dot = dotEls[i];
    if (!dot) return;

    /* centre vertical de l'item dans le repère de .timeline */
    const itemCy = item.offsetTop + item.offsetHeight / 2;
    /* décalage du haut de .timeline-line dans .timeline */
    const lineTy = lineEl.offsetTop;
    const relY = itemCy - lineTy;
    const ratio = Math.max(0, Math.min(relY / vbH, 1));

    /* point sur la courbe SVG */
    const pt = wavePath.getPointAtLength(pathLen * ratio);

    /* conversion en coordonnées page */
    const pageX = lineRect.left + window.scrollX + pt.x * scaleX;
    const pageY = lineRect.top + window.scrollY + pt.y * scaleY;

    dot.style.left = `${pageX}px`;
    dot.style.top = `${pageY}px`;
  });
}

/* =========================
   SCROLL — énergie + activation
========================= */

function updateEnergy() {
  const rect = timeline.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  const height = timeline.offsetHeight;
  const vbH = height;
  const lineTy = lineEl.offsetTop;

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  const scrollRatio = window.scrollY / maxScroll;

  /* progression plus généreuse */
  const rawProg = (window.scrollY - top + window.innerHeight * 0.15) / height;

  /* boost fin de timeline */
  
  const start = top - window.innerHeight * 0.35;
  const end = top + height - window.innerHeight * 0.35;

let progress = (window.scrollY - start) / (end - start);
progress = Math.max(0, Math.min(progress, 1));


  const clamped = Math.max(0, Math.min(rawProg, 1));

  const total = wavePath.getTotalLength();

  /* longueur visible du flux (segment d’encre) */
  const visibleLength = total * 0.08; // ← ajuste ici (0.14 à 0.18)

  /* position du flux */
  const current = progress * total;

  /* segment court + déplacement */
  energyPath.style.strokeDasharray = `${visibleLength} ${total}`;
  energyPath.style.strokeDashoffset = total - current;
  
if (progress >= 1) {
  energyPath.style.strokeDashoffset = 0;
}

  /* glow de l'energyPath selon le dernier dot actif */
  let lastActive = -1;
  items.forEach((item, i) => {
    const cy = item.offsetTop + item.offsetHeight / 2;
    const ratio = Math.max(0, Math.min((cy - lineTy) / vbH, 1));
    if (clamped >= ratio - 0.03) lastActive = i;
  });
  if (lastActive >= 0) {
    const c = colors[lastActive % colors.length];
    energyPath.style.filter = `drop-shadow(0 0 5px ${c}) drop-shadow(0 0 14px ${c})`;
  }

  /* activation items + dots */
  items.forEach((item, i) => {
    const dot = dotEls[i];
    const cy = item.offsetTop + item.offsetHeight / 2;
    const ratio = Math.max(0, Math.min((cy - lineTy) / vbH, 1));
    const now = clamped >= ratio - 0.03;
    const was = item.classList.contains('active');

    if (now !== was) {
      item.classList.toggle('active', now);
      if (dot) dot.classList.toggle('active', now);
    }
  });

  items.forEach((item) => {
    item.style.cursor = 'pointer';

    item.addEventListener('click', () => {
      const link = item.dataset.link;
      if (link) {
        window.location.href = link;
      }
    });
  });
}

/* =========================
   LUCIOLES — PANDORA / EYWA
   Double couche : halo radial flou + cœur brillant
   Position absolue en px sur toute la hauteur de la page
   Z-index varié → devant et derrière le contenu
========================= */

const floatAnims = ['float-a', 'float-b', 'float-c', 'float-d'];

const orbPalette = [
  {
    core: 'rgba(115, 245, 255',
    halo: 'rgba(25,  195, 245',
  } /* cyan eau       */,
  {
    core: 'rgba(155, 255, 205',
    halo: 'rgba(35,  215, 140',
  } /* vert teal      */,
  {
    core: 'rgba(205, 125, 255',
    halo: 'rgba(115,  35, 245',
  } /* violet         */,
  {
    core: 'rgba(255, 155, 230',
    halo: 'rgba(225,  55, 195',
  } /* rose magenta   */,
  {
    core: 'rgba( 90, 255, 248',
    halo: 'rgba( 10, 205, 225',
  } /* turquoise      */,
  {
    core: 'rgba(255, 248,  75',
    halo: 'rgba(170, 135,   8',
  } /* jaune bio      */,
  {
    core: 'rgba(120, 255, 140',
    halo: 'rgba( 20, 205,  65',
  } /* vert fluo      */,
  {
    core: 'rgba( 70, 195, 255',
    halo: 'rgba( 10, 115, 235',
  } /* bleu profond   */,
  {
    core: 'rgba(255, 205, 110',
    halo: 'rgba(200,  95,  12',
  } /* ambre chaud    */,
  {
    core: 'rgba(195, 255, 175',
    halo: 'rgba( 75, 225,  95',
  } /* menthe         */,
  {
    core: 'rgba(255, 140, 180',
    halo: 'rgba(215,  45, 120',
  } /* rose corail    */,
  {
    core: 'rgba(140, 220, 255',
    halo: 'rgba( 40, 145, 230',
  } /* bleu ciel      */,
];

const zLayers = [-4, -3, -2, -1, 0, 2, 5, 8, 14, 20];

function createFireflies(count = 10) {
  /* on attend que le DOM soit complet pour mesurer la hauteur */
  const pageH = document.documentElement.scrollHeight;

  for (let k = 0; k < count; k++) {
    const pal = orbPalette[Math.floor(Math.random() * orbPalette.length)];
    const coreSize = 1.5 + Math.random() * 5.5; /* 1.5 – 7 px        */
    const haloMult = 7 + Math.random() * 12; /* halo = 7–19× core */
    const haloSize = coreSize * haloMult;
    const blurR = 0.38 + Math.random() * 0.22; /* blur ratio        */
    const anim = floatAnims[Math.floor(Math.random() * floatAnims.length)];
    const dur = 9 + Math.random() * 20; /* 9–29 s            */
    const delay = -(Math.random() * dur);
    const pDur = 2.2 + Math.random() * 5; /* pulse 2.2–7.2 s   */
    const pDelay = -(Math.random() * pDur);
    const xPct = Math.random() * 100;
    const yPx = Math.random() * pageH;
    const z = zLayers[Math.floor(Math.random() * zLayers.length)];

    /* ── HALO ── */
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
        orb-pulse ${pDur.toFixed(1)}s ${pDelay.toFixed(
      1
    )}s ease-in-out infinite;
    `;
    document.body.appendChild(halo);

    /* ── CŒUR ── */
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
        core-pulse ${pDur.toFixed(1)}s ${(pDelay - 0.5).toFixed(
      1
    )}s ease-in-out infinite;
    `;
    document.body.appendChild(core);
  }
}

createFireflies(75);

/* =========================
   BOUCLE D'ANIMATION
========================= */

let lastT = 0;

function animate(t) {
  if (t - lastT >= 16) {
    lastT = t;

    const d = generateWave(t);
    wavePath.setAttribute('d', d);
    energyPath.setAttribute('d', d);

    placeDots();
    updateEnergy();
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
    updateEnergy();
    placeDots();
  },
  { passive: true }
);

window.addEventListener('resize', () => {
  placeDots();
  updateEnergy();
});

window.addEventListener('load', () => {
  placeDots();
  updateEnergy();
});


const walker = document.createElement("div");
walker.classList.add("walker");
document.body.appendChild(walker);

