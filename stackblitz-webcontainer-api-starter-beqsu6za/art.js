/* =========================================================
SCENE
========================================================= */

const scene = new THREE.Scene();

/* =========================================================
CAMERA
========================================================= */

const camera = new THREE.PerspectiveCamera(
  75,

  window.innerWidth / window.innerHeight,

  0.1,

  1000
);

camera.position.z = 4;

/* =========================================================
RENDERER
========================================================= */

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('globe'),

  antialias: true,

  alpha: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setPixelRatio(window.devicePixelRatio);

/* =========================================================
LIGHTS
========================================================= */

const light = new THREE.PointLight(0xffffff, 3);

light.position.set(5, 5, 5);

scene.add(light);

const ambient = new THREE.AmbientLight(0xffffff, 1.5);

scene.add(ambient);

/* =========================================================
GLOBE GROUP
========================================================= */

const globeGroup = new THREE.Group();

scene.add(globeGroup);
globeGroup.position.set(0, -1.08, 0);

/* =========================================================
GLOBE
========================================================= */

const globeGeometry = new THREE.SphereGeometry(1.02, 64, 64);

const globeMaterial = new THREE.MeshPhongMaterial({
  color: 0x7c3aed,

  wireframe: true,

  emissive: 0x3b0764,

  shininess: 100,

  transparent: true,

  opacity: 0.7,
});

const globe = new THREE.Mesh(globeGeometry, globeMaterial);

globeGroup.add(globe);

/* =========================================================
CARTE DE PROJECTION (CONTINENTS EN RELIEF)
========================================================= */

const projectionGeometry = new THREE.SphereGeometry(1.15, 64, 64);
const projectionMaterial = new THREE.MeshPhongMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.7,
  side: THREE.DoubleSide,
  shininess: 10,
  emissive: 0x111111,
  depthWrite: false,
});

const projectionMap = new THREE.Mesh(projectionGeometry, projectionMaterial);
globeGroup.add(projectionMap);

const geoJsonUrl =
  'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';

fetch(geoJsonUrl)
  .then((res) => res.json())
  .then((data) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1.5;

    function drawRing(ring) {
      ring.forEach((coord, index) => {
        const x = ((coord[0] + 180) / 360) * canvas.width;
        const y = ((90 - coord[1]) / 180) * canvas.height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
    }

    data.features.forEach((feature) => {
      const geom = feature.geometry;

      if (geom.type === 'Polygon') {
        geom.coordinates.forEach((ring) => {
          ctx.beginPath();
          drawRing(ring);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }

      if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach((polygon) => {
          polygon.forEach((ring) => {
            ctx.beginPath();
            drawRing(ring);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });
        });
      }
    });

    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.needsUpdate = true;
    projectionMaterial.map = canvasTexture;
    projectionMaterial.needsUpdate = true;
  })
  .catch((err) => console.error('Erreur chargement GeoJSON:', err));

/* =========================================================
GRID PROJECTION
========================================================= */

const wireframe = new THREE.WireframeGeometry(globeGeometry);

const grid = new THREE.LineSegments(
  wireframe,

  new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    depthTest: false,
  })
);

grid.scale.set(1.17, 1.17, 1.17);
grid.renderOrder = 999;

globeGroup.add(grid);

/* =========================================================
FRONTIÈRES DES CONTINENTS (SUR PROJECTION)
========================================================= */

// Cette section est désormais gérée par la texture de projection générée depuis GeoJSON.
// Les continents sont dessinés sur une texture de canevas et appliqués à la sphère projection.

/* =========================================================
COUNTRIES
========================================================= */

const countries = [
  {
    name: 'France',
    lat: 46,
    lon: 2,
    page: 'creations.html?country=France',
  },

  {
    name: 'Martinique',
    lat: 14.6,
    lon: -61.0,
    page: 'creations.html?country=Martinique',
  },
  {
    name: 'Espagne',
    lat: 40,
    lon: -4,
    page: 'creations.html?country=Espagne',
  },

  {
    name: 'Italie',
    lat: 41,
    lon: 12,
    page: 'creations.html?country=Italie',
  },

  {
    name: 'Malaisie',
    lat: 4.2,
    lon: 101.9,
    page: 'creations.html?country=Malaisie',
  },

  {
    name: 'Japon',
    lat: 36,
    lon: 138,
    page: 'creations.html?country=Japon',
  },

  {
    name: 'Australie',
    lat: -26.9,
    lon: 133.3,
    page: 'creations.html?country=Australie',
  },

  {
    name: 'Brésil',
    lat: -14.2,
    lon: -53.2,
    page: 'creations.html?country=Brésil',
  },

  {
    name: 'Point Nemo',
    lat: -48.5,
    lon: -123.2,
    page: 'creations.html?country=Point Nemo',
  },
];

