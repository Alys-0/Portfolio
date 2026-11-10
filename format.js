let current = 0;
/* ── sélecteurs ── */
const timeline = document.querySelector('.timeline');
const items = document.querySelectorAll('.timeline-item');
@@ -61,7 +62,7 @@ function xAt(y, t) {
}

function generateWave(t) {
  const h = timeline.offsetHeight;
  const h = lineEl.offsetHeight;
  const x0 = xAt(0, t);
  let d = `M${x0} 0`;

@@ -140,7 +141,7 @@ function placeDots() {
  const pathLen = wavePath.getTotalLength();
  const svgW = lineEl.offsetWidth;
  const svgH = lineEl.offsetHeight;
  const vbH = timeline.offsetHeight; /* viewBox height = timeline height */
  const vbH = lineEl.offsetHeight; /* viewBox height = timeline height */
  const scaleX = svgW / 80; /* viewBox width = 80 (centre à 40) */
  const scaleY = svgH / vbH;

@@ -183,24 +184,34 @@ function updateEnergy() {
  const scrollRatio = window.scrollY / maxScroll;

  /* progression plus généreuse */
  const rawProg = (window.scrollY - top + window.innerHeight * 0.72) / height;
  const rawProg = (window.scrollY - top + window.innerHeight * 0.15) / height;

  /* boost fin de timeline */
  const boosted = Math.max(rawProg, scrollRatio * 1.08);
  
  const start = top - window.innerHeight * 0.35;
  const end = top + height - window.innerHeight * 0.35;

  const clamped = Math.max(0, Math.min(boosted, 1));
let progress = (window.scrollY - start) / (end - start);
progress = Math.max(0, Math.min(progress, 1));


  const clamped = Math.max(0, Math.min(rawProg, 1));

  const total = wavePath.getTotalLength();

  /* longueur visible du flux (segment d’encre) */
  const visibleLength = total * 0.16; // ← ajuste ici (0.14 à 0.18)
  const visibleLength = total * 0.08; // ← ajuste ici (0.14 à 0.18)

  /* position du flux */
  const current = clamped * total;
  const current = progress * total;

  /* segment court + déplacement */
  energyPath.style.strokeDasharray = `${visibleLength} ${total}`;
  energyPath.style.strokeDashoffset = total - current;
  
if (progress >= 1) {
  energyPath.style.strokeDashoffset = 0;
}

  /* glow de l'energyPath selon le dernier dot actif */
  let lastActive = -1;
@@ -227,6 +238,17 @@ function updateEnergy() {
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
@@ -405,3 +427,9 @@ window.addEventListener('load', () => {
  placeDots();
  updateEnergy();
});


const walker = document.createElement("div");
walker.classList.add("walker");
document.body.appendChild(walker);
