import * as THREE from 'three';
import { JellyfishField } from './jellyfishfield.js';
import { PostProcessing } from './postprocessing.js'; // Import de ton nouveau module

export class JellyfishScene {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.initScene();
    this.initLights();

    // Essaim de méduses autonomes remontant l'écran (5 par défaut, ajustable)
    this.field = new JellyfishField(this.scene, this.camera, { count: 5 });

    // Initialisation du post-traitement cinématique (Bloom, Aberration, Vignette, Color Grading)
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);

    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#000814');
    
    // Brouillard abyssal
    this.scene.fog = new THREE.FogExp2('#000814', 0.06);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
  }

  initLights() {
    // Éclairage cinéma (4 points)
    const hemiLight = new THREE.HemisphereLight('#003366', '#000511', 1.2);
    this.scene.add(hemiLight);

    const mainLight = new THREE.PointLight('#00ccff', 4, 25);
    mainLight.position.set(0, 6, 3);
    this.scene.add(mainLight);

    const rimLight = new THREE.PointLight('#00ffcc', 3, 20);
    rimLight.position.set(0, -3, -5);
    this.scene.add(rimLight);
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Mise à jour de la caméra
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Mise à jour du renderer et du post-processing
    this.renderer.setSize(width, height);
    if (this.postProcessing) {
      this.postProcessing.resize(width, height);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    if (this.field) {
      this.field.update(delta);
    }

    // Rendu de la scène via le pipeline de post-traitement cinématique
    if (this.postProcessing) {
      this.postProcessing.update(delta);
    }
  }
}