/* =========================================================
MARKERS
========================================================= */

const markers = [];

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);

  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),

    radius * Math.cos(phi),

    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/* =========================================================
CREATE MARKERS
========================================================= */

countries.forEach((country) => {
  const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);

  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  const marker = new THREE.Mesh(markerGeometry, markerMaterial);

  marker.position.copy(latLonToVector3(country.lat, country.lon, 1.3));

  marker.userData = country;
  globeGroup.add(marker);
  const glowGeometry = new THREE.SphereGeometry(0.12, 16, 16);

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,

    transparent: true,

    opacity: 0.25,
  });

  const glow = new THREE.Mesh(glowGeometry, glowMaterial);

  glow.position.copy(marker.position);

  globeGroup.add(glow);
  markers.push(marker);
  marker.userData.originalScale = 1.4;
  marker.scale.set(1.4, 1.4, 1.4);
  marker.renderOrder = 100;
});

/* =========================================================
LINES BETWEEN COUNTRIES
========================================================= */

function createLine(start, end) {
  const points = [];

  points.push(start);

  const mid = start.clone().add(end).multiplyScalar(0.5);

  mid.normalize();

  mid.multiplyScalar(1.7);

  points.push(mid);

  points.push(end);

  const curve = new THREE.CatmullRomCurve3(points);

  const geometry = new THREE.BufferGeometry().setFromPoints(
    curve.getPoints(60)
  );

  const material = new THREE.LineBasicMaterial({
    color: 0xc084fc,
    transparent: true,
    opacity: 1,
  });

  const line = new THREE.Line(geometry, material);

  globeGroup.add(line);
  const glowMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
  });

  const glowLine = new THREE.Line(geometry, glowMaterial);

  glowLine.scale.multiplyScalar(1.01);

  globeGroup.add(glowLine);
}

/* LINES */

createLine(markers[0].position, markers[1].position);

createLine(markers[1].position, markers[5].position);

createLine(markers[1].position, markers[7].position);

createLine(markers[2].position, markers[5].position);

createLine(markers[2].position, markers[7].position);

createLine(markers[3].position, markers[4].position);

createLine(markers[4].position, markers[6].position);

createLine(markers[5].position, markers[4].position);

createLine(markers[5].position, markers[6].position);

createLine(markers[5].position, markers[8].position);

createLine(markers[6].position, markers[8].position);

createLine(markers[7].position, markers[8].position);



/* =========================================================
STARS
========================================================= */

const starsGeometry = new THREE.BufferGeometry();

const starsVertices = [];

for (let i = 0; i < 4000; i++) {
  const x = (Math.random() - 0.5) * 2000;

  const y = (Math.random() - 0.5) * 2000;

  const z = -Math.random() * 2000;

  starsVertices.push(x, y, z);
}

starsGeometry.setAttribute(
  'position',

  new THREE.Float32BufferAttribute(starsVertices, 3)
);

const starsMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.35,
});

const stars = new THREE.Points(starsGeometry, starsMaterial);

scene.add(stars);

/* =========================================================
MOUSE ROTATION
========================================================= */

let isDragging = false;

document.addEventListener('mousedown', () => (isDragging = true));

document.addEventListener('mouseup', () => (isDragging = false));

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    globeGroup.rotation.y += e.movementX * 0.005;

    globeGroup.rotation.x += e.movementY * 0.002;
  }
});

/* =========================================================
RAYCASTER
========================================================= */

const raycaster = new THREE.Raycaster();

const mouse = new THREE.Vector2();

const tooltip = document.getElementById('tooltip');

window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;

  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(markers);

  markers.forEach((marker) => {
    marker.scale.set(1.4, 1.4, 1.4);
  });

  if (intersects.length > 0) {
    const hoveredMarker = intersects[0].object;

    hoveredMarker.scale.set(2.3, 2.3, 2.3);

    const country = hoveredMarker.userData;

    tooltip.innerHTML = country.name;

    tooltip.style.opacity = 1;

    tooltip.style.left = event.clientX + 'px';

    tooltip.style.top = event.clientY - 65 + 'px';

    document.body.style.cursor = 'pointer';
  } else {
    tooltip.style.opacity = 0;

    document.body.style.cursor = 'default';
  }
});

/* =========================================================
CLICK CINEMATIC
========================================================= */

const transition = document.getElementById('transition');

window.addEventListener('click', () => {
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(markers);

  if (intersects.length > 0) {
    const country = intersects[0].object.userData;

    transition.classList.add('active');

    setTimeout(() => {
      window.location.href = country.page;
    }, 800);
  }
});

/* =========================================================
ANIMATION
========================================================= */

function animate() {
  requestAnimationFrame(animate);

  globeGroup.rotation.y += 0.0015;

  renderer.render(scene, camera);
}

animate();

/* =========================================================
RESIZE
========================================================= */

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});
