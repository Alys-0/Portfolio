const timeline = document.querySelector('.timeline');
const items = document.querySelectorAll('.timeline-item');
const wavePath = document.getElementById('wavePath');
const lineEl = document.querySelector('.timeline-line');

items.forEach((item, i) => {
  item.classList.add(i % 2 === 0 ? 'left' : 'right');
});

const colors = ['#c084fc', '#f472b6', '#60a5fa', '#34d399', '#fbbf24'];

items.forEach((item, i) => {
  item.style.setProperty('--color', colors[i % colors.length]);
});

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

const energyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
energyPath.setAttribute('id', 'energyPath');
svg.appendChild(energyPath);

function xAt(y, t) {
  return (
    50 +
    Math.sin(y * 0.011 + t * 0.00085) * 16 +
    Math.sin(y * 0.028 + t * 0.00055) * 9 +
    Math.sin(y * 0.055 + t * 0.00035) * 3
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

function placeDots() {
  const lineRect = lineEl.getBoundingClientRect();
  const pathLen = wavePath.getTotalLength();
  const svgW = lineEl.offsetWidth;
  const svgH = lineEl.offsetHeight;
  const vbH = lineEl.offsetHeight;
  const scaleX = svgW / 100;
  const scaleY = svgH / vbH;

  items.forEach((item, i) => {
    const dot = dotEls[i];
    if (!dot) return;

    const itemCy = item.offsetTop + item.offsetHeight / 2;
    const lineTy = lineEl.offsetTop;
    const relY = itemCy - lineTy;
    const ratio = Math.max(0, Math.min(relY / vbH, 1));

    const pt = wavePath.getPointAtLength(pathLen * ratio);

    const pageX = lineRect.left + window.scrollX + pt.x * scaleX;
    const pageY = lineRect.top + window.scrollY + pt.y * scaleY;

    dot.style.left = `${pageX}px`;
    dot.style.top = `${pageY}px`;
  });
}

function updateEnergy() {
  const rect = timeline.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  const height = timeline.offsetHeight;
  const vbH = lineEl.offsetHeight;
  const lineTy = lineEl.offsetTop;

  const start = top - window.innerHeight * 0.2;
  const end = top + height - window.innerHeight * 0.5;

  let progress = (window.scrollY - start) / (end - start);
  progress = Math.max(0, Math.min(progress, 1));

  const total = wavePath.getTotalLength();
  const visibleLength = total * 0.25;
  const currentPos = progress * total;

  energyPath.style.strokeDasharray = `${visibleLength} ${total}`;
  energyPath.style.strokeDashoffset = total - currentPos;

  if (progress >= 1) {
    energyPath.style.strokeDashoffset = 0;
  }

  let lastActive = -1;
  items.forEach((item, i) => {
    const cy = item.offsetTop + item.offsetHeight / 2;
    const ratio = Math.max(0, Math.min((cy - lineTy) / vbH, 1));
    if (progress >= ratio - 0.05) lastActive = i;
  });

  if (lastActive >= 0) {
    const c = colors[lastActive % colors.length];
    energyPath.style.filter = `drop-shadow(0 0 5px ${c}) drop-shadow(0 0 14px ${c})`;
  }

  items.forEach((item, i) => {
    const dot = dotEls[i];
    const cy = item.offsetTop + item.offsetHeight / 2;
    const ratio = Math.max(0, Math.min((cy - lineTy) / vbH, 1));
    const now = progress >= ratio - 0.05;
    const was = item.classList.contains('active');

    if (now !== was) {
      item.classList.toggle('active', now);
      if (dot) dot.classList.toggle('active', now);
    }
  });
}

const floatAnims = ['float-a', 'float-b', 'float-c', 'float-d'];
const orbPalette = [
  { core: 'rgba(115, 245, 255', halo: 'rgba(25, 195, 245' },
  { core: 'rgba(155, 255, 205', halo: 'rgba(35, 215, 140' },
  { core: 'rgba(205, 125, 255', halo: 'rgba(115, 35, 245' },
  { core: 'rgba(255, 155, 230', halo: 'rgba(225, 55, 195' },
  { core: 'rgba(90, 255, 248', halo: 'rgba(10, 205, 225' },
  { core: 'rgba(255, 248, 75', halo: 'rgba(170, 135, 8' }
];
const zLayers = [-4, -3, -2, -1, 0, 2, 5, 8, 14, 20];

function createFireflies(count = 10) {
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
      background:radial-gradient(circle, ${pal.halo},0.60) 0%, ${pal.halo},0.00) 72%);
      filter:blur(${(haloSize * blurR).toFixed(1)}px);
      z-index:${z};
      animation: ${anim} ${dur.toFixed(1)}s ${delay.toFixed(1)}s ease-in-out infinite, orb-pulse ${pDur.toFixed(1)}s ${pDelay.toFixed(1)}s ease-in-out infinite;
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
      box-shadow: 0 0 ${(coreSize * 1.8).toFixed(1)}px ${pal.core},0.95), 0 0 ${(coreSize * 5.0).toFixed(1)}px ${pal.core},0.55);
      animation: ${anim} ${dur.toFixed(1)}s ${delay.toFixed(1)}s ease-in-out infinite, core-pulse ${pDur.toFixed(1)}s ${(pDelay - 0.5).toFixed(1)}s ease-in-out infinite;
    `;
    document.body.appendChild(core);
  }
}

createFireflies(50);

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

window.addEventListener('scroll', () => {
  updateEnergy();
  placeDots();
}, { passive: true });

window.addEventListener('resize', () => {
  placeDots();
  updateEnergy();
});

window.addEventListener('load', () => {
  placeDots();
  updateEnergy();
});
