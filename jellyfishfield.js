import * as THREE from 'three';
import { JellyCreature } from './jellycreature.js';

export class JellyfishField {
  constructor(scene, camera, options = {}) {
    this.scene = scene;
    this.camera = camera;
    this.count = options.count || 5;
    this.time = 0;

    // Profondeur : proche (positif) → grand & rapide ; loin (négatif) → petit & lent
    this.zRange = options.zRange || [-6, 3];

    // FIX: zone d'exclusion horizontale centrale (où se trouve la timeline),
    // appliquée uniquement aux méduses au-delà d'un certain seuil de taille
    // (les plus proches / premier plan), pour éviter qu'elles ne se fassent
    // visuellement couper en passant derrière le contenu.
    this.avoidZoneWidthRatio = options.avoidZoneWidthRatio ?? 0.32;
    this.avoidZoneScaleThreshold = options.avoidZoneScaleThreshold ?? 0.6;

    this.jellies = [];
    for (let i = 0; i < this.count; i++) {
      this.jellies.push(this.createJelly(true));
    }
  }

  getVisibleBounds(depth) {
    const distance = Math.abs(this.camera.position.z - depth);
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * this.camera.aspect;
    return { halfWidth: width / 2, halfHeight: height / 2 };
  }

  computeContraction(phase, peakPoint) {
    if (phase < peakPoint) {
      const t = phase / peakPoint;
      return 1 - Math.pow(1 - t, 3);
    } else {
      const t = (phase - peakPoint) / (1 - peakPoint);
      const relax = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      return 1 - relax;
    }
  }

  // Crée une nouvelle méduse (uniquement à l'initialisation — ensuite on recycle)
  createJelly(spreadOverScreen) {
    const creature = new JellyCreature(this.scene);
    const state = { creature };
    this.assignRandomParams(state, spreadOverScreen);
    return state;
  }

  // (Ré)assigne une profondeur, une taille, une position de départ et une
  // trajectoire aléatoires à une méduse existante — utilisé au spawn initial
  // et à chaque recyclage une fois sortie de l'écran par le haut.
  assignRandomParams(state, spreadOverScreen) {
    const z = THREE.MathUtils.randFloat(this.zRange[0], this.zRange[1]);
    const bounds = this.getVisibleBounds(z);

    // Échelle liée à la profondeur : proche = grand, lointain = petit
    const depthT = THREE.MathUtils.mapLinear(z, this.zRange[0], this.zRange[1], 0, 1);
    const scale = THREE.MathUtils.lerp(0.32, 0.9, depthT) * THREE.MathUtils.randFloat(0.9, 1.1);
    state.creature.group.scale.set(scale, scale, scale);
    // FIX: suppression de l'appel prématuré à position.set() ici — state.baseX/
    // y/z n'existent pas encore à ce stade, ça écrivait des NaN inutilement
    // (écrasés plus bas de toute façon, donc sans effet visible, mais mort).

    state.z = z;
    state.baseZ = z;
    state.zDriftAmp = THREE.MathUtils.randFloat(0.4, 1.6);
    state.zDriftFreq = THREE.MathUtils.randFloat(0.05, 0.12);
    state.zDriftPhase = Math.random() * Math.PI * 2;

    state.scale = scale;

    // FIX: si la méduse est assez grande (proche), on la fait naître d'un
    // côté ou de l'autre de la zone centrale réservée à la timeline, plutôt
    // que n'importe où sur la largeur.
    if (scale > this.avoidZoneScaleThreshold) {
      const avoidHalfWidth = bounds.halfWidth * this.avoidZoneWidthRatio;
      const side = Math.random() < 0.5 ? -1 : 1;
      const minX = avoidHalfWidth + 0.3;
      const maxX = bounds.halfWidth * 0.9;
      state.baseX = side * THREE.MathUtils.randFloat(minX, maxX);
    } else {
      state.baseX = THREE.MathUtils.randFloatSpread(bounds.halfWidth * 1.5);
    }

    // Au démarrage, on les répartit sur toute la hauteur (pour ne pas toutes
    // les voir apparaître en bas en même temps) ; au recyclage, elles
    // repartent toujours du bas, hors champ.
    state.y = spreadOverScreen
      ? THREE.MathUtils.randFloat(-bounds.halfHeight * 1.3, bounds.halfHeight * 1.1)
      : -bounds.halfHeight - THREE.MathUtils.randFloat(1.5, 5);

    // Vitesse de remontée liée à la taille (parallaxe cohérente)
    state.riseSpeed = THREE.MathUtils.lerp(0.06, 0.16, depthT) * THREE.MathUtils.randFloat(0.85, 1.15);

    // Trajectoire serpentante : deux fréquences superposées, déphasage propre
    state.weaveAmp1 = bounds.halfWidth * THREE.MathUtils.randFloat(0.18, 0.38);
    state.weaveAmp2 = bounds.halfWidth * THREE.MathUtils.randFloat(0.06, 0.16);
    state.weaveFreq1 = THREE.MathUtils.randFloat(0.12, 0.28);
    state.weaveFreq2 = THREE.MathUtils.randFloat(0.3, 0.6);
    state.weavePhase = Math.random() * Math.PI * 2;

    // Cycle de propulsion propre à chaque méduse
    state.pulsePhase = Math.random();
    state.period = THREE.MathUtils.randFloat(2.4, 3.6);
    state.peakPoint = 0.35;

  // FIX: c'est ici que devait se trouver l'appel à resetTentacles() défini
    // dans jellycreature.js — il n'était jamais appelé nulle part, donc le
    // recyclage (et même le tout premier spawn) réutilisait un état de nœuds
    // potentiellement déformé, d'où les pattes emmêlées à l'apparition.
    state.creature.resetTentacles();
    state.creature.group.position.set(state.baseX, state.y, state.z);

  }

