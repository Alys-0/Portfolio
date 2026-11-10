const timeline = document.querySelector(".timeline");
const items = document.querySelectorAll(".timeline-item");
const wavePath = document.getElementById("wavePath");

  let smoothProgress = 0;

/* =========================
COLORS
========================= */

const colors = [
  "#c084fc",
  "#f472b6",
  "#60a5fa",
  "#34d399",
  "#fbbf24"
];

/* =========================
CREATE ENERGY PATH
========================= */

const svg = wavePath.parentElement;

const defs = document.createElementNS(
  "http://www.w3.org/2000/svg",
  "defs"
);

defs.innerHTML = `
<linearGradient id="energyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#c084fc"/>
  <stop offset="25%" stop-color="#f472b6"/>
  <stop offset="50%" stop-color="#60a5fa"/>
  <stop offset="75%" stop-color="#34d399"/>
  <stop offset="100%" stop-color="#fbbf24"/>
</linearGradient>
`;

svg.prepend(defs);

const energyPath =
  document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );

energyPath.setAttribute(
  "id",
  "energyPath"
);

svg.appendChild(energyPath);

/* =========================
ITEM COLORS
========================= */

items.forEach((item,i)=>{

  item.style.setProperty(
    "--color",
    colors[i % colors.length]
  );

});

/* =========================
WAVE GENERATION
========================= */

function generateWave(time){

  const h =
    timeline.offsetHeight;

  let d = `M50 0`;

  for(let y = 0; y <= h; y += 80){

    const x =
      50 +
      Math.sin(y * .012 + time * .0012) * 18 +
      Math.sin(y * .03 + time * .0008) * 10;

    const cx1 =
      x - 25;

    const cx2 =
      x + 25;

    const ny = y + 80;

    d += `
      C ${cx1} ${y + 30},
        ${cx2} ${y + 50},
        ${x} ${ny}
    `;
  }

  return d;
}

/* =========================
DOT POSITION
========================= */

function placeDots(){

  const pathLength =
    wavePath.getTotalLength();

  items.forEach(item => {
    const dot =
      item.querySelector(".dot");
    if (!dot) return;

    const offset = item.offsetTop + item.offsetHeight / 2;
    const progress =
      item.offsetTop / timeline.offsetHeight;

    const point =
      wavePath.getPointAtLength(
        pathLength * progress
      );

    dot.style.left =
      `${point.x}px`;

    dot.style.top =
      `${point.y}px`;

  });

}

/* =========================
SCROLL ENERGY
========================= */

function updateEnergy(){

  const rect =
    timeline.getBoundingClientRect();

  const top =
    rect.top + window.scrollY;

  const height =
    timeline.offsetHeight;

  const progress =
    (
      window.scrollY -
      top +
      window.innerHeight * .55
    ) / height;

  const clamped =
    Math.max(
      0,
      Math.min(progress,1)
    );

  const total =
    wavePath.getTotalLength();

  /* propagation lente */

  const offset =
    total - (clamped * total);

  energyPath.style.strokeDashoffset =
    offset;

  /* activation */

  items.forEach((item,i)=>{

    const dot =
      item.querySelector(".dot");

    const itemProgress =
      item.offsetTop / height;

    if(clamped > itemProgress - .05){

      item.classList.add("active");
      dot.classList.add("active");

    }else{

      item.classList.remove("active");
      dot.classList.remove("active");

    }

  });

}

/* =========================
ANIMATE
========================= */

function animate(time){

  const d =
    generateWave(time);

  wavePath.setAttribute("d",d);

  energyPath.setAttribute("d",d);

  placeDots();

  updateEnergy();

  requestAnimationFrame(
    animate
  );

}

animate(0);

/* =========================
EVENTS
========================= */

window.addEventListener(
  "scroll",
  updateEnergy,
  { passive:true }
);

window.addEventListener(
  "resize",
  ()=>{

    placeDots();
    updateEnergy();

  }
);