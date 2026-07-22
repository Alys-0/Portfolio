import * as THREE from 'three';

const CONFIG = {
  colors: {
    abyssalBlue: 0x030b1e,
    cyan: 0x00ffff,
    violet: 0x8a2be2,
    magenta: 0xff007f,
    emissiveCyan: 0x00aaff,
  },
  animationSpeed: 1.0,
  particleCount: 120,
  tentacleCount: 12,
  tentacleSegments: 20,
};

export class JellyCreature {
  constructor(options = {}) {
    this.options = { ...CONFIG, ...options };
    this.group = new THREE.Group();

    this.body = null;
    this.bodyBasePositions = null;
    this.innerOrgans = null;
    this.tentacles = [];
    this.particles = null;
    this.materials = [];
    this.geometries = [];

    this.time = 0;
    this.state = {
      mood: 'calm',
      energy: 1.0,
      pulse: 0,
      baseEmissiveIntensity: 0.5,
    };

    // Vecteurs réutilisables pour éviter le Garbage Collection dans update()
    this._tempVector = new THREE.Vector3();
    this._targetRotation = new THREE.Euler();
    this._targetPosition = new THREE.Vector3();

    this.init();
  }

  init() {
    this.createBody();
    this.createGlow();
    this.createTentacles();
    this.createParticles();
  }

  // --- CORPS ET ORGANES ---
  createBody() {
    // Cloche sur-mesure déformée à partir d'une sphère
    const radius = 3.5;
    const widthSegments = 64;
    const heightSegments = 64;
    
    // Dôme découpé
    const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments, 0, Math.PI * 2, 0, Math.PI * 0.55);
    geo.scale(1, 0.7, 1); // Aplatissement de la cloche

    const pos = geo.attributes.position;
    this.bodyBasePositions = pos.clone();

    this.geometries.push(geo);