  update(deltaTime) {
    const safeDelta = Math.min(deltaTime, 0.1);
    this.time += safeDelta * 0.6;

    this.jellies.forEach((state) => {
      // Remontée continue
      state.y += state.riseSpeed;

      // Trajectoire serpentante horizontale (non-rectiligne)
      const weave =
      Math.sin(this.time * state.weaveFreq1 + state.weavePhase) * state.weaveAmp1 +
      Math.sin(this.time * state.weaveFreq2 + state.weavePhase * 1.7) * state.weaveAmp2;
    let targetX = state.baseX + weave;

    // FIX: si une grande méduse est déviée par son propre serpentage vers
    // la zone centrale (timeline), on la repousse doucement vers son côté
    // d'origine au lieu de la laisser traverser.
    if (state.scale > this.avoidZoneScaleThreshold) {
      const boundsHere = this.getVisibleBounds(state.z);
      const avoidHalfWidth = boundsHere.halfWidth * this.avoidZoneWidthRatio;
      if (Math.abs(targetX) < avoidHalfWidth) {
        const side = state.baseX >= 0 ? 1 : -1;
        targetX = side * avoidHalfWidth;
      }
    }

      // Légère dérive en profondeur : permet à deux méduses de se croiser,
      // l'une passant devant l'autre
      state.z = state.baseZ + Math.sin(this.time * state.zDriftFreq + state.zDriftPhase) * state.zDriftAmp;

      const pos = state.creature.group.position;
      const prevX = pos.x;
      pos.x += (targetX - pos.x) * 0.04;
      pos.y = state.y;
      pos.z = state.z;

      const velocity = new THREE.Vector3(pos.x - prevX, state.riseSpeed, 0);

      // Inclinaison douce dans le sens du zigzag
      const targetRotZ = -THREE.MathUtils.clamp(velocity.x * 30, -0.35, 0.35);
      state.creature.group.rotation.z = THREE.MathUtils.lerp(state.creature.group.rotation.z, targetRotZ, 0.04);
      state.creature.group.rotation.y += 0.0004;

      // Cycle de propulsion → contraction visuelle de la cloche
      state.pulsePhase += safeDelta / state.period;
      if (state.pulsePhase >= 1) state.pulsePhase -= 1;
      const contraction = this.computeContraction(state.pulsePhase, state.peakPoint);

      state.creature.update(this.time, safeDelta, state.riseSpeed * 40, velocity, contraction, 0);

      // Recyclage : une fois sortie par le haut, elle repart du bas avec de
      // nouveaux paramètres (pas de création/destruction d'objets 3D)
      const bounds = this.getVisibleBounds(state.z);
      if (state.y > bounds.halfHeight + 4) {
        this.assignRandomParams(state, false);
      }
    });
  }

  dispose() {
    this.jellies.forEach((state) => {
      this.scene.remove(state.creature.group);
    });
  }
}