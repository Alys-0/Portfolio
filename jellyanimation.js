import * as THREE from 'three';

export class JellyAnimation {
  constructor(jellyCreature, camera, homePosition = new THREE.Vector3(0, 0, 0)) {
    this.jelly = jellyCreature;
    this.camera = camera;
    this.homePosition = homePosition.clone();

    this.time = 0;
    this.currentVelocity = new THREE.Vector3(0.01, 0.005, 0);

    // Vitesse & amortissement (comportement unique, plus de mode "fuite")
    this.maxSpeed = 0.028;
    this.damping = 0.975;

    // Vagabondage autonome
    this.wanderTarget = new THREE.Vector3();
    this.wanderTimer = 0;
    this.wanderIntervalMin = 4;
    this.wanderIntervalMax = 7;
    this.pickNewWanderTarget();

    // Cycle de propulsion : rythme de nage clair (poussée ample, glisse longue)
    this.pulsePhase = 0;
    this.peakPoint = 0.35;
    this.period = 3.2;
    this.strength = 0.05;

    this.turnSpeed = 0.05;
    this.tmpVector = new THREE.Vector3();

    // FIX: toute interaction souris supprimée — plus de raycaster, plus de
    // plan, plus d'écouteur mousemove. La méduse est désormais 100% autonome.
  }

  getVisibleBounds(depth) {
    const distance = Math.abs(this.camera.position.z - depth);
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * this.camera.aspect;
    return { halfWidth: width / 2, halfHeight: height / 2 };
  }

  lerpAngle(a, b, t) {
    let diff = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    return a + diff * t;
  }

  smoothstep(x, min, max) {
    const t = THREE.MathUtils.clamp((x - min) / (max - min), 0, 1);
    return t * t * (3 - 2 * t);
  }

  pickNewWanderTarget() {
    const bounds = this.camera ? this.getVisibleBounds(0) : { halfWidth: 3, halfHeight: 2 };
    const marginRatio = 0.5;
    this.wanderTarget.set(
      (Math.random() * 2 - 1) * bounds.halfWidth * marginRatio,
      (Math.random() * 2 - 1) * bounds.halfHeight * marginRatio,
      0
    );
    this.wanderTimer = THREE.MathUtils.lerp(this.wanderIntervalMin, this.wanderIntervalMax, Math.random());
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

  update(deltaTime) {
    if (!this.camera) return;

    const safeDelta = Math.min(deltaTime, 0.1);
    this.time += safeDelta * 0.6;

    const jellyfishPos = this.jelly.group.position;

    this.wanderTimer -= safeDelta;
    if (this.wanderTimer <= 0) {
      this.pickNewWanderTarget();
    }

    // FIX: marges de confinement asymétriques — les tentacules pendent
    // beaucoup plus bas que la cloche ne dépasse vers le haut. Avant, la
    // même marge était utilisée des deux côtés, ce qui laissait la méduse
    // s'approcher trop près du bord bas et faire sortir ses tentacules
    // du cadre visible.
    const bounds = this.getVisibleBounds(jellyfishPos.z);
    const marginX = 2.6;
    const marginTop = 2.3;
    const marginBottom = 6.8;

    const limitX = Math.max(1, bounds.halfWidth - marginX);
    const limitYTop = Math.max(1, bounds.halfHeight - marginTop);
    const limitYBottom = Math.max(1, bounds.halfHeight - marginBottom);

    let boundarySteerX = 0;
    let boundarySteerY = 0;

    if (jellyfishPos.x > limitX) {
      boundarySteerX = -this.turnSpeed;
    } else if (jellyfishPos.x < -limitX) {
      boundarySteerX = this.turnSpeed;
    }

    if (jellyfishPos.y > limitYTop) {
      boundarySteerY = -this.turnSpeed;
    } else if (jellyfishPos.y < -limitYBottom) {
      boundarySteerY = this.turnSpeed;
    }

    this.currentVelocity.x += boundarySteerX;
    this.currentVelocity.y += boundarySteerY;

    // FIX: courant ambiant très atténué — avant, il dominait le mouvement
    // et donnait une impression de dérive passive plutôt que de nage active.
    const driftX = Math.sin(this.time * 0.15) * 0.0004;
    const driftY = Math.cos(this.time * 0.12) * 0.0004;
    this.currentVelocity.x += driftX;
    this.currentVelocity.y += driftY;

    // Cycle de propulsion unique : rythme de nage clair
    const prevPhase = this.pulsePhase;
    this.pulsePhase += safeDelta / this.period;
    const crossedPeak = prevPhase < this.peakPoint && this.pulsePhase >= this.peakPoint;
    if (this.pulsePhase >= 1) this.pulsePhase -= 1;

    if (crossedPeak) {
      const steer = new THREE.Vector3();
      if (boundarySteerX !== 0 || boundarySteerY !== 0) {
        steer.set(-jellyfishPos.x, -jellyfishPos.y, 0).normalize();
      } else {
        steer.set(this.wanderTarget.x - jellyfishPos.x, this.wanderTarget.y - jellyfishPos.y, 0);
      }

      if (steer.lengthSq() > 0.0001) {
        steer.normalize();
        this.currentVelocity.x += steer.x * this.strength;
        this.currentVelocity.y += steer.y * this.strength;
      }
    }

    this.currentVelocity.multiplyScalar(this.damping);

    if (this.currentVelocity.length() > this.maxSpeed) {
      this.currentVelocity.setLength(this.maxSpeed);
    }

    jellyfishPos.add(this.currentVelocity);

    // Confinement avec absorption de la vitesse au contact (pas de jitter)
    if (jellyfishPos.x > limitX) {
      jellyfishPos.x = limitX;
      if (this.currentVelocity.x > 0) this.currentVelocity.x = 0;
    } else if (jellyfishPos.x < -limitX) {
      jellyfishPos.x = -limitX;
      if (this.currentVelocity.x < 0) this.currentVelocity.x = 0;
    }

    if (jellyfishPos.y > limitYTop) {
      jellyfishPos.y = limitYTop;
      if (this.currentVelocity.y > 0) this.currentVelocity.y = 0;
    } else if (jellyfishPos.y < -limitYBottom) {
      jellyfishPos.y = -limitYBottom;
      if (this.currentVelocity.y < 0) this.currentVelocity.y = 0;
    }

    jellyfishPos.z = Math.sin(this.time * 0.15) * 0.3;

    // FIX: amplitude de bascule fortement réduite (0.95 rad ≈ 54° au lieu de
    // 2.6 rad ≈ 149°) — avant, un déplacement vers le bas de l'écran pouvait
    // presque inverser complètement la cloche, ce qui envoyait visuellement
    // la première rangée de tentacules par-dessus la tête.
    const speed = this.currentVelocity.length();
    const orientBlend = this.smoothstep(speed, 0.002, 0.02);

    let targetRotZ = 0;
    if (this.currentVelocity.lengthSq() > 0.000001) {
      const rawAngle = Math.atan2(-this.currentVelocity.x, this.currentVelocity.y);
      targetRotZ = THREE.MathUtils.clamp(rawAngle, -0.95, 0.95) * orientBlend;
    }

    this.jelly.group.rotation.z = this.lerpAngle(this.jelly.group.rotation.z, targetRotZ, 0.06);

    const targetX = THREE.MathUtils.clamp(this.currentVelocity.y * 10, -0.15, 0.15);
    this.jelly.group.rotation.x += (targetX - this.jelly.group.rotation.x) * 0.08;
    this.jelly.group.rotation.y += Math.sin(this.time * 0.2) * 0.001;

    const contraction = this.computeContraction(this.pulsePhase, this.peakPoint);
    if (this.jelly && typeof this.jelly.update === 'function') {
      this.jelly.update(this.time, safeDelta, speed * 4, this.currentVelocity, contraction, 0);
    }
  }
}