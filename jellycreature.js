import * as THREE from "three";

export class JellyCreature {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.scale.set(0.70, 0.70, 0.70);
    scene.add(this.group);

    this.tentacles = [];
    this.veils = [];
    this.particles = [];
    this.bellCells = [];
    
    this.frame = 0;
    this.fleeVelocity = new THREE.Vector3();
    this.prevVelocity = new THREE.Vector3();
    this.totalRadius = 2.2;

    this.initMaterials();
    this.createBell();
    this.createOrganicHeartAndArms();
    this.createVeils();
    this.createDoubleTentacles();
    this.createParticles();
    this.createBellCells();
    this.createGlowCollar();
    this.addCrystalSpikes();
    this.createMucusLayer();
  }

  initMaterials() {
    this.bellMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        time: { value: 0 },
        blue: { value: new THREE.Color("#00d9ff") },
        purple: { value: new THREE.Color("#792cff") },
        pink: { value: new THREE.Color("#ff4fcf") },
        orange: { value: new THREE.Color("#ff9d38") },
        gold: { value: new THREE.Color("#ffd166") }
      },
      vertexShader: `
        uniform float time;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main(){
          vPosition = position;
          vNormal = normal;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;

          vec3 pos = position;
          float ripple = sin(position.x * 6.0 + time * 2.0) * sin(position.z * 5.0 + time * 2.0) * 0.02;
          pos.y += ripple;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 blue;
        uniform vec3 purple;
        uniform vec3 pink;
        uniform vec3 orange;
        uniform vec3 gold;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main(){
          float h = (vPosition.y + 2.5) / 5.0;
          vec3 color;
          if(h > 0.65){
            color = mix(orange, gold, (h - 0.65) * 3.0);
          } else if(h > 0.35){
            color = mix(purple, pink, (h - 0.35) * 3.0);
          } else {
            color = mix(blue, purple, h * 3.0);
          }

          float cells = sin(vPosition.x * 40.0) * sin(vPosition.z * 40.0);
          cells = smoothstep(0.5, 1.0, cells);
          color += pink * cells * 0.08;

          float angle = atan(vPosition.z, vPosition.x);
          float veins = sin(angle * 32.0 + time) * 0.12;
          color += veins;

          if(vPosition.y < 0.0) {
            float caustics = sin(vPosition.x * 15.0 + time * 3.0) * cos(vPosition.z * 15.0 - time * 2.0);
            color += blue * max(caustics, 0.0) * 0.15;
          }

          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - max(dot(viewDir, normalize(vNormal)), 0.0), 4.0);
          color += blue * fresnel * 1.2;

          float subsurface = pow(max(dot(vec3(0, 1, 0), normalize(vNormal)), 0.0), 2.0);
          color += pink * subsurface * 0.4;

          float glow = 0.85 + sin(time * 2.0) * 0.15;
          gl_FragColor = vec4(color * glow, 0.68);
        }
      `
    });

    this.organicArmMaterial = new THREE.MeshPhysicalMaterial({
      color: "#d98556",
      emissive: "#4f1d7a",
      emissiveIntensity: 0.35,
      roughness: 0.05,
      metalness: 0.02,
      clearcoat: 1,
      clearcoatRoughness: 0,
      transmission: 0.95,
      thickness: 1.2,
      ior: 1.45,
      transparent: true,
      opacity: 0.7,
      attenuationColor: new THREE.Color("#ff9f68"),
      attenuationDistance: 0.6,
      side: THREE.DoubleSide
    });

    this.coreMaterial = new THREE.MeshPhysicalMaterial({
      color: "#ffb36b",
      emissive: "#ff4fb2",
      emissiveIntensity: 1.0,
      roughness: 0.02,
      clearcoat: 1,
      clearcoatRoughness: 0,
      transmission: 1,
      thickness: 2.5,
      ior: 1.4,
      transparent: true,
      opacity: 0.9
    });

    this.heartHaloMaterial = new THREE.MeshBasicMaterial({
      color: "#ffaa00",
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    this.veilMaterial = new THREE.MeshPhysicalMaterial({
      color: "#b026ff",
      emissive: "#ff3399",
      emissiveIntensity: 0.6,
      roughness: 0.15,
      transmission: 0.6,
      thickness: 1.5,
      ior: 1.18,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide
    });

    this.particleMaterial = new THREE.PointsMaterial({
      color: "#ffd86b",
      size: 0.04,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
  }

  createBell() {
    const geometry = new THREE.SphereGeometry(2.6, 160, 80, 0, Math.PI * 2, 0, Math.PI * 0.58);
    const position = geometry.attributes.position;
    const origPositions = new Float32Array(position.count * 3);

    for (let i = 0; i < position.count; i++) {
      origPositions[i * 3] = position.getX(i);
      origPositions[i * 3 + 1] = position.getY(i);
      origPositions[i * 3 + 2] = position.getZ(i);
    }

    geometry.computeVertexNormals();
    this.bellMesh = new THREE.Mesh(geometry, this.bellMaterial);
    this.bellMesh.userData = { origPositions: origPositions };
    this.group.add(this.bellMesh);

    const ringGeo = new THREE.TorusGeometry(2.3, 0.06, 32, 120);
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: "#00eaff",
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    }));
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = -0.45;
    this.group.add(this.ring);
  }

  createOrganicHeartAndArms() {
    const coreGeo = new THREE.SphereGeometry(0.55, 64, 64);
    this.core = new THREE.Mesh(coreGeo, this.coreMaterial);
    this.core.position.y = -0.15;
    this.group.add(this.core);

    this.heartLight = new THREE.PointLight("#ffaa33", 1.5, 12);
    this.heartLight.position.y = -0.15;
    this.group.add(this.heartLight);

    const haloGeo = new THREE.SphereGeometry(1.15, 64, 64);
    this.halo = new THREE.Mesh(haloGeo, this.heartHaloMaterial);
    this.halo.position.copy(this.core.position);
    this.group.add(this.halo);

    this.centralArms = [];
    const armCount = 5;

    for (let i = 0; i < armCount; i++) {
      let angle = (i / armCount) * Math.PI * 2;
      const pointCount = 20;
      const points = [];

      for (let j = 0; j < pointCount; j++) {
        points.push(new THREE.Vector3(0, -0.3 - (j / pointCount) * 2.5, 0));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, 30, 0.03, 6, false);
      let arm = new THREE.Mesh(geometry, this.organicArmMaterial);

      arm.userData = {
        seed: Math.random() * 1000,
        angle,
        pointCount,
        curve
      };
      this.group.add(arm);
      this.centralArms.push(arm);
    }
  }

  createVeils() {
    const veilCount = 8;
    for (let i = 0; i < veilCount; i++) {
      let angle = (i / veilCount) * Math.PI * 2;
      let curvePoints = [];
      for (let j = 0; j < 30; j++) {
        let progress = j / 30;
        let radius = 0.45 + Math.sin(progress * Math.PI) * 0.35;
        let wave = Math.sin(progress * 10) * 0.12;
        curvePoints.push(new THREE.Vector3(
          Math.cos(angle) * radius + wave,
          -0.75 - progress * 2.2,
          Math.sin(angle) * radius
        ));
      }
      const curve = new THREE.CatmullRomCurve3(curvePoints);
      const geometry = new THREE.TubeGeometry(curve, 80, 0.16, 12, false);

      const posAttr = geometry.attributes.position;
      const basePositions = new Float32Array(posAttr.count * 3);
      for (let p = 0; p < posAttr.count; p++) {
        basePositions[p * 3] = posAttr.getX(p);
        basePositions[p * 3 + 1] = posAttr.getY(p);
        basePositions[p * 3 + 2] = posAttr.getZ(p);
      }

      const veil = new THREE.Mesh(geometry, this.veilMaterial);
      veil.userData = { index: i, basePositions, seed: Math.random() * 100 };
      this.group.add(veil);
      this.veils.push(veil);
    }
  }

  createDoubleTentacles() {
    // Répartition uniforme et fluide en cercle parfait pour éviter l'effet de cadre ou d'alignement rigide
    this.createTentacleRing(36, 2.15, 3.0, 3.8, "#ff88dd", 0.4, 0);
  }

  createTentacleRing(count, rootRadius, minLen, maxLen, colorHex, opacityVal, ringIndex) {
    for (let i = 0; i < count; i++) {
      // Distribution radiale pure sans distorsion angulaire artificielle
      const angle = (i / count) * Math.PI * 2;
      
      const points = [];
      const nodes = [];
      const length = THREE.MathUtils.randFloat(minLen, maxLen);
      const seed = Math.random() * 100;

      for (let j = 0; j < 25; j++) {
        const progress = j / 24;
        const radius = rootRadius + Math.sin(progress * Math.PI * 0.5) * 0.03;

        const pt = new THREE.Vector3(
          Math.cos(angle) * radius,
          -0.45 - progress * length,
          Math.sin(angle) * radius
        );

        points.push(pt);
        nodes.push({
          x: pt.x, y: pt.y, z: pt.z,
          ox: pt.x, oy: pt.y, oz: pt.z,
          angle: angle,
          baseRadius: rootRadius
        });
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, 40, 0.015, 4, false);

      const material = new THREE.MeshPhysicalMaterial({
        color: colorHex,
        emissive: "#ff33aa",
        emissiveIntensity: 0.3,
        roughness: 0.1,
        transmission: 0.8,
        transparent: true,
        opacity: opacityVal
      });

      const tentacle = new THREE.Mesh(geometry, material);
      tentacle.userData = { nodes, length, ringIndex, seed };

      this.group.add(tentacle);
      this.tentacles.push(tentacle);
    }
  }

  resetTentacles() {
    this.tentacles.forEach((tentacle) => {
      const nodes = tentacle.userData.nodes;
      if (!nodes) return;
      nodes.forEach((node) => {
        node.x = node.ox;
        node.y = node.oy;
        node.z = node.oz;
      });
    });
  }

  createParticles() {
    const particleCount = 250;
    const positions = new Float32Array(particleCount * 3);
    
    // Distribution sphérique douce et volumétrique autour de la méduse pour supprimer l'effet de cadre rectangulaire
    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.2 + Math.random() * 2.8; // Rayon progressif autour du corps

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (r * Math.sin(phi) * Math.sin(theta)) * 0.7 - 0.5;
      positions[i * 3 + 2] = r * Math.cos(phi);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, this.particleMaterial);
    this.group.add(points);
    this.particles.push(points);
  }

  createBellCells() {
    const cellMaterial = new THREE.MeshBasicMaterial({
      color: "#ff8fe7",
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    for (let i = 0; i < 90; i++) {
      let angle = Math.random() * Math.PI * 2;
      let radius = Math.random() * 2;
      let y = Math.random() * 1.2;
      const geo = new THREE.CircleGeometry(0.03 + Math.random() * 0.05, 12);
      const cell = new THREE.Mesh(geo, cellMaterial);
      cell.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      this.group.add(cell);
      this.bellCells.push(cell);
    }
  }

  createGlowCollar() {
    const geometry = new THREE.TorusGeometry(2.3, 0.035, 16, 150);
    const material = new THREE.MeshBasicMaterial({ color: "#ff5eea", transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
    this.collar = new THREE.Mesh(geometry, material);
    this.collar.rotation.x = Math.PI / 2;
    this.collar.position.y = -0.45;
    this.group.add(this.collar);
  }

  addCrystalSpikes() {
    const material = new THREE.MeshBasicMaterial({ color: "#75ffff", transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 24; i++) {
      const geo = new THREE.ConeGeometry(0.03, 0.25, 8);
      const spike = new THREE.Mesh(geo, material);
      let angle = (i / 24) * Math.PI * 2;
      spike.position.set(Math.cos(angle) * 2.3, -0.2, Math.sin(angle) * 2.3);
      this.group.add(spike);
    }
  }

  createMucusLayer() {
    const geo = new THREE.SphereGeometry(3.1, 64, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: "#33dfff",
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    this.aura = new THREE.Mesh(geo, mat);
    this.group.add(this.aura);
  }

  update(time, deltaTime = 0.016, speed = 0, velocity = new THREE.Vector3(), contraction = null, urgency = 0) {
    this.frame++;

    if (this.bellMaterial && this.bellMaterial.uniforms) {
      this.bellMaterial.uniforms.time.value = time;
    }

    const pulseFactor = contraction !== null ? (0.5 - contraction) : Math.sin(time * 2.2) * 0.5;
    
    if (this.ring) {
      const ringScale = 1 - pulseFactor * 0.45; // On amplifie un peu pour épouser la cloche
      this.ring.scale.set(ringScale, 1, ringScale);
      this.ring.position.y = -0.45 + (pulseFactor * 0.1); // Suit légèrement le mouvement vertical
    }

    if (this.collar) {
      const collarScale = 1 - pulseFactor * 0.45;
      this.collar.scale.set(collarScale, 1, collarScale);
      this.collar.position.y = -0.45 + (pulseFactor * 0.1);
    }

    if (this.ring && this.ring.material) {
      this.ring.material.opacity = 0.35 + Math.sin(time * 3.0) * 0.15;
    }
    if (this.collar && this.collar.material) {
      this.collar.material.opacity = 0.4 + Math.cos(time * 3.0) * 0.15;
    }
    if (this.core) {
      this.core.position.x = Math.sin(time * 0.8) * 0.08;
      this.core.position.z = Math.cos(time * 0.7) * 0.08;
      const beat = 1 + Math.sin(time * 2.2) * 0.05;
      this.core.scale.setScalar(beat);
    }

    this.centralArms.forEach((arm) => {
      const { seed, angle, pointCount } = arm.userData;
      const points = [];
      const baseRadius = 0.15; // Un peu plus large à la base

      for (let j = 0; j < pointCount; j++) {
        const p = j / pointCount;
        
        // On amplifie l'onde sur la longueur pour qu'ils dansent dans l'eau
        const waveX = Math.sin(time * 2.5 + seed + p * 5.0) * (0.05 + p * 0.25);
        const waveZ = Math.cos(time * 2.0 + seed * 1.3 + p * 5.0) * (0.05 + p * 0.25);

        // Suivi du déplacement global de la méduse avec un léger délai (inertie)
        const x = Math.cos(angle) * (baseRadius + p * 0.1) + waveX - velocity.x * p * 3.0;
        const y = -0.3 - (p * 2.5);
        const z = Math.sin(angle) * (baseRadius + p * 0.1) + waveZ - velocity.z * p * 3.0;

        points.push(new THREE.Vector3(x, y, z));
      }

      arm.userData.curve.points = points;
      arm.geometry.dispose();
      arm.geometry = new THREE.TubeGeometry(arm.userData.curve, 30, 0.025, 6, false);
    });this.centralArms.forEach((arm) => {
      const { seed, angle, pointCount } = arm.userData;
      const points = [];
      const baseRadius = 0.15; // Un peu plus large à la base

      for (let j = 0; j < pointCount; j++) {
        const p = j / pointCount;
        
        // On amplifie l'onde sur la longueur pour qu'ils dansent dans l'eau
        const waveX = Math.sin(time * 2.5 + seed + p * 5.0) * (0.05 + p * 0.25);
        const waveZ = Math.cos(time * 2.0 + seed * 1.3 + p * 5.0) * (0.05 + p * 0.25);

        // Suivi du déplacement global de la méduse avec un léger délai (inertie)
        const x = Math.cos(angle) * (baseRadius + p * 0.1) + waveX - velocity.x * p * 3.0;
        const y = -0.3 - (p * 2.5);
        const z = Math.sin(angle) * (baseRadius + p * 0.1) + waveZ - velocity.z * p * 3.0;

        points.push(new THREE.Vector3(x, y, z));
      }

      arm.userData.curve.points = points;
      arm.geometry.dispose();
      arm.geometry = new THREE.TubeGeometry(arm.userData.curve, 30, 0.025, 6, false);
    });

    if (this.bellMesh) {
      const posAttr = this.bellMesh.geometry.attributes.position;
      const orig = this.bellMesh.userData.origPositions;

      for (let i = 0; i < posAttr.count; i++) {
        let ox = orig[i * 3];
        let oy = orig[i * 3 + 1];
        let oz = orig[i * 3 + 2];

        let normalizedHeight = (oy + 1.5) / 2.6;
        let horizontalSpread = 1.0 - (pulseFactor * 0.45 * (1.0 - normalizedHeight));
        let verticalDome = oy + (pulseFactor * 0.4 * normalizedHeight);

        posAttr.setXYZ(i, ox * horizontalSpread, verticalDome, oz * horizontalSpread);
      }
      posAttr.needsUpdate = true;

      if ((this.frame % 4) === 0) {
        this.bellMesh.geometry.computeVertexNormals();
      }
    }

    if (this.tentacles) {
      this.tentacles.forEach((tentacle) => {
        const nodes = tentacle.userData.nodes;
        if (!nodes) return;

        const seed = tentacle.userData.seed || 0;

        let prevX = 0, prevY = -0.45, prevZ = 0;
        const points = [];
        const maxAllowedLength = tentacle.userData.length * 1.35;

        for (let j = 0; j < nodes.length; j++) {
          let node = nodes[j];
          let progress = j / nodes.length;

          node.x -= velocity.x * (1 + progress * 1.5);
          node.y -= velocity.y * (1 + progress * 1.5);
          node.z -= velocity.z * (1 + progress * 1.5);

          node.y -= 0.005 * (1 + progress);

          if (j === 0) {
            let dynamicRadius = node.baseRadius * (1.0 - pulseFactor * 0.25);
            node.ox = Math.cos(node.angle) * dynamicRadius;
            node.oz = Math.sin(node.angle) * dynamicRadius;
          }

          let waveDelay = Math.sin(this.frame * 0.06 + seed + progress * 3.0) * 0.05 * progress;
          let convergence = -pulseFactor * 0.4 * (1.0 - progress * 0.3);
          let targetX = node.ox * (1.0 + convergence) + waveDelay;
          let targetZ = node.oz * (1.0 + convergence) + waveDelay;

          node.x += (targetX - node.x) * 0.15;
          node.z += (targetZ - node.z) * 0.15;

          let targetY = -0.45 - (progress * tentacle.userData.length);
          node.y += (targetY - node.y) * 0.1;

          let currentDistFromTop = Math.sqrt(node.x * node.x + Math.pow(node.y + 0.45, 2) + node.z * node.z);
          if (currentDistFromTop > maxAllowedLength) {
            let scaleFactor = maxAllowedLength / currentDistFromTop;
            node.x *= scaleFactor;
            node.y = -0.45 + (node.y + 0.45) * scaleFactor;
            node.z *= scaleFactor;
          }

          let dx = node.x - prevX;
          let dy = node.y - prevY;
          let dz = node.z - prevZ;
          let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          let targetDist = 0.15;

          if (dist > 0.0001) {
            let factor = (dist - targetDist) / dist;
            node.x -= dx * factor * 0.5;
            node.y -= dy * factor * 0.5;
            node.z -= dz * factor * 0.5;
          }
          
          prevX = node.x;
          prevY = node.y;
          prevZ = node.z;

          points.push(new THREE.Vector3(node.x, node.y, node.z));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const segments = points.length - 1;
        const frames = curve.computeFrenetFrames(segments, false);
        const posAttr = tentacle.geometry.attributes.position;
        
        for (let i = 0; i <= segments; i++) {
          const p = curve.getPointAt(i / segments);
          const normal = frames.normals[i];
          
          let currentWidth = 0.02 * (1.0 - (i / segments) * 0.85);

          const left = p.clone().addScaledVector(normal, currentWidth);
          const right = p.clone().addScaledVector(normal, -currentWidth);

          const idx = i * 2;
          posAttr.setXYZ(idx, left.x, left.y, left.z);
          posAttr.setXYZ(idx + 1, right.x, right.y, right.z);
        }

        posAttr.needsUpdate = true;
        tentacle.geometry.computeVertexNormals();
      });
    }

    if (this.veils) {
      this.veils.forEach((veil) => {
        const i = veil.userData.index;
        const seed = veil.userData.seed;
        const basePos = veil.userData.basePositions;
        const posAttr = veil.geometry.attributes.position;

        veil.rotation.y = Math.sin(time * 0.8 + i) * 0.06;
        veil.rotation.z = Math.cos(time * 0.6 + i) * 0.04;

        for (let p = 0; p < posAttr.count; p++) {
          const bx = basePos[p * 3];
          const by = basePos[p * 3 + 1];
          const bz = basePos[p * 3 + 2];

          const depthFactor = Math.abs(by) / 2.6;
          const breathe = 1.0 - pulseFactor * 0.2 * depthFactor;

          const ripple = Math.sin(time * 2.2 + seed - by * 1.5) * 0.05 * depthFactor;

          const dragX = -velocity.x * 6 * depthFactor;
          const dragZ = -velocity.z * 6 * depthFactor;

          posAttr.setXYZ(
            p,
            bx * breathe + ripple + dragX,
            by,
            bz * breathe + ripple + dragZ
          );
        }
        posAttr.needsUpdate = true;
      });
    }
  }
}