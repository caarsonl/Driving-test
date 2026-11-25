window.HorizonWorld = (() => {
  "use strict";

  // =========================================================================
  // 1. WORLD CONFIGURATION & PRESETS (2.2 KM x 2.2 KM OPEN WORLD)
  // =========================================================================
  const CONFIG = {
    ISLAND_HALF: 1100,
    WORLD_LIMIT: 1240,
    GRID_SPACING: 110,
    ROAD_WIDTH: 16,
    ROAD_LINES: [
      -990, -880, -770, -660, -550, -440, -330, -220, -110, 0,
      110, 220, 330, 440, 550, 660, 770, 880, 990,
    ],
    HARBOR: { minX: -322, maxX: -8, minZ: -322, maxZ: -8 },
    PORT_ZONE: { minX: -990, maxX: -330, minZ: 220, maxZ: 990 },
    STUNT_ZONE: { minX: 330, maxX: 660, minZ: -330, maxZ: 110 },
  };

  const TIME_PRESETS = [
    {
      name: "SUNSET",
      skyTop: 0x1b264f,
      skyHorizon: 0xf07848,
      skyBottom: 0x3b1d2e,
      fog: 0xb85247,
      fogDensity: 0.00095,
      sunColor: 0xffa45b,
      sunIntensity: 1.45,
      sunPos: [-320, 92, -240],
      hemiSky: 0xfdba74,
      hemiGround: 0x1e293b,
      hemiIntensity: 0.64,
      ambientRoad: 0x4b3540,
      waterDeep: 0x0a2540,
      waterShallow: 0x1c4e63,
      windowGlow: 0.85,
      neonGlow: 2.2,
      headlights: true,
      exposure: 1.15,
    },
    {
      name: "NIGHT",
      skyTop: 0x030612,
      skyHorizon: 0x101e3d,
      skyBottom: 0x040710,
      fog: 0x081024,
      fogDensity: 0.00145,
      sunColor: 0x60a5fa,
      sunIntensity: 0.4,
      sunPos: [140, 280, -210],
      hemiSky: 0x1e3a5f,
      hemiGround: 0x050811,
      hemiIntensity: 0.48,
      ambientRoad: 0x182542,
      waterDeep: 0x030c1c,
      waterShallow: 0x0b223d,
      windowGlow: 1.45,
      neonGlow: 2.8,
      headlights: true,
      exposure: 1.22,
    },
    {
      name: "DAY",
      skyTop: 0x2563eb,
      skyHorizon: 0x93d5fa,
      skyBottom: 0x60a5fa,
      fog: 0x9bd2f5,
      fogDensity: 0.00072,
      sunColor: 0xfff6e5,
      sunIntensity: 1.5,
      sunPos: [260, 340, 200],
      hemiSky: 0xdbeafe,
      hemiGround: 0x3f6212,
      hemiIntensity: 0.78,
      ambientRoad: 0x5c6675,
      waterDeep: 0x074166,
      waterShallow: 0x1282a2,
      windowGlow: 0.08,
      neonGlow: 0.45,
      headlights: false,
      exposure: 1.06,
    },
  ];

  const WEATHER_PRESETS = [
    {
      name: "CLEAR",
      rainCount: 0,
      rainSpeed: 0,
      rainTiltX: 0,
      rainIntensity: 0.0,
      autoFloor: { wetness: 0.0, coverage: 0.0 },
      waveStrength: 0.42,
      fogMult: 1.0,
      skyDarken: 1.0,
      sunMult: 1.0,
      forceHeadlights: false,
      lightning: false,
      rainAudio: 0.0,
    },
    {
      name: "RAIN",
      rainCount: 1200,
      rainSpeed: 44,
      rainTiltX: 3.5,
      rainIntensity: 0.78,
      autoFloor: { wetness: 0.92, coverage: 0.56 },
      waveStrength: 0.75,
      fogMult: 1.38,
      skyDarken: 0.68,
      sunMult: 0.6,
      forceHeadlights: true,
      lightning: false,
      rainAudio: 0.14,
    },
    {
      name: "STORM",
      rainCount: 1900,
      rainSpeed: 64,
      rainTiltX: 11.5,
      rainIntensity: 1.0,
      autoFloor: { wetness: 1.0, coverage: 0.95 },
      waveStrength: 1.4,
      fogMult: 1.85,
      skyDarken: 0.45,
      sunMult: 0.35,
      forceHeadlights: true,
      lightning: true,
      rainAudio: 0.26,
    },
    {
      name: "FOG",
      rainCount: 0,
      rainSpeed: 0,
      rainTiltX: 0,
      rainIntensity: 0.0,
      autoFloor: { wetness: 0.62, coverage: 0.36 },
      waveStrength: 0.24,
      fogMult: 3.2,
      skyDarken: 0.78,
      sunMult: 0.45,
      forceHeadlights: true,
      lightning: false,
      rainAudio: 0.0,
    },
  ];

  const FLOOR_MODES = [
    { name: "DRY + WET", wetness: 0.95, coverage: 0.5 },
    { name: "DRY", wetness: 0.0, coverage: 0.0 },
    { name: "SOAKED", wetness: 1.0, coverage: 0.98 },
    { name: "WEATHER", wetness: -1, coverage: -1 },
  ];

  // =========================================================================
  // 2. SHARED DETERMINISTIC PUDDLE NOISE (MATCHED BETWEEN GLSL & JS PHYSICS)
  // =========================================================================
  function fract(x) {
    return x - Math.floor(x);
  }

  function hash21JS(px, pz) {
    let x = fract(px * 123.34);
    let y = fract(pz * 456.21);
    const d = x * (y + 45.32) + y * (x + 45.32);
    x += d;
    y += d;
    return fract(x * y);
  }

  function noise2DJS(px, pz) {
    const ix = Math.floor(px);
    const iz = Math.floor(pz);
    let fx = px - ix;
    let fz = pz - iz;
    fx = fx * fx * (3.0 - 2.0 * fx);
    fz = fz * fz * (3.0 - 2.0 * fz);
    const a = hash21JS(ix, iz);
    const b = hash21JS(ix + 1, iz);
    const c = hash21JS(ix, iz + 1);
    const d = hash21JS(ix + 1, iz + 1);
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
  }

  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function samplePuddleAt(x, z, wetness, coverage) {
    if (wetness <= 0.01 || coverage <= 0.01) return 0.0;
    if (coverage >= 0.94) return wetness;
    const p1 = noise2DJS(x * 0.036, z * 0.036);
    const p2 = noise2DJS(x * 0.11, z * 0.11);
    const n = p1 * 0.72 + p2 * 0.28;
    const threshold = 1.0 - coverage;
    return smoothstep(threshold - 0.07, threshold + 0.07, n) * wetness;
  }

  function lerpAngle(a, b, t) {
    let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  // =========================================================================
  // 3. PROCEDURAL TEXTURES
  // =========================================================================
  function createGrassTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#2f5327";
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 4200; i++) {
      const s = 32 + Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgb(${s}, ${s + 36}, ${s - 8})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(0.075, 0.075);
    return tex;
  }

  function createRoadTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#2b303a";
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 3200; i++) {
      const v = 30 + Math.floor(Math.random() * 34);
      ctx.fillStyle = `rgb(${v},${v},${v + 5})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    ctx.fillStyle = "rgba(15, 18, 24, 0.28)";
    ctx.fillRect(46, 0, 32, 256);
    ctx.fillRect(178, 0, 32, 256);

    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(10, 0, 5, 256);
    ctx.fillRect(241, 0, 5, 256);

    ctx.fillStyle = "#facc15";
    ctx.fillRect(124, 22, 8, 92);
    ctx.fillRect(124, 150, 8, 92);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  function createFacadeTexture(style) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext("2d");

    if (style === "glass") {
      ctx.fillStyle = "#162538";
      ctx.fillRect(0, 0, 256, 512);
      for (let r = 0; r < 24; r++) {
        const y = r * 21.3;
        ctx.fillStyle = "#0b1320";
        ctx.fillRect(0, y, 256, 4);
        for (let col = 0; col < 8; col++) {
          const lit = Math.random() > 0.42;
          ctx.fillStyle = lit ? (Math.random() > 0.3 ? "#7dd3fc" : "#fef08a") : "#1e3a5f";
          ctx.fillRect(col * 32 + 3, y + 5, 26, 14);
        }
      }
    } else if (style === "artdeco") {
      ctx.fillStyle = "#4b4a47";
      ctx.fillRect(0, 0, 256, 512);
      for (let col = 0; col < 6; col++) {
        ctx.fillStyle = "#625f58";
        ctx.fillRect(col * 42.6, 0, 8, 512);
        for (let r = 0; r < 16; r++) {
          const lit = Math.random() > 0.35;
          ctx.fillStyle = lit ? "#fde68a" : "#181a20";
          ctx.fillRect(col * 42.6 + 11, r * 32 + 6, 28, 20);
        }
      }
    } else if (style === "brick") {
      ctx.fillStyle = "#6c3d32";
      ctx.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,0,0,0.12)" : "rgba(255,210,180,0.08)";
        ctx.fillRect(Math.random() * 256, Math.random() * 512, 16, 6);
      }
      for (let r = 0; r < 10; r++) {
        ctx.fillStyle = "#3f3835";
        ctx.fillRect(0, r * 51 + 42, 256, 7);
        for (let col = 0; col < 4; col++) {
          const lit = Math.random() > 0.32;
          ctx.fillStyle = lit ? "#fed7aa" : "#1c1917";
          ctx.fillRect(col * 64 + 12, r * 51 + 10, 40, 28);
        }
      }
    } else if (style === "concrete") {
      ctx.fillStyle = "#64748b";
      ctx.fillRect(0, 0, 256, 512);
      for (let r = 0; r < 14; r++) {
        const y = r * 36.5;
        ctx.fillStyle = "#475569";
        ctx.fillRect(0, y, 256, 12);
        for (let col = 0; col < 8; col++) {
          ctx.fillStyle = Math.random() > 0.4 ? "#bae6fd" : "#111827";
          ctx.fillRect(col * 32 + 2, y + 14, 28, 19);
        }
      }
    } else if (style === "warehouse") {
      ctx.fillStyle = "#4b5563";
      ctx.fillRect(0, 0, 256, 512);
      for (let x = 0; x < 256; x += 8) {
        ctx.fillStyle = x % 16 === 0 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.16)";
        ctx.fillRect(x, 0, 4, 512);
      }
      for (let col = 0; col < 6; col++) {
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(col * 42 + 6, 48, 30, 38);
      }
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(24, 340, 84, 172);
      ctx.fillRect(148, 340, 84, 172);
    } else {
      ctx.fillStyle = "#141824";
      ctx.fillRect(0, 0, 256, 512);
      for (let r = 0; r < 20; r++) {
        for (let col = 0; col < 5; col++) {
          const lit = Math.random() > 0.36;
          ctx.fillStyle = lit ? (Math.random() > 0.5 ? "#38bdf8" : "#f472b6") : "#0b0f19";
          ctx.fillRect(col * 51 + 7, r * 25.6 + 6, 37, 13);
        }
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function createRampTexture() {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 256;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#334155";
    ctx.fillRect(0, 0, 128, 256);

    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 10;
    for (let y = 40; y < 240; y += 64) {
      ctx.beginPath();
      ctx.moveTo(22, y + 26);
      ctx.lineTo(64, y);
      ctx.lineTo(106, y + 26);
      ctx.stroke();
    }

    ctx.fillStyle = "#facc15";
    ctx.fillRect(0, 0, 10, 256);
    ctx.fillRect(118, 0, 10, 256);

    return new THREE.CanvasTexture(c);
  }

  // =========================================================================
  // 4. DRY + WET ROAD SHADER & REAL-TIME REFLECTIVE WATER SHADER
  // =========================================================================
  function createReflectiveRoadMaterial(roadTex, reflTexture, resolution, isIntersection) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uRoadMap: { value: roadTex },
        uReflMap: { value: reflTexture },
        uResolution: { value: resolution.clone() },
        uUvScale: {
          value: isIntersection
            ? new THREE.Vector2(1.0, 1.0)
            : new THREE.Vector2(1.0, 125.0),
        },
        uIsIntersection: { value: isIntersection ? 1.0 : 0.0 },
        uTime: { value: 0.0 },
        uRTEnabled: { value: 1.0 },
        uWetness: { value: 0.95 },
        uPuddleCoverage: { value: 0.5 },
        uRainIntensity: { value: 0.0 },
        uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.5).normalize() },
        uSunColor: { value: new THREE.Color(0xffa45b) },
        uAmbientColor: { value: new THREE.Color(0x4b3540) },
        uFogColor: { value: new THREE.Color(0xb85247) },
        uFogDensity: { value: 0.00095 },
        uCarPos: { value: new THREE.Vector3(0, 0, 20) },
        uCarForward: { value: new THREE.Vector3(0, 0, -1) },
        uHeadlightsOn: { value: 1.0 },
        uBrakeIntensity: { value: 0.45 },
        uNitroActive: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 localPos = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            localPos = instanceMatrix * localPos;
          #endif
          vec4 wp = modelMatrix * localPos;
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform sampler2D uRoadMap;
        uniform sampler2D uReflMap;
        uniform vec2 uResolution;
        uniform vec2 uUvScale;
        uniform float uIsIntersection;
        uniform float uTime;
        uniform float uRTEnabled;
        uniform float uWetness;
        uniform float uPuddleCoverage;
        uniform float uRainIntensity;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uAmbientColor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uCarPos;
        uniform vec3 uCarForward;
        uniform float uHeadlightsOn;
        uniform float uBrakeIntensity;
        uniform float uNitroActive;

        varying vec2 vUv;
        varying vec3 vWorldPos;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise2D(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        vec2 rainRipples(vec2 pos, float t) {
          vec2 cell = floor(pos);
          vec2 local = fract(pos) - 0.5;
          float rnd = hash21(cell);
          float phase = fract(t * 1.15 + rnd * 6.2831);
          float dist = length(local - (vec2(hash21(cell + 7.1), hash21(cell + 13.7)) - 0.5) * 0.45);
          float ring = sin((dist - phase * 0.48) * 44.0) * exp(-dist * 10.0) * (1.0 - phase);
          return normalize(local + vec2(0.0001)) * ring;
        }

        void main() {
          vec3 albedo = uIsIntersection > 0.5
            ? vec3(0.18, 0.2, 0.24)
            : texture2D(uRoadMap, vUv * uUvScale).rgb;

          vec3 L = normalize(uSunDir);
          vec3 V = normalize(cameraPosition - vWorldPos);

          float puddle = 0.0;
          float dampRim = 0.0;
          if (uWetness > 0.01 && uPuddleCoverage > 0.01) {
            if (uPuddleCoverage >= 0.94) {
              puddle = uWetness;
              dampRim = uWetness;
            } else {
              float p1 = noise2D(vWorldPos.xz * 0.036);
              float p2 = noise2D(vWorldPos.xz * 0.11);
              float n = p1 * 0.72 + p2 * 0.28;
              float thresh = 1.0 - uPuddleCoverage;
              puddle = smoothstep(thresh - 0.07, thresh + 0.07, n) * uWetness;
              dampRim = smoothstep(thresh - 0.16, thresh - 0.03, n) * uWetness;
            }
          }

          float grain = noise2D(vWorldPos.xz * 3.4);
          float microX = noise2D(vWorldPos.xz * 2.2) - 0.5;
          float microZ = noise2D(vWorldPos.xz * 2.2 + 19.7) - 0.5;
          vec2 rip = (uRainIntensity > 0.05 && puddle > 0.05)
            ? rainRipples(vWorldPos.xz * 0.85, uTime) * uRainIntensity * puddle * 0.18
            : vec2(0.0);

          float roughAmt = mix(0.24, 0.01, puddle);
          vec3 N = normalize(vec3(microX * roughAmt + rip.x, 1.0, microZ * roughAmt + rip.y));

          vec3 dryAlbedo = albedo * (0.94 + grain * 0.14);
          vec3 surfaceAlbedo = mix(dryAlbedo, albedo * 0.42, clamp(dampRim * 0.65 + puddle * 0.55, 0.0, 1.0));

          float NdotL = max(dot(N, L), 0.0);
          vec3 H = normalize(L + V);
          float specPower = mix(14.0, 280.0, puddle);
          float spec = pow(max(dot(N, H), 0.0), specPower) * mix(0.05, 1.85, puddle);

          vec3 color = surfaceAlbedo * (uAmbientColor * 1.1 + uSunColor * NdotL * 0.88) + uSunColor * spec * 0.68;

          vec3 toFrag = vWorldPos - uCarPos;
          float carDist = length(toFrag.xz);
          if (uHeadlightsOn > 0.5 && carDist < 66.0) {
            vec2 dir2 = normalize(toFrag.xz + vec2(0.0001));
            float cone = dot(dir2, normalize(uCarForward.xz));
            float beam = smoothstep(0.65, 0.96, cone) * smoothstep(66.0, 2.5, carDist);
            color += vec3(1.0, 0.94, 0.82) * beam * mix(0.32, 0.92, puddle);
          }

          vec3 rearPos = uCarPos - uCarForward * 2.3;
          float rearDist = length(vWorldPos.xz - rearPos.xz);
          if (rearDist < 15.0) {
            float tailFalloff = smoothstep(15.0, 0.5, rearDist);
            color += vec3(1.0, 0.1, 0.08) * tailFalloff * uBrakeIntensity * mix(0.18, 0.9, puddle);
            if (uNitroActive > 0.5) {
              color += vec3(0.15, 0.78, 1.0) * tailFalloff * mix(0.35, 1.25, puddle);
            }
          }

          if (uRTEnabled > 0.5 && puddle > 0.01) {
            vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
            vec2 reflUv = vec2(screenUv.x, 1.0 - screenUv.y);
            reflUv += vec2(microX, microZ) * 0.002 + rip * 0.045;
            reflUv = clamp(reflUv, vec2(0.002), vec2(0.998));

            vec3 reflColor = texture2D(uReflMap, reflUv).rgb * 1.16;
            float fresnel = 0.22 + 0.78 * pow(1.0 - max(dot(N, V), 0.0), 2.4);
            float reflStrength = clamp(puddle * (0.58 + fresnel * 0.42), 0.0, 0.93);
            color = mix(color, reflColor, reflStrength);
          }

          float depth = length(cameraPosition - vWorldPos);
          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
          color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
        }
      `,
    });
  }

  function createWaterMaterial(reflTexture, resolution) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uReflMap: { value: reflTexture },
        uResolution: { value: resolution.clone() },
        uTime: { value: 0.0 },
        uRTEnabled: { value: 1.0 },
        uWaveStrength: { value: 0.45 },
        uRainIntensity: { value: 0.0 },
        uDeepColor: { value: new THREE.Color(0x0a2540) },
        uShallowColor: { value: new THREE.Color(0x1c4e63) },
        uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.5).normalize() },
        uSunColor: { value: new THREE.Color(0xffa45b) },
        uFogColor: { value: new THREE.Color(0xb85247) },
        uFogDensity: { value: 0.00095 },
        uCarPos: { value: new THREE.Vector3(0, 0, 20) },
        uCarForward: { value: new THREE.Vector3(0, 0, -1) },
        uHeadlightsOn: { value: 1.0 },
        uNitroActive: { value: 0.0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uWaveStrength;
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          float swell = sin(wp.x * 0.075 + uTime * 1.6) * cos(wp.z * 0.068 - uTime * 1.3);
          wp.y += swell * 0.08 * uWaveStrength;
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform sampler2D uReflMap;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uRTEnabled;
        uniform float uWaveStrength;
        uniform float uRainIntensity;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uCarPos;
        uniform vec3 uCarForward;
        uniform float uHeadlightsOn;
        uniform float uNitroActive;

        varying vec3 vWorldPos;

        float hash21(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 34.5);
          return fract(p.x * p.y);
        }

        float noise2D(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        vec2 waveGradient(vec2 p, float t) {
          vec2 g = vec2(0.0);
          float w1 = p.x * 0.26 + p.y * 0.18 + t * 1.8;
          float w2 = p.x * -0.21 + p.y * 0.33 - t * 2.1;
          float w3 = p.x * 0.52 - p.y * 0.4 + t * 2.9;
          g += vec2(0.26, 0.18) * cos(w1) * 0.35;
          g += vec2(-0.21, 0.33) * cos(w2) * 0.28;
          g += vec2(0.52, -0.4) * cos(w3) * 0.16;

          float n1 = noise2D(p * 0.42 + vec2(t * 0.65, -t * 0.45));
          float n2 = noise2D(p * 0.42 + vec2(-t * 0.5, t * 0.72) + 17.3);
          g += vec2(n1 - 0.5, n2 - 0.5) * 0.45;
          return g;
        }

        vec2 waterRainRipples(vec2 pos, float t) {
          vec2 cell = floor(pos);
          vec2 local = fract(pos) - 0.5;
          float rnd = hash21(cell);
          float phase = fract(t * 1.35 + rnd * 6.2831);
          vec2 center = (vec2(hash21(cell + 4.3), hash21(cell + 19.1)) - 0.5) * 0.48;
          float dist = length(local - center);
          float ring = sin((dist - phase * 0.48) * 38.0) * exp(-dist * 9.0) * (1.0 - phase);
          return normalize(local - center + vec2(0.0001)) * ring;
        }

        void main() {
          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 L = normalize(uSunDir);

          vec2 grad = waveGradient(vWorldPos.xz, uTime) * (0.14 + uWaveStrength * 0.22);
          vec2 rip = uRainIntensity > 0.05
            ? waterRainRipples(vWorldPos.xz * 0.55, uTime) * uRainIntensity * 0.22
            : vec2(0.0);

          vec3 N = normalize(vec3(grad.x + rip.x, 1.0, grad.y + rip.y));

          float dHarbor = min(
            min(abs(vWorldPos.x + 322.0), abs(vWorldPos.x + 8.0)),
            min(abs(vWorldPos.z + 322.0), abs(vWorldPos.z + 8.0))
          );
          float dCausewayX = min(abs(vWorldPos.x + 110.0), abs(vWorldPos.x + 220.0)) - 8.4;
          float dCausewayZ = min(abs(vWorldPos.z + 110.0), abs(vWorldPos.z + 220.0)) - 8.4;
          float dCoast = min(abs(abs(vWorldPos.x) - 1100.0), abs(abs(vWorldPos.z) - 1100.0));
          float edgeDist = min(dHarbor, min(min(abs(dCausewayX), abs(dCausewayZ)), dCoast));

          float foamNoise = noise2D(vWorldPos.xz * 0.65 + vec2(uTime * 0.35, -uTime * 0.28));
          float shoreFoam = smoothstep(2.8, 0.15, edgeDist) * smoothstep(0.32, 0.72, foamNoise + 0.22);

          float shallowMix = smoothstep(22.0, 1.0, edgeDist);
          vec3 waterBase = mix(uDeepColor, uShallowColor, shallowMix);

          vec3 color;
          if (uRTEnabled > 0.5) {
            vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
            vec2 reflUv = vec2(screenUv.x, 1.0 - screenUv.y);
            reflUv += N.xz * (0.042 + uWaveStrength * 0.028);
            reflUv = clamp(reflUv, vec2(0.002), vec2(0.998));

            vec3 reflColor = texture2D(uReflMap, reflUv).rgb * 1.18;
            float NdotV = max(dot(N, V), 0.0);
            float fresnel = 0.16 + 0.84 * pow(1.0 - NdotV, 3.2);
            color = mix(waterBase, reflColor, clamp(fresnel * 1.05, 0.2, 0.96));

            vec3 H = normalize(L + V);
            float glitter = pow(max(dot(N, H), 0.0), 260.0) * 2.2;
            float broadSpec = pow(max(dot(N, H), 0.0), 36.0) * 0.28;
            color += uSunColor * (glitter + broadSpec);

            vec3 toFrag = vWorldPos - uCarPos;
            float carDist = length(toFrag.xz);
            if (uHeadlightsOn > 0.5 && carDist < 72.0) {
              vec2 dir2 = normalize(toFrag.xz + vec2(0.0001));
              float cone = dot(dir2, normalize(uCarForward.xz));
              float beam = smoothstep(0.62, 0.95, cone) * smoothstep(72.0, 2.0, carDist);
              color += vec3(1.0, 0.94, 0.82) * beam * 0.65;
            }
            if (uNitroActive > 0.5 && carDist < 18.0) {
              color += vec3(0.15, 0.8, 1.0) * smoothstep(18.0, 1.0, carDist) * 0.7;
            }
          } else {
            float NdotL = max(dot(N, L), 0.0);
            color = waterBase * (0.65 + NdotL * 0.65);
          }

          color = mix(color, vec3(0.84, 0.92, 0.97), clamp(shoreFoam * 0.55, 0.0, 0.65));

          float depth = length(cameraPosition - vWorldPos);
          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
          color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
        }
      `,
    });
  }

  // =========================================================================
  // 5. WORLD BUILDER
  // =========================================================================
  function buildWorld(scene, reflTarget, drawingBufferSize) {
    const { ISLAND_HALF, GRID_SPACING, ROAD_WIDTH, ROAD_LINES, HARBOR, PORT_ZONE, STUNT_ZONE } = CONFIG;

    // Sky Dome
    const skyUniforms = {
      uTopColor: { value: new THREE.Color(0x1b264f) },
      uHorizonColor: { value: new THREE.Color(0xf07848) },
      uBottomColor: { value: new THREE.Color(0x3b1d2e) },
      uFlash: { value: 0.0 },
    };
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(2100, 24, 16),
      new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uTopColor;
          uniform vec3 uHorizonColor;
          uniform vec3 uBottomColor;
          uniform float uFlash;
          varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 col = h >= 0.0
              ? mix(uHorizonColor, uTopColor, pow(clamp(h, 0.0, 1.0), 0.55))
              : mix(uHorizonColor, uBottomColor, pow(clamp(-h, 0.0, 1.0), 0.6));
            col += vec3(0.75, 0.88, 1.0) * uFlash;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      })
    );
    scene.add(skyDome);

    // Island Ground with Grand Harbor Cutout
    const islandShape = new THREE.Shape();
    islandShape.moveTo(-ISLAND_HALF, -ISLAND_HALF);
    islandShape.lineTo(ISLAND_HALF, -ISLAND_HALF);
    islandShape.lineTo(ISLAND_HALF, ISLAND_HALF);
    islandShape.lineTo(-ISLAND_HALF, ISLAND_HALF);
    islandShape.closePath();

    const harborHole = new THREE.Path();
    harborHole.moveTo(HARBOR.minX, -HARBOR.maxZ);
    harborHole.lineTo(HARBOR.minX, -HARBOR.minZ);
    harborHole.lineTo(HARBOR.maxX, -HARBOR.minZ);
    harborHole.lineTo(HARBOR.maxX, -HARBOR.maxZ);
    harborHole.closePath();
    islandShape.holes.push(harborHole);

    const groundMat = new THREE.MeshStandardMaterial({
      map: createGrassTexture(),
      roughness: 0.94,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(new THREE.ShapeGeometry(islandShape), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Reflective Water Plane
    const waterMat = createWaterMaterial(reflTarget.texture, drawingBufferSize);
    const waterGroup = new THREE.Group();
    const waterGeo = new THREE.PlaneGeometry(4600, 4600, 150, 150);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.24;
    waterGroup.add(waterMesh);
    scene.add(waterGroup);

    // Reflective Dry/Wet Roads + Instanced Intersections
    const roadTex = createRoadTexture();
    const roadMatStrip = createReflectiveRoadMaterial(roadTex, reflTarget.texture, drawingBufferSize, false);
    const roadMatInter = createReflectiveRoadMaterial(roadTex, reflTarget.texture, drawingBufferSize, true);
    const roadShadowMat = new THREE.ShadowMaterial({ opacity: 0.34 });

    const roadGroup = new THREE.Group();
    const roadShadowGroup = new THREE.Group();
    scene.add(roadGroup);
    scene.add(roadShadowGroup);

    const roadLength = 1996;
    const stripGeo = new THREE.PlaneGeometry(ROAD_WIDTH, roadLength);

    ROAD_LINES.forEach((coord) => {
      const rV = new THREE.Mesh(stripGeo, roadMatStrip);
      rV.rotation.x = -Math.PI / 2;
      rV.position.set(coord, 0.03, 0);
      roadGroup.add(rV);

      const sV = new THREE.Mesh(stripGeo, roadShadowMat);
      sV.rotation.x = -Math.PI / 2;
      sV.position.set(coord, 0.06, 0);
      sV.receiveShadow = true;
      roadShadowGroup.add(sV);

      const rH = new THREE.Mesh(stripGeo, roadMatStrip);
      rH.rotation.x = -Math.PI / 2;
      rH.rotation.z = Math.PI / 2;
      rH.position.set(0, 0.04, coord);
      roadGroup.add(rH);

      const sH = new THREE.Mesh(stripGeo, roadShadowMat);
      sH.rotation.x = -Math.PI / 2;
      sH.rotation.z = Math.PI / 2;
      sH.position.set(0, 0.065, coord);
      sH.receiveShadow = true;
      roadShadowGroup.add(sH);
    });

    const interCount = ROAD_LINES.length * ROAD_LINES.length;
    const interGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 0.5, ROAD_WIDTH + 0.5);
    interGeo.rotateX(-Math.PI / 2);
    const interInst = new THREE.InstancedMesh(interGeo, roadMatInter, interCount);
    const dummy = new THREE.Object3D();
    let interIdx = 0;
    ROAD_LINES.forEach((x) => {
      ROAD_LINES.forEach((z) => {
        dummy.position.set(x, 0.05, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        interInst.setMatrixAt(interIdx++, dummy.matrix);
      });
    });
    interInst.instanceMatrix.needsUpdate = true;
    roadGroup.add(interInst);

    // Harbor Seawalls, Arched Causeway Bridges & Waterfront Landmark
    const seawallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.78 });
    const bridgeArchMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.65, roughness: 0.28 });
    const neonMaterials = [];
    [0x38bdf8, 0xf43f5e, 0xa855f7, 0x22d3ee, 0xfbbf24].forEach((hex) => {
      neonMaterials.push(
        new THREE.MeshStandardMaterial({
          color: hex,
          emissive: hex,
          emissiveIntensity: 2.2,
          roughness: 0.2,
        })
      );
    });

    function addSeawall(x, z, w, d, h = 1.4) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), seawallMat);
      m.position.set(x, -h / 2 + 0.08, z);
      m.receiveShadow = true;
      scene.add(m);
    }

    const hW = HARBOR.maxX - HARBOR.minX;
    const hD = HARBOR.maxZ - HARBOR.minZ;
    const hCX = (HARBOR.minX + HARBOR.maxX) / 2;
    const hCZ = (HARBOR.minZ + HARBOR.maxZ) / 2;
    addSeawall(hCX, HARBOR.minZ, hW + 2, 2.4);
    addSeawall(hCX, HARBOR.maxZ, hW + 2, 2.4);
    addSeawall(HARBOR.minX, hCZ, 2.4, hD + 2);
    addSeawall(HARBOR.maxX, hCZ, 2.4, hD + 2);

    const coastSpan = ISLAND_HALF * 2 + 3;
    addSeawall(0, -ISLAND_HALF, coastSpan, 3.0);
    addSeawall(0, ISLAND_HALF, coastSpan, 3.0);
    addSeawall(-ISLAND_HALF, 0, 3.0, coastSpan);
    addSeawall(ISLAND_HALF, 0, 3.0, coastSpan);

    [-110, -220].forEach((cCoord) => {
      const deckNS = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH + 2.0, 0.85, hD), seawallMat);
      deckNS.position.set(cCoord, -0.39, hCZ);
      scene.add(deckNS);

      const deckEW = new THREE.Mesh(new THREE.BoxGeometry(hW, 0.85, ROAD_WIDTH + 2.0), seawallMat);
      deckEW.position.set(hCX, -0.39, cCoord);
      scene.add(deckEW);

      [-55, -165, -275].forEach((spanPos) => {
        const archNS = new THREE.Mesh(new THREE.TorusGeometry(9.4, 0.55, 8, 20, Math.PI), bridgeArchMat);
        archNS.position.set(cCoord, 0, spanPos);
        scene.add(archNS);

        const archEW = new THREE.Mesh(new THREE.TorusGeometry(9.4, 0.55, 8, 20, Math.PI), bridgeArchMat);
        archEW.rotation.y = Math.PI / 2;
        archEW.position.set(spanPos, 0, cCoord);
        scene.add(archEW);
      });
    });

    // Waterfront Needle Tower Landmark (x: 42, z: -42)
    const landmarkGroup = new THREE.Group();
    const needleMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.72, roughness: 0.25 });
    const needleShaft = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 6.2, 130, 12), needleMat);
    needleShaft.position.y = 65;
    needleShaft.castShadow = true;
    landmarkGroup.add(needleShaft);

    const obsDeck = new THREE.Mesh(new THREE.CylinderGeometry(14, 10, 9, 16), needleMat);
    obsDeck.position.y = 112;
    landmarkGroup.add(obsDeck);

    const obsRing = new THREE.Mesh(new THREE.TorusGeometry(14.2, 0.6, 8, 24), neonMaterials[0]);
    obsRing.rotation.x = Math.PI / 2;
    obsRing.position.y = 112;
    landmarkGroup.add(obsRing);

    const needleSpire = new THREE.Mesh(new THREE.ConeGeometry(1.4, 38, 8), needleMat);
    needleSpire.position.y = 148;
    landmarkGroup.add(needleSpire);

    const beaconTop = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 10), neonMaterials[1]);
    beaconTop.position.y = 167;
    landmarkGroup.add(beaconTop);

    landmarkGroup.position.set(42, 0, -42);
    scene.add(landmarkGroup);

    // Harbor Beacon Buoys (9 centers)
    [
      [-55, -55], [-165, -55], [-275, -55],
      [-55, -165], [-165, -165], [-275, -165],
      [-55, -275], [-165, -275], [-275, -275],
    ].forEach(([bx, bz], i) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.0, 2.4, 8), seawallMat);
      base.position.set(bx, 0.4, bz);
      scene.add(base);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 10), neonMaterials[i % neonMaterials.length]);
      orb.position.set(bx, 2.3, bz);
      scene.add(orb);
    });

    // =========================================================================
    // 6. STUNT RAMPS
    // =========================================================================
    const ramps = [];
    const rampMatShared = new THREE.MeshStandardMaterial({
      map: createRampTexture(),
      roughness: 0.45,
      metalness: 0.3,
    });

    function addRamp(x, z, width, height, length, angleY) {
      const shape = new THREE.Shape();
      shape.moveTo(-length / 2, 0);
      shape.lineTo(length / 2, 0);
      shape.lineTo(-length / 2, height);
      shape.closePath();

      const extrudeGeo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
      extrudeGeo.translate(0, 0, -width / 2);
      extrudeGeo.rotateY(-Math.PI / 2);

      const mesh = new THREE.Mesh(extrudeGeo, rampMatShared);
      mesh.position.set(x, 0, z);
      mesh.rotation.y = angleY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      ramps.push({ x, z, width, height, length, angleY });
    }

    addRamp(0, -60, 12, 4.8, 22, 0);
    addRamp(0, -170, 12, 5.2, 24, Math.PI);
    addRamp(-110, -355, 13, 6.0, 26, Math.PI);
    addRamp(440, -60, 18, 7.5, 32, 0);
    addRamp(440, -170, 18, 7.5, 32, Math.PI);
    addRamp(550, -110, 16, 8.2, 34, Math.PI / 2);
    addRamp(385, -275, 16, 6.5, 28, -Math.PI / 2);
    addRamp(-550, 440, 14, 6.0, 26, 0);
    addRamp(220, 660, 14, 5.8, 26, Math.PI / 2);
    addRamp(-660, -440, 14, 6.2, 26, -Math.PI / 2);

    function sampleRampHeight(x, z) {
      let bestH = 0;
      for (let i = 0; i < ramps.length; i++) {
        const r = ramps[i];
        const dx = x - r.x;
        const dz = z - r.z;
        const cosA = Math.cos(r.angleY);
        const sinA = Math.sin(r.angleY);
        const lx = dx * cosA - dz * sinA;
        const lz = dx * sinA + dz * cosA;
        if (Math.abs(lx) <= r.width / 2 + 0.5 && Math.abs(lz) <= r.length / 2 + 0.5) {
          const t = THREE.MathUtils.clamp((r.length / 2 - lz) / r.length, 0, 1);
          bestH = Math.max(bestH, t * r.height);
        }
      }
      return bestH;
    }

    // =========================================================================
    // 7. 7 ARCHITECTURAL BUILDING ARCHETYPES (INSTANCED)
    // =========================================================================
    const buildings = [];
    buildings.push({ minX: 34, maxX: 50, minZ: -50, maxZ: -34, x: 42, z: -42, w: 16, d: 16, h: 130, kind: "landmark" });

    const facadeStyles = ["glass", "artdeco", "brick", "concrete", "warehouse", "cyber"];
    const buildingMaterials = [];
    const facadeMats = {};

    facadeStyles.forEach((st) => {
      const tex = createFacadeTexture(st);
      const isGlass = st === "glass" || st === "cyber";
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(isGlass ? 0xcceeff : 0xfff0c8),
        emissiveIntensity: 0.85,
        roughness: isGlass ? 0.18 : 0.62,
        metalness: isGlass ? 0.65 : 0.18,
      });
      facadeMats[st] = mat;
      buildingMaterials.push(mat);
    });

    const roofDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.25 });
    const spireMetalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 });
    const pitchedRoofMat = new THREE.MeshStandardMaterial({ color: 0x5c342b, roughness: 0.85 });
    const siloMetalMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.65, roughness: 0.35 });
    const containerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.3 });

    const boxBatches = {
      glass: [], artdeco: [], brick: [], concrete: [],
      warehouse: [], cyber: [], roof: [], container: [],
    };
    const cylBatches = { glass: [], cyber: [], silo: [] };
    const spireBatch = [];
    const pitchedRoofBatch = [];
    const neonBatches = neonMaterials.map(() => []);
    const treeBatch = [];
    const lampBatch = [];

    function pushTransform(list, x, y, z, sx, sy, sz, ry = 0, colorHex = null) {
      list.push({ x, y, z, sx, sy, sz, ry, colorHex });
    }

    let seed = 4242;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    const containerPalette = [0xdc2626, 0x2563eb, 0xd97706, 0x059669, 0x7c3aed, 0x0284c7];

    for (let bx = -9; bx < 9; bx++) {
      for (let bz = -9; bz < 9; bz++) {
        const cx = (bx + 0.5) * GRID_SPACING;
        const cz = (bz + 0.5) * GRID_SPACING;

        if (cx > HARBOR.minX && cx < HARBOR.maxX && cz > HARBOR.minZ && cz < HARBOR.maxZ) continue;
        if (bx === 0 && bz === -1) {
          for (let t = 0; t < 8; t++) {
            const a = (t / 8) * Math.PI * 2;
            treeBatch.push({ x: cx + Math.cos(a) * 34, z: cz + Math.sin(a) * 34, s: 1.0 + rand() * 0.4 });
          }
          continue;
        }

        if ((bx + bz) % 2 === 0) {
          lampBatch.push({ x: cx - 43, z: cz - 43 });
          lampBatch.push({ x: cx + 43, z: cz + 43 });
        }

        if (cx > STUNT_ZONE.minX && cx < STUNT_ZONE.maxX && cz > STUNT_ZONE.minZ && cz < STUNT_ZONE.maxZ) {
          for (let t = 0; t < 4; t++) {
            treeBatch.push({ x: cx + (rand() - 0.5) * 68, z: cz + (rand() - 0.5) * 68, s: 0.9 + rand() * 0.5 });
          }
          continue;
        }

        const dist = Math.hypot(cx, cz);
        const isPort = cx > PORT_ZONE.minX && cx < PORT_ZONE.maxX && cz > PORT_ZONE.minZ && cz < PORT_ZONE.maxZ;
        const isDowntown = dist < 410 && !isPort;
        const isMidtown = dist >= 410 && dist < 760 && !isPort;
        const isParkland = dist >= 760 && !isPort;

        if (isDowntown && rand() < 0.34) {
          const roll = rand();
          if (roll < 0.36) {
            const bw = 44 + rand() * 14;
            const bd = 44 + rand() * 14;
            const h1 = 22 + rand() * 16;
            const h2 = 35 + rand() * 45;
            const h3 = 20 + rand() * 28;
            pushTransform(boxBatches.artdeco, cx, h1 / 2, cz, bw, h1, bd);
            pushTransform(boxBatches.artdeco, cx, h1 + h2 / 2, cz, bw * 0.68, h2, bd * 0.68);
            pushTransform(boxBatches.artdeco, cx, h1 + h2 + h3 / 2, cz, bw * 0.42, h3, bd * 0.42);
            pushTransform(spireBatch, cx, h1 + h2 + h3 + 13, cz, 1.5, 26, 1.5);
            const nIdx = Math.floor(rand() * neonBatches.length);
            pushTransform(neonBatches[nIdx], cx, h1 + h2 + h3 - 0.5, cz, bw * 0.44, 1.0, bd * 0.44);
            buildings.push({ minX: cx - bw / 2, maxX: cx + bw / 2, minZ: cz - bd / 2, maxZ: cz + bd / 2, x: cx, z: cz, w: bw, d: bd, h: h1 + h2 + h3 });
          } else if (roll < 0.7) {
            const r = 18 + rand() * 7;
            const h = 65 + rand() * 68;
            const style = rand() > 0.4 ? "glass" : "cyber";
            pushTransform(cylBatches[style], cx, h / 2, cz, r, h, r);
            pushTransform(cylBatches.silo, cx, h + 1.2, cz, r * 0.85, 2.2, r * 0.85);
            pushTransform(spireBatch, cx, h + 12, cz, 1.0, 22, 1.0);
            const nIdx = Math.floor(rand() * neonBatches.length);
            pushTransform(neonBatches[nIdx], cx, h - 1, cz, r * 1.65, 1.1, r * 1.65);
            buildings.push({ minX: cx - r, maxX: cx + r, minZ: cz - r, maxZ: cz + r, x: cx, z: cz, w: r * 2, d: r * 2, h });
          } else {
            const tw = 22 + rand() * 6;
            const td = 24 + rand() * 8;
            const th = 58 + rand() * 54;
            const sep = 20;
            const matKey = rand() > 0.5 ? "glass" : "cyber";
            pushTransform(boxBatches[matKey], cx - sep, th / 2, cz, tw, th, td);
            pushTransform(boxBatches[matKey], cx + sep, th / 2, cz, tw, th * 0.88, td);
            pushTransform(boxBatches.glass, cx, th * 0.62, cz, sep * 2, 6.5, td * 0.45);
            const nIdx = Math.floor(rand() * neonBatches.length);
            pushTransform(neonBatches[nIdx], cx - sep, th - 0.5, cz, tw + 0.6, 1.0, td + 0.6);
            pushTransform(neonBatches[nIdx], cx + sep, th * 0.88 - 0.5, cz, tw + 0.6, 1.0, td + 0.6);
            buildings.push({ minX: cx - sep - tw / 2, maxX: cx - sep + tw / 2, minZ: cz - td / 2, maxZ: cz + td / 2, x: cx - sep, z: cz, w: tw, d: td, h: th });
            buildings.push({ minX: cx + sep - tw / 2, maxX: cx + sep + tw / 2, minZ: cz - td / 2, maxZ: cz + td / 2, x: cx + sep, z: cz, w: tw, d: td, h: th * 0.88 });
          }
          continue;
        }

        const lotOffsets = [[-22, -22], [22, -22], [-22, 22], [22, 22]];

        lotOffsets.forEach(([ox, oz]) => {
          const px = cx + ox;
          const pz = cz + oz;

          if (isParkland) {
            if (rand() < 0.72) {
              treeBatch.push({ x: px + (rand() - 0.5) * 18, z: pz + (rand() - 0.5) * 18, s: 1.0 + rand() * 0.8 });
              treeBatch.push({ x: px + (rand() - 0.5) * 18, z: pz + (rand() - 0.5) * 18, s: 0.85 + rand() * 0.6 });
              return;
            }
            const w = 14 + rand() * 8;
            const d = 14 + rand() * 8;
            const h = 7 + rand() * 6;
            pushTransform(boxBatches.brick, px, h / 2, pz, w, h, d);
            pushTransform(pitchedRoofBatch, px, h + 3.2, pz, w * 0.8, 6.4, d * 0.8, Math.PI / 4);
            buildings.push({ minX: px - w / 2, maxX: px + w / 2, minZ: pz - d / 2, maxZ: pz + d / 2, x: px, z: pz, w, d, h });
            return;
          }

          if (isPort) {
            const pRoll = rand();
            if (pRoll < 0.42) {
              const w = 24 + rand() * 10;
              const d = 18 + rand() * 10;
              const h = 11 + rand() * 7;
              pushTransform(boxBatches.warehouse, px, h / 2, pz, w, h, d);
              pushTransform(boxBatches.roof, px, h + 1.0, pz, w * 0.85, 2.0, d * 0.75);
              buildings.push({ minX: px - w / 2, maxX: px + w / 2, minZ: pz - d / 2, maxZ: pz + d / 2, x: px, z: pz, w, d, h });
            } else if (pRoll < 0.72) {
              const stacks = 2 + Math.floor(rand() * 3);
              const rot = rand() > 0.5 ? 0 : Math.PI / 2;
              const cw = rot === 0 ? 22 : 9;
              const cd = rot === 0 ? 9 : 22;
              for (let s = 0; s < stacks; s++) {
                const col = containerPalette[Math.floor(rand() * containerPalette.length)];
                pushTransform(boxBatches.container, px, 2.2 + s * 4.5, pz, 22, 4.4, 8.8, rot, col);
              }
              buildings.push({ minX: px - cw / 2, maxX: px + cw / 2, minZ: pz - cd / 2, maxZ: pz + cd / 2, x: px, z: pz, w: cw, d: cd, h: stacks * 4.5 });
            } else {
              const r = 7.5 + rand() * 3.5;
              const h = 18 + rand() * 14;
              pushTransform(cylBatches.silo, px - 7, h / 2, pz, r, h, r);
              pushTransform(cylBatches.silo, px + 7, (h * 0.85) / 2, pz, r * 0.9, h * 0.85, r * 0.9);
              buildings.push({ minX: px - 15, maxX: px + 15, minZ: pz - r, maxZ: pz + r, x: px, z: pz, w: 30, d: r * 2, h });
            }
            return;
          }

          if (isMidtown && rand() < 0.28) {
            treeBatch.push({ x: px + (rand() - 0.5) * 14, z: pz + (rand() - 0.5) * 14, s: 1.0 + rand() * 0.5 });
            treeBatch.push({ x: px + (rand() - 0.5) * 14, z: pz + (rand() - 0.5) * 14, s: 0.9 + rand() * 0.4 });
            return;
          }

          const archRoll = rand();
          const w = 18 + rand() * 14;
          const d = 18 + rand() * 14;

          if (archRoll < 0.25) {
            const h = isDowntown ? 26 + rand() * 44 : 14 + rand() * 20;
            pushTransform(boxBatches.concrete, px, h / 2, pz, w, h, d);
            pushTransform(boxBatches.glass, px + w * 0.16, h * 0.72, pz - d * 0.14, w * 0.78, h * 0.48, d * 0.78);
            pushTransform(boxBatches.roof, px - w * 0.15, h + 1.5, pz + d * 0.15, w * 0.35, 3.0, d * 0.35);
            buildings.push({ minX: px - w / 2, maxX: px + w / 2, minZ: pz - d / 2, maxZ: pz + d / 2, x: px, z: pz, w, d, h });
          } else if (archRoll < 0.5) {
            const h = isDowntown ? 18 + rand() * 24 : 12 + rand() * 18;
            pushTransform(boxBatches.brick, px, h / 2, pz, w, h, d);
            pushTransform(boxBatches.roof, px, h + 0.8, pz, w + 0.8, 1.6, d + 0.8);
            pushTransform(boxBatches.roof, px + 2, h + 2.6, pz - 2, w * 0.32, 3.2, d * 0.32);
            buildings.push({ minX: px - w / 2, maxX: px + w / 2, minZ: pz - d / 2, maxZ: pz + d / 2, x: px, z: pz, w, d, h });
          } else if (archRoll < 0.75) {
            const h = isDowntown ? 34 + rand() * 58 : 18 + rand() * 24;
            const style = rand() > 0.45 ? "glass" : "cyber";
            pushTransform(boxBatches[style], px, h / 2, pz, w, h, d);
            pushTransform(boxBatches[style], px, h + h * 0.16, pz, w * 0.62, h * 0.32, d * 0.62);
            if (isDowntown) {
              const nIdx = Math.floor(rand() * neonBatches.length);
              pushTransform(neonBatches[nIdx], px, h - 0.5, pz, w + 0.5, 0.9, d + 0.5);
              pushTransform(neonBatches[nIdx], px, 6.2, pz, w + 0.4, 0.6, d + 0.4);
            }
            buildings.push({ minX: px - w / 2, maxX: px + w / 2, minZ: pz - d / 2, maxZ: pz + d / 2, x: px, z: pz, w, d, h: h * 1.32 });
          } else {
            const r = 9 + rand() * 5.5;
            const h = isDowntown ? 30 + rand() * 52 : 16 + rand() * 22;
            const style = rand() > 0.5 ? "glass" : "cyber";
            pushTransform(cylBatches[style], px, h / 2, pz, r, h, r);
            pushTransform(spireBatch, px, h + 7, pz, 0.7, 14, 0.7);
            buildings.push({ minX: px - r, maxX: px + r, minZ: pz - r, maxZ: pz + r, x: px, z: pz, w: r * 2, d: r * 2, h });
          }
        });
      }
    }

    function buildInstanced(geo, mat, list, castShadow = true, receiveShadow = true) {
      if (!list.length) return null;
      const inst = new THREE.InstancedMesh(geo, mat, list.length);
      inst.castShadow = castShadow;
      inst.receiveShadow = receiveShadow;
      const color = new THREE.Color();
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(0, it.ry || 0, 0);
        dummy.scale.set(it.sx, it.sy, it.sz);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        if (it.colorHex !== null && it.colorHex !== undefined) {
          color.setHex(it.colorHex);
          inst.setColorAt(i, color);
        }
      }
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      scene.add(inst);
      return inst;
    }

    const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const unitCylGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
    const unitConeGeo = new THREE.ConeGeometry(1, 1, 4);
    const spireConeGeo = new THREE.ConeGeometry(1, 1, 6);

    buildInstanced(unitBoxGeo, facadeMats.glass, boxBatches.glass);
    buildInstanced(unitBoxGeo, facadeMats.artdeco, boxBatches.artdeco);
    buildInstanced(unitBoxGeo, facadeMats.brick, boxBatches.brick);
    buildInstanced(unitBoxGeo, facadeMats.concrete, boxBatches.concrete);
    buildInstanced(unitBoxGeo, facadeMats.warehouse, boxBatches.warehouse);
    buildInstanced(unitBoxGeo, facadeMats.cyber, boxBatches.cyber);
    buildInstanced(unitBoxGeo, roofDarkMat, boxBatches.roof);
    buildInstanced(unitBoxGeo, containerMat, boxBatches.container);

    buildInstanced(unitCylGeo, facadeMats.glass, cylBatches.glass);
    buildInstanced(unitCylGeo, facadeMats.cyber, cylBatches.cyber);
    buildInstanced(unitCylGeo, siloMetalMat, cylBatches.silo);

    buildInstanced(spireConeGeo, spireMetalMat, spireBatch, false, false);
    buildInstanced(unitConeGeo, pitchedRoofMat, pitchedRoofBatch);

    neonBatches.forEach((batch, idx) => {
      buildInstanced(unitBoxGeo, neonMaterials[idx], batch, false, false);
    });

    // Instanced Trees
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1e5c2e, roughness: 0.85 });
    if (treeBatch.length) {
      const trunkGeo = new THREE.CylinderGeometry(0.45, 0.65, 4, 6);
      const crownGeo = new THREE.ConeGeometry(2.8, 7.2, 6);
      const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeBatch.length);
      const crownInst = new THREE.InstancedMesh(crownGeo, leafMat, treeBatch.length);
      trunkInst.castShadow = true;
      crownInst.castShadow = true;
      treeBatch.forEach((t, i) => {
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(t.s, t.s, t.s);
        dummy.position.set(t.x, 2 * t.s, t.z);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(i, dummy.matrix);

        dummy.position.set(t.x, 6.5 * t.s, t.z);
        dummy.updateMatrix();
        crownInst.setMatrixAt(i, dummy.matrix);
      });
      trunkInst.instanceMatrix.needsUpdate = true;
      crownInst.instanceMatrix.needsUpdate = true;
      scene.add(trunkInst);
      scene.add(crownInst);
    }

    // Instanced Street Lamps
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.35 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 2.4,
    });
    if (lampBatch.length) {
      const poleGeo = new THREE.CylinderGeometry(0.14, 0.2, 8.5, 5);
      const bulbGeo = new THREE.SphereGeometry(0.5, 6, 6);
      const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, lampBatch.length);
      const bulbInst = new THREE.InstancedMesh(bulbGeo, bulbMat, lampBatch.length);
      lampBatch.forEach((l, i) => {
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.position.set(l.x, 4.25, l.z);
        dummy.updateMatrix();
        poleInst.setMatrixAt(i, dummy.matrix);

        dummy.position.set(l.x, 8.6, l.z);
        dummy.updateMatrix();
        bulbInst.setMatrixAt(i, dummy.matrix);
      });
      poleInst.instanceMatrix.needsUpdate = true;
      bulbInst.instanceMatrix.needsUpdate = true;
      scene.add(poleInst);
      scene.add(bulbInst);
    }

    // Distant Coastal Mountain Ring (pushed outside coastal shipping lanes)
    const mtnMat = new THREE.MeshStandardMaterial({ color: 0x26382b, roughness: 0.95 });
    const mtnGeo = new THREE.ConeGeometry(1, 1, 7);
    const mtnCount = 56;
    const mtnInst = new THREE.InstancedMesh(mtnGeo, mtnMat, mtnCount);
    for (let i = 0; i < mtnCount; i++) {
      const a = (i / mtnCount) * Math.PI * 2;
      const rad = 1720 + (i % 4) * 95;
      const h = 95 + (i % 5) * 46;
      const w = 125 + (i % 3) * 48;
      dummy.position.set(Math.cos(a) * rad, h / 2 - 1, Math.sin(a) * rad);
      dummy.rotation.set(0, a, 0);
      dummy.scale.set(w, h, w);
      dummy.updateMatrix();
      mtnInst.setMatrixAt(i, dummy.matrix);
    }
    mtnInst.instanceMatrix.needsUpdate = true;
    scene.add(mtnInst);

    // =========================================================================
    // 8. MOVING AI CITY TRAFFIC (SEDANS, SUVS & DELIVERY TRUCKS)
    // =========================================================================
    const trafficGroup = new THREE.Group();
    scene.add(trafficGroup);

    const LANE_OFFSET = 3.8;
    const AI_COUNT = 48;
    const trafficCars = [];

    const aiGlassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.14 });
    const aiTireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const aiHeadlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff8d6,
      emissiveIntensity: 2.8,
    });
    const aiHeadBeamMat = new THREE.MeshBasicMaterial({
      color: 0xfff4cc,
      transparent: true,
      opacity: 0.065,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const aiHeadBeams = [];

    const aiWheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
    aiWheelGeo.rotateZ(Math.PI / 2);
    const aiBeamGeo = new THREE.ConeGeometry(1.85, 11, 10, 1, true);
    aiBeamGeo.rotateX(Math.PI / 2);

    const aiCarPalette = [
      0xf59e0b, // City Taxi Yellow
      0xf8fafc, // Pearl White
      0x3b82f6, // Cobalt Blue
      0x94a3b8, // Metallic Silver
      0x10b981, // Emerald
      0xef4444, // Crimson
      0x8b5cf6, // Violet
      0x334155, // Graphite
      0xf97316, // Sunset Orange
    ];

    function createAIVehicleMesh(type, colorHex) {
      const group = new THREE.Group();
      const paintMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness: 0.55,
        roughness: 0.32,
      });

      let length = 4.3;
      let width = 1.98;
      let radius = 2.15;

      if (type === "truck") {
        length = 6.2;
        width = 2.25;
        radius = 2.9;

        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.55, 1.85), paintMat);
        cab.position.set(0, 1.2, -2.05);
        cab.castShadow = true;
        group.add(cab);

        const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.65, 0.14), aiGlassMat);
        windshield.position.set(0, 1.52, -2.96);
        group.add(windshield);

        const cargoMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.65, metalness: 0.15 });
        const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.26, 2.25, 4.15), cargoMat);
        cargo.position.set(0, 1.65, 1.0);
        cargo.castShadow = true;
        group.add(cargo);
      } else if (type === "suv") {
        length = 4.65;
        width = 2.08;
        radius = 2.3;

        const body = new THREE.Mesh(new THREE.BoxGeometry(width, 0.72, length), paintMat);
        body.position.y = 0.76;
        body.castShadow = true;
        group.add(body);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.66, 2.85), aiGlassMat);
        cabin.position.set(0, 1.42, 0.25);
        cabin.castShadow = true;
        group.add(cabin);
      } else {
        // Sedan
        const body = new THREE.Mesh(new THREE.BoxGeometry(width, 0.58, length), paintMat);
        body.position.y = 0.62;
        body.castShadow = true;
        group.add(body);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.52, 2.1), aiGlassMat);
        cabin.position.set(0, 1.14, 0.15);
        cabin.castShadow = true;
        group.add(cabin);

        // Taxi roof sign on yellow sedans
        if (colorHex === 0xf59e0b) {
          const sign = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.22, 0.28),
            new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 1.5 })
          );
          sign.position.set(0, 1.52, 0.05);
          group.add(sign);
        }
      }

      // 4 Spinning Wheels
      const wheelZ = length * 0.31;
      const wheelX = width * 0.51;
      const wheels = [];
      [[-wheelX, -wheelZ], [wheelX, -wheelZ], [-wheelX, wheelZ], [wheelX, wheelZ]].forEach(([wx, wz]) => {
        const w = new THREE.Mesh(aiWheelGeo, aiTireMat);
        w.position.set(wx, 0.38, wz);
        group.add(w);
        wheels.push(w);
      });

      // Headlights + subtle additive beam cones
      const halfL = length * 0.5;
      [-0.65, 0.65].forEach((lx) => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.08), aiHeadlightMat);
        hl.position.set(lx, 0.68, -halfL - 0.02);
        group.add(hl);
      });

      const beam = new THREE.Mesh(aiBeamGeo, aiHeadBeamMat);
      beam.position.set(0, 0.65, -halfL - 5.6);
      group.add(beam);
      aiHeadBeams.push(beam);

      // Independent taillight material per car so individual cars light up when braking!
      const tailMat = new THREE.MeshStandardMaterial({
        color: 0x7f1d1d,
        emissive: 0xff1e1e,
        emissiveIntensity: 0.7,
      });
      [-0.65, 0.65].forEach((lx) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), tailMat);
        tl.position.set(lx, 0.7, halfL + 0.02);
        group.add(tl);
      });

      trafficGroup.add(group);
      return { group, wheels, tailMat, radius };
    }

    function headingForTraffic(axis, dir) {
      if (axis === "z") return dir < 0 ? 0 : Math.PI;
      return dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    }

    function coordsForTraffic(axis, dir, roadCoord, pos) {
      if (axis === "z") {
        // North (-Z): right lane is +LANE_OFFSET; South (+Z): right lane is -LANE_OFFSET
        return { x: roadCoord + (dir < 0 ? LANE_OFFSET : -LANE_OFFSET), z: pos };
      }
      // East (+X): right lane is +LANE_OFFSET; West (-X): right lane is -LANE_OFFSET
      return { x: pos, z: roadCoord + (dir > 0 ? LANE_OFFSET : -LANE_OFFSET) };
    }

    // Spawn 48 AI Traffic Cars concentrated near Downtown/Harbor + spread across avenues
    for (let i = 0; i < AI_COUNT; i++) {
      const axis = i % 2 === 0 ? "z" : "x";
      const dir = rand() > 0.5 ? 1 : -1;

      // Bias first 22 cars to central downtown & harbor causeways so traffic is immediately visible
      let lineIdx;
      if (i < 22) {
        lineIdx = 6 + Math.floor(rand() * 7); // ROAD_LINES[-330..330]
      } else {
        lineIdx = Math.floor(rand() * ROAD_LINES.length);
      }
      const roadCoord = ROAD_LINES[lineIdx];
      let pos = (i < 22 ? (rand() - 0.5) * 620 : (rand() - 0.5) * 1860);

      // Avoid spawning right on top of the player car at (0, 20)
      if (roadCoord === 0 && Math.abs(pos - 20) < 48) pos -= 80;

      const roll = rand();
      const type = roll < 0.58 ? "sedan" : roll < 0.85 ? "suv" : "truck";
      const colorHex = aiCarPalette[Math.floor(rand() * aiCarPalette.length)];
      const built = createAIVehicleMesh(type, colorHex);

      const baseSpeed = type === "truck" ? 13 + rand() * 4 : 16 + rand() * 8;
      const startCoords = coordsForTraffic(axis, dir, roadCoord, pos);
      const heading = headingForTraffic(axis, dir);

      built.group.position.set(startCoords.x, 0, startCoords.z);
      built.group.rotation.y = heading;

      trafficCars.push({
        mesh: built.group,
        wheels: built.wheels,
        tailMat: built.tailMat,
        radius: built.radius,
        axis,
        dir,
        roadCoord,
        pos,
        x: startCoords.x,
        y: 0,
        z: startCoords.z,
        heading,
        targetHeading: heading,
        speed: baseSpeed,
        cruiseSpeed: baseSpeed,
        lastTurnLine: 99999,
        knockVx: 0,
        knockVz: 0,
        stunTimer: 0,
      });
    }

    // =========================================================================
    // 9. CRUISING HARBOR & COASTAL BOATS (WITH WAKES & LIVE WATER REFLECTIONS)
    // =========================================================================
    const boatsGroup = new THREE.Group();
    scene.add(boatsGroup);
    const boats = [];

    const boatCabinGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfde68a,
      emissiveIntensity: 1.9,
      roughness: 0.2,
    });
    const navPortMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2.8 });
    const navStbdMat = new THREE.MeshStandardMaterial({ color: 0x22ff55, emissive: 0x22ff55, emissiveIntensity: 2.8 });
    const navSternMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.6 });
    const wakeMatBase = new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    function createBoatMesh(kind, accentHex) {
      const g = new THREE.Group();
      const hullWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.26, metalness: 0.22 });
      const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.3, metalness: 0.35 });
      const darkTrim = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.4 });
      const deckWood = new THREE.MeshStandardMaterial({ color: 0x9a6b42, roughness: 0.78 });

      let radius = 4.2;
      let sternZ = 5.5;

      if (kind === "yacht") {
        radius = 5.2;
        sternZ = 7.2;

        // Main hull + pointed bow
        const hull = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.45, 11.2), hullWhite);
        hull.position.set(0, 0.55, 0.5);
        hull.castShadow = true;
        g.add(hull);

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.28, 11.0), accentMat);
        stripe.position.set(0, 0.85, 0.5);
        g.add(stripe);

        const bow = new THREE.Mesh(new THREE.ConeGeometry(2.68, 4.4, 4), hullWhite);
        bow.rotation.x = -Math.PI / 2;
        bow.rotation.y = Math.PI / 4;
        bow.scale.set(1.0, 1.0, 0.38);
        bow.position.set(0, 0.65, -7.2);
        g.add(bow);

        const deck = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.14, 10.4), deckWood);
        deck.position.set(0, 1.32, 0.6);
        g.add(deck);

        // Two-tier illuminated cabin + flybridge
        const cabinLower = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.35, 6.2), hullWhite);
        cabinLower.position.set(0, 1.98, 0.8);
        cabinLower.castShadow = true;
        g.add(cabinLower);

        const winGlow = new THREE.Mesh(new THREE.BoxGeometry(3.02, 0.55, 4.9), boatCabinGlowMat);
        winGlow.position.set(0, 2.1, 0.6);
        g.add(winGlow);

        const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 3.6), hullWhite);
        upperDeck.position.set(0, 3.05, 1.2);
        g.add(upperDeck);

        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.0, 6), darkTrim);
        mast.position.set(0, 4.6, 0.8);
        g.add(mast);

        // Navigation beacons (Port Red, Starboard Green, Mast White)
        const portL = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6), navPortMat);
        portL.position.set(-1.75, 2.3, -1.8);
        g.add(portL);
        const stbdL = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6), navStbdMat);
        stbdL.position.set(1.75, 2.3, -1.8);
        g.add(stbdL);
        const topL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), navSternMat);
        topL.position.set(0, 6.1, 0.8);
        g.add(topL);
      } else if (kind === "speedboat") {
        radius = 3.4;
        sternZ = 4.6;

        const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 6.8), accentMat);
        hull.position.set(0, 0.35, 0.4);
        hull.castShadow = true;
        g.add(hull);

        const bow = new THREE.Mesh(new THREE.ConeGeometry(1.7, 3.2, 4), hullWhite);
        bow.rotation.x = -Math.PI / 2;
        bow.rotation.y = Math.PI / 4;
        bow.scale.set(1.0, 1.0, 0.35);
        bow.position.set(0, 0.42, -4.5);
        g.add(bow);

        const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 1.8), darkTrim);
        windshield.position.set(0, 0.98, 0.0);
        windshield.rotation.x = -0.3;
        g.add(windshield);

        const neonTrim = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.14, 6.6), neonMaterials[0]);
        neonTrim.position.set(0, 0.58, 0.4);
        g.add(neonTrim);

        const portL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), navPortMat);
        portL.position.set(-1.15, 0.85, -2.2);
        g.add(portL);
        const stbdL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), navStbdMat);
        stbdL.position.set(1.15, 0.85, -2.2);
        g.add(stbdL);
      } else if (kind === "tug") {
        radius = 4.8;
        sternZ = 5.4;

        const hull = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.7, 9.2), accentMat);
        hull.position.set(0, 0.72, 0);
        hull.castShadow = true;
        g.add(hull);

        const wheelhouse = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 3.4), hullWhite);
        wheelhouse.position.set(0, 2.6, -0.6);
        wheelhouse.castShadow = true;
        g.add(wheelhouse);

        const glass = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.72, 2.4), boatCabinGlowMat);
        glass.position.set(0, 3.05, -0.8);
        g.add(glass);

        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 2.4, 8), darkTrim);
        stack.position.set(0, 3.8, 1.7);
        g.add(stack);

        const topL = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6), neonMaterials[4]);
        topL.position.set(0, 4.8, -0.6);
        g.add(topL);
      } else {
        // Large Coastal Cargo Ship / Ocean Liner
        radius = 12.0;
        sternZ = 24.0;

        const hull = new THREE.Mesh(new THREE.BoxGeometry(10.5, 4.4, 42.0), accentMat);
        hull.position.set(0, 1.8, 0);
        hull.castShadow = true;
        g.add(hull);

        const bow = new THREE.Mesh(new THREE.ConeGeometry(7.4, 10.0, 4), accentMat);
        bow.rotation.x = -Math.PI / 2;
        bow.rotation.y = Math.PI / 4;
        bow.scale.set(1.0, 1.0, 0.42);
        bow.position.set(0, 2.1, -25.5);
        g.add(bow);

        const bridge = new THREE.Mesh(new THREE.BoxGeometry(9.2, 7.5, 7.5), hullWhite);
        bridge.position.set(0, 7.4, 14.5);
        bridge.castShadow = true;
        g.add(bridge);

        const bridgeGlow = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.6, 5.2), boatCabinGlowMat);
        bridgeGlow.position.set(0, 9.2, 13.8);
        g.add(bridgeGlow);

        // Stacked cargo containers on deck
        const cColors = [0xdc2626, 0x2563eb, 0xf59e0b, 0x059669];
        for (let r = 0; r < 3; r++) {
          const cm = new THREE.MeshStandardMaterial({ color: cColors[r % cColors.length], roughness: 0.6 });
          const stack = new THREE.Mesh(new THREE.BoxGeometry(8.2, 3.4, 8.2), cm);
          stack.position.set(0, 5.5, -10.5 + r * 9.5);
          g.add(stack);
        }

        const topBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 8), navSternMat);
        topBeacon.position.set(0, 13.5, 14.5);
        g.add(topBeacon);
      }

      // Trailing V-Wake Foam Mesh behind Stern
      const wakeLen = kind === "ship" ? 26 : 11;
      const wakeW = kind === "ship" ? 13 : 4.6;
      const wakeGeo = new THREE.PlaneGeometry(wakeW, wakeLen);
      wakeGeo.rotateX(-Math.PI / 2);
      const wakeMat = wakeMatBase.clone();
      const wake = new THREE.Mesh(wakeGeo, wakeMat);
      wake.position.set(0, 0.06, sternZ + wakeLen * 0.45);
      g.add(wake);

      boatsGroup.add(g);
      return { group: g, wake, radius };
    }

    // 9 Boats cruising smoothly inside all 9 Grand Harbor quadrants (clear of seawalls, bridges & buoys)
    const harborQuadrants = [
      { cx: -55.1, cz: -55.1, kind: "yacht", color: 0x0284c7, rx: 28, rz: 26, speed: 0.34, dir: 1 },
      { cx: -165.0, cz: -55.1, kind: "speedboat", color: 0xf43f5e, rx: 30, rz: 28, speed: 0.56, dir: -1 },
      { cx: -274.9, cz: -55.1, kind: "tug", color: 0xd97706, rx: 25, rz: 25, speed: 0.24, dir: 1 },
      { cx: -55.1, cz: -165.0, kind: "speedboat", color: 0x10b981, rx: 29, rz: 27, speed: 0.52, dir: -1 },
      { cx: -165.0, cz: -165.0, kind: "yacht", color: 0x7c3aed, rx: 31, rz: 29, speed: 0.31, dir: 1 },
      { cx: -274.9, cz: -165.0, kind: "yacht", color: 0x0ea5e9, rx: 27, rz: 27, speed: 0.36, dir: -1 },
      { cx: -55.1, cz: -274.9, kind: "tug", color: 0xdc2626, rx: 25, rz: 24, speed: 0.26, dir: 1 },
      { cx: -165.0, cz: -274.9, kind: "speedboat", color: 0xf59e0b, rx: 29, rz: 28, speed: 0.58, dir: -1 },
      { cx: -274.9, cz: -274.9, kind: "yacht", color: 0x2563eb, rx: 28, rz: 27, speed: 0.33, dir: 1 },
    ];

    harborQuadrants.forEach((q, idx) => {
      const built = createBoatMesh(q.kind, q.color);
      boats.push({
        mode: "orbit",
        mesh: built.group,
        wake: built.wake,
        radius: built.radius,
        cx: q.cx,
        cz: q.cz,
        rx: q.rx,
        rz: q.rz,
        angle: idx * 0.9,
        angSpeed: q.speed * q.dir,
        phase: idx * 1.3,
        x: q.cx + q.rx,
        z: q.cz,
        heading: 0,
      });
    });

    // 6 Coastal Ocean Ships & Cruisers patrolling parallel to the 4 outer coastlines
    const coastalRoutes = [
      { kind: "ship", color: 0x991b1b, axis: "x", fixed: -1190, min: -860, max: 860, pos: -320, dir: 1, speed: 12 },
      { kind: "ship", color: 0x1e3a8a, axis: "x", fixed: 1190, min: -860, max: 860, pos: 410, dir: -1, speed: 11 },
      { kind: "ship", color: 0x065f46, axis: "z", fixed: -1195, min: -860, max: 860, pos: 180, dir: -1, speed: 11.5 },
      { kind: "ship", color: 0x334155, axis: "z", fixed: 1195, min: -860, max: 860, pos: -450, dir: 1, speed: 12.5 },
      { kind: "yacht", color: 0x0284c7, axis: "z", fixed: -1155, min: -820, max: 820, pos: -220, dir: 1, speed: 18 },
      { kind: "speedboat", color: 0xf97316, axis: "x", fixed: -1155, min: -820, max: 820, pos: 260, dir: -1, speed: 24 },
    ];

    coastalRoutes.forEach((r, idx) => {
      const built = createBoatMesh(r.kind, r.color);
      boats.push({
        mode: "patrol",
        mesh: built.group,
        wake: built.wake,
        radius: built.radius,
        axis: r.axis,
        fixed: r.fixed,
        min: r.min,
        max: r.max,
        pos: r.pos,
        dir: r.dir,
        speed: r.speed,
        phase: idx * 1.7 + 4.0,
        x: r.axis === "x" ? r.pos : r.fixed,
        z: r.axis === "z" ? r.pos : r.fixed,
        heading: 0,
      });
    });

    // Update AI Traffic Cars & Harbor/Coastal Boats each frame
    function updateTrafficAndBoats(dt, elapsed, playerCar, waveStrength, enabled) {
      trafficGroup.visible = enabled;
      boatsGroup.visible = enabled;
      if (!enabled) return;

      // --- Update AI Traffic Cars ---
      for (let i = 0; i < trafficCars.length; i++) {
        const ai = trafficCars[i];

        // Handle post-collision recovery
        if (ai.stunTimer > 0) {
          ai.stunTimer -= dt;
          ai.x += ai.knockVx * dt;
          ai.z += ai.knockVz * dt;
          ai.knockVx *= Math.exp(-3.5 * dt);
          ai.knockVz *= Math.exp(-3.5 * dt);
          ai.mesh.position.set(ai.x, sampleRampHeight(ai.x, ai.z), ai.z);
          if (ai.stunTimer <= 0) {
            ai.pos = ai.axis === "z" ? ai.z : ai.x;
            ai.speed = 2;
          }
          continue;
        }

        const fx = -Math.sin(ai.targetHeading);
        const fz = -Math.cos(ai.targetHeading);
        let blocked = false;

        // Yield if Player Car is directly ahead
        const pdx = playerCar.x - ai.x;
        const pdz = playerCar.z - ai.z;
        const pFwd = pdx * fx + pdz * fz;
        if (pFwd > 0 && pFwd < 22) {
          const pLat = Math.abs(pdx * fz - pdz * fx);
          if (pLat < 3.6) blocked = true;
        }

        // Yield to other AI cars ahead in same lane
        if (!blocked) {
          for (let j = 0; j < trafficCars.length; j++) {
            if (i === j) continue;
            const o = trafficCars[j];
            const odx = o.x - ai.x;
            const odz = o.z - ai.z;
            if (Math.abs(odx) > 20 || Math.abs(odz) > 20) continue;
            const oFwd = odx * fx + odz * fz;
            if (oFwd > 0 && oFwd < 15.5) {
              const oLat = Math.abs(odx * fz - odz * fx);
              if (oLat < 3.0) {
                blocked = true;
                break;
              }
            }
          }
        }

        const desiredSpeed = blocked ? 0 : ai.cruiseSpeed;
        ai.speed = THREE.MathUtils.lerp(ai.speed, desiredSpeed, (blocked ? 9.5 : 3.2) * dt);
        ai.tailMat.emissiveIntensity = blocked ? 3.2 : 0.65;

        const step = ai.speed * dt;
        const prevPos = ai.pos;
        ai.pos += ai.dir * step;

        // Check for clean 90-degree intersection turn or perimeter turn-back
        const nearestLine = Math.round(ai.pos / GRID_SPACING) * GRID_SPACING;
        if (
          nearestLine >= -990 &&
          nearestLine <= 990 &&
          nearestLine !== ai.lastTurnLine &&
          Math.abs(ai.pos - nearestLine) < 4.5
        ) {
          const atEdge = (ai.dir > 0 && nearestLine >= 990) || (ai.dir < 0 && nearestLine <= -990);
          if (atEdge || rand() < 0.28) {
            ai.lastTurnLine = nearestLine;
            const newAxis = ai.axis === "z" ? "x" : "z";
            const options = [];
            if (ai.roadCoord > -990) options.push(-1);
            if (ai.roadCoord < 990) options.push(1);
            const newDir = options[Math.floor(rand() * options.length)] || -ai.dir;
            const oldRoadCoord = ai.roadCoord;

            ai.axis = newAxis;
            ai.dir = newDir;
            ai.roadCoord = nearestLine;
            ai.pos = oldRoadCoord;
            ai.targetHeading = headingForTraffic(ai.axis, ai.dir);
          } else {
            ai.lastTurnLine = nearestLine;
          }
        } else if (Math.abs(ai.pos) > 996 && Math.abs(prevPos) <= 996) {
          ai.dir *= -1;
          ai.targetHeading = headingForTraffic(ai.axis, ai.dir);
        }

        const targetC = coordsForTraffic(ai.axis, ai.dir, ai.roadCoord, ai.pos);
        ai.x = THREE.MathUtils.lerp(ai.x, targetC.x, Math.min(1, 14 * dt));
        ai.z = THREE.MathUtils.lerp(ai.z, targetC.z, Math.min(1, 14 * dt));
        ai.y = sampleRampHeight(ai.x, ai.z);
        ai.heading = lerpAngle(ai.heading, ai.targetHeading, Math.min(1, 10 * dt));

        ai.mesh.position.set(ai.x, ai.y, ai.z);
        ai.mesh.rotation.y = ai.heading;

        // Spin AI wheels
        const wheelSpin = (ai.speed * dt) / 0.38;
        for (let w = 0; w < ai.wheels.length; w++) {
          ai.wheels[w].rotation.x -= wheelSpin;
        }
      }

      // --- Update Grand Harbor & Coastal Ocean Boats ---
      for (let i = 0; i < boats.length; i++) {
        const b = boats[i];
        let vx = 0;
        let vz = 0;

        if (b.mode === "orbit") {
          b.angle += b.angSpeed * dt;
          const nx = b.cx + Math.cos(b.angle) * b.rx;
          const nz = b.cz + Math.sin(b.angle) * b.rz;
          vx = -Math.sin(b.angle) * b.rx * b.angSpeed;
          vz = Math.cos(b.angle) * b.rz * b.angSpeed;
          b.x = nx;
          b.z = nz;
        } else {
          b.pos += b.dir * b.speed * dt;
          if (b.pos > b.max) {
            b.pos = b.max;
            b.dir = -1;
          } else if (b.pos < b.min) {
            b.pos = b.min;
            b.dir = 1;
          }
          if (b.axis === "x") {
            b.x = b.pos;
            b.z = b.fixed;
            vx = b.dir * b.speed;
          } else {
            b.x = b.fixed;
            b.z = b.pos;
            vz = b.dir * b.speed;
          }
        }

        const desiredHeading = Math.atan2(-vx, -vz);
        b.heading = lerpAngle(b.heading, desiredHeading, Math.min(1, 5 * dt));

        // Match water vertex shader swell for realistic floating motion
        const swell = Math.sin(b.x * 0.075 + elapsed * 1.6) * Math.cos(b.z * 0.068 - elapsed * 1.3);
        const bobY = -0.22 + swell * 0.1 * (0.5 + waveStrength);
        const pitch = Math.cos(elapsed * 2.0 + b.phase) * 0.028 * (0.5 + waveStrength);
        const roll = Math.sin(elapsed * 1.6 + b.phase) * 0.042 * (0.5 + waveStrength);

        b.mesh.position.set(b.x, bobY, b.z);
        b.mesh.rotation.set(pitch, b.heading, roll);

        // Animated trailing foam wake
        b.wake.scale.x = 0.92 + Math.sin(elapsed * 5.0 + b.phase) * 0.1;
        b.wake.material.opacity = 0.28 + Math.sin(elapsed * 4.0 + b.phase) * 0.08;
      }
    }

    function setTrafficLighting(headlightsOn, rtOn) {
      aiHeadlightMat.emissiveIntensity = headlightsOn ? 3.2 : 0.45;
      aiHeadBeams.forEach((b) => (b.visible = headlightsOn && rtOn));
      boatCabinGlowMat.emissiveIntensity = headlightsOn ? 2.4 : 0.35;
    }

    // =========================================================================
    // 10. SPATIAL HASH GRID FOR FAST O(1) BUILDING COLLISIONS
    // =========================================================================
    const CELL_SIZE = 110;
    const spatialGrid = new Map();

    buildings.forEach((b) => {
      const minCX = Math.floor(b.minX / CELL_SIZE);
      const maxCX = Math.floor(b.maxX / CELL_SIZE);
      const minCZ = Math.floor(b.minZ / CELL_SIZE);
      const maxCZ = Math.floor(b.maxZ / CELL_SIZE);
      for (let gx = minCX; gx <= maxCX; gx++) {
        for (let gz = minCZ; gz <= maxCZ; gz++) {
          const key = `${gx},${gz}`;
          if (!spatialGrid.has(key)) spatialGrid.set(key, []);
          spatialGrid.get(key).push(b);
        }
      }
    });

    function getNearbyBuildings(x, z) {
      const gx = Math.floor(x / CELL_SIZE);
      const gz = Math.floor(z / CELL_SIZE);
      const out = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = spatialGrid.get(`${gx + dx},${gz + dz}`);
          if (list) {
            for (let i = 0; i < list.length; i++) out.push(list[i]);
          }
        }
      }
      return out;
    }

    // =========================================================================
    // 11. 3D WEATHER SYSTEM (RAIN & LIGHTNING)
    // =========================================================================
    const MAX_RAIN = 1900;
    const RAIN_BOX_XZ = 100;
    const RAIN_BOX_Y = 46;
    const rainPositions = new Float32Array(MAX_RAIN * 6);
    const rainDrops = [];

    for (let i = 0; i < MAX_RAIN; i++) {
      rainDrops.push({
        x: (Math.random() - 0.5) * RAIN_BOX_XZ,
        y: Math.random() * RAIN_BOX_Y,
        z: (Math.random() - 0.5) * RAIN_BOX_XZ,
        len: 1.1 + Math.random() * 0.9,
        spd: 0.85 + Math.random() * 0.3,
      });
    }

    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const rainLines = new THREE.LineSegments(rainGeo, rainMat);
    rainLines.frustumCulled = false;
    scene.add(rainLines);

    const lightningLight = new THREE.DirectionalLight(0xcbe8ff, 0.0);
    lightningLight.position.set(140, 260, -140);
    scene.add(lightningLight);

    const boltGeo = new THREE.BufferGeometry();
    boltGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(36), 3));
    const boltMat = new THREE.LineBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.0,
      fog: false,
    });
    const lightningBolt = new THREE.Line(boltGeo, boltMat);
    lightningBolt.frustumCulled = false;
    scene.add(lightningBolt);

    let lightningFlash = 0;
    let nextLightningTimer = 3.5;

    function updateWeather(dt, weatherPreset, cameraPos, car, onThunder) {
      if (weatherPreset.rainCount > 0) {
        rainLines.visible = true;
        rainGeo.setDrawRange(0, weatherPreset.rainCount * 2);

        const cx = cameraPos.x;
        const cz = cameraPos.z;
        const halfXZ = RAIN_BOX_XZ / 2;
        const posAttr = rainGeo.attributes.position;

        for (let i = 0; i < weatherPreset.rainCount; i++) {
          const d = rainDrops[i];
          d.y -= weatherPreset.rainSpeed * d.spd * dt;
          d.x += weatherPreset.rainTiltX * dt;

          if (d.y < -1) d.y += RAIN_BOX_Y;
          if (d.x - cx > halfXZ) d.x -= RAIN_BOX_XZ;
          else if (d.x - cx < -halfXZ) d.x += RAIN_BOX_XZ;
          if (d.z - cz > halfXZ) d.z -= RAIN_BOX_XZ;
          else if (d.z - cz < -halfXZ) d.z += RAIN_BOX_XZ;

          const dx = weatherPreset.rainTiltX * 0.045 * d.len;
          const idx = i * 6;
          rainPositions[idx] = d.x;
          rainPositions[idx + 1] = d.y;
          rainPositions[idx + 2] = d.z;
          rainPositions[idx + 3] = d.x - dx;
          rainPositions[idx + 4] = d.y + d.len;
          rainPositions[idx + 5] = d.z;
        }
        posAttr.needsUpdate = true;
      } else {
        rainLines.visible = false;
      }

      if (weatherPreset.lightning) {
        nextLightningTimer -= dt;
        if (nextLightningTimer <= 0) {
          lightningFlash = 1.0;
          const angle = car.heading + (Math.random() - 0.5) * 1.4;
          const dist = 180 + Math.random() * 220;
          let bx = car.x - Math.sin(angle) * dist;
          let bz = car.z - Math.cos(angle) * dist;

          const attr = lightningBolt.geometry.attributes.position;
          for (let i = 0; i < 12; i++) {
            const y = 190 * (1 - i / 11);
            if (i > 0) {
              bx += (Math.random() - 0.5) * 18;
              bz += (Math.random() - 0.5) * 18;
            }
            attr.setXYZ(i, bx, y, bz);
          }
          attr.needsUpdate = true;
          boltMat.opacity = 1.0;
          setTimeout(onThunder, 260 + Math.random() * 880);
          nextLightningTimer = 4.2 + Math.random() * 7.2;
        }
      }

      if (lightningFlash > 0.005) {
        lightningFlash *= Math.exp(-9.5 * dt);
        skyUniforms.uFlash.value = lightningFlash * 0.85;
        lightningLight.intensity = lightningFlash * 4.5;
        boltMat.opacity = Math.max(0, lightningFlash * 1.15);
      } else {
        skyUniforms.uFlash.value = 0;
        lightningLight.intensity = 0;
        boltMat.opacity = 0;
      }
    }

    function isOnRoad(x, z) {
      if (Math.abs(x) > ISLAND_HALF || Math.abs(z) > ISLAND_HALF) return false;
      const halfW = ROAD_WIDTH / 2 + 0.8;
      for (let i = 0; i < ROAD_LINES.length; i++) {
        if (Math.abs(x - ROAD_LINES[i]) <= halfW || Math.abs(z - ROAD_LINES[i]) <= halfW) {
          return true;
        }
      }
      return false;
    }

    function isOverWater(x, z) {
      if (Math.abs(x) > ISLAND_HALF || Math.abs(z) > ISLAND_HALF) return true;
      if (x > HARBOR.minX && x < HARBOR.maxX && z > HARBOR.minZ && z < HARBOR.maxZ) {
        const onCauseway =
          Math.abs(x + 110) < ROAD_WIDTH / 2 + 1.2 ||
          Math.abs(x + 220) < ROAD_WIDTH / 2 + 1.2 ||
          Math.abs(z + 110) < ROAD_WIDTH / 2 + 1.2 ||
          Math.abs(z + 220) < ROAD_WIDTH / 2 + 1.2;
        return !onCauseway;
      }
      return false;
    }

    const allRoadMats = [roadMatStrip, roadMatInter];
    function setRoadUniform(name, val) {
      allRoadMats.forEach((m) => {
        if (m.uniforms[name].value && typeof m.uniforms[name].value.copy === "function") {
          m.uniforms[name].value.copy(val);
        } else {
          m.uniforms[name].value = val;
        }
      });
    }

    function setWaterUniform(name, val) {
      if (!waterMat.uniforms[name]) return;
      if (waterMat.uniforms[name].value && typeof waterMat.uniforms[name].value.copy === "function") {
        waterMat.uniforms[name].value.copy(val);
      } else {
        waterMat.uniforms[name].value = val;
      }
    }

    return {
      skyDome,
      skyUniforms,
      ground,
      waterGroup,
      roadGroup,
      roadShadowGroup,
      trafficGroup,
      boatsGroup,
      rainLines,
      buildings,
      ramps,
      trafficCars,
      boats,
      buildingMaterials,
      neonMaterials,
      bulbMat,
      getNearbyBuildings,
      isOnRoad,
      isOverWater,
      setRoadUniform,
      setWaterUniform,
      setTrafficLighting,
      updateTrafficAndBoats,
      updateWeather,
    };
  }

  return {
    CONFIG,
    TIME_PRESETS,
    WEATHER_PRESETS,
    FLOOR_MODES,
    samplePuddleAt,
    buildWorld,
  };
})();