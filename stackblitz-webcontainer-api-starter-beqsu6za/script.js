const projects = [
  {
    title: 'Maquettes BIM',

    images: [
      '/images/projet1.jpg',
      '/images/projet1.jpg',
      '/images/projet1.jpg',
    ],
  },

  {
    title: 'Études énergétiques',

    images: [
      '/images/projet2.jpg',
      '/images/projet2.jpg',
      '/images/projet2.jpg',
    ],
  },

  {
    title: 'Projet technique',

    images: [
      '/images/projet3.jpg',
      '/images/projet3.jpg',
      '/images/projet3.jpg',
    ],
  },
];

/* =========================================
ELEMENTS
========================================= */

const viewer = document.getElementById('viewer');

const slider = document.getElementById('slider');

const viewerTitle = document.getElementById('viewer-title');

/* =========================================
OPEN PROJECT
========================================= */

document.querySelectorAll('.card').forEach((card) => {
  card.addEventListener('click', () => {
    const index = card.dataset.project;

    openProject(index);
  });
});

function openProject(index) {
  slider.innerHTML = '';

  const project = projects[index];

  viewerTitle.textContent = project.title;

  /* DUPLICATION POUR INFINITE */

  const infiniteImages = [
    ...project.images,
    ...project.images,
    ...project.images,
  ];

  infiniteImages.forEach((src) => {
    const img = document.createElement('img');

    img.src = src;

    slider.appendChild(img);
  });

  viewer.classList.add('active');
}

/* =========================================
CLOSE
========================================= */

document.querySelector('.close').addEventListener('click', closeProject);

function closeProject() {
  viewer.classList.remove('active');
}

/* =========================================
ESC CLOSE
========================================= */

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeProject();
  }
});

/* =========================================
PARALLAX EFFECT
========================================= */

document.addEventListener('mousemove', (e) => {
  const x = e.clientX / window.innerWidth;

  const y = e.clientY / window.innerHeight;

  document.querySelector('.bg-animation').style.transform = `
      translate(
        ${x * 40}px,
        ${y * 40}px
      )
      scale(1.2)
    `;
});