    // Matériau translucide organique (Verre / Gelée)
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: CONFIG.colors.abyssalBlue,
      emissive: CONFIG.colors.emissiveCyan,
      emissiveIntensity: this.state.baseEmissiveIntensity,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.88,
      transparent: true,
      opacity: 0.85,
      ior: 1.33,
      reflectivity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
    });
    this.materials.push(bodyMat);

    this.body = new THREE.Mesh(geo, bodyMat);
    this.group.add(this.body);

    // Organes bioluminescents internes (Noyau interne)
    const innerGeo = new THREE.SphereGeometry(1.8, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
    innerGeo.scale(1, 0.5, 1);
    this.geometries.push(innerGeo);

    const innerMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.magenta,
      emissive: CONFIG.colors.magenta,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.65,
      roughness: 0.3,
    });
    this.materials.push(innerMat);

    this.innerOrgans = new THREE.Mesh(innerGeo, innerMat);
    this.innerOrgans.position.y = -0.3;
    this.group.add(this.innerOrgans);
  }

  // --- HALO ET BIOLUMINESCENCE ---
  createGlow() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
    gradient.addColorStop(0.3, 'rgba(138, 43, 226, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const glowMat = new THREE.SpriteMaterial({
      map: texture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.75,
    });
    this.materials.push(glowMat);

    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.scale.set(9, 9, 1);
    glowSprite.position.set(0, -0.4, 0);
    this.group.add(glowSprite);
    this.glowSprite = glowSprite;
  }

  // --- TENTACULES ---
  createTentacles() {
    const count = this.options.tentacleCount;
    const tentacleMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.cyan,
      emissive: CONFIG.colors.violet,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    this.materials.push(tentacleMat);

    for (let i = 0; i < count; i++) {
      const length = 8 + Math.random() * 5;
      const points = [];
      const segs = CONFIG.tentacleSegments;

      for (let j = 0; j < segs; j++) {
        points.push(new THREE.Vector3(0, -j * (length / segs), 0));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const geo = new THREE.TubeGeometry(curve, 24, 0.05, 6, false);
      this.geometries.push(geo);

      const mesh = new THREE.Mesh(geo, tentacleMat);

      const angle = (i / count) * Math.PI * 2;
      const radius = 1.6 + (i % 2) * 0.7;
      mesh.position.set(Math.cos(angle) * radius, -0.4, Math.sin(angle) * radius);

      this.group.add(mesh);

      this.tentacles.push({
        mesh,
        basePoints: points,
        length,
        angleOffset: angle,
        speed: 1.0 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        amplitude: 0.08 + Math.random() * 0.08,
      });
    }
  }

  // --- PLANCTON / PARTICULES ---
  createParticles() {
    const count = this.options.particleCount;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16 - 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
      scales[i] = Math.random() * 0.12 + 0.03;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometries.push(geo);

    const mat = new THREE.PointsMaterial({
      color: CONFIG.colors.cyan,
      size: 0.25,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    this.materials.push(mat);

    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);
  }

  // --- BOUCLE D'ANIMATION ET COMPORTEMENT ---
  update(deltaTime = 0.016, mousePosition = { x: 0, y: 0 }) {
    this.time += deltaTime * CONFIG.animationSpeed * this.state.energy;

    // 1. Gestion de la pulsation / respiration du corps
    this.state.pulse = Math.sin(this.time * 1.8);
    const pulseFactor = this.state.pulse * 0.14;

    const posAttr = this.body.geometry.attributes.position;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const bx = this.bodyBasePositions.getX(i);
      const by = this.bodyBasePositions.getY(i);
      const bz = this.bodyBasePositions.getZ(i);

      // Simulation d'ondulation gélatineuse
      const squeeze = by < 0 ? 1 + pulseFactor * 1.3 : 1 - pulseFactor * 0.4;
      const ripple = Math.sin(this.time * 3.5 + by * 2.0) * 0.06;

      posAttr.setXYZ(
        i,
        bx * squeeze + ripple,
        by * (1 + pulseFactor * 0.7),
        bz * squeeze + ripple
      );
    }
    posAttr.needsUpdate = true;
    this.body.geometry.computeVertexNormals();

    // 2. Pulsation lumineuse de bioluminescence
    const lightGlow = 0.4 + (this.state.pulse + 1) * 0.25;
    this.body.material.emissiveIntensity = lightGlow;
    if (this.glowSprite) {
      this.glowSprite.material.opacity = 0.5 + lightGlow * 0.3;
    }

    // 3. Ondulation des tentacules
    for (let i = 0; i < this.tentacles.length; i++) {
      const t = this.tentacles[i];
      const pathPoints = [];

      for (let j = 0; j < t.basePoints.length; j++) {
        const pt = t.basePoints[j];
        const waveX = Math.sin(this.time * t.speed + j * 0.35 + t.phase) * (j * t.amplitude);
        const waveZ = Math.cos(this.time * (t.speed * 0.85) + j * 0.35 + t.angleOffset) * (j * t.amplitude);

        pathPoints.push(this._tempVector.set(pt.x + waveX, pt.y, pt.z + waveZ).clone());
      }

      const newCurve = new THREE.CatmullRomCurve3(pathPoints);
      t.mesh.geometry.dispose();
      t.mesh.geometry = new THREE.TubeGeometry(newCurve, 20, 0.04, 6, false);
    }

    // 4. Animation des particules de plancton
    const pPositions = this.particles.geometry.attributes.position.array;
    const pCount = pPositions.length / 3;
    for (let i = 0; i < pCount; i++) {
      pPositions[i * 3 + 1] += Math.sin(this.time + i) * 0.005 + 0.006;
      if (pPositions[i * 3 + 1] > 8) {
        pPositions[i * 3 + 1] = -8;
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    // 5. Flottement fluide & Réaction douce à la souris
    const floatY = Math.sin(this.time * 0.8) * 0.8;
    const floatX = Math.sin(this.time * 0.5) * 0.4;

    this._targetPosition.set(
      floatX + mousePosition.x * 2.5,
      floatY + mousePosition.y * 1.5,
      Math.cos(this.time * 0.6) * 0.5
    );

    // Interpolation douce (LERP) pour éliminer tout mouvement robotique
    this.group.position.lerp(this._targetPosition, 0.03);

    this._targetRotation.set(
      mousePosition.y * 0.15 + Math.cos(this.time * 0.4) * 0.05,
      this.time * 0.05,
      -mousePosition.x * 0.2 + Math.sin(this.time * 0.5) * 0.05
    );

    this.group.rotation.x += (this._targetRotation.x - this.group.rotation.x) * 0.03;
    this.group.rotation.y += (this._targetRotation.y - this.group.rotation.y) * 0.03;
    this.group.rotation.z += (this._targetRotation.z - this.group.rotation.z) * 0.03;
  }

  // --- NETTOYAGE MÉMOIRE PROPRE ---
  destroy() {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => {
      if (m.map) m.map.dispose();
      m.dispose();
    });

    this.tentacles.forEach((t) => {
      if (t.mesh && t.mesh.geometry) t.mesh.geometry.dispose();
    });

    while (this.group.children.length > 0) {
      const obj = this.group.children[0];
      this.group.remove(obj);
    }

    this.bodyBasePositions = null;
    this.tentacles = [];
    this.geometries = [];
    this.materials = [];
  }
}