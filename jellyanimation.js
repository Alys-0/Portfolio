import * as THREE from 'three';

export class JellyAnimation {
  constructor(creature) {
    this.creature = creature;
    this.time = 0;

    // Vecteurs et structures réutilisables pour éviter toute allocation mémoire dans update()
    this._tempVector = new THREE.Vector3();
    this._targetPosition = new THREE.Vector3();
    this._targetRotation = new THREE.Euler();
    this._mousePos = new THREE.Vector2(0, 0);

    // Bruit / Décalages aléatoires uniques pour l'organicité du mouvement
    this.randomOffsets = {
      driftX: Math.random() * 100,
      driftY: Math.random() * 100,
      driftZ: Math.random() * 100,
      rotX: Math.random() * 50,
      rotY: Math.random() * 50,
      rotZ: Math.random() * 50,
    };

    // Configuration centrale des animations
    this.parameters = {
      breathingSpeed: 1.8,
      breathingAmplitude: 0.14,
      floatingSpeed: 0.8,
      floatingAmplitude: 1.2,
      tentacleSpeed: 1.2,
      glowSpeed: 2.2,
      mouseInfluence: 0.035,
      randomMovement: true,
      currentEnergy: 1.0,
      targetEnergy: 1.0,
      energyTimer: 0,
    };

    // Sauvegarde des positions d'origine de la géométrie de la cloche
    if (this.creature && this.creature.body) {
      this.originalPositions = this.creature.body.geometry.attributes.position.clone();
    }
  }

  // --- BOUCLE PRINCIPALE D'ANIMATION ---
  update(deltaTime = 0.016) {
    if (!this.creature) return;

    this.time += deltaTime;

    // Mise à jour des comportements biologiques aléatoires
    this.updateRandomBehavior(deltaTime);

    // Exécution séquentielle des modules d'animation
    this.animateBreathing();
    this.animateFloating();
    this.animateTentacles();
    this.animateGlow();
    this.animateParticles();
  }

  // --- 1. RESPIRATION BIOLOGIQUE (Pompage de l'eau par la cloche) ---
  animateBreathing() {
    if (!this.creature.body) return;

    const energy = this.parameters.currentEnergy;
    const speed = this.parameters.breathingSpeed * energy;
    const amp = this.parameters.breathingAmplitude;

    // Combinaison d'une onde sinusoïdale principale et d'une micro-vibration secondaire
    const mainPulse = Math.sin(this.time * speed);
    const microPulse = Math.sin(this.time * speed * 3.5) * 0.02;
    const pulseFactor = (mainPulse + microPulse) * amp;

    const geo = this.creature.body.geometry;
    const posAttr = geo.attributes.position;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const bx = this.originalPositions.getX(i);
      const by = this.originalPositions.getY(i);
      const bz = this.originalPositions.getZ(i);

      // Simulation de la contraction péristaltique : expansion latérale lors du retrait vertical
      const Squeeze = by < 0 ? 1 + pulseFactor * 1.35 : 1 - pulseFactor * 0.45;
      const surfaceRipple = Math.sin(this.time * 4.0 + by * 2.5) * 0.05;

      posAttr.setXYZ(
        i,
        bx * Squeeze + surfaceRipple,
        by * (1 + pulseFactor * 0.85),
        bz * Squeeze + surfaceRipple
      );
    }

    posAttr.needsUpdate = true;
    geo.computeVertexNormals();

    // Propagation de la respiration sur les organes internes (décalage de phase)
    if (this.creature.innerOrgans) {
      const innerScale = 1 + Math.sin(this.time * speed - 0.5) * 0.08;
      this.creature.innerOrgans.scale.set(innerScale, innerScale * 0.9, innerScale);
    }
  }

  // --- 2. FLOTTEMENT SOUS-MARIN (Dérive cinématique) ---
  animateFloating() {
    if (!this.creature.group) return;

    const fSpeed = this.parameters.floatingSpeed;
    const fAmp = this.parameters.floatingAmplitude;
    const off = this.randomOffsets;

    // Mouvement d'onde de dérive sinusoïdale sur 3 axes avec fréquences asynchrones
    const driftY = Math.sin(this.time * fSpeed + off.driftY) * fAmp;
    const driftX = Math.sin(this.time * fSpeed * 0.6 + off.driftX) * (fAmp * 0.5);
    const driftZ = Math.cos(this.time * fSpeed * 0.4 + off.driftZ) * (fAmp * 0.3);

    // Calcul de la cible en intégrant la réaction à la souris
    this._targetPosition.set(
      driftX + this._mousePos.x * 3.0,
      driftY + this._mousePos.y * 2.0,
      driftZ
    );

    // Tangage et roulis fluides simulant le courant abyssal
    const rotX = Math.cos(this.time * 0.5 + off.rotX) * 0.08 + this._mousePos.y * 0.15;
    const rotY = this.time * 0.04 + off.rotY;
    const rotZ = Math.sin(this.time * 0.4 + off.rotZ) * 0.08 - this._mousePos.x * 0.2;

    this._targetRotation.set(rotX, rotY, rotZ);

    // Interpolation LERP ultra-douce
    this.creature.group.position.lerp(this._targetPosition, 0.03);
    
    this.creature.group.rotation.x += (this._targetRotation.x - this.creature.group.rotation.x) * 0.03;
    this.creature.group.rotation.y += (this._targetRotation.y - this.creature.group.rotation.y) * 0.03;
    this.creature.group.rotation.z += (this._targetRotation.z - this.creature.group.rotation.z) * 0.03;
  }

  // --- 3. ANIMATION DES TENTACULES (Filaments aquatiques) ---
  animateTentacles() {
    if (!this.creature.tentacles || this.creature.tentacles.length === 0) return;

    const tSpeed = this.parameters.tentacleSpeed * this.parameters.currentEnergy;

    for (let i = 0; i < this.creature.tentacles.length; i++) {
      const t = this.creature.tentacles[i];
      const pathPoints = [];
      const basePoints = t.basePoints;

      for (let j = 0; j < basePoints.length; j++) {
        const pt = basePoints[j];
        
        // Propagation progressive de l'onde le long des segments du tentacule
        const waveProgress = j * 0.35;
        const waveX = Math.sin(this.time * tSpeed * t.speed + waveProgress + t.phase) * (j * t.amplitude);
        const waveZ = Math.cos(this.time * (tSpeed * 0.8) + waveProgress + t.angleOffset) * (j * t.amplitude);

        pathPoints.push(this._tempVector.set(pt.x + waveX, pt.y, pt.z + waveZ).clone());
      }

      // Reconstruction de la géométrie tubulaire le long de la nouvelle courbe
      const newCurve = new THREE.CatmullRomCurve3(pathPoints);
      t.mesh.geometry.dispose();
      t.mesh.geometry = new THREE.TubeGeometry(newCurve, 20, 0.04, 6, false);
    }
  }

  // --- 4. PULSATION LUMINEUSE (Bioluminescence) ---
  animateGlow() {
    const gSpeed = this.parameters.glowSpeed;
    const pulse = (Math.sin(this.time * gSpeed) + 1) * 0.5; // Normalisé entre 0 et 1

    if (this.creature.body && this.creature.body.material) {
      const baseEmissive = this.creature.state ? this.creature.state.baseEmissiveIntensity : 0.5;
      this.creature.body.material.emissiveIntensity = baseEmissive + pulse * 0.4;
    }

    if (this.creature.glowSprite && this.creature.glowSprite.material) {
      this.creature.glowSprite.material.opacity = 0.45 + pulse * 0.35;
    }

    if (this.creature.innerOrgans && this.creature.innerOrgans.material) {
      this.creature.innerOrgans.material.emissiveIntensity = 0.9 + pulse * 0.6;
    }
  }

  // --- 5. PARTICULES VIVANTES (Plancton marin) ---
  animateParticles() {
    if (!this.creature.particles) return;

    const pGeo = this.creature.particles.geometry;
    const pPositions = pGeo.attributes.position.array;
    const count = pPositions.length / 3;

    for (let i = 0; i < count; i++) {
      // Élévation lente des particules avec turbulence latérale
      pPositions[i * 3 + 1] += Math.sin(this.time * 0.5 + i) * 0.004 + 0.007;
      pPositions[i * 3] += Math.sin(this.time * 0.3 + i * 2) * 0.003;

      // Réinitialisation en boucle lorsque la particule monte trop haut
      if (pPositions[i * 3 + 1] > 8) {
        pPositions[i * 3 + 1] = -8;
      }
    }

    pGeo.attributes.position.needsUpdate = true;
  }

  // --- 6. RÉACTION À LA SOURIS (Orientation douce) ---
  reactToMouse(mousePosition) {
    if (!mousePosition) return;

    // Lissage continu des coordonnées normalisées de la souris (-1 à 1)
    const factor = this.parameters.mouseInfluence;
    this._mousePos.x += (mousePosition.x - this._mousePos.x) * factor;
    this._mousePos.y += (mousePosition.y - this._mousePos.y) * factor;
  }

  // --- 7. VARIATIONS AUTONOMES ET INTELLIGENCE ALÉATOIRE ---
  updateRandomBehavior(deltaTime) {
    if (!this.parameters.randomMovement) return;

    this.parameters.energyTimer += deltaTime;

    // Toutes les 6 à 10 secondes, modification imprévisible du rythme biologique
    if (this.parameters.energyTimer > 7.0 + Math.random() * 3.0) {
      this.parameters.targetEnergy = 0.7 + Math.random() * 0.7; // Rythme calme vs actif
      this.parameters.energyTimer = 0;
    }

    // Interpolation douce de l'énergie
    this.parameters.currentEnergy +=
      (this.parameters.targetEnergy - this.parameters.currentEnergy) * 0.01;
  }

  // --- 8. RÉINITIALISATION DES POSITIONS ET DES ÉTATS ---
  reset() {
    this.time = 0;
    this._mousePos.set(0, 0);
    this.parameters.currentEnergy = 1.0;
    this.parameters.targetEnergy = 1.0;
    this.parameters.energyTimer = 0;

    if (this.creature && this.creature.group) {
      this.creature.group.position.set(0, 0, 0);
      this.creature.group.rotation.set(0, 0, 0);
    }
  }
}