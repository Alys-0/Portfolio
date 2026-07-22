import * as THREE from 'three';

export function createJellyfishScene(container) {
  // --- SCÈNE, CAMÉRA & RENDU ---
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 32);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);

  // --- ÉCLAIRAGE ABYSSAL ---
  const ambientLight = new THREE.AmbientLight(0x0a1026, 1.5);
  scene.add(ambientLight);

  const topLight = new THREE.DirectionalLight(0x00f3ff, 2.5);
  topLight.position.set(0, 20, 10);
  scene.add(topLight);

  const backPurpleLight = new THREE.PointLight(0x9d00ff, 4, 50);
  backPurpleLight.position.set(-10, -5, -10);
  scene.add(backPurpleLight);

  const cyanRimLight = new THREE.PointLight(0x00ffff, 3, 40);
  cyanRimLight.position.set(10, -10, 5);
  scene.add(cyanRimLight);

  // --- GROUPE PRINCIPAL MÉDUSE ---
  const jellyfish = new THREE.Group();
  scene.add(jellyfish);

  // 1. CLOCHE (BODY)
  const bellGeo = new THREE.SphereGeometry(3.5, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.58);
  bellGeo.scale(1, 0.75, 1);

  const basePositions = bellGeo.attributes.position.clone();

  const bellMat = new THREE.MeshPhysicalMaterial({
    color: 0x11002c,
    emissive: 0x4a00e0,
    emissiveIntensity: 0.45,
    roughness: 0.1,
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

  const bellMesh = new THREE.Mesh(bellGeo, bellMat);
  jellyfish.add(bellMesh);

  // Membrane interne / Organes bioluminescents
  const innerGeo = new THREE.SphereGeometry(2.0, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
  innerGeo.scale(1, 0.6, 1);
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xff007f,
    emissive: 0xff00aa,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.6,
    roughness: 0.3,
  });
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  innerMesh.position.y = -0.2;
  jellyfish.add(innerMesh);

  // Halo / Glow interne (Sprite)
  const canvasGlow = document.createElement('canvas');
  canvasGlow.width = 128;
  canvasGlow.height = 128;
  const ctx = canvasGlow.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0, 243, 255, 0.8)');
  gradient.addColorStop(0.4, 'rgba(157, 0, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const glowTexture = new THREE.CanvasTexture(canvasGlow);
  const glowMat = new THREE.SpriteMaterial({
    map: glowTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.8,
  });
  const glowSprite = new THREE.Sprite(glowMat);
  glowSprite.scale.set(10, 10, 1);
  glowSprite.position.set(0, -0.5, 0);
  jellyfish.add(glowSprite);

  // 2. TENTACULES 3D
  const tentacleCount = 12;
  const tentacles = [];
  const tentacleMat = new THREE.MeshStandardMaterial({
    color: 0x00f3ff,
    emissive: 0x0088ff,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
  });

  for (let i = 0; i < tentacleCount; i++) {
    const segmentCount = 20;
    const length = 10 + Math.random() * 6;
    const points = [];
    
    for (let j = 0; j < segmentCount; j++) {
      points.push(new THREE.Vector3(0, -j * (length / segmentCount), 0));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.06, 8, false);
    const mesh = new THREE.Mesh(tubeGeo, tentacleMat);

    const angle = (i / tentacleCount) * Math.PI * 2;
    const radius = 1.8 + (i % 2) * 0.8;
    mesh.position.set(Math.cos(angle) * radius, -0.5, Math.sin(angle) * radius);

    jellyfish.add(mesh);

    tentacles.push({
      mesh,
      basePoints: points,
      length,
      angleOffset: angle,
      speed: 1.2 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // 3. POUSSIÈRE MARINE ET BULLES BIOLUMINESCENTES
  const particleCount = 250;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleScales = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 50;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 50;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    particleScales[i] = Math.random() * 0.15 + 0.05;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.3,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  scene.add(particleSystem);

  // --- SUIVI SOURIS & PARALLAX ---
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

  function onMouseMove(event) {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    mouse.targetX = (x / container.clientWidth) * 2 - 1;
    mouse.targetY = -(y / container.clientHeight) * 2 + 1;
  }

  window.addEventListener('mousemove', onMouseMove);

  // --- RESIZE HANDLER ---
  function onWindowResize() {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  window.addEventListener('resize', onWindowResize);

  // --- UPDATE (ANIMATION LOOP) ---
  const clock = new THREE.Clock();

  function update() {
    const time = clock.getElapsedTime();

    // Smooth Interpolation de la souris (Parallax)
    mouse.x += (mouse.targetX - mouse.x) * 0.03;
    mouse.y += (mouse.targetY - mouse.y) * 0.03;

    camera.position.x = mouse.x * 3;
    camera.position.y = mouse.y * 3;
    camera.lookAt(0, 0, 0);

    // 1. Respiration & Contraction de la cloche (Bell pulsing)
    const pulse = Math.sin(time * 1.8);
    const pulseFactor = pulse * 0.15;
    const posAttr = bellMesh.geometry.attributes.position;

    for (let i = 0; i < posAttr.count; i++) {
      const x = basePositions.getX(i);
      const y = basePositions.getY(i);
      const z = basePositions.getZ(i);

      // Deformation sinusoïdale vers le bas
      const squeeze = y < 0 ? 1 + pulseFactor * 1.2 : 1 - pulseFactor * 0.5;
      const wave = Math.sin(time * 3 + y * 2) * 0.08;

      posAttr.setXYZ(
        i,
        x * squeeze + wave,
        y * (1 + pulseFactor * 0.8),
        z * squeeze + wave
      );
    }
    posAttr.needsUpdate = true;
    bellMesh.geometry.computeVertexNormals();

    // 2. Animation des Tentacules
    tentacles.forEach((t) => {
      const pathPoints = [];
      t.basePoints.forEach((pt, idx) => {
        const waveX = Math.sin(time * t.speed + idx * 0.3 + t.phase) * (idx * 0.12);
        const waveZ = Math.cos(time * (t.speed * 0.8) + idx * 0.3 + t.angleOffset) * (idx * 0.12);
        pathPoints.push(new THREE.Vector3(pt.x + waveX, pt.y, pt.z + waveZ));
      });

      const newCurve = new THREE.CatmullRomCurve3(pathPoints);
      t.mesh.geometry.dispose();
      t.mesh.geometry = new THREE.TubeGeometry(newCurve, 24, 0.05, 6, false);
    });

    // 3. Flottement global de la méduse
    jellyfish.position.y = Math.sin(time * 0.8) * 1.5;
    jellyfish.position.x = Math.sin(time * 0.5) * 1.0 + mouse.x * 2;
    jellyfish.position.z = Math.cos(time * 0.6) * 0.8;

    jellyfish.rotation.y = time * 0.1;
    jellyfish.rotation.z = Math.sin(time * 0.5) * 0.1;
    jellyfish.rotation.x = Math.cos(time * 0.4) * 0.08;

    // 4. Animation de la poussière marine / bulles
    const pPositions = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3 + 1] += Math.sin(time + i) * 0.01 + 0.008;
      if (pPositions[i * 3 + 1] > 25) {
        pPositions[i * 3 + 1] = -25;
      }
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;

    // Render
    renderer.render(scene, camera);
  }

  // --- NETTOYAGE & DESTROY ---
  function destroy() {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', onWindowResize);

    scene.traverse((child) => {
      if (child.isMesh || child.isPoints || child.isSprite) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

    tentacles.forEach((t) => {
      if (t.mesh.geometry) t.mesh.geometry.dispose();
    });

    renderer.dispose();

    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }

  return {
    scene,
    camera,
    renderer,
    jellyfish,
    update,
    destroy,
  };
}