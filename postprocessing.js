import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const POST_PROCESS_CONFIG = {
  bloom: {
    strength: 1.1,
    radius: 0.85,
    threshold: 0.2,
  },
  chromatic: {
    strength: 0.0025,
  },
  vignette: {
    offset: 0.95,
    darkness: 1.35,
  },
  color: {
    tint: new THREE.Vector3(0.02, 0.05, 0.12), // Teinte cyan/bleu abyssal
    contrast: 1.15,
    saturation: 1.1,
  },
};

// --- SHADER PERSONNALISÉ: COLOR GRADING, ABERRATION CHROMATIQUE & VIGNETTE ---
const CinematicAbyssalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uChromaticStrength: { value: POST_PROCESS_CONFIG.chromatic.strength },
    uVignetteOffset: { value: POST_PROCESS_CONFIG.vignette.offset },
    uVignetteDarkness: { value: POST_PROCESS_CONFIG.vignette.darkness },
    uColorTint: { value: POST_PROCESS_CONFIG.color.tint },
    uContrast: { value: POST_PROCESS_CONFIG.color.contrast },
    uSaturation: { value: POST_PROCESS_CONFIG.color.saturation },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uChromaticStrength;
    uniform float uVignetteOffset;
    uniform float uVignetteDarkness;
    uniform vec3 uColorTint;
    uniform float uContrast;
    uniform float uSaturation;

    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;

      // 1. Aberration Chromatique Légère (Distorsion Cinéma)
      vec2 distFromCenter = uv - 0.5;
      vec2 shift = distFromCenter * uChromaticStrength;

      float r = texture2D(tDiffuse, uv + shift).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - shift).b;
      vec3 color = vec3(r, g, b);

      // 2. Color Grading (Harmonies Abyssales)
      // Saturation
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luminance), color, uSaturation);

      // Contraste
      color = (color - 0.5) * uContrast + 0.5;

      // Infiltration de teintes froides / cyan
      color += uColorTint * (1.0 - luminance) * 0.5;

      // 3. Vignette Douce
      float uvDist = length(distFromCenter * uVignetteOffset);
      float vignette = smoothstep(0.8, uVignetteOffset - 0.2, uvDist * uVignetteDarkness);
      color *= vignette;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.composer = null;
    this.renderPass = null;
    this.bloomPass = null;
    this.cinematicPass = null;

    this.time = 0;
    this.quality = 'high';

    this.initComposer();
  }

  // --- 1. INITIALISATION DU PIPELINE D'EFFETS ---
  initComposer() {
    const width = this.renderer.domElement.clientWidth || window.innerWidth;
    const height = this.renderer.domElement.clientHeight || window.innerHeight;

    // Support de la haute précision de rendu
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });

    this.composer = new EffectComposer(this.renderer, renderTarget);

    // Pass 1: Scène principale
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Pass 2: Bloom bioluminescent
    this.addBloom(width, height);

    // Pass 3: Color Grading, Aberration Chromatique & Vignette
    this.addCinematicShader();
  }

  // --- 2. BLOOM BIOLUMINESCENT (Glow néon doux) ---
  addBloom(width, height) {
    const res = new THREE.Vector2(width, height);
    const cfg = POST_PROCESS_CONFIG.bloom;

    this.bloomPass = new UnrealBloomPass(res, cfg.strength, cfg.radius, cfg.threshold);
    this.composer.addPass(this.bloomPass);
  }

  // --- 3. SHADER CINÉMATIQUE SUR-MESURE ---
  addCinematicShader() {
    this.cinematicPass = new ShaderPass(CinematicAbyssalShader);
    this.composer.addPass(this.cinematicPass);
  }

  // Méthodes individuelles d'ajustement dynamique
  addChromaticAberration(strength) {
    if (this.cinematicPass) {
      this.cinematicPass.uniforms.uChromaticStrength.value = strength;
    }
  }

  addVignette(offset, darkness) {
    if (this.cinematicPass) {
      this.cinematicPass.uniforms.uVignetteOffset.value = offset;
      this.cinematicPass.uniforms.uVignetteDarkness.value = darkness;
    }
  }

  addColorGrading(contrast, saturation) {
    if (this.cinematicPass) {
      this.cinematicPass.uniforms.uContrast.value = contrast;
      this.cinematicPass.uniforms.uSaturation.value = saturation;
    }
  }

  // --- 4. ANIMATION DES EFFETS EN TEMPS RÉEL ---
  update(deltaTime = 0.016) {
    this.time += deltaTime;

    // Pulsation respiratoire très subtile de la lumière bioluminescente (Bloom)
    if (this.bloomPass) {
      const pulse = Math.sin(this.time * 1.5) * 0.08;
      this.bloomPass.strength = POST_PROCESS_CONFIG.bloom.strength + pulse;
    }

    // Mise à jour du temps dans les shaders personnalisés
    if (this.cinematicPass) {
      this.cinematicPass.uniforms.uTime.value = this.time;
    }

    // Rendu final via composer
    this.composer.render();
  }

  // --- 5. REDIMENSIONNEMENT DYNAMIQUE ---
  resize(width, height) {
    if (!this.composer) return;

    this.composer.setSize(width, height);

    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
  }

  // --- 6. GESTION DES NIVEAUX DE QUALITÉ (MOBILES & PERFORMANCES) ---
  setQuality(level = 'high') {
    this.quality = level;

    switch (level) {
      case 'low':
        if (this.bloomPass) {
          this.bloomPass.strength = 0.5;
          this.bloomPass.radius = 0.4;
        }
        if (this.cinematicPass) {
          this.cinematicPass.uniforms.uChromaticStrength.value = 0.0;
        }
        break;

      case 'medium':
        if (this.bloomPass) {
          this.bloomPass.strength = 0.8;
          this.bloomPass.radius = 0.6;
        }
        if (this.cinematicPass) {
          this.cinematicPass.uniforms.uChromaticStrength.value = 0.0015;
        }
        break;

      case 'high':
      default:
        if (this.bloomPass) {
          this.bloomPass.strength = POST_PROCESS_CONFIG.bloom.strength;
          this.bloomPass.radius = POST_PROCESS_CONFIG.bloom.radius;
        }
        if (this.cinematicPass) {
          this.cinematicPass.uniforms.uChromaticStrength.value =
            POST_PROCESS_CONFIG.chromatic.strength;
        }
        break;
    }
  }

  // --- 7. NETTOYAGE PROPRE DE LA MÉMOIRE ---
  destroy() {
    if (this.bloomPass) {
      this.bloomPass.dispose();
    }

    if (this.cinematicPass && this.cinematicPass.material) {
      this.cinematicPass.material.dispose();
    }

    if (this.renderPass) {
      this.renderPass.dispose();
    }

    if (this.composer) {
      this.composer.passes.forEach((pass) => {
        if (pass.dispose) pass.dispose();
      });
      this.composer.renderTarget1.dispose();
      this.composer.renderTarget2.dispose();
    }

    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }
}