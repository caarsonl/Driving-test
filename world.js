window.HorizonWorld = (() => {
  "use strict";

  // =========================================================================
  // 1. MULTI-CITY CONFIGURATION, PRESETS & FAST TRAVEL POINTS
  // =========================================================================
  const CONFIG = {
    WORLD_BOUNDS: { minX: -620, maxX: 1860, minZ: -1620, maxZ: 580 },
    ROAD_WIDTH: 16,
    HIGHWAY_WIDTH: 22,

    ISLANDS: [
      { id: "metro", name: "METRO BAY CITY", minX: -420, maxX: 320, minZ: -340, maxZ: 380 },
      {
        id: "palm",
        name: "PALM ISLAND MARINA",
        minX: 960,
        maxX: 1660,
        minZ: -380,
        maxZ: 360,
        hole: { minX: 1340, maxX: 1600, minZ: 60, maxZ: 290 },
      },
      { id: "pinecrest", name: "PINECREST ALPINE", minX: -420, maxX: 460, minZ: -1440, maxZ: -880 },
    ],

    BRIDGE: { startX: 320, endX: 960, z: 0, halfW: 11.0, peakH: 24.0 },
    TUNNEL: { x: 0, startZ: -340, endZ: -880, halfW: 11.0, height: 11.6 },
    VIADUCT: {
      eastStartX: 460,
      eastRampEndX: 580,
      curveCX: 1140,
      curveCZ: -1000,
      curveR: 140,
      southRampStartZ: -500,
      southEndZ: -380,
      deckH: 12.0,
      halfW: 11.0,
    },
  };

  const WARP_POINTS = [
    { name: "METRO BAY", x: 0, y: 0.2, z: 45, heading: 0 },
    { name: "SUSPENSION BRIDGE", x: 270, y: 0.2, z: 0, heading: -Math.PI / 2 },
    { name: "PALM ISLAND", x: 1030, y: 0.2, z: 0, heading: -Math.PI / 2 },
    { name: "ALPINE TUNNEL", x: 0, y: 0.2, z: -295, heading: 0 },
    { name: "PINECREST", x: 0, y: 0.2, z: -960, heading: 0 },
    { name: "COASTAL VIADUCT", x: 640, y: 12.2, z: -1140, heading: -Math.PI / 2 },
  ];

  const TIME_PRESETS = [
    {
      name: "SUNSET",
      skyTop: 0x16224a,
      skyHorizon: 0xf47b47,
      skyBottom: 0x3b1d2e,
      fog: 0xb65549,
      fogDensity: 0.00068,
      sunColor: 0xffa85c,
      sunIntensity: 1.55,
      sunPos: [-360, 102, -280],
      hemiSky: 0xfdba74,
      hemiGround: 0x1e293b,
      hemiIntensity: 0.7,
      ambientRoad: 0x543e49,
      waterDeep: 0x09223c,
      waterShallow: 0x1b5469,
      windowGlow: 0.92,
      neonGlow: 2.35,
      headlights: true,
      nightMix: 0.18,
      dryRate: 0.042,
      exposure: 1.14,
    },
    {
      name: "NIGHT",
      skyTop: 0x020510,
      skyHorizon: 0x0d1b38,
      skyBottom: 0x040710,
      fog: 0x071024,
      fogDensity: 0.00105,
      sunColor: 0x7cb8ff,
      sunIntensity: 0.46,
      sunPos: [160, 310, -240],
      hemiSky: 0x22416b,
      hemiGround: 0x050811,
      hemiIntensity: 0.52,
      ambientRoad: 0x1e2e4d,
      waterDeep: 0x030c1c,
      waterShallow: 0x0b2542,
      windowGlow: 1.55,
      neonGlow: 3.1,
      headlights: true,
      nightMix: 1.0,
      dryRate: 0.022,
      exposure: 1.2,
    },
    {
      name: "DAY",
      skyTop: 0x1e56d9,
      skyHorizon: 0x99dafc,
      skyBottom: 0x60a5fa,
      fog: 0x9cd4f7,
      fogDensity: 0.00052,
      sunColor: 0xfff7e8,
      sunIntensity: 1.62,
      sunPos: [280, 380, 220],
      hemiSky: 0xdbeafe,
      hemiGround: 0x3f6212,
      hemiIntensity: 0.82,
      ambientRoad: 0x6b7482,
      waterDeep: 0x063f66,
      waterShallow: 0x1288ab,
      windowGlow: 0.08,
      neonGlow: 0.45,
      headlights: false,
      nightMix: 0.0,
      dryRate: 0.068,
      exposure: 1.08,
    },
  ];

  const WEATHER_PRESETS = [
    {
      name: "CLEAR",
      rainCount: 0,
      splashCount: 0,
      rainSpeed: 0,
      rainTiltX: 0,
      rainIntensity: 0.0,
      cloudCover: 0.3,
      wetRate: 0.0,
      targetMoisture: 0.0,
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
      rainCount: 1350,
      splashCount: 120,
      rainSpeed: 46,
      rainTiltX: 3.8,
      rainIntensity: 0.75,
      cloudCover: 0.82,
      wetRate: 0.08,
      targetMoisture: 0.82,
      waveStrength: 0.78,
      fogMult: 1.45,
      skyDarken: 0.68,
      sunMult: 0.58,
      forceHeadlights: true,
      lightning: false,
      rainAudio: 0.14,
    },
    {
      name: "STORM",
      rainCount: 2000,
      splashCount: 200,
      rainSpeed: 66,
      rainTiltX: 12.0,
      rainIntensity: 1.0,
      cloudCover: 0.96,
      wetRate: 0.14,
      targetMoisture: 1.0,
      waveStrength: 1.4,
      fogMult: 1.9,
      skyDarken: 0.46,
      sunMult: 0.34,
      forceHeadlights: true,
      lightning: true,
      rainAudio: 0.26,
    },
    {
      name: "FOG",
      rainCount: 0,
      splashCount: 0,
      rainSpeed: 0,
      rainTiltX: 0,
      rainIntensity: 0.0,
      cloudCover: 0.7,
      wetRate: 0.014,
      targetMoisture: 0.22,
      waveStrength: 0.25,
      fogMult: 3.3,
      skyDarken: 0.78,
      sunMult: 0.45,
      forceHeadlights: true,
      lightning: false,
      rainAudio: 0.0,
    },
  ];

  // =========================================================================
  // 2. SHARED NOISE, PUDDLE & ELEVATION MATH (MATCHED BETWEEN JS & GLSL)
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

  function smoothstep(e0, e1, x) {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }

  function lerpAngle(a, b, t) {
    let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  function isPointInTunnel(x, z) {
    const T = CONFIG.TUNNEL;
    return Math.abs(x - T.x) <= T.halfW + 1.8 && z <= T.startZ && z >= T.endZ;
  }

  function samplePuddleAt(x, z, moisture) {
    if (moisture <= 0.22 || isPointInTunnel(x, z)) return 0.0;
    const p1 = noise2DJS(x * 0.026, z * 0.026);
    const p2 = noise2DJS(x * 0.085, z * 0.085);
    const n = p1 * 0.68 + p2 * 0.32;
    const thresh = 0.86 - moisture * 0.34;
    return smoothstep(thresh - 0.06, thresh + 0.07, n) * smoothstep(0.22, 0.72, moisture);
  }

  function evalBridge(x) {
    const B = CONFIG.BRIDGE;
    const span = B.endX - B.startX;
    const t = THREE.MathUtils.clamp((x - B.startX) / span, 0, 1);
    const s = Math.sin(Math.PI * t);
    const h = B.peakH * Math.pow(Math.max(0, s), 1.6);
    const dhdx =
      s > 0.0001
        ? ((B.peakH * 1.6 * Math.PI) / span) * Math.pow(s, 0.6) * Math.cos(Math.PI * t)
        : 0;
    return { h, dhdx };
  }

  function evalEastViaduct(x) {
    const V = CONFIG.VIADUCT;
    if (x <= V.eastStartX) return { h: 0, dhdx: 0 };
    if (x >= V.eastRampEndX) return { h: V.deckH, dhdx: 0 };
    const span = V.eastRampEndX - V.eastStartX;
    const t = (x - V.eastStartX) / span;
    const h = V.deckH * (3 * t * t - 2 * t * t * t);
    const dhdx = (V.deckH * (6 * t - 6 * t * t)) / span;
    return { h, dhdx };
  }

  function evalSouthViaduct(z) {
    const V = CONFIG.VIADUCT;
    if (z >= V.southEndZ) return { h: 0, dhdz: 0 };
    if (z <= V.southRampStartZ) return { h: V.deckH, dhdz: 0 };
    const span = V.southEndZ - V.southRampStartZ;
    const t = (V.southEndZ - z) / span;
    const h = V.deckH * (3 * t * t - 2 * t * t * t);
    const dhdz = -(V.deckH * (6 * t - 6 * t * t)) / span;
    return { h, dhdz };
  }

  // =========================================================================
  // 3. SOFT VOLUMETRIC HEADLIGHT BEAM SHADER
  // =========================================================================
  function createSoftBeamMaterial(colorHex = 0xfff5d6, opacity = 0.16) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(colorHex) },
        uOpacity: { value: opacity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormalV = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        void main() {
          float edgeSoft = pow(clamp(abs(dot(normalize(vNormalV), normalize(vViewDir))), 0.0, 1.0), 2.5);
          float lengthFade = smoothstep(0.0, 0.72, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
          float alpha = edgeSoft * lengthFade * uOpacity;
          gl_FragColor = vec4(uColor * alpha, alpha);
        }
      `,
    });
  }

  // =========================================================================
  // 4. PROCEDURAL TEXTURES (TERRAIN, CITY ROAD, 4-LANE HIGHWAY/BRIDGE, FACADES)
  // =========================================================================
  function createGrassTexture(tintHex, grainDelta) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = tintHex;
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 4800; i++) {
      const s = 30 + Math.floor(Math.random() * 44);
      ctx.fillStyle = `rgb(${s + grainDelta[0]}, ${s + grainDelta[1]}, ${s + grainDelta[2]})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(0.065, 0.065);
    return tex;
  }

  function createRoadTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#353b45";
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 4600; i++) {
      const v = 36 + Math.floor(Math.random() * 46);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    ctx.fillStyle = "rgba(18, 22, 28, 0.26)";
    ctx.fillRect(42, 0, 34, 256);
    ctx.fillRect(180, 0, 34, 256);

    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(11, 0, 5, 256);
    ctx.fillRect(240, 0, 5, 256);

    ctx.fillStyle = "#facc15";
    ctx.fillRect(124, 20, 8, 92);
    ctx.fillRect(124, 148, 8, 92);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  function createHighwayTexture(isBridge = false) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");

    ctx.fillStyle = isBridge ? "#2e3540" : "#2b313b";
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 8200; i++) {
      const v = 30 + Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgb(${v},${v + 3},${v + 7})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 3);
    }

    ctx.fillStyle = "rgba(148, 163, 184, 0.08)";
    ctx.fillRect(0, 0, 36, 512);
    ctx.fillRect(476, 0, 36, 512);

    ctx.fillStyle = "rgba(10, 14, 20, 0.24)";
    [76, 178, 304, 406].forEach((lx) => ctx.fillRect(lx, 0, 30, 512));

    if (isBridge) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.68)";
      ctx.fillRect(0, 0, 512, 7);
      ctx.fillStyle = "rgba(148, 163, 184, 0.24)";
      ctx.fillRect(0, 7, 512, 3);

      ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
      for (let y = 16; y < 512; y += 20) {
        ctx.fillRect(14, y, 16, 6);
        ctx.fillRect(482, y, 16, 6);
      }
    }

    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(36, 0, 7, 512);
    ctx.fillRect(469, 0, 7, 512);

    ctx.fillStyle = "#facc15";
    ctx.fillRect(246, 0, 7, 512);
    ctx.fillRect(259, 0, 7, 512);

    ctx.fillStyle = "#e2e8f0";
    for (let y = 26; y < 512; y += 128) {
      ctx.fillRect(141, y, 6, 68);
      ctx.fillRect(365, y, 6, 68);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  function createGantrySignTexture(title, subtitle, arrow = "↑") {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 160;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#065f46";
    ctx.fillRect(0, 0, 512, 160);

    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 140);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 38px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, 256, 68);

    ctx.fillStyle = "#fde047";
    ctx.font = "bold 26px Segoe UI, sans-serif";
    ctx.fillText(`${arrow}  ${subtitle}  ${arrow}`, 256, 120);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function createFacadeTexture(style) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext("2d");

    if (style === "glass") {
      ctx.fillStyle = "#16263a";
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
      ctx.fillStyle = "#524f49";
      ctx.fillRect(0, 0, 256, 512);
      for (let col = 0; col < 6; col++) {
        ctx.fillStyle = "#6c685f";
        ctx.fillRect(col * 42.6, 0, 8, 512);
        for (let r = 0; r < 16; r++) {
          const lit = Math.random() > 0.35;
          ctx.fillStyle = lit ? "#fde68a" : "#181a20";
          ctx.fillRect(col * 42.6 + 11, r * 32 + 6, 28, 20);
        }
      }
    } else if (style === "resort") {
      ctx.fillStyle = "#d6d3d1";
      ctx.fillRect(0, 0, 256, 512);
      for (let r = 0; r < 14; r++) {
        const y = r * 36.5;
        ctx.fillStyle = "#f5f5f4";
        ctx.fillRect(0, y + 26, 256, 9);
        for (let col = 0; col < 4; col++) {
          const lit = Math.random() > 0.36;
          ctx.fillStyle = lit ? "#fef3c7" : "#0e7490";
          ctx.fillRect(col * 64 + 8, y + 4, 48, 21);
        }
      }
    } else if (style === "alpine") {
      ctx.fillStyle = "#6b4a35";
      ctx.fillRect(0, 0, 256, 512);
      ctx.fillStyle = "#57534e";
      ctx.fillRect(0, 380, 256, 132);
      for (let r = 0; r < 8; r++) {
        for (let col = 0; col < 4; col++) {
          const lit = Math.random() > 0.28;
          ctx.fillStyle = lit ? "#fed7aa" : "#1c1917";
          ctx.fillRect(col * 64 + 14, r * 58 + 14, 36, 28);
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
  // 5. UPGRADED RT GLOSSY-BLUR PAVEMENT SHADER + CONTACT AO + SPARK LIGHTS
  // =========================================================================
  function createRealisticRoadMaterial(roadTex, reflTexture, resolution, isIntersection) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uRoadMap: { value: roadTex },
        uReflMap: { value: reflTexture },
        uResolution: { value: resolution.clone() },
        uIsIntersection: { value: isIntersection ? 1.0 : 0.0 },
        uTime: { value: 0.0 },
        uRTEnabled: { value: 1.0 },
        uRoadMoisture: { value: 0.0 },
        uRainIntensity: { value: 0.0 },
        uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.5).normalize() },
        uSunColor: { value: new THREE.Color(0xffa45b) },
        uAmbientColor: { value: new THREE.Color(0x523c46) },
        uFogColor: { value: new THREE.Color(0xb85247) },
        uFogDensity: { value: 0.00068 },
        uCarPos: { value: new THREE.Vector3(0, 0, 45) },
        uCarForward: { value: new THREE.Vector3(0, 0, -1) },
        uCarHalfW: { value: 1.15 },
        uCarHalfL: { value: 2.35 },
        uHeadlightsOn: { value: 1.0 },
        uBrakeIntensity: { value: 0.45 },
        uNitroActive: { value: 0.0 },
        uSparkPos: { value: new THREE.Vector3(0, -100, 0) },
        uSparkIntensity: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        void main() {
          vUv = uv;
          vec4 localPos = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            localPos = instanceMatrix * localPos;
          #endif
          vec4 wp = modelMatrix * localPos;
          vWorldPos = wp.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform sampler2D uRoadMap;
        uniform sampler2D uReflMap;
        uniform vec2 uResolution;
        uniform float uIsIntersection;
        uniform float uTime;
        uniform float uRTEnabled;
        uniform float uRoadMoisture;
        uniform float uRainIntensity;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uAmbientColor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uCarPos;
        uniform vec3 uCarForward;
        uniform float uCarHalfW;
        uniform float uCarHalfL;
        uniform float uHeadlightsOn;
        uniform float uBrakeIntensity;
        uniform float uNitroActive;
        uniform vec3 uSparkPos;
        uniform float uSparkIntensity;

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;

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

        vec3 rainImpactLayer(vec2 pos, float t, float speed) {
          vec2 cell = floor(pos);
          vec2 local = fract(pos) - 0.5;
          float rnd = hash21(cell);
          float phase = fract(t * speed + rnd * 13.71);
          vec2 center = (vec2(hash21(cell + 7.1), hash21(cell + 19.3)) - 0.5) * 0.44;
          vec2 diff = local - center;
          float dist = length(diff);

          float radius = phase * 0.42;
          float ringEdge = exp(-pow((dist - radius) * 26.0, 2.0)) * (1.0 - phase);
          float splashDot = exp(-dist * 28.0) * smoothstep(0.28, 0.0, phase);
          float wave = sin((dist - radius) * 44.0) * exp(-dist * 10.0) * (1.0 - phase);

          vec2 dir = normalize(diff + vec2(0.0001));
          return vec3(dir * wave, clamp(ringEdge * 0.9 + splashDot * 1.15, 0.0, 1.4));
        }

        // Roughness-aware 5-tap RT Glossy Reflection Sampler
        vec3 sampleGlossyRT(vec2 uv, float blurRadius) {
          vec3 c = texture2D(uReflMap, uv).rgb * 0.36;
          vec2 o1 = vec2(blurRadius, blurRadius * 0.55);
          vec2 o2 = vec2(-blurRadius, blurRadius * 0.55);
          vec2 o3 = vec2(blurRadius * 0.55, -blurRadius);
          vec2 o4 = vec2(-blurRadius * 0.55, -blurRadius);
          c += texture2D(uReflMap, clamp(uv + o1, vec2(0.002), vec2(0.998))).rgb * 0.16;
          c += texture2D(uReflMap, clamp(uv + o2, vec2(0.002), vec2(0.998))).rgb * 0.16;
          c += texture2D(uReflMap, clamp(uv + o3, vec2(0.002), vec2(0.998))).rgb * 0.16;
          c += texture2D(uReflMap, clamp(uv + o4, vec2(0.002), vec2(0.998))).rgb * 0.16;
          return c;
        }

        void main() {
          vec3 rawAlbedo = uIsIntersection > 0.5
            ? vec3(0.21, 0.23, 0.27)
            : texture2D(uRoadMap, vUv).rgb;

          float inTunnel = step(-880.0, vWorldPos.z) * step(vWorldPos.z, -340.0) * step(abs(vWorldPos.x), 13.5);
          float localMoisture = uRoadMoisture * (1.0 - inTunnel);
          float activeRain = uRainIntensity * (1.0 - inTunnel);

          float macroWear = noise2D(vWorldPos.xz * 0.09);
          float fineGrain = noise2D(vWorldPos.xz * 4.2);
          float microX = noise2D(vWorldPos.xz * 2.6) - 0.5;
          float microZ = noise2D(vWorldPos.xz * 2.6 + 19.7) - 0.5;

          float p1 = noise2D(vWorldPos.xz * 0.026);
          float p2 = noise2D(vWorldPos.xz * 0.085);
          float pNoise = p1 * 0.68 + p2 * 0.32;
          float thresh = 0.86 - localMoisture * 0.34;
          float puddle = smoothstep(thresh - 0.06, thresh + 0.07, pNoise) * smoothstep(0.22, 0.72, localMoisture);
          float drainFactor = 1.0 - smoothstep(2.0, 12.0, vWorldPos.y) * 0.45;
          puddle *= drainFactor;

          vec2 ripGrad = vec2(0.0);
          float impactRing = 0.0;
          if (activeRain > 0.03) {
            vec3 r1 = rainImpactLayer(vWorldPos.xz * 0.72, uTime, 1.55);
            vec3 r2 = rainImpactLayer(vWorldPos.xz * 1.38 + 11.4, uTime + 0.37, 2.15);
            ripGrad = (r1.xy * 0.65 + r2.xy * 0.45) * activeRain * (0.28 + puddle * 0.72);
            float camDist = length(cameraPosition - vWorldPos);
            float distMask = smoothstep(130.0, 18.0, camDist);
            impactRing = (r1.z * 0.62 + r2.z * 0.55) * activeRain * distMask * (0.35 + localMoisture * 0.45 + puddle * 0.55);
          }

          float roughAmt = mix(0.28, 0.13, localMoisture);
          roughAmt = mix(roughAmt, 0.012, puddle);
          vec3 N = normalize(normalize(vWorldNormal) + vec3(microX * roughAmt + ripGrad.x * 0.22, 0.0, microZ * roughAmt + ripGrad.y * 0.22));

          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 L = normalize(uSunDir);

          float isMarking = smoothstep(0.48, 0.65, max(rawAlbedo.r, rawAlbedo.g));
          vec3 dryTex = rawAlbedo * (0.88 + fineGrain * 0.16 + (macroWear - 0.5) * 0.09);
          float darkenAmt = mix(localMoisture * 0.44 + puddle * 0.24, localMoisture * 0.14, isMarking);
          vec3 albedo = dryTex * (1.0 - clamp(darkenAmt, 0.0, 0.56));

          float NdotL = max(dot(N, L), 0.0) * (1.0 - inTunnel);
          vec3 H = normalize(L + V);
          float specPow = mix(mix(14.0, 62.0, localMoisture), 280.0, puddle);
          float specStr = mix(mix(0.06, 0.34, localMoisture), 1.35, puddle) * (1.0 - inTunnel);
          float spec = pow(max(dot(N, H), 0.0), specPow) * specStr;

          // Subtle micro-aggregate asphalt sparkle under grazing sun/headlights
          float sparkleHash = hash21(floor(vWorldPos.xz * 7.5));
          float asphaltGlint = smoothstep(0.955, 0.995, sparkleHash) * pow(max(dot(N, H), 0.0), 18.0) * (1.0 - puddle) * 0.45;

          vec3 lampGlow = vec3(0.0);
          if (inTunnel > 0.5) {
            float lampCycle = 0.5 + 0.5 * cos((vWorldPos.z + 340.0) * (6.28318 / 28.0));
            lampGlow = vec3(0.48, 0.38, 0.26) * (0.58 + 0.42 * pow(lampCycle, 2.0));
          } else if (uHeadlightsOn > 0.5 && vWorldPos.y > 1.0) {
            float spanCoord = abs(vWorldPos.z) < 25.0 ? vWorldPos.x : (abs(vWorldPos.z + 1140.0) < 25.0 ? vWorldPos.x : vWorldPos.z);
            float pool = 0.5 + 0.5 * cos(spanCoord * (6.28318 / 48.0));
            lampGlow = vec3(0.38, 0.3, 0.2) * pow(pool, 3.0) * (0.55 + localMoisture * 0.7);
          }

          vec3 color = albedo * (uAmbientColor * (1.0 - inTunnel * 0.65) + lampGlow + uSunColor * NdotL * 0.92)
                     + uSunColor * (spec * 0.72 + asphaltGlint);

          // Analytic Under-Car Contact AO (grounds car on road; lifts cleanly during ramp jumps!)
          vec3 toFrag = vWorldPos - uCarPos;
          float carDist = length(toFrag.xz);
          float contactAO = 1.0;
          if (carDist < 5.5 && toFrag.y < 0.8 && toFrag.y > -4.5) {
            vec2 carF = normalize(uCarForward.xz + vec2(0.0001));
            vec2 carR = vec2(-carF.y, carF.x);
            float lx = abs(dot(toFrag.xz, carR)) / max(0.8, uCarHalfW * 1.12);
            float lz = abs(dot(toFrag.xz, carF)) / max(1.6, uCarHalfL * 1.08);
            float footprint = smoothstep(1.18, 0.62, max(lx, lz)) * smoothstep(1.38, 0.7, length(vec2(lx, lz)));
            float heightFade = smoothstep(3.2, 0.0, max(0.0, uCarPos.y - vWorldPos.y));
            contactAO = 1.0 - footprint * heightFade * 0.68;
          }
          color *= contactAO;

          // Headlight pool + rain impact illumination
          float headlightFactor = 0.0;
          if ((uHeadlightsOn > 0.5 || inTunnel > 0.5) && carDist < 76.0 && abs(toFrag.y) < 6.0) {
            vec2 dir2 = normalize(toFrag.xz + vec2(0.0001));
            float cone = dot(dir2, normalize(uCarForward.xz));
            headlightFactor = smoothstep(0.62, 0.96, cone) * smoothstep(76.0, 2.5, carDist);
            color += vec3(1.0, 0.94, 0.82) * headlightFactor * mix(0.36, 0.78, max(localMoisture * 0.5, puddle));
          }

          if (impactRing > 0.005) {
            vec3 ringTint = mix(vec3(0.76, 0.86, 0.98), vec3(1.0, 0.97, 0.9), headlightFactor);
            color += ringTint * impactRing * (0.3 + headlightFactor * 0.6);
          }

          vec3 rearPos = uCarPos - uCarForward * (uCarHalfL + 0.1);
          float rearDist = length(vWorldPos.xz - rearPos.xz);
          if (rearDist < 16.0 && abs(toFrag.y) < 4.0) {
            float tailFalloff = smoothstep(16.0, 0.5, rearDist);
            color += vec3(1.0, 0.1, 0.08) * tailFalloff * uBrakeIntensity * mix(0.16, 0.78, max(localMoisture * 0.48, puddle));
            if (uNitroActive > 0.5) {
              color += vec3(0.15, 0.82, 1.0) * tailFalloff * mix(0.3, 1.05, max(localMoisture * 0.48, puddle));
            }
          }

          // Dynamic Flickering Collision Spark Road Illumination!
          if (uSparkIntensity > 0.02) {
            float sDist = length(vWorldPos - uSparkPos);
            if (sDist < 14.0) {
              float sFall = smoothstep(14.0, 0.4, sDist);
              color += vec3(1.0, 0.58, 0.14) * sFall * sFall * uSparkIntensity * mix(0.65, 1.5, max(localMoisture * 0.5, puddle));
            }
          }

          // Upgraded Roughness-Blurred RT Planar Reflections (even subtle dry-asphalt grazing sheen!)
          if (uRTEnabled > 0.5) {
            float NdotV = max(dot(N, V), 0.0);
            float fresnel = 0.03 + 0.97 * pow(1.0 - NdotV, 4.0);
            float drySheen = (1.0 - inTunnel) * 0.055 * fresnel;

            if (vWorldPos.y < 1.5 && (localMoisture > 0.03 || drySheen > 0.01)) {
              vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
              vec2 reflUv = vec2(screenUv.x, 1.0 - screenUv.y);
              float distort = mix(0.024, 0.0025, puddle);
              reflUv += vec2(microX, microZ) * distort + ripGrad * 0.048;
              reflUv = clamp(reflUv, vec2(0.002), vec2(0.998));

              float blurRad = mix(0.011, 0.0012, puddle);
              vec3 reflSample = sampleGlossyRT(reflUv, blurRad);
              float dampRefl = localMoisture * 0.3 * (0.16 + fresnel * 0.84);
              float puddleRefl = puddle * (0.18 + fresnel * 0.68);
              float reflFactor = clamp(max(max(dampRefl, puddleRefl), drySheen), 0.0, 0.82) * (1.0 - isMarking * 0.35);
              // Ground contact shadow dims reflections right underneath the car
              color = mix(color, reflSample * 1.08 * mix(0.45, 1.0, contactAO), reflFactor);
            } else if (vWorldPos.y >= 1.5 && localMoisture > 0.04) {
              float deckSheen = clamp((localMoisture * 0.3 + puddle * 0.42) * fresnel, 0.0, 0.54);
              color = mix(color, uFogColor * 1.15 + uSunColor * 0.32 + lampGlow * 0.9, deckSheen);
            }
          }

          float depth = length(cameraPosition - vWorldPos);
          float fogFactor = (1.0 - exp(-uFogDensity * uFogDensity * depth * depth)) * (1.0 - inTunnel * 0.78);
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
        uDeepColor: { value: new THREE.Color(0x09223c) },
        uShallowColor: { value: new THREE.Color(0x1b5469) },
        uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.5).normalize() },
        uSunColor: { value: new THREE.Color(0xffa85c) },
        uFogColor: { value: new THREE.Color(0xb65549) },
        uFogDensity: { value: 0.00068 },
        uCarPos: { value: new THREE.Vector3(0, 0, 45) },
        uCarForward: { value: new THREE.Vector3(0, 0, -1) },
        uHeadlightsOn: { value: 1.0 },
        uNitroActive: { value: 0.0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uWaveStrength;
        varying vec3 vWorldPos;
        varying float vWaveH;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          float swell = sin(wp.x * 0.065 + uTime * 1.5) * cos(wp.z * 0.06 - uTime * 1.25);
          wp.y += swell * 0.12 * uWaveStrength;
          vWaveH = swell * uWaveStrength;
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
        varying float vWaveH;

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
          float w1 = p.x * 0.24 + p.y * 0.17 + t * 1.7;
          float w2 = p.x * -0.19 + p.y * 0.31 - t * 2.0;
          float w3 = p.x * 0.48 - p.y * 0.38 + t * 2.8;
          g += vec2(0.24, 0.17) * cos(w1) * 0.35;
          g += vec2(-0.19, 0.31) * cos(w2) * 0.28;
          g += vec2(0.48, -0.38) * cos(w3) * 0.16;
          float n1 = noise2D(p * 0.38 + vec2(t * 0.6, -t * 0.42));
          float n2 = noise2D(p * 0.38 + vec2(-t * 0.48, t * 0.68) + 17.3);
          g += vec2(n1 - 0.5, n2 - 0.5) * 0.44;
          return g;
        }

        vec3 waterRainRipples(vec2 pos, float t) {
          vec2 cell = floor(pos);
          vec2 local = fract(pos) - 0.5;
          float rnd = hash21(cell);
          float phase = fract(t * 1.45 + rnd * 6.2831);
          vec2 center = (vec2(hash21(cell + 4.3), hash21(cell + 19.1)) - 0.5) * 0.48;
          vec2 diff = local - center;
          float dist = length(diff);
          float rad = phase * 0.45;
          float ring = sin((dist - rad) * 38.0) * exp(-dist * 9.0) * (1.0 - phase);
          float glint = exp(-pow((dist - rad) * 24.0, 2.0)) * (1.0 - phase);
          return vec3(normalize(diff + vec2(0.0001)) * ring, glint);
        }

        float boxDist2D(vec2 p, vec2 bmin, vec2 bmax) {
          vec2 c = (bmin + bmax) * 0.5;
          vec2 ext = (bmax - bmin) * 0.5;
          vec2 d = abs(p - c) - ext;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        }

        void main() {
          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 L = normalize(uSunDir);

          vec2 grad = waveGradient(vWorldPos.xz, uTime) * (0.14 + uWaveStrength * 0.22);
          vec3 rip = uRainIntensity > 0.05
            ? waterRainRipples(vWorldPos.xz * 0.55, uTime) * uRainIntensity
            : vec3(0.0);

          vec3 N = normalize(vec3(grad.x + rip.x * 0.24, 1.0, grad.y + rip.y * 0.24));

          float dMetro = abs(boxDist2D(vWorldPos.xz, vec2(-420.0, -340.0), vec2(320.0, 380.0)));
          float dPalm = abs(boxDist2D(vWorldPos.xz, vec2(960.0, -380.0), vec2(1660.0, 360.0)));
          float dLagoon = abs(boxDist2D(vWorldPos.xz, vec2(1340.0, 60.0), vec2(1600.0, 290.0)));
          float dPine = abs(boxDist2D(vWorldPos.xz, vec2(-420.0, -1440.0), vec2(460.0, -880.0)));
          float edgeDist = min(min(dMetro, dPalm), min(dLagoon, dPine));

          float foamNoise = noise2D(vWorldPos.xz * 0.55 + vec2(uTime * 0.32, -uTime * 0.25));
          float shoreFoam = smoothstep(3.4, 0.15, edgeDist) * smoothstep(0.32, 0.72, foamNoise + 0.24);

          float shallowMix = smoothstep(38.0, 2.0, edgeDist);
          vec3 waterBase = mix(uDeepColor, uShallowColor, shallowMix);
          // Subtle subsurface turquoise glow on backlit wave crests
          float sss = clamp(vWaveH * 0.8 + 0.3, 0.0, 1.0) * pow(max(dot(V, -L), 0.0), 3.0);
          waterBase += uShallowColor * sss * 0.45;

          vec3 color;
          if (uRTEnabled > 0.5) {
            vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
            vec2 reflUv = vec2(screenUv.x, 1.0 - screenUv.y);
            reflUv += N.xz * (0.042 + uWaveStrength * 0.024);
            reflUv = clamp(reflUv, vec2(0.002), vec2(0.998));

            // 3-tap soft ocean reflection
            vec3 reflColor = texture2D(uReflMap, reflUv).rgb * 0.52
                           + texture2D(uReflMap, clamp(reflUv + vec2(0.003, 0.002), vec2(0.002), vec2(0.998))).rgb * 0.24
                           + texture2D(uReflMap, clamp(reflUv - vec2(0.003, 0.002), vec2(0.002), vec2(0.998))).rgb * 0.24;
            reflColor *= 1.18;

            float NdotV = max(dot(N, V), 0.0);
            float fresnel = 0.06 + 0.94 * pow(1.0 - NdotV, 3.4);
            color = mix(waterBase, reflColor, clamp(fresnel * 1.08, 0.18, 0.95));

            vec3 H = normalize(L + V);
            float glitter = pow(max(dot(N, H), 0.0), 280.0) * 2.4;
            float broadSpec = pow(max(dot(N, H), 0.0), 36.0) * 0.3;
            color += uSunColor * (glitter + broadSpec);

            vec3 toFrag = vWorldPos - uCarPos;
            float carDist = length(toFrag.xz);
            if (uHeadlightsOn > 0.5 && carDist < 70.0 && abs(toFrag.y) < 12.0) {
              vec2 dir2 = normalize(toFrag.xz + vec2(0.0001));
              float cone = dot(dir2, normalize(uCarForward.xz));
              float beam = smoothstep(0.62, 0.95, cone) * smoothstep(70.0, 2.0, carDist);
              color += vec3(1.0, 0.94, 0.82) * beam * 0.65;
            }
            if (uNitroActive > 0.5 && carDist < 18.0 && abs(toFrag.y) < 8.0) {
              color += vec3(0.15, 0.8, 1.0) * smoothstep(18.0, 1.0, carDist) * 0.7;
            }
          } else {
            float NdotL = max(dot(N, L), 0.0);
            color = waterBase * (0.65 + NdotL * 0.65);
          }

          color += vec3(0.78, 0.88, 0.96) * rip.z * 0.28;
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
  // 6. WORLD BUILDER (ATMOSPHERIC SKY + CLOUDS + STARS, ISLANDS & HIGHWAYS)
  // =========================================================================
  function buildWorld(scene, reflTarget, drawingBufferSize) {
    const { ISLANDS, BRIDGE, TUNNEL, VIADUCT, ROAD_WIDTH, HIGHWAY_WIDTH } = CONFIG;

    const skyUniforms = {
      uTopColor: { value: new THREE.Color(0x16224a) },
      uHorizonColor: { value: new THREE.Color(0xf47b47) },
      uBottomColor: { value: new THREE.Color(0x3b1d2e) },
      uSunDir: { value: new THREE.Vector3(-0.6, 0.22, -0.5).normalize() },
      uSunColor: { value: new THREE.Color(0xffa85c) },
      uTime: { value: 0.0 },
      uNightMix: { value: 0.18 },
      uCloudCover: { value: 0.3 },
      uFlash: { value: 0.0 },
    };

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(2800, 32, 20),
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
          uniform vec3 uSunDir;
          uniform vec3 uSunColor;
          uniform float uTime;
          uniform float uNightMix;
          uniform float uCloudCover;
          uniform float uFlash;
          varying vec3 vDir;

          float hash21(vec2 p) {
            p = fract(p * vec2(127.1, 311.7));
            p += dot(p, p + 34.5);
            return fract(p.x * p.y);
          }

          float noise2D(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
              mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
              f.y
            );
          }

          float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            for (int i = 0; i < 4; i++) {
              v += a * noise2D(p);
              p = p * 2.04 + vec2(17.1, 9.2);
              a *= 0.5;
            }
            return v;
          }

          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 col = h >= 0.0
              ? mix(uHorizonColor, uTopColor, pow(clamp(h, 0.0, 1.0), 0.52))
              : mix(uHorizonColor, uBottomColor, pow(clamp(-h, 0.0, 1.0), 0.6));

            // Atmospheric Rayleigh / Mie Sun Glow & Horizon Band
            vec3 sDir = normalize(uSunDir);
            float sunDot = max(dot(d, sDir), 0.0);
            float sunHalo = pow(sunDot, 12.0) * 0.42 + pow(sunDot, 180.0) * 1.15;
            col += uSunColor * sunHalo * (1.0 - uCloudCover * 0.55) * (1.0 - uNightMix * 0.72);

            // Procedural Twinkling Starfield at Night / Twilight
            if (uNightMix > 0.05 && h > 0.04) {
              vec2 starUv = floor(d.xz / (h + 0.35) * 165.0);
              float sVal = hash21(starUv);
              if (sVal > 0.992) {
                float twinkle = 0.55 + 0.45 * sin(uTime * 3.5 + sVal * 90.0);
                float starVis = smoothstep(0.04, 0.25, h) * uNightMix * (1.0 - uCloudCover * 0.85);
                col += vec3(0.85, 0.92, 1.0) * twinkle * starVis * 1.1;
              }
            }

            // Drifting Multi-Layer Procedural Sky Clouds lit by Sun & Lightning
            if (h > 0.025) {
              vec2 cloudUv = d.xz / (h + 0.16) * 0.95 + vec2(uTime * 0.0085, uTime * 0.0035);
              float cNoise = fbm(cloudUv);
              float threshold = mix(0.62, 0.26, uCloudCover);
              float cloudMask = smoothstep(threshold, threshold + 0.34, cNoise) * smoothstep(0.025, 0.18, h);

              vec3 cloudBase = mix(uHorizonColor * 1.05, vec3(0.85, 0.89, 0.95), 0.35 * (1.0 - uNightMix));
              cloudBase = mix(cloudBase, uTopColor * 0.85, uCloudCover * 0.65);
              vec3 cloudLit = cloudBase + uSunColor * (0.28 + pow(sunDot, 5.0) * 0.55) * (1.0 - uNightMix * 0.8);
              cloudLit += vec3(0.7, 0.85, 1.0) * uFlash * 0.9;

              col = mix(col, cloudLit, clamp(cloudMask * 0.82, 0.0, 0.88));
            }

            col += vec3(0.75, 0.88, 1.0) * uFlash * 0.75;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      })
    );
    scene.add(skyDome);

    // Unified Height-Aware Collider Registry
    const colliders = [];
    const minimapBuildings = [];

    function addAABB(minX, maxX, minZ, maxZ, minY = -2, maxY = 200, isBuilding = false) {
      const c = {
        type: "aabb",
        minX,
        maxX,
        minZ,
        maxZ,
        minY,
        maxY,
        isBuilding,
        x: (minX + maxX) * 0.5,
        z: (minZ + maxZ) * 0.5,
        w: maxX - minX,
        d: maxZ - minZ,
      };
      colliders.push(c);
      if (isBuilding) minimapBuildings.push(c);
    }

    function addCircleCollider(x, z, r, minY = -2, maxY = 200, isBuilding = false) {
      const c = {
        type: "circle",
        x,
        z,
        r,
        minX: x - r,
        maxX: x + r,
        minZ: z - r,
        maxZ: z + r,
        minY,
        maxY,
        isBuilding,
        w: r * 2,
        d: r * 2,
      };
      colliders.push(c);
      if (isBuilding) minimapBuildings.push(c);
    }

    function addOBB(cx, cz, hx, hz, angleY, minY = -2, maxY = 200) {
      const cosA = Math.cos(angleY);
      const sinA = Math.sin(angleY);
      const boundX = Math.abs(hx * cosA) + Math.abs(hz * sinA);
      const boundZ = Math.abs(hx * sinA) + Math.abs(hz * cosA);
      colliders.push({
        type: "obb",
        cx,
        cz,
        hx,
        hz,
        cosA,
        sinA,
        minX: cx - boundX,
        maxX: cx + boundX,
        minZ: cz - boundZ,
        maxZ: cz + boundZ,
        minY,
        maxY,
      });
    }

    // 3 Distinct City Islands + Seawalls
    const groundGroup = new THREE.Group();
    scene.add(groundGroup);

    const seawallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.78 });
    const islandMaterials = {
      metro: new THREE.MeshStandardMaterial({ map: createGrassTexture("#2f5327", [0, 34, -8]), roughness: 0.94 }),
      palm: new THREE.MeshStandardMaterial({ map: createGrassTexture("#4f6f36", [28, 36, 4]), roughness: 0.92 }),
      pinecrest: new THREE.MeshStandardMaterial({ map: createGrassTexture("#264428", [-6, 26, -6]), roughness: 0.95 }),
    };

    function addSeawallBox(x, z, w, d, h = 1.6) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), seawallMat);
      m.position.set(x, -h / 2 + 0.08, z);
      m.receiveShadow = true;
      groundGroup.add(m);
    }

    ISLANDS.forEach((isl) => {
      const shape = new THREE.Shape();
      shape.moveTo(isl.minX, -isl.maxZ);
      shape.lineTo(isl.maxX, -isl.maxZ);
      shape.lineTo(isl.maxX, -isl.minZ);
      shape.lineTo(isl.minX, -isl.minZ);
      shape.closePath();

      if (isl.hole) {
        const hole = new THREE.Path();
        hole.moveTo(isl.hole.minX, -isl.hole.maxZ);
        hole.lineTo(isl.hole.minX, -isl.hole.minZ);
        hole.lineTo(isl.hole.maxX, -isl.hole.minZ);
        hole.lineTo(isl.hole.maxX, -isl.hole.maxZ);
        hole.closePath();
        shape.holes.push(hole);

        const lw = isl.hole.maxX - isl.hole.minX;
        const ld = isl.hole.maxZ - isl.hole.minZ;
        const lcx = (isl.hole.minX + isl.hole.maxX) * 0.5;
        const lcz = (isl.hole.minZ + isl.hole.maxZ) * 0.5;
        addSeawallBox(lcx, isl.hole.minZ, lw + 2, 2.2);
        addSeawallBox(lcx, isl.hole.maxZ, lw + 2, 2.2);
        addSeawallBox(isl.hole.minX, lcz, 2.2, ld + 2);
        addSeawallBox(isl.hole.maxX, lcz, 2.2, ld + 2);
      }

      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), islandMaterials[isl.id]);
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      groundGroup.add(mesh);

      const iw = isl.maxX - isl.minX;
      const id = isl.maxZ - isl.minZ;
      const icx = (isl.minX + isl.maxX) * 0.5;
      const icz = (isl.minZ + isl.maxZ) * 0.5;
      addSeawallBox(icx, isl.minZ, iw + 2.4, 2.6);
      addSeawallBox(icx, isl.maxZ, iw + 2.4, 2.6);
      addSeawallBox(isl.minX, icz, 2.6, id + 2.4);
      addSeawallBox(isl.maxX, icz, 2.6, id + 2.4);
    });

    const beachStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(660, 56),
      new THREE.MeshStandardMaterial({ color: 0xd6b57c, roughness: 0.96 })
    );
    beachStrip.rotation.x = -Math.PI / 2;
    beachStrip.position.set(1310, 0.015, 328);
    beachStrip.receiveShadow = true;
    groundGroup.add(beachStrip);

    // Reflective Ocean Surface
    const waterMat = createWaterMaterial(reflTarget.texture, drawingBufferSize);
    const waterGroup = new THREE.Group();
    const waterGeo = new THREE.PlaneGeometry(6400, 6400, 160, 160);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(600, -0.26, -500);
    waterGroup.add(waterMesh);
    scene.add(waterGroup);

    // Distinct Road Materials: 2-Lane City, 4-Lane Highway, 4-Lane Bridge/Viaduct & Intersections
    const roadTexCity = createRoadTexture();
    const roadTexHighway = createHighwayTexture(false);
    const roadTexBridge = createHighwayTexture(true);

    const roadMatCity = createRealisticRoadMaterial(roadTexCity, reflTarget.texture, drawingBufferSize, false);
    const roadMatHighway = createRealisticRoadMaterial(roadTexHighway, reflTarget.texture, drawingBufferSize, false);
    const roadMatBridge = createRealisticRoadMaterial(roadTexBridge, reflTarget.texture, drawingBufferSize, false);
    const roadMatInter = createRealisticRoadMaterial(roadTexCity, reflTarget.texture, drawingBufferSize, true);
    const roadShadowMat = new THREE.ShadowMaterial({ opacity: 0.36 });

    const roadGroup = new THREE.Group();
    const roadShadowGroup = new THREE.Group();
    scene.add(roadGroup);
    scene.add(roadShadowGroup);

    const flatRoadRects = [];
    const roadSegments = [];
    const dummy = new THREE.Object3D();

    function addFlatRoad(axis, coord, minP, maxP, width = ROAD_WIDTH, y = 0.035, isHighway = false) {
      const len = maxP - minP;
      const mid = (minP + maxP) * 0.5;
      const tileLen = isHighway ? 24.0 : 16.0;
      const geo = new THREE.PlaneGeometry(width, len);
      const uvAttr = geo.attributes.uv;
      for (let i = 0; i < uvAttr.count; i++) {
        uvAttr.setY(i, uvAttr.getY(i) * (len / tileLen));
      }
      uvAttr.needsUpdate = true;

      const mat = isHighway ? roadMatHighway : roadMatCity;
      const mesh = new THREE.Mesh(geo, mat);
      const shadow = new THREE.Mesh(geo, roadShadowMat);
      mesh.rotation.x = -Math.PI / 2;
      shadow.rotation.x = -Math.PI / 2;

      if (axis === "z") {
        mesh.position.set(coord, y, mid);
        shadow.position.set(coord, y + 0.025, mid);
        flatRoadRects.push({ minX: coord - width * 0.5, maxX: coord + width * 0.5, minZ: minP, maxZ: maxP });
        roadSegments.push({ x1: coord, z1: minP, x2: coord, z2: maxP, w: width, kind: isHighway ? "highway" : "city" });
      } else {
        mesh.rotation.z = Math.PI / 2;
        shadow.rotation.z = Math.PI / 2;
        mesh.position.set(mid, y + 0.008, coord);
        shadow.position.set(mid, y + 0.032, coord);
        flatRoadRects.push({ minX: minP, maxX: maxP, minZ: coord - width * 0.5, maxZ: coord + width * 0.5 });
        roadSegments.push({ x1: minP, z1: coord, x2: maxP, z2: coord, w: width, kind: isHighway ? "highway" : "city" });
      }
      shadow.receiveShadow = true;
      roadGroup.add(mesh);
      roadShadowGroup.add(shadow);
    }

    function addIntersection(x, z, size = HIGHWAY_WIDTH + 0.6) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), roadMatInter);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.056, z);
      roadGroup.add(mesh);
    }

    // 1) Metro Bay City Streets
    addFlatRoad("z", 0, -340, 260, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("x", 0, -260, 320, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("z", -260, -240, 260, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", 220, -240, 260, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", -240, -260, 220, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", 260, -260, 220, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", -130, -240, 120, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", 120, -260, 220, ROAD_WIDTH, 0.032, false);

    [
      [0, 0, HIGHWAY_WIDTH + 0.8], [0, -240, HIGHWAY_WIDTH + 0.6], [0, 120, HIGHWAY_WIDTH + 0.6], [0, 260, HIGHWAY_WIDTH + 0.6],
      [-260, -240, ROAD_WIDTH + 0.8], [-260, 0, HIGHWAY_WIDTH + 0.6], [-260, 120, ROAD_WIDTH + 0.8], [-260, 260, ROAD_WIDTH + 0.8],
      [220, -240, ROAD_WIDTH + 0.8], [220, 0, HIGHWAY_WIDTH + 0.6], [220, 120, ROAD_WIDTH + 0.8], [220, 260, ROAD_WIDTH + 0.8],
      [-130, -240, ROAD_WIDTH + 0.8], [-130, 0, HIGHWAY_WIDTH + 0.6], [-130, 120, ROAD_WIDTH + 0.8],
    ].forEach(([ix, iz, sz]) => addIntersection(ix, iz, sz));

    // 2) Palm Island Marina Streets
    addFlatRoad("x", 0, 960, 1540, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("z", 1080, -280, 260, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", 1280, -380, 260, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("z", 1540, -280, 0, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", -280, 1080, 1540, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", 260, 1080, 1280, ROAD_WIDTH, 0.032, false);

    [
      [1080, 0, HIGHWAY_WIDTH + 0.6], [1080, -280, ROAD_WIDTH + 0.8], [1080, 260, ROAD_WIDTH + 0.8],
      [1280, 0, HIGHWAY_WIDTH + 0.8], [1280, -280, HIGHWAY_WIDTH + 0.6], [1280, 260, HIGHWAY_WIDTH + 0.6],
      [1540, 0, HIGHWAY_WIDTH + 0.6], [1540, -280, ROAD_WIDTH + 0.8],
    ].forEach(([ix, iz, sz]) => addIntersection(ix, iz, sz));

    // 3) Pinecrest Alpine Streets
    addFlatRoad("z", 0, -1340, -880, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("x", -1020, -300, 340, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", -1140, 0, 460, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("x", -1340, -300, 340, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", -300, -1340, -1020, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", 340, -1340, -1020, ROAD_WIDTH, 0.032, false);

    [
      [0, -1020, HIGHWAY_WIDTH + 0.6], [0, -1140, HIGHWAY_WIDTH + 0.8], [0, -1340, HIGHWAY_WIDTH + 0.6],
      [-300, -1020, ROAD_WIDTH + 0.8], [-300, -1340, ROAD_WIDTH + 0.8],
      [340, -1020, ROAD_WIDTH + 0.8], [340, -1140, HIGHWAY_WIDTH + 0.6], [340, -1340, ROAD_WIDTH + 0.8],
    ].forEach(([ix, iz, sz]) => addIntersection(ix, iz, sz));

    // 4) Sheltered 4-Lane Alpine Tunnel Expressway Floor
    addFlatRoad("z", 0, TUNNEL.endZ, TUNNEL.startZ, HIGHWAY_WIDTH, 0.042, true);

    function buildElevatedRibbon(samples, halfW, mat) {
      const positions = [];
      const normals = [];
      const uvs = [];
      const indices = [];
      let accumDist = 0;

      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        if (i > 0) {
          const p = samples[i - 1];
          accumDist += Math.hypot(s.x - p.x, s.y - p.y, s.z - p.z);
        }
        const lx = s.x - s.rx * halfW;
        const lz = s.z - s.rz * halfW;
        const rx = s.x + s.rx * halfW;
        const rz = s.z + s.rz * halfW;

        positions.push(lx, s.y + 0.04, lz, rx, s.y + 0.04, rz);
        normals.push(s.nx, s.ny, s.nz, s.nx, s.ny, s.nz);
        uvs.push(0, accumDist / 24.0, 1, accumDist / 24.0);

        if (i < samples.length - 1) {
          const base = i * 2;
          indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      return new THREE.Mesh(geo, mat);
    }

    // === END OF PART 1/2 — PASTE PART 2/2 DIRECTLY BELOW THIS LINE ===

    // =========================================================================
    // 7. UPGRADED GOLDEN BAY SUSPENSION BRIDGE (4-LANE DECK, LAMPS & GANTRIES)
    // =========================================================================
    const bridgeSteelRed = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.48, roughness: 0.38 });
    const bridgeDeckUndersideMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.55, roughness: 0.48 });
    const cableMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.82, roughness: 0.22 });
    const jerseyBarrierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.76, metalness: 0.16 });
    const steelRailMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.78, roughness: 0.25 });
    const gantrySteelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.72, roughness: 0.34 });

    const neonMaterials = [];
    [0x38bdf8, 0xf43f5e, 0xa855f7, 0x22d3ee, 0xfbbf24].forEach((hex) => {
      neonMaterials.push(
        new THREE.MeshStandardMaterial({
          color: hex,
          emissive: hex,
          emissiveIntensity: 2.35,
          roughness: 0.18,
        })
      );
    });

    const catsEyeAmberBatch = [];
    const catsEyeWhiteBatch = [];
    const highwayLampBatch = [];
    const gantrySignMaterials = [];

    function addHighwayGantry(x, z, rotY, title, subtitle, arrow = "↑") {
      const g = new THREE.Group();
      const spanHalf = 13.0;

      [-spanHalf, spanHalf].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.45, 11.2, 8), gantrySteelMat);
        leg.position.set(lx, 5.6, 0);
        g.add(leg);
      });

      const beam = new THREE.Mesh(new THREE.BoxGeometry(spanHalf * 2 + 1.0, 0.7, 0.7), gantrySteelMat);
      beam.position.set(0, 10.6, 0);
      g.add(beam);

      const signTex = createGantrySignTexture(title, subtitle, arrow);
      const signMat = new THREE.MeshStandardMaterial({
        map: signTex,
        emissiveMap: signTex,
        emissive: new THREE.Color(0xd1fae5),
        emissiveIntensity: 0.72,
        roughness: 0.34,
      });
      gantrySignMaterials.push(signMat);

      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(15.2, 4.0, 0.35), [
        gantrySteelMat, gantrySteelMat, gantrySteelMat, gantrySteelMat, signMat, signMat,
      ]);
      signBoard.position.set(0, 10.4, 0);
      g.add(signBoard);

      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      scene.add(g);

      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);
      [-spanHalf, spanHalf].forEach((lx) => {
        const wx = x + lx * cosR;
        const wz = z - lx * sinR;
        addCircleCollider(wx, wz, 0.65, -2, 12, false);
      });
    }

    addHighwayGantry(292, 0, Math.PI / 2, "GOLDEN BAY BRIDGE", "PALM ISLAND MARINA");
    addHighwayGantry(988, 0, -Math.PI / 2, "GOLDEN BAY BRIDGE", "METRO BAY CITY");
    addHighwayGantry(0, -315, 0, "ALPINE RIDGE TUNNEL", "PINECREST VALLEY");
    addHighwayGantry(0, -905, Math.PI, "ALPINE RIDGE TUNNEL", "METRO BAY CITY");
    addHighwayGantry(435, -1140, Math.PI / 2, "COASTAL VIADUCT", "PALM ISLAND MARINA");
    addHighwayGantry(1280, -355, 0, "COASTAL VIADUCT", "PINECREST ALPINE");

    const bridgeSegs = 48;
    const bridgeSamples = [];
    for (let i = 0; i <= bridgeSegs; i++) {
      const x = BRIDGE.startX + (i / bridgeSegs) * (BRIDGE.endX - BRIDGE.startX);
      const { h, dhdx } = evalBridge(x);
      const nLen = Math.hypot(dhdx, 1);
      bridgeSamples.push({ x, y: h, z: 0, rx: 0, rz: 1, nx: -dhdx / nLen, ny: 1 / nLen, nz: 0 });
    }
    roadGroup.add(buildElevatedRibbon(bridgeSamples, BRIDGE.halfW, roadMatBridge));
    roadSegments.push({ x1: BRIDGE.startX, z1: 0, x2: BRIDGE.endX, z2: 0, w: HIGHWAY_WIDTH, kind: "bridge" });

    for (let i = 0; i < bridgeSegs; i++) {
      const a = bridgeSamples[i];
      const b = bridgeSamples[i + 1];
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const pitch = Math.atan2(b.y - a.y, b.x - a.x);

      const girder = new THREE.Mesh(
        new THREE.BoxGeometry(segLen + 0.4, 2.3, HIGHWAY_WIDTH + 2.2),
        bridgeDeckUndersideMat
      );
      girder.position.set(mx, my - 1.15, 0);
      girder.rotation.z = pitch;
      scene.add(girder);

      catsEyeAmberBatch.push({ x: mx, y: my + 0.08, z: 0 });
      catsEyeWhiteBatch.push({ x: mx, y: my + 0.08, z: -(BRIDGE.halfW - 0.8) });
      catsEyeWhiteBatch.push({ x: mx, y: my + 0.08, z: BRIDGE.halfW - 0.8 });

      if (i % 3 === 1) {
        highwayLampBatch.push({ x: mx, y: my, z: -(BRIDGE.halfW + 0.85), rotY: 0 });
        highwayLampBatch.push({ x: mx, y: my, z: BRIDGE.halfW + 0.85, rotY: Math.PI });
      }

      [-1, 1].forEach((side) => {
        const rz = side * (BRIDGE.halfW + 0.55);
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.25, 1.05, 0.85), jerseyBarrierMat);
        barrier.position.set(mx, my + 0.52, rz);
        barrier.rotation.z = pitch;
        scene.add(barrier);

        const topRail = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.25, 0.22, 0.24), steelRailMat);
        topRail.position.set(mx, my + 1.32, rz);
        topRail.rotation.z = pitch;
        scene.add(topRail);

        addAABB(
          Math.min(a.x, b.x),
          Math.max(a.x, b.x),
          rz - 0.5,
          rz + 0.5,
          Math.min(a.y, b.y) - 1.5,
          Math.max(a.y, b.y) + 3.5,
          false
        );
      });
    }

    const towerXs = [500, 780];
    const towerTopY = 92;
    towerXs.forEach((tx) => {
      const deckY = evalBridge(tx).h;
      [-13.8, 13.8].forEach((tz) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(4.4, towerTopY + 12, 4.4), bridgeSteelRed);
        leg.position.set(tx, (towerTopY - 12) * 0.5, tz);
        leg.castShadow = true;
        scene.add(leg);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.25, 8, 8), neonMaterials[1]);
        beacon.position.set(tx, towerTopY + 1.2, tz);
        scene.add(beacon);

        addAABB(tx - 2.3, tx + 2.3, tz - 2.3, tz + 2.3, -4, towerTopY, false);
      });

      [deckY + 24, deckY + 48, towerTopY - 6].forEach((cy) => {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.0, 27.6), bridgeSteelRed);
        brace.position.set(tx, cy, 0);
        scene.add(brace);
      });
    });

    function evalCableY(x) {
      if (x <= 500) {
        const u = (x - 320) / 180;
        return 8 + (towerTopY - 8) * Math.pow(u, 1.55);
      } else if (x <= 780) {
        const u = (x - 640) / 140;
        return 30 + (towerTopY - 30) * (u * u);
      } else {
        const u = (960 - x) / 180;
        return 8 + (towerTopY - 8) * Math.pow(u, 1.55);
      }
    }

    [-13.4, 13.4].forEach((cz) => {
      const pts = [];
      for (let x = 320; x <= 960; x += 10) pts.push(new THREE.Vector3(x, evalCableY(x), cz));
      const curve = new THREE.CatmullRomCurve3(pts);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.55, 6, false), cableMat));

      for (let x = 340; x <= 940; x += 20) {
        if (Math.abs(x - 500) < 6 || Math.abs(x - 780) < 6) continue;
        const cy = evalCableY(x);
        const dy = evalBridge(x).h;
        const h = cy - dy;
        if (h > 1.5) {
          const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, h, 5), cableMat);
          rod.position.set(x, dy + h * 0.5, cz);
          scene.add(rod);
        }
      }
    });

    // =========================================================================
    // 8. ALPINE RIDGE MOUNTAIN TUNNEL (4-LANE BORE, 100% CLEAR OVERHEAD ARCH)
    // =========================================================================
    const tunnelConcreteMat = new THREE.MeshStandardMaterial({
      color: 0x454d59,
      roughness: 0.86,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const tunnelRibMat = new THREE.MeshStandardMaterial({ color: 0x333942, roughness: 0.82, metalness: 0.15 });
    const tunnelPortalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.78 });
    const tunnelStripMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xfdba74, emissiveIntensity: 3.2 });
    const tunnelSignMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 2.6 });
    const reflectorMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 2.4 });

    const tunnelLen = TUNNEL.startZ - TUNNEL.endZ;
    const tunnelMidZ = (TUNNEL.startZ + TUNNEL.endZ) * 0.5;

    const archGeo = new THREE.CylinderGeometry(12.6, 12.6, tunnelLen, 26, 1, true, -Math.PI / 2, Math.PI);
    archGeo.rotateX(-Math.PI / 2);
    const tunnelShell = new THREE.Mesh(archGeo, tunnelConcreteMat);
    tunnelShell.position.set(0, 0, tunnelMidZ);
    scene.add(tunnelShell);

    const ribCount = Math.floor(tunnelLen / 28);
    const ribInst = new THREE.InstancedMesh(new THREE.TorusGeometry(12.3, 0.3, 6, 22, Math.PI), tunnelRibMat, ribCount);
    const stripInst = new THREE.InstancedMesh(new THREE.BoxGeometry(5.0, 0.34, 3.8), tunnelStripMat, ribCount);
    const reflInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.45, 0.9), reflectorMat, ribCount * 2);

    for (let i = 0; i < ribCount; i++) {
      const rz = TUNNEL.startZ - 16 - i * 28;
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);

      dummy.position.set(0, 0, rz);
      dummy.updateMatrix();
      ribInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(0, 11.85, rz);
      dummy.updateMatrix();
      stripInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(-11.15, 1.35, rz);
      dummy.updateMatrix();
      reflInst.setMatrixAt(i * 2, dummy.matrix);

      dummy.position.set(11.15, 1.35, rz);
      dummy.updateMatrix();
      reflInst.setMatrixAt(i * 2 + 1, dummy.matrix);

      catsEyeAmberBatch.push({ x: 0, y: 0.08, z: rz });
    }
    ribInst.instanceMatrix.needsUpdate = true;
    stripInst.instanceMatrix.needsUpdate = true;
    reflInst.instanceMatrix.needsUpdate = true;
    scene.add(ribInst);
    scene.add(stripInst);
    scene.add(reflInst);

    [-11.85, 11.85].forEach((wx) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, tunnelLen), tunnelPortalMat);
      curb.position.set(wx, 0.75, tunnelMidZ);
      scene.add(curb);
      addAABB(wx - 0.6, wx + 0.6, TUNNEL.endZ, TUNNEL.startZ, -2, 14, false);
    });

    [TUNNEL.startZ, TUNNEL.endZ].forEach((pz) => {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(48, 9.2, 4.6), tunnelPortalMat);
      lintel.position.set(0, 17.1, pz);
      scene.add(lintel);

      [-18.0, 18.0].forEach((px) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(10.8, 21.8, 5.6), tunnelPortalMat);
        pillar.position.set(px, 10.9, pz);
        scene.add(pillar);
        addAABB(px - 5.4, px + 5.4, pz - 2.8, pz + 2.8, -2, 22, false);
      });

      const sign = new THREE.Mesh(new THREE.BoxGeometry(12.5, 1.3, 0.45), tunnelSignMat);
      sign.position.set(0, 12.9, pz + (pz === TUNNEL.startZ ? 2.4 : -2.4));
      scene.add(sign);
    });

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3b424c, roughness: 0.94 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 });

    const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(264, 45, tunnelLen - 6), rockMat);
    ridgeCap.position.set(0, 37, tunnelMidZ);
    scene.add(ridgeCap);

    [-74.5, 74.5].forEach((cx) => {
      const flank = new THREE.Mesh(new THREE.BoxGeometry(120, 48, tunnelLen - 6), rockMat);
      flank.position.set(cx, 22, tunnelMidZ);
      scene.add(flank);
    });

    const peakData = [
      { x: -128, z: -455, r: 90, h: 132 },
      { x: 130, z: -470, r: 92, h: 142 },
      { x: -168, z: -610, r: 115, h: 170 },
      { x: 168, z: -620, r: 115, h: 176 },
      { x: -128, z: -760, r: 90, h: 128 },
      { x: 130, z: -755, r: 92, h: 136 },
      { x: 0, z: -525, r: 108, h: 148, yBase: 17 },
      { x: 0, z: -695, r: 105, h: 142, yBase: 17 },
      { x: -265, z: -555, r: 112, h: 120 },
      { x: 268, z: -575, r: 112, h: 124 },
      { x: -248, z: -725, r: 106, h: 110 },
      { x: 252, z: -720, r: 106, h: 114 },
    ];

    peakData.forEach((pk) => {
      const yBase = pk.yBase || -4;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(pk.r, pk.h, 7), rockMat);
      cone.position.set(pk.x, yBase + pk.h * 0.5, pk.z);
      cone.castShadow = true;
      cone.receiveShadow = true;
      scene.add(cone);

      if (pk.h > 130) {
        const capH = pk.h * 0.28;
        const capR = pk.r * 0.285;
        const cap = new THREE.Mesh(new THREE.ConeGeometry(capR, capH, 7), snowMat);
        cap.position.set(pk.x, yBase + pk.h - capH * 0.5 + 0.3, pk.z);
        scene.add(cap);
      }

      if (!pk.yBase && Math.abs(pk.x) > 55) {
        addCircleCollider(pk.x, pk.z, Math.min(pk.r * 0.72, Math.abs(pk.x) - 20), -2, 160, false);
      }
    });

    // =========================================================================
    // 9. UPGRADED NE COASTAL VIADUCT HIGHWAY (4-LANE DECK, BARRIERS & LAMPS)
    // =========================================================================
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });

    // A) Eastbound Viaduct (z = -1140, x = 460 -> 1140)
    const eastSegs = 28;
    const eastSamples = [];
    for (let i = 0; i <= eastSegs; i++) {
      const x = VIADUCT.eastStartX + (i / eastSegs) * (VIADUCT.curveCX - VIADUCT.eastStartX);
      const { h, dhdx } = evalEastViaduct(x);
      const nLen = Math.hypot(dhdx, 1);
      eastSamples.push({ x, y: h, z: -1140, rx: 0, rz: 1, nx: -dhdx / nLen, ny: 1 / nLen, nz: 0 });
    }
    roadGroup.add(buildElevatedRibbon(eastSamples, VIADUCT.halfW, roadMatBridge));
    roadSegments.push({ x1: VIADUCT.eastStartX, z1: -1140, x2: VIADUCT.curveCX, z2: -1140, w: HIGHWAY_WIDTH, kind: "viaduct" });

    for (let i = 0; i < eastSegs; i++) {
      const a = eastSamples[i];
      const b = eastSamples[i + 1];
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const pitch = Math.atan2(b.y - a.y, b.x - a.x);

      const deckSlab = new THREE.Mesh(
        new THREE.BoxGeometry(segLen + 0.4, 1.8, HIGHWAY_WIDTH + 1.8),
        bridgeDeckUndersideMat
      );
      deckSlab.position.set(mx, my - 0.92, -1140);
      deckSlab.rotation.z = pitch;
      scene.add(deckSlab);

      catsEyeAmberBatch.push({ x: mx, y: my + 0.08, z: -1140 });
      catsEyeWhiteBatch.push({ x: mx, y: my + 0.08, z: -1140 - (VIADUCT.halfW - 0.8) });
      catsEyeWhiteBatch.push({ x: mx, y: my + 0.08, z: -1140 + (VIADUCT.halfW - 0.8) });

      if (i % 3 === 1) {
        if (my > 3) {
          const pier = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.6, my + 4, 8), pierMat);
          pier.position.set(mx, (my - 4) * 0.5, -1140);
          scene.add(pier);
        }
        highwayLampBatch.push({ x: mx, y: my, z: -1140 - (VIADUCT.halfW + 0.8), rotY: 0 });
      }

      [-1, 1].forEach((side) => {
        const rz = -1140 + side * (VIADUCT.halfW + 0.5);
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.25, 1.05, 0.8), jerseyBarrierMat);
        barrier.position.set(mx, my + 0.52, rz);
        barrier.rotation.z = pitch;
        scene.add(barrier);

        const rail = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.25, 0.2, 0.22), steelRailMat);
        rail.position.set(mx, my + 1.28, rz);
        rail.rotation.z = pitch;
        scene.add(rail);

        addAABB(
          Math.min(a.x, b.x),
          Math.max(a.x, b.x),
          rz - 0.45,
          rz + 0.45,
          Math.min(a.y, b.y) - 1.5,
          Math.max(a.y, b.y) + 3.5,
          false
        );
      });
    }

    // B) Sweeping 90-Degree Ocean Curve (center 1140, -1000, radius 140, y = 12m)
    const curveSegs = 22;
    const curveSamples = [];
    for (let i = 0; i <= curveSegs; i++) {
      const ang = -Math.PI * 0.5 + (i / curveSegs) * (Math.PI * 0.5);
      const x = VIADUCT.curveCX + Math.cos(ang) * VIADUCT.curveR;
      const z = VIADUCT.curveCZ + Math.sin(ang) * VIADUCT.curveR;
      curveSamples.push({ x, y: VIADUCT.deckH, z, rx: -Math.cos(ang), rz: -Math.sin(ang), nx: 0, ny: 1, nz: 0 });
    }
    roadGroup.add(buildElevatedRibbon(curveSamples, VIADUCT.halfW, roadMatBridge));

    for (let i = 0; i < curveSegs; i++) {
      const a = curveSamples[i];
      const b = curveSamples[i + 1];
      const mx = (a.x + b.x) * 0.5;
      const mz = (a.z + b.z) * 0.5;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const segLen = Math.hypot(dx, dz);
      const yaw = Math.atan2(dx, dz);

      roadSegments.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, w: HIGHWAY_WIDTH, kind: "viaduct" });

      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(HIGHWAY_WIDTH + 1.8, 1.8, segLen + 0.8),
        bridgeDeckUndersideMat
      );
      slab.position.set(mx, VIADUCT.deckH - 0.92, mz);
      slab.rotation.y = yaw;
      scene.add(slab);

      const midAng = -Math.PI * 0.5 + ((i + 0.5) / curveSegs) * (Math.PI * 0.5);
      catsEyeAmberBatch.push({ x: mx, y: VIADUCT.deckH + 0.08, z: mz });
      catsEyeWhiteBatch.push({
        x: VIADUCT.curveCX + Math.cos(midAng) * (VIADUCT.curveR + VIADUCT.halfW - 0.8),
        y: VIADUCT.deckH + 0.08,
        z: VIADUCT.curveCZ + Math.sin(midAng) * (VIADUCT.curveR + VIADUCT.halfW - 0.8),
      });

      if (i % 3 === 1) {
        const pier = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.7, VIADUCT.deckH + 4, 8), pierMat);
        pier.position.set(mx, (VIADUCT.deckH - 4) * 0.5, mz);
        scene.add(pier);

        const outerR = VIADUCT.curveR + VIADUCT.halfW + 0.8;
        highwayLampBatch.push({
          x: VIADUCT.curveCX + Math.cos(midAng) * outerR,
          y: VIADUCT.deckH,
          z: VIADUCT.curveCZ + Math.sin(midAng) * outerR,
          rotY: -midAng - Math.PI * 0.5,
        });
      }

      [-1, 1].forEach((side) => {
        const rr = VIADUCT.curveR + side * (VIADUCT.halfW + 0.5);
        const gx = VIADUCT.curveCX + Math.cos(midAng) * rr;
        const gz = VIADUCT.curveCZ + Math.sin(midAng) * rr;
        const railLen = (rr / VIADUCT.curveR) * segLen + 0.35;

        const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.05, railLen), jerseyBarrierMat);
        barrier.position.set(gx, VIADUCT.deckH + 0.52, gz);
        barrier.rotation.y = yaw;
        scene.add(barrier);

        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, railLen), steelRailMat);
        rail.position.set(gx, VIADUCT.deckH + 1.28, gz);
        rail.rotation.y = yaw;
        scene.add(rail);

        addOBB(gx, gz, 0.5, railLen * 0.5, yaw, VIADUCT.deckH - 1.5, VIADUCT.deckH + 3.5);
      });
    }

    // C) Southbound Viaduct (x = 1280, z = -1000 -> -380)
    const southSegs = 26;
    const southSamples = [];
    for (let i = 0; i <= southSegs; i++) {
      const z = VIADUCT.curveCZ + (i / southSegs) * (VIADUCT.southEndZ - VIADUCT.curveCZ);
      const { h, dhdz } = evalSouthViaduct(z);
      const nLen = Math.hypot(dhdz, 1);
      southSamples.push({ x: 1280, y: h, z, rx: -1, rz: 0, nx: 0, ny: 1 / nLen, nz: -dhdz / nLen });
    }
    roadGroup.add(buildElevatedRibbon(southSamples, VIADUCT.halfW, roadMatBridge));
    roadSegments.push({ x1: 1280, z1: VIADUCT.curveCZ, x2: 1280, z2: VIADUCT.southEndZ, w: HIGHWAY_WIDTH, kind: "viaduct" });

    for (let i = 0; i < southSegs; i++) {
      const a = southSamples[i];
      const b = southSamples[i + 1];
      const mz = (a.z + b.z) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const segLen = Math.hypot(b.z - a.z, b.y - a.y);
      const pitch = -Math.atan2(b.y - a.y, b.z - a.z);

      const deckSlab = new THREE.Mesh(
        new THREE.BoxGeometry(HIGHWAY_WIDTH + 1.8, 1.8, segLen + 0.4),
        bridgeDeckUndersideMat
      );
      deckSlab.position.set(1280, my - 0.92, mz);
      deckSlab.rotation.x = pitch;
      scene.add(deckSlab);

      catsEyeAmberBatch.push({ x: 1280, y: my + 0.08, z: mz });
      catsEyeWhiteBatch.push({ x: 1280 - (VIADUCT.halfW - 0.8), y: my + 0.08, z: mz });
      catsEyeWhiteBatch.push({ x: 1280 + (VIADUCT.halfW - 0.8), y: my + 0.08, z: mz });

      if (i % 3 === 1) {
        if (my > 3) {
          const pier = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.6, my + 4, 8), pierMat);
          pier.position.set(1280, (my - 4) * 0.5, mz);
          scene.add(pier);
        }
        highwayLampBatch.push({ x: 1280 + (VIADUCT.halfW + 0.8), y: my, z: mz, rotY: Math.PI / 2 });
      }

      [-1, 1].forEach((side) => {
        const rx = 1280 + side * (VIADUCT.halfW + 0.5);
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.05, segLen + 0.25), jerseyBarrierMat);
        barrier.position.set(rx, my + 0.52, mz);
        barrier.rotation.x = pitch;
        scene.add(barrier);

        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, segLen + 0.25), steelRailMat);
        rail.position.set(rx, my + 1.28, mz);
        rail.rotation.x = pitch;
        scene.add(rail);

        addAABB(
          rx - 0.45,
          rx + 0.45,
          Math.min(a.z, b.z),
          Math.max(a.z, b.z),
          Math.min(a.y, b.y) - 1.5,
          Math.max(a.y, b.y) + 3.5,
          false
        );
      });
    }

    // Build Instanced Highway Cat's-Eye Studs & Cobra-Head Streetlamps
    const studAmberMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 2.5 });
    const studWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0xe2e8f0, emissiveIntensity: 2.0 });
    const studGeo = new THREE.BoxGeometry(0.24, 0.07, 0.24);

    if (catsEyeAmberBatch.length) {
      const instA = new THREE.InstancedMesh(studGeo, studAmberMat, catsEyeAmberBatch.length);
      catsEyeAmberBatch.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        instA.setMatrixAt(i, dummy.matrix);
      });
      instA.instanceMatrix.needsUpdate = true;
      scene.add(instA);
    }

    if (catsEyeWhiteBatch.length) {
      const instW = new THREE.InstancedMesh(studGeo, studWhiteMat, catsEyeWhiteBatch.length);
      catsEyeWhiteBatch.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        instW.setMatrixAt(i, dummy.matrix);
      });
      instW.instanceMatrix.needsUpdate = true;
      scene.add(instW);
    }

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.72, roughness: 0.35 });
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 2.8 });

    if (highwayLampBatch.length) {
      const hPoleInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.2, 8.2, 5), poleMat, highwayLampBatch.length);
      const hArmInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.16, 2.8), poleMat, highwayLampBatch.length);
      const hHeadInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.16, 0.85), bulbMat, highwayLampBatch.length);

      highwayLampBatch.forEach((l, i) => {
        const cosR = Math.cos(l.rotY);
        const sinR = Math.sin(l.rotY);

        dummy.rotation.set(0, l.rotY, 0);
        dummy.scale.set(1, 1, 1);
        dummy.position.set(l.x, l.y + 4.1, l.z);
        dummy.updateMatrix();
        hPoleInst.setMatrixAt(i, dummy.matrix);

        dummy.position.set(l.x + sinR * 1.3, l.y + 8.15, l.z + cosR * 1.3);
        dummy.updateMatrix();
        hArmInst.setMatrixAt(i, dummy.matrix);

        dummy.position.set(l.x + sinR * 2.55, l.y + 8.05, l.z + cosR * 2.55);
        dummy.updateMatrix();
        hHeadInst.setMatrixAt(i, dummy.matrix);
      });
      hPoleInst.instanceMatrix.needsUpdate = true;
      hArmInst.instanceMatrix.needsUpdate = true;
      hHeadInst.instanceMatrix.needsUpdate = true;
      scene.add(hPoleInst);
      scene.add(hArmInst);
      scene.add(hHeadInst);
    }

    // =========================================================================
    // 10. WORKING 3D TRAFFIC LIGHTS (12 SIGNALIZED INTERSECTIONS, BLOOM-READY)
    // =========================================================================
    const trafficLightsGroup = new THREE.Group();
    scene.add(trafficLightsGroup);
    const trafficLights = [];

    const signalPhases = [0, 7.5, 15.0].map((offset) => ({
      offset,
      nsState: "GREEN",
      ewState: "RED",
      nsRedMat: new THREE.MeshStandardMaterial({ color: 0x3b0808, emissive: 0xff1e1e, emissiveIntensity: 0.08 }),
      nsYelMat: new THREE.MeshStandardMaterial({ color: 0x3d2e05, emissive: 0xfacc15, emissiveIntensity: 0.08 }),
      nsGrnMat: new THREE.MeshStandardMaterial({ color: 0x06381c, emissive: 0x22c55e, emissiveIntensity: 4.0 }),
      ewRedMat: new THREE.MeshStandardMaterial({ color: 0x3b0808, emissive: 0xff1e1e, emissiveIntensity: 4.0 }),
      ewYelMat: new THREE.MeshStandardMaterial({ color: 0x3d2e05, emissive: 0xfacc15, emissiveIntensity: 0.08 }),
      ewGrnMat: new THREE.MeshStandardMaterial({ color: 0x06381c, emissive: 0x22c55e, emissiveIntensity: 0.08 }),
    }));

    const tlHousingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.35 });
    const tlPoleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.65, roughness: 0.35 });
    const tlLensGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const tlBoxGeo = new THREE.BoxGeometry(0.75, 2.05, 0.55);

    function createSignalHead(redMat, yelMat, grnMat) {
      const h = new THREE.Group();
      h.add(new THREE.Mesh(tlBoxGeo, tlHousingMat));

      [-0.27, 0.27].forEach((zOff) => {
        const r = new THREE.Mesh(tlLensGeo, redMat);
        r.position.set(0, 0.6, zOff);
        h.add(r);

        const y = new THREE.Mesh(tlLensGeo, yelMat);
        y.position.set(0, 0.0, zOff);
        h.add(y);

        const g = new THREE.Mesh(tlLensGeo, grnMat);
        g.position.set(0, -0.6, zOff);
        h.add(g);
      });
      return h;
    }

    const signalIntersections = [
      { x: 0, z: 0, halfW: 12.2, phaseIdx: 0 },
      { x: 0, z: -240, halfW: 12.2, phaseIdx: 1 },
      { x: 0, z: 120, halfW: 12.2, phaseIdx: 2 },
      { x: 0, z: 260, halfW: 12.2, phaseIdx: 1 },
      { x: -260, z: 0, halfW: 11.8, phaseIdx: 2 },
      { x: 220, z: 0, halfW: 11.8, phaseIdx: 1 },
      { x: 1080, z: 0, halfW: 11.8, phaseIdx: 0 },
      { x: 1280, z: 0, halfW: 12.2, phaseIdx: 2 },
      { x: 1280, z: -280, halfW: 11.8, phaseIdx: 1 },
      { x: 0, z: -1020, halfW: 11.8, phaseIdx: 0 },
      { x: 0, z: -1140, halfW: 12.2, phaseIdx: 2 },
      { x: 340, z: -1140, halfW: 11.8, phaseIdx: 1 },
    ];

    signalIntersections.forEach((cfg) => {
      const ph = signalPhases[cfg.phaseIdx];
      const g = new THREE.Group();
      g.position.set(cfg.x, 0, cfg.z);

      const d = cfg.halfW;
      const poleH = 8.4;

      [
        { px: d, pz: d, armDirX: -1, armDirZ: -1 },
        { px: -d, pz: -d, armDirX: 1, armDirZ: 1 },
      ].forEach(({ px, pz, armDirX, armDirZ }) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, poleH, 7), tlPoleMat);
        pole.position.set(px, poleH * 0.5, pz);
        g.add(pole);

        const armNS = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.22, 0.22), tlPoleMat);
        armNS.position.set(px + armDirX * 3.6, poleH - 0.3, pz);
        g.add(armNS);

        const headNS = createSignalHead(ph.nsRedMat, ph.nsYelMat, ph.nsGrnMat);
        headNS.position.set(px + armDirX * 6.4, poleH - 1.35, pz);
        g.add(headNS);

        const armEW = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 7.2), tlPoleMat);
        armEW.position.set(px, poleH - 0.3, pz + armDirZ * 3.6);
        g.add(armEW);

        const headEW = createSignalHead(ph.ewRedMat, ph.ewYelMat, ph.ewGrnMat);
        headEW.rotation.y = Math.PI / 2;
        headEW.position.set(px, poleH - 1.35, pz + armDirZ * 6.4);
        g.add(headEW);

        addCircleCollider(cfg.x + px, cfg.z + pz, 0.45, -2, poleH, false);
      });

      trafficLightsGroup.add(g);
      trafficLights.push({
        x: cfg.x,
        z: cfg.z,
        stopDist: cfg.halfW + 1.8,
        phase: ph,
        nsState: "GREEN",
        ewState: "RED",
      });
    });

    function updateTrafficLights(elapsed) {
      const CYCLE = 22.0;
      for (let i = 0; i < signalPhases.length; i++) {
        const ph = signalPhases[i];
        const t = (elapsed + ph.offset) % CYCLE;

        let ns = "RED";
        let ew = "RED";
        if (t < 8.5) {
          ns = "GREEN";
          ew = "RED";
        } else if (t < 10.0) {
          ns = "YELLOW";
          ew = "RED";
        } else if (t < 11.0) {
          ns = "RED";
          ew = "RED";
        } else if (t < 19.5) {
          ns = "RED";
          ew = "GREEN";
        } else if (t < 21.0) {
          ns = "RED";
          ew = "YELLOW";
        } else {
          ns = "RED";
          ew = "RED";
        }

        ph.nsState = ns;
        ph.ewState = ew;

        ph.nsRedMat.emissiveIntensity = ns === "RED" ? 4.0 : 0.06;
        ph.nsYelMat.emissiveIntensity = ns === "YELLOW" ? 4.0 : 0.06;
        ph.nsGrnMat.emissiveIntensity = ns === "GREEN" ? 4.0 : 0.06;

        ph.ewRedMat.emissiveIntensity = ew === "RED" ? 4.0 : 0.06;
        ph.ewYelMat.emissiveIntensity = ew === "YELLOW" ? 4.0 : 0.06;
        ph.ewGrnMat.emissiveIntensity = ew === "GREEN" ? 4.0 : 0.06;
      }

      for (let i = 0; i < trafficLights.length; i++) {
        const tl = trafficLights[i];
        tl.nsState = tl.phase.nsState;
        tl.ewState = tl.phase.ewState;
      }
    }

    // =========================================================================
    // 11. STUNT RAMPS & METRO BAY NEEDLE LANDMARK
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

    addRamp(-180, 315, 14, 5.2, 24, Math.PI / 2);
    addRamp(1160, 315, 15, 5.8, 26, -Math.PI / 2);
    addRamp(1595, -140, 14, 5.5, 24, 0);
    addRamp(-355, -1180, 14, 5.5, 24, 0);

    const landmarkGroup = new THREE.Group();
    const needleMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.72, roughness: 0.25 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 6.5, 136, 12), needleMat);
    shaft.position.y = 68;
    shaft.castShadow = true;
    landmarkGroup.add(shaft);

    const obsDeck = new THREE.Mesh(new THREE.CylinderGeometry(14.5, 10.5, 9, 16), needleMat);
    obsDeck.position.y = 118;
    landmarkGroup.add(obsDeck);

    const obsRing = new THREE.Mesh(new THREE.TorusGeometry(14.8, 0.65, 8, 24), neonMaterials[0]);
    obsRing.rotation.x = Math.PI / 2;
    obsRing.position.y = 118;
    landmarkGroup.add(obsRing);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.5, 40, 8), needleMat);
    spire.position.y = 156;
    landmarkGroup.add(spire);

    const topOrb = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 10), neonMaterials[1]);
    topOrb.position.y = 176;
    landmarkGroup.add(topOrb);

    landmarkGroup.position.set(110, 0, -120);
    scene.add(landmarkGroup);
    addCircleCollider(110, -120, 7.2, -2, 180, true);

    // =========================================================================
    // 12. THREE DISTINCT ARCHITECTURAL CITIES
    // =========================================================================
    function isClearOfRoadsAndWater(cx, cz, hw, hd) {
      const pad = 6.2;
      for (let i = 0; i < flatRoadRects.length; i++) {
        const r = flatRoadRects[i];
        if (cx + hw + pad > r.minX && cx - hw - pad < r.maxX && cz + hd + pad > r.minZ && cz - hd - pad < r.maxZ) {
          return false;
        }
      }
      const hole = ISLANDS[1].hole;
      if (cx + hw + 6 > hole.minX && cx - hw - 6 < hole.maxX && cz + hd + 6 > hole.minZ && cz - hd - 6 < hole.maxZ) {
        return false;
      }
      for (let i = 0; i < ramps.length; i++) {
        if (Math.hypot(cx - ramps[i].x, cz - ramps[i].z) < 28) return false;
      }
      if (Math.hypot(cx - 110, cz + 120) < 36) return false;
      return true;
    }

    const facadeStyles = ["glass", "artdeco", "resort", "alpine", "warehouse", "cyber"];
    const buildingMaterials = [];
    const facadeMats = {};
    facadeStyles.forEach((st) => {
      const tex = createFacadeTexture(st);
      const isGlass = st === "glass" || st === "cyber";
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(isGlass ? 0xcceeff : 0xfff0c8),
        emissiveIntensity: 0.92,
        roughness: isGlass ? 0.16 : 0.6,
        metalness: isGlass ? 0.68 : 0.16,
      });
      facadeMats[st] = mat;
      buildingMaterials.push(mat);
    });

    const roofDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const spireMetalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 });
    const pitchedRoofMat = new THREE.MeshStandardMaterial({ color: 0x6b3228, roughness: 0.85 });
    const siloMetalMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.65, roughness: 0.35 });
    const containerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.3 });

    const boxBatches = { glass: [], artdeco: [], resort: [], alpine: [], warehouse: [], cyber: [], roof: [], container: [] };
    const cylBatches = { glass: [], cyber: [], resort: [], silo: [] };
    const spireBatch = [];
    const pitchedRoofBatch = [];
    const neonBatches = neonMaterials.map(() => []);
    const treeBatch = [];
    const lampBatch = [];

    function pushT(list, x, y, z, sx, sy, sz, ry = 0, colorHex = null) {
      list.push({ x, y, z, sx, sy, sz, ry, colorHex });
    }

    let seed = 8842;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    const metroZones = [
      [-245, -145, -225, -20],
      [-115, -20, -225, -20],
      [22, 205, -225, -20],
      [-245, -145, 20, 105],
      [-115, -20, 20, 105],
      [22, 205, 20, 105],
      [-245, -20, 138, 245],
      [22, 205, 138, 245],
      [-395, -280, -240, 260],
    ];

    metroZones.forEach(([x0, x1, z0, z1]) => {
      const cols = Math.max(1, Math.floor((x1 - x0) / 52));
      const rows = Math.max(1, Math.floor((z1 - z0) / 52));
      const stepX = (x1 - x0) / cols;
      const stepZ = (z1 - z0) / rows;

      for (let ix = 0; ix < cols; ix++) {
        for (let iz = 0; iz < rows; iz++) {
          const px = x0 + (ix + 0.5) * stepX + (rand() - 0.5) * 6;
          const pz = z0 + (iz + 0.5) * stepZ + (rand() - 0.5) * 6;
          const w = Math.min(stepX - 10, 22 + rand() * 16);
          const d = Math.min(stepZ - 10, 22 + rand() * 16);
          if (!isClearOfRoadsAndWater(px, pz, w * 0.5, d * 0.5)) continue;

          const roll = rand();
          if (roll < 0.28) {
            const h1 = 24 + rand() * 18;
            const h2 = 30 + rand() * 44;
            const h3 = 18 + rand() * 24;
            pushT(boxBatches.artdeco, px, h1 / 2, pz, w, h1, d);
            pushT(boxBatches.artdeco, px, h1 + h2 / 2, pz, w * 0.68, h2, d * 0.68);
            pushT(boxBatches.artdeco, px, h1 + h2 + h3 / 2, pz, w * 0.42, h3, d * 0.42);
            pushT(spireBatch, px, h1 + h2 + h3 + 11, pz, 1.3, 22, 1.3);
            addAABB(px - w / 2, px + w / 2, pz - d / 2, pz + d / 2, -2, h1 + h2 + h3, true);
          } else if (roll < 0.55) {
            const r = Math.min(w, d) * 0.46;
            const h = 42 + rand() * 68;
            const st = rand() > 0.45 ? "glass" : "cyber";
            pushT(cylBatches[st], px, h / 2, pz, r, h, r);
            pushT(cylBatches.silo, px, h + 1, pz, r * 0.82, 2, r * 0.82);
            pushT(neonBatches[Math.floor(rand() * neonBatches.length)], px, h - 0.6, pz, r * 1.5, 0.9, r * 1.5);
            addCircleCollider(px, pz, r + 0.2, -2, h, true);
          } else if (roll < 0.85) {
            const h = 30 + rand() * 58;
            const st = rand() > 0.5 ? "glass" : "cyber";
            pushT(boxBatches[st], px, h / 2, pz, w, h, d);
            pushT(boxBatches.roof, px, h + 1.2, pz, w * 0.55, 2.4, d * 0.55);
            pushT(neonBatches[Math.floor(rand() * neonBatches.length)], px, h - 0.5, pz, w + 0.5, 0.9, d + 0.5);
            addAABB(px - w / 2, px + w / 2, pz - d / 2, pz + d / 2, -2, h, true);
          } else {
            for (let t = 0; t < 4; t++) {
              treeBatch.push({ x: px + (rand() - 0.5) * 20, z: pz + (rand() - 0.5) * 20, s: 0.9 + rand() * 0.5 });
            }
          }
        }
      }
    });

    const palmZones = [
      [1098, 1260, -262, -20],
      [1300, 1522, -262, -20],
      [1098, 1260, 20, 242],
      [980, 1062, -260, 260],
      [1560, 1640, -280, 20],
    ];

    palmZones.forEach(([x0, x1, z0, z1]) => {
      const cols = Math.max(1, Math.floor((x1 - x0) / 50));
      const rows = Math.max(1, Math.floor((z1 - z0) / 50));
      const stepX = (x1 - x0) / cols;
      const stepZ = (z1 - z0) / rows;

      for (let ix = 0; ix < cols; ix++) {
        for (let iz = 0; iz < rows; iz++) {
          const px = x0 + (ix + 0.5) * stepX + (rand() - 0.5) * 5;
          const pz = z0 + (iz + 0.5) * stepZ + (rand() - 0.5) * 5;
          const w = Math.min(stepX - 10, 20 + rand() * 14);
          const d = Math.min(stepZ - 10, 20 + rand() * 14);
          if (!isClearOfRoadsAndWater(px, pz, w * 0.5, d * 0.5)) continue;

          const roll = rand();
          if (roll < 0.48) {
            const h = 22 + rand() * 44;
            pushT(boxBatches.resort, px, h / 2, pz, w, h, d);
            pushT(boxBatches.resort, px, h + h * 0.16, pz, w * 0.65, h * 0.32, d * 0.65);
            pushT(neonBatches[3], px, h - 0.5, pz, w + 0.4, 0.8, d + 0.4);
            addAABB(px - w / 2, px + w / 2, pz - d / 2, pz + d / 2, -2, h * 1.32, true);
          } else if (roll < 0.78) {
            const r = Math.min(w, d) * 0.45;
            const h = 28 + rand() * 48;
            pushT(cylBatches.resort, px, h / 2, pz, r, h, r);
            pushT(neonBatches[0], px, h - 0.6, pz, r * 1.5, 0.85, r * 1.5);
            addCircleCollider(px, pz, r + 0.2, -2, h, true);
          } else {
            for (let t = 0; t < 4; t++) {
              treeBatch.push({ x: px + (rand() - 0.5) * 18, z: pz + (rand() - 0.5) * 18, s: 1.0 + rand() * 0.6 });
            }
          }
        }
      }
    });

    const containerPalette = [0xdc2626, 0x2563eb, 0xd97706, 0x059669, 0x7c3aed];
    const pineZones = [
      { rect: [-282, -20, -1322, -1038], mode: "alpine" },
      { rect: [22, 322, -1322, -1160], mode: "alpine" },
      { rect: [22, 322, -1120, -1038], mode: "industrial" },
      { rect: [-400, -320, -1380, -940], mode: "forest" },
      { rect: [360, 440, -1380, -1168], mode: "industrial" },
      { rect: [-280, -25, -1000, -910], mode: "forest" },
      { rect: [25, 340, -1000, -910], mode: "alpine" },
    ];

    pineZones.forEach(({ rect: [x0, x1, z0, z1], mode }) => {
      const cols = Math.max(1, Math.floor((x1 - x0) / 48));
      const rows = Math.max(1, Math.floor((z1 - z0) / 48));
      const stepX = (x1 - x0) / cols;
      const stepZ = (z1 - z0) / rows;

      for (let ix = 0; ix < cols; ix++) {
        for (let iz = 0; iz < rows; iz++) {
          const px = x0 + (ix + 0.5) * stepX + (rand() - 0.5) * 6;
          const pz = z0 + (iz + 0.5) * stepZ + (rand() - 0.5) * 6;
          const w = Math.min(stepX - 10, 18 + rand() * 12);
          const d = Math.min(stepZ - 10, 18 + rand() * 12);
          if (!isClearOfRoadsAndWater(px, pz, w * 0.5, d * 0.5)) continue;

          if (mode === "forest") {
            for (let t = 0; t < 4; t++) {
              treeBatch.push({ x: px + (rand() - 0.5) * 26, z: pz + (rand() - 0.5) * 26, s: 1.1 + rand() * 0.8 });
            }
          } else if (mode === "industrial") {
            const pRoll = rand();
            if (pRoll < 0.45) {
              const h = 11 + rand() * 7;
              pushT(boxBatches.warehouse, px, h / 2, pz, w, h, d);
              pushT(boxBatches.roof, px, h + 0.9, pz, w * 0.85, 1.8, d * 0.75);
              addAABB(px - w / 2, px + w / 2, pz - d / 2, pz + d / 2, -2, h + 2, true);
            } else if (pRoll < 0.78) {
              const stacks = 2 + Math.floor(rand() * 2);
              for (let s = 0; s < stacks; s++) {
                const col = containerPalette[Math.floor(rand() * containerPalette.length)];
                pushT(boxBatches.container, px, 2.2 + s * 4.5, pz, 20, 4.4, 8.6, 0, col);
              }
              addAABB(px - 10, px + 10, pz - 4.3, pz + 4.3, -2, stacks * 4.5, true);
            } else {
              const r = 6.5 + rand() * 2.5;
              const h = 18 + rand() * 12;
              pushT(cylBatches.silo, px, h / 2, pz, r, h, r);
              addCircleCollider(px, pz, r + 0.2, -2, h, true);
            }
          } else {
            if (rand() < 0.34) {
              for (let t = 0; t < 3; t++) {
                treeBatch.push({ x: px + (rand() - 0.5) * 20, z: pz + (rand() - 0.5) * 20, s: 1.0 + rand() * 0.6 });
              }
              continue;
            }
            const h = 9 + rand() * 11;
            pushT(boxBatches.alpine, px, h / 2, pz, w, h, d);
            pushT(pitchedRoofBatch, px, h + 4.0, pz, w * 0.78, 8.0, d * 0.78, Math.PI / 4);
            addAABB(px - w / 2, px + w / 2, pz - d / 2, pz + d / 2, -2, h + 8, true);
          }
        }
      }
    });

    [
      [-15, -180], [15, -180], [-15, -70], [15, -70], [-15, 70], [15, 70], [-15, 190], [15, 190],
      [-180, -15], [110, -15], [250, -15], [1020, -15], [1180, -15], [1410, -15],
      [1265, -140], [1265, 130], [-15, -950], [15, -1240], [-160, -1034], [180, -1156],
    ].forEach(([lx, lz]) => lampBatch.push({ x: lx, z: lz }));

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
    buildInstanced(unitBoxGeo, facadeMats.resort, boxBatches.resort);
    buildInstanced(unitBoxGeo, facadeMats.alpine, boxBatches.alpine);
    buildInstanced(unitBoxGeo, facadeMats.warehouse, boxBatches.warehouse);
    buildInstanced(unitBoxGeo, facadeMats.cyber, boxBatches.cyber);
    buildInstanced(unitBoxGeo, roofDarkMat, boxBatches.roof);
    buildInstanced(unitBoxGeo, containerMat, boxBatches.container);

    buildInstanced(unitCylGeo, facadeMats.glass, cylBatches.glass);
    buildInstanced(unitCylGeo, facadeMats.cyber, cylBatches.cyber);
    buildInstanced(unitCylGeo, facadeMats.resort, cylBatches.resort);
    buildInstanced(unitCylGeo, siloMetalMat, cylBatches.silo);

    buildInstanced(spireConeGeo, spireMetalMat, spireBatch, false, false);
    buildInstanced(unitConeGeo, pitchedRoofMat, pitchedRoofBatch);
    neonBatches.forEach((b, idx) => buildInstanced(unitBoxGeo, neonMaterials[idx], b, false, false));

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1e5c2e, roughness: 0.85 });
    if (treeBatch.length) {
      const trunkInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45, 0.65, 4, 6), trunkMat, treeBatch.length);
      const crownInst = new THREE.InstancedMesh(new THREE.ConeGeometry(2.8, 7.2, 6), leafMat, treeBatch.length);
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

    if (lampBatch.length) {
      const poleInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.2, 8.5, 5), poleMat, lampBatch.length);
      const bulbInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 6, 6), bulbMat, lampBatch.length);
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

    const farMtnMat = new THREE.MeshStandardMaterial({ color: 0x26353a, roughness: 0.95 });
    const farMtnInst = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), farMtnMat, 48);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const rad = 1850 + (i % 4) * 140;
      const h = 110 + (i % 5) * 52;
      const w = 150 + (i % 3) * 55;
      dummy.position.set(600 + Math.cos(a) * rad, h * 0.5 - 2, -500 + Math.sin(a) * rad);
      dummy.rotation.set(0, a, 0);
      dummy.scale.set(w, h, w);
      dummy.updateMatrix();
      farMtnInst.setMatrixAt(i, dummy.matrix);
    }
    farMtnInst.instanceMatrix.needsUpdate = true;
    scene.add(farMtnInst);

    // =========================================================================
    // 13. EXACT SURFACE SAMPLER & SPATIAL HASH COLLIDER GRID
    // =========================================================================
    function isOnIslandLand(x, z) {
      for (let i = 0; i < ISLANDS.length; i++) {
        const isl = ISLANDS[i];
        if (x >= isl.minX && x <= isl.maxX && z >= isl.minZ && z <= isl.maxZ) {
          if (isl.hole && x > isl.hole.minX && x < isl.hole.maxX && z > isl.hole.minZ && z < isl.hole.maxZ) {
            return false;
          }
          return true;
        }
      }
      return false;
    }

    function isOnFlatRoad(x, z) {
      for (let i = 0; i < flatRoadRects.length; i++) {
        const r = flatRoadRects[i];
        if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return true;
      }
      return false;
    }

    function sampleSurface(x, z, currentY = 0, heading = 0) {
      const carFX = -Math.sin(heading);
      const carFZ = -Math.cos(heading);
      const inTunnel = isPointInTunnel(x, z);

      if (x >= BRIDGE.startX && x <= BRIDGE.endX && Math.abs(z - BRIDGE.z) <= BRIDGE.halfW + 0.6) {
        const { h, dhdx } = evalBridge(x);
        if (currentY >= h - 4.2) {
          return { height: h, slopePitch: Math.atan(dhdx * carFX), surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      if (x >= VIADUCT.eastStartX && x <= VIADUCT.curveCX && Math.abs(z + 1140) <= VIADUCT.halfW + 0.6) {
        const { h, dhdx } = evalEastViaduct(x);
        if (currentY >= h - 4.2) {
          return { height: h, slopePitch: Math.atan(dhdx * carFX), surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      if (x >= VIADUCT.curveCX && z <= VIADUCT.curveCZ) {
        const r = Math.hypot(x - VIADUCT.curveCX, z - VIADUCT.curveCZ);
        if (Math.abs(r - VIADUCT.curveR) <= VIADUCT.halfW + 0.6 && currentY >= VIADUCT.deckH - 4.2) {
          return { height: VIADUCT.deckH, slopePitch: 0, surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      if (z >= VIADUCT.curveCZ && z <= VIADUCT.southEndZ && Math.abs(x - 1280) <= VIADUCT.halfW + 0.6) {
        const { h, dhdz } = evalSouthViaduct(z);
        if (currentY >= h - 4.2) {
          return { height: h, slopePitch: Math.atan(dhdz * carFZ), surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      if (inTunnel) {
        return { height: 0.0, slopePitch: 0, surfaceType: "TUNNEL", onRoad: true, overWater: false, inTunnel: true, hitWall: false };
      }

      const onLand = isOnIslandLand(x, z);
      const onRoad = onLand && isOnFlatRoad(x, z);
      let bestH = onLand ? 0.0 : -0.35;
      let slopePitch = 0;
      let hitWall = false;
      let onRamp = false;

      for (let i = 0; i < ramps.length; i++) {
        const r = ramps[i];
        const dx = x - r.x;
        const dz = z - r.z;
        const cosA = Math.cos(r.angleY);
        const sinA = Math.sin(r.angleY);
        const lx = dx * cosA - dz * sinA;
        const lz = dx * sinA + dz * cosA;
        if (Math.abs(lx) <= r.width * 0.5 + 0.5 && Math.abs(lz) <= r.length * 0.5 + 0.4) {
          const t = THREE.MathUtils.clamp((r.length * 0.5 - lz) / r.length, 0, 1);
          const rampH = t * r.height;
          if (rampH - currentY > 1.25) {
            hitWall = true;
          } else if (rampH > bestH) {
            bestH = rampH;
            onRamp = true;
            const rfx = -Math.sin(r.angleY);
            const rfz = -Math.cos(r.angleY);
            slopePitch = Math.atan2(r.height, r.length) * (rfx * carFX + rfz * carFZ);
          }
        }
      }

      return {
        height: bestH,
        slopePitch,
        surfaceType: !onLand && !onRamp ? "WATER" : onRoad || onRamp ? "ROAD" : "GRASS",
        onRoad: onRoad || onRamp,
        overWater: !onLand && !onRamp,
        inTunnel: false,
        hitWall,
      };
    }

    const CELL = 80;
    const spatialGrid = new Map();
    colliders.forEach((c) => {
      const minCX = Math.floor(c.minX / CELL);
      const maxCX = Math.floor(c.maxX / CELL);
      const minCZ = Math.floor(c.minZ / CELL);
      const maxCZ = Math.floor(c.maxZ / CELL);
      for (let gx = minCX; gx <= maxCX; gx++) {
        for (let gz = minCZ; gz <= maxCZ; gz++) {
          const key = `${gx},${gz}`;
          if (!spatialGrid.has(key)) spatialGrid.set(key, []);
          spatialGrid.get(key).push(c);
        }
      }
    });

    function getNearbyColliders(x, z) {
      const gx = Math.floor(x / CELL);
      const gz = Math.floor(z / CELL);
      const seen = new Set();
      const out = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = spatialGrid.get(`${gx + dx},${gz + dz}`);
          if (!list) continue;
          for (let i = 0; i < list.length; i++) {
            const c = list[i];
            if (!seen.has(c)) {
              seen.add(c);
              out.push(c);
            }
          }
        }
      }
      return out;
    }

    // =========================================================================
    // 14. JAM-FREE AI TRAFFIC (PER-CLASS MASSES + PHYSICAL SPIN-OUT REACTIONS)
    // =========================================================================
    const trafficGroup = new THREE.Group();
    scene.add(trafficGroup);
    const trafficCars = [];

    const aiGlassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.88, roughness: 0.12 });
    const aiTireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const aiHeadlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff8d6, emissiveIntensity: 3.4 });
    const aiHeadBeamMat = createSoftBeamMaterial(0xfff4d0, 0.12);
    const aiHeadBeams = [];

    const aiWheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
    aiWheelGeo.rotateZ(Math.PI / 2);
    const aiBeamGeo = new THREE.ConeGeometry(1.5, 9.5, 14, 1, true);
    aiBeamGeo.rotateX(Math.PI / 2);

    const aiPalette = [
      0xf59e0b, 0xf8fafc, 0x3b82f6, 0x94a3b8, 0x10b981,
      0xef4444, 0x8b5cf6, 0x334155, 0xf97316, 0x06b6d4,
    ];

    const AI_CLASS_MASS = {
      hatchback: 1180,
      coupe: 1440,
      sedan: 1560,
      taxi: 1620,
      suv: 2180,
      van: 2520,
      truck: 6200,
      bus: 9800,
    };

    function createAIVehicle(type, colorHex) {
      const g = new THREE.Group();
      const paintMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.62, roughness: 0.26 });
      let len = 4.3, w = 1.98;

      if (type === "bus") {
        len = 8.4; w = 2.4;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 2.3, len), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.42 }));
        body.position.y = 1.65;
        body.castShadow = true;
        g.add(body);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.32, len + 0.02), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
        stripe.position.y = 1.05;
        g.add(stripe);
        const winBand = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.85, len - 0.8), aiGlassMat);
        winBand.position.y = 2.05;
        g.add(winBand);
      } else if (type === "truck") {
        len = 6.2; w = 2.25;
        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.55, 1.85), paintMat);
        cab.position.set(0, 1.2, -2.05);
        cab.castShadow = true;
        g.add(cab);
        const cargo = new THREE.Mesh(
          new THREE.BoxGeometry(2.26, 2.25, 4.15),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 })
        );
        cargo.position.set(0, 1.65, 1.0);
        cargo.castShadow = true;
        g.add(cargo);
      } else if (type === "van") {
        len = 4.9; w = 2.05;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 1.55, len), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.42 }));
        body.position.y = 1.2;
        body.castShadow = true;
        g.add(body);
        const ws = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.68, 0.14), aiGlassMat);
        ws.position.set(0, 1.48, -len * 0.5 - 0.02);
        g.add(ws);
      } else if (type === "suv") {
        len = 4.65; w = 2.08;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.72, len), paintMat);
        body.position.y = 0.76;
        body.castShadow = true;
        g.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.66, 2.85), aiGlassMat);
        cabin.position.set(0, 1.42, 0.25);
        cabin.castShadow = true;
        g.add(cabin);
      } else if (type === "coupe") {
        len = 4.4; w = 2.08;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.52, len), paintMat);
        body.position.y = 0.56;
        body.castShadow = true;
        g.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.46, 1.85), aiGlassMat);
        cabin.position.set(0, 1.02, 0.22);
        g.add(cabin);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.08, 0.36), aiGlassMat);
        wing.position.set(0, 1.06, 1.95);
        g.add(wing);
      } else if (type === "hatchback") {
        len = 3.75; w = 1.86;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.58, len), paintMat);
        body.position.y = 0.62;
        body.castShadow = true;
        g.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.56, 2.15), aiGlassMat);
        cabin.position.set(0, 1.16, 0.45);
        g.add(cabin);
      } else {
        const isTaxi = type === "taxi";
        const bodyMat = isTaxi
          ? new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.45, roughness: 0.32 })
          : paintMat;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.58, len), bodyMat);
        body.position.y = 0.62;
        body.castShadow = true;
        g.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.52, 2.1), aiGlassMat);
        cabin.position.set(0, 1.14, 0.15);
        cabin.castShadow = true;
        g.add(cabin);
        if (isTaxi) {
          const sign = new THREE.Mesh(
            new THREE.BoxGeometry(0.68, 0.22, 0.26),
            new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 2.2 })
          );
          sign.position.set(0, 1.5, 0.08);
          g.add(sign);
        }
      }

      const wheels = [];
      const wz = len * 0.32, wx = w * 0.51;
      [[-wx, -wz], [wx, -wz], [-wx, wz], [wx, wz]].forEach(([px, pz]) => {
        const wh = new THREE.Mesh(aiWheelGeo, aiTireMat);
        wh.position.set(px, 0.38, pz);
        g.add(wh);
        wheels.push(wh);
      });

      const halfL = len * 0.5;
      const halfW = w * 0.5;
      [-0.65, 0.65].forEach((lx) => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.08), aiHeadlightMat);
        hl.position.set(lx, 0.68, -halfL - 0.02);
        g.add(hl);
      });

      const beam = new THREE.Mesh(aiBeamGeo, aiHeadBeamMat);
      beam.position.set(0, 0.52, -halfL - 4.75);
      beam.rotation.x = -0.06;
      g.add(beam);
      aiHeadBeams.push(beam);

      const tailMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xff1e1e, emissiveIntensity: 0.85 });
      [-0.65, 0.65].forEach((lx) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), tailMat);
        tl.position.set(lx, 0.7, halfL + 0.02);
        g.add(tl);
      });

      trafficGroup.add(g);
      return {
        group: g,
        wheels,
        tailMat,
        halfW,
        halfL,
        mass: AI_CLASS_MASS[type] || 1600,
        radius: Math.hypot(halfW, halfL),
      };
    }

    const AI_MIST_MAX = 60;
    const aiMistPool = [];
    const aiMistGeo = new THREE.SphereGeometry(0.42, 6, 6);
    for (let i = 0; i < AI_MIST_MAX; i++) {
      const m = new THREE.Mesh(
        aiMistGeo,
        new THREE.MeshBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.25, depthWrite: false })
      );
      m.visible = false;
      scene.add(m);
      aiMistPool.push({ mesh: m, life: 0, maxLife: 0.45, vx: 0, vy: 0, vz: 0 });
    }
    let aiMistIdx = 0;

    function spawnAiMist(x, y, z) {
      const p = aiMistPool[aiMistIdx];
      aiMistIdx = (aiMistIdx + 1) % AI_MIST_MAX;
      p.mesh.position.set(x, y, z);
      p.mesh.scale.setScalar(0.5);
      p.mesh.material.opacity = 0.26;
      p.mesh.visible = true;
      p.life = p.maxLife;
      p.vx = (Math.random() - 0.5) * 1.6;
      p.vy = 1.2 + Math.random() * 0.9;
      p.vz = (Math.random() - 0.5) * 1.6;
    }

    const curveWaypoints = [];
    for (let i = 0; i <= 10; i++) {
      const ang = -Math.PI * 0.5 + (i / 10) * (Math.PI * 0.5);
      curveWaypoints.push([
        VIADUCT.curveCX + Math.cos(ang) * VIADUCT.curveR,
        VIADUCT.curveCZ + Math.sin(ang) * VIADUCT.curveR,
      ]);
    }

    const ROUTES = [
      [
        [0, 0], [0, -340], [0, -880], [0, -1140], [580, -1140],
        ...curveWaypoints,
        [1280, -500], [1280, 0], [960, 0], [320, 0],
      ],
      [[-260, -240], [220, -240], [220, 260], [-260, 260]],
      [[1080, -280], [1540, -280], [1540, 0], [1280, 0], [1280, 260], [1080, 260]],
      [[-300, -1340], [340, -1340], [340, -1020], [-300, -1020]],
    ];

    function buildSmoothLaneLoop(rawPts, reverse, laneOffset) {
      const pts = reverse ? [...rawPts].reverse() : [...rawPts];
      const n = pts.length;

      const offsetPts = [];
      for (let i = 0; i < n; i++) {
        const pPrev = pts[(i - 1 + n) % n];
        const pCur = pts[i];
        const pNext = pts[(i + 1) % n];

        const d1x = pCur[0] - pPrev[0], d1z = pCur[1] - pPrev[1];
        const l1 = Math.hypot(d1x, d1z) || 1;
        const n1x = -d1z / l1, n1z = d1x / l1;

        const d2x = pNext[0] - pCur[0], d2z = pNext[1] - pCur[1];
        const l2 = Math.hypot(d2x, d2z) || 1;
        const n2x = -d2z / l2, n2z = d2x / l2;

        const det = d1x * d2z - d1z * d2x;
        if (Math.abs(det) < 0.001 * l1 * l2) {
          offsetPts.push([pCur[0] + (n1x + n2x) * 0.5 * laneOffset, pCur[1] + (n1z + n2z) * 0.5 * laneOffset]);
        } else {
          const ax = pCur[0] + n1x * laneOffset, az = pCur[1] + n1z * laneOffset;
          const bx = pCur[0] + n2x * laneOffset, bz = pCur[1] + n2z * laneOffset;
          const t = ((bx - ax) * d2z - (bz - az) * d2x) / det;
          const clampedT = THREE.MathUtils.clamp(t, -25 / l1, 25 / l1);
          offsetPts.push([ax + d1x * clampedT, az + d1z * clampedT]);
        }
      }

      const smoothPts = [];
      for (let i = 0; i < n; i++) {
        const prev = offsetPts[(i - 1 + n) % n];
        const cur = offsetPts[i];
        const next = offsetPts[(i + 1) % n];

        const v1x = prev[0] - cur[0], v1z = prev[1] - cur[1];
        const v2x = next[0] - cur[0], v2z = next[1] - cur[1];
        const l1 = Math.hypot(v1x, v1z);
        const l2 = Math.hypot(v2x, v2z);
        if (l1 < 0.5 || l2 < 0.5) continue;

        const cosAng = (v1x * v2x + v1z * v2z) / (l1 * l2);
        if (cosAng > -0.92) {
          const trim = Math.min(11.0, l1 * 0.32, l2 * 0.32);
          const pA = [cur[0] + (v1x / l1) * trim, cur[1] + (v1z / l1) * trim];
          const pB = [cur[0] + (v2x / l2) * trim, cur[1] + (v2z / l2) * trim];
          const steps = 5;
          for (let s = 0; s <= steps; s++) {
            const u = s / steps;
            const mu = 1 - u;
            const qx = mu * mu * pA[0] + 2 * mu * u * cur[0] + u * u * pB[0];
            const qz = mu * mu * pA[1] + 2 * mu * u * cur[1] + u * u * pB[1];
            smoothPts.push([qx, qz]);
          }
        } else {
          smoothPts.push(cur);
        }
      }

      const segs = [];
      let totalLen = 0;
      for (let i = 0; i < smoothPts.length; i++) {
        const a = smoothPts[i];
        const b = smoothPts[(i + 1) % smoothPts.length];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const len = Math.hypot(dx, dz);
        if (len < 0.4) continue;
        segs.push({ x1: a[0], z1: a[1], dx, dz, len, startDist: totalLen, heading: Math.atan2(-dx, -dz) });
        totalLen += len;
      }
      return { segs, totalLen };
    }

    function sampleLoopPos(loopData, dist) {
      const d = ((dist % loopData.totalLen) + loopData.totalLen) % loopData.totalLen;
      for (let i = 0; i < loopData.segs.length; i++) {
        const s = loopData.segs[i];
        if (d <= s.startDist + s.len || i === loopData.segs.length - 1) {
          const t = THREE.MathUtils.clamp((d - s.startDist) / s.len, 0, 1);
          return { x: s.x1 + s.dx * t, z: s.z1 + s.dz * t, heading: s.heading };
        }
      }
      return { x: 0, z: 0, heading: 0 };
    }

    const compiledLoops = [
      { loop: buildSmoothLaneLoop(ROUTES[0], false, 3.2), count: 10 },
      { loop: buildSmoothLaneLoop(ROUTES[0], false, 7.2), count: 8 },
      { loop: buildSmoothLaneLoop(ROUTES[0], true, 3.2), count: 10 },
      { loop: buildSmoothLaneLoop(ROUTES[0], true, 7.2), count: 8 },
      { loop: buildSmoothLaneLoop(ROUTES[1], false, 3.8), count: 6 },
      { loop: buildSmoothLaneLoop(ROUTES[2], false, 3.8), count: 5 },
      { loop: buildSmoothLaneLoop(ROUTES[3], false, 3.8), count: 5 },
    ];

    compiledLoops.forEach(({ loop, count }, loopIdx) => {
      const isOuterSlowLane = loopIdx === 1 || loopIdx === 3;
      for (let i = 0; i < count; i++) {
        const r = rand();
        let type = "sedan";
        if (isOuterSlowLane && r < 0.45) type = r < 0.25 ? "truck" : "bus";
        else if (r < 0.24) type = "sedan";
        else if (r < 0.38) type = "taxi";
        else if (r < 0.52) type = "hatchback";
        else if (r < 0.68) type = "suv";
        else if (r < 0.82) type = "coupe";
        else if (r < 0.92) type = "van";
        else type = "truck";

        const colorHex = aiPalette[Math.floor(rand() * aiPalette.length)];
        const built = createAIVehicle(type, colorHex);

        const dist = ((i + 0.15) / count) * loop.totalLen;
        const p = sampleLoopPos(loop, dist);
        const surf = sampleSurface(p.x, p.z, 30, p.heading);
        const baseSpd =
          type === "bus" || type === "truck"
            ? 15 + rand() * 3
            : type === "coupe"
            ? 24 + rand() * 5
            : isOuterSlowLane
            ? 17 + rand() * 3.5
            : 20 + rand() * 4.5;

        built.group.position.set(p.x, surf.height, p.z);
        built.group.rotation.y = p.heading;

        trafficCars.push({
          mesh: built.group,
          wheels: built.wheels,
          tailMat: built.tailMat,
          halfW: built.halfW,
          halfL: built.halfL,
          mass: built.mass,
          radius: built.radius,
          loop,
          loopIdx,
          dist,
          x: p.x,
          y: surf.height,
          z: p.z,
          heading: p.heading,
          pitch: surf.slopePitch,
          roll: 0,
          speed: baseSpd,
          cruiseSpeed: baseSpd,
          knockVx: 0,
          knockVz: 0,
          knockYaw: 0,
          hitRoll: 0,
          hitPitch: 0,
          stunTimer: 0,
          stuckTimer: 0,
          deadlockGrace: 0,
        });
      }
    });

    // =========================================================================
    // 15. HARBOR YACHTS & OCEAN SHIPS (EXACT OBB + MASSES)
    // =========================================================================
    const boatsGroup = new THREE.Group();
    scene.add(boatsGroup);
    const boats = [];

    const boatCabinGlowMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfde68a, emissiveIntensity: 2.3, roughness: 0.2 });
    const navPortMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 3.4 });
    const navStbdMat = new THREE.MeshStandardMaterial({ color: 0x22ff55, emissive: 0x22ff55, emissiveIntensity: 3.4 });
    const navSternMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.2 });
    const wakeMatBase = new THREE.MeshBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });

    function createBoat(kind, accentHex) {
      const g = new THREE.Group();
      const hullWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.24, metalness: 0.24 });
      const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.28, metalness: 0.36 });
      const darkTrim = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });

      let halfW = 2.0, halfL = 5.5, sternZ = 6.0, mass = 8500;

      if (kind === "ship") {
        halfW = 5.4; halfL = 23.0; sternZ = 24.0; mass = 45000;
        const hull = new THREE.Mesh(new THREE.BoxGeometry(10.5, 4.4, 42.0), accentMat);
        hull.position.set(0, 1.8, 0);
        g.add(hull);
        const bow = new THREE.Mesh(new THREE.ConeGeometry(7.4, 10.0, 4), accentMat);
        bow.rotation.x = -Math.PI / 2;
        bow.rotation.y = Math.PI / 4;
        bow.scale.set(1.0, 1.0, 0.42);
        bow.position.set(0, 2.1, -25.5);
        g.add(bow);
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(9.2, 7.2, 7.5), hullWhite);
        bridge.position.set(0, 7.2, 14.5);
        g.add(bridge);
        const glow = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.6, 5.2), boatCabinGlowMat);
        glow.position.set(0, 9.0, 13.8);
        g.add(glow);
        const cCols = [0xdc2626, 0x2563eb, 0xf59e0b];
        for (let r = 0; r < 3; r++) {
          const stack = new THREE.Mesh(
            new THREE.BoxGeometry(8.2, 3.4, 8.2),
            new THREE.MeshStandardMaterial({ color: cCols[r] })
          );
          stack.position.set(0, 5.5, -10.5 + r * 9.5);
          g.add(stack);
        }
      } else if (kind === "yacht") {
        halfW = 2.0; halfL = 6.8; sternZ = 7.2; mass = 9500;
        const hull = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.45, 11.2), hullWhite);
        hull.position.set(0, 0.55, 0.5);
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
        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.35, 6.2), hullWhite);
        cab.position.set(0, 1.98, 0.8);
        g.add(cab);
        const winGlow = new THREE.Mesh(new THREE.BoxGeometry(3.02, 0.55, 4.9), boatCabinGlowMat);
        winGlow.position.set(0, 2.1, 0.6);
        g.add(winGlow);
        const topL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), navSternMat);
        topL.position.set(0, 4.8, 0.8);
        g.add(topL);
      } else {
        halfW = 1.3; halfL = 4.2; sternZ = 4.6; mass = 2800;
        const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 6.8), accentMat);
        hull.position.set(0, 0.35, 0.4);
        g.add(hull);
        const bow = new THREE.Mesh(new THREE.ConeGeometry(1.7, 3.2, 4), hullWhite);
        bow.rotation.x = -Math.PI / 2;
        bow.rotation.y = Math.PI / 4;
        bow.scale.set(1.0, 1.0, 0.35);
        bow.position.set(0, 0.42, -4.5);
        g.add(bow);
        const ws = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 1.8), darkTrim);
        ws.position.set(0, 0.98, 0);
        ws.rotation.x = -0.3;
        g.add(ws);
      }

      const portL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), navPortMat);
      portL.position.set(-1.5, 1.4, -2.5);
      g.add(portL);
      const stbdL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), navStbdMat);
      stbdL.position.set(1.5, 1.4, -2.5);
      g.add(stbdL);

      const wakeLen = kind === "ship" ? 28 : 11;
      const wakeW = kind === "ship" ? 13 : 4.5;
      const wakeGeo = new THREE.PlaneGeometry(wakeW, wakeLen);
      wakeGeo.rotateX(-Math.PI / 2);
      const wake = new THREE.Mesh(wakeGeo, wakeMatBase.clone());
      wake.position.set(0, 0.06, sternZ + wakeLen * 0.45);
      g.add(wake);

      boatsGroup.add(g);
      return { group: g, wake, halfW, halfL, mass, radius: Math.hypot(halfW, halfL) };
    }

    const boatSpecs = [
      { mode: "patrol", kind: "ship", color: 0x991b1b, axis: "z", fixed: 615, min: -860, max: 520, pos: -240, dir: 1, speed: 12 },
      { mode: "patrol", kind: "ship", color: 0x1e3a8a, axis: "z", fixed: 685, min: -860, max: 520, pos: 260, dir: -1, speed: 11 },
      { mode: "patrol", kind: "yacht", color: 0x0284c7, axis: "z", fixed: 415, min: -680, max: 460, pos: -120, dir: 1, speed: 16 },
      { mode: "patrol", kind: "speedboat", color: 0xf43f5e, axis: "z", fixed: 865, min: -680, max: 460, pos: 180, dir: -1, speed: 24 },
      { mode: "orbit", kind: "yacht", color: 0x0ea5e9, cx: 1470, cz: 175, rx: 75, rz: 62, speed: 0.26, dir: 1 },
      { mode: "orbit", kind: "speedboat", color: 0xf59e0b, cx: 1470, cz: 175, rx: 46, rz: 38, speed: 0.52, dir: -1 },
      { mode: "orbit", kind: "yacht", color: 0x7c3aed, cx: 740, cz: -720, rx: 160, rz: 130, speed: 0.16, dir: 1 },
      { mode: "orbit", kind: "speedboat", color: 0x10b981, cx: 740, cz: -720, rx: 110, rz: 85, speed: 0.28, dir: -1 },
    ];

    boatSpecs.forEach((s, idx) => {
      const built = createBoat(s.kind, s.color);
      boats.push({
        ...s,
        mesh: built.group,
        wake: built.wake,
        halfW: built.halfW,
        halfL: built.halfL,
        mass: built.mass,
        radius: built.radius,
        angle: idx * 1.1,
        angSpeed: (s.speed || 0.2) * (s.dir || 1),
        phase: idx * 1.5,
        x: s.cx || (s.axis === "x" ? s.pos : s.fixed),
        z: s.cz || (s.axis === "z" ? s.pos : s.fixed),
        heading: 0,
      });
    });

    function updateTrafficAndBoats(dt, elapsed, playerCar, waveStrength, roadMoisture, enabled) {
      updateTrafficLights(elapsed);

      trafficGroup.visible = enabled;
      boatsGroup.visible = enabled;

      for (let i = 0; i < AI_MIST_MAX; i++) {
        const m = aiMistPool[i];
        if (m.life > 0) {
          m.life -= dt;
          m.mesh.position.x += m.vx * dt;
          m.mesh.position.y += m.vy * dt;
          m.mesh.position.z += m.vz * dt;
          const r = Math.max(0, m.life / m.maxLife);
          m.mesh.scale.setScalar(0.5 + (1 - r) * 1.6);
          m.mesh.material.opacity = r * 0.26;
          if (m.life <= 0) m.mesh.visible = false;
        }
      }

      if (!enabled) return;

      // --- Smart Jam-Free AI Traffic + Physical Spin-Out & Recovery ---
      for (let i = 0; i < trafficCars.length; i++) {
        const ai = trafficCars[i];

        // Decay visual body jolt from impacts
        ai.hitRoll *= Math.exp(-7.5 * dt);
        ai.hitPitch *= Math.exp(-7.5 * dt);

        if (ai.stunTimer > 0) {
          ai.stunTimer -= dt;
          ai.x += ai.knockVx * dt;
          ai.z += ai.knockVz * dt;
          ai.heading += ai.knockYaw * dt;

          // Tire-scrub friction slows sideways skid and spin naturally
          ai.knockVx *= Math.exp(-2.8 * dt);
          ai.knockVz *= Math.exp(-2.8 * dt);
          ai.knockYaw *= Math.exp(-3.4 * dt);
          ai.speed = Math.hypot(ai.knockVx, ai.knockVz);

          // Keep knocked AI cars inside tunnel/bridge corridors
          if (isPointInTunnel(ai.x, ai.z)) {
            ai.x = THREE.MathUtils.clamp(ai.x, -9.2, 9.2);
          } else if (ai.x >= BRIDGE.startX && ai.x <= BRIDGE.endX && Math.abs(ai.z) < 16) {
            ai.z = THREE.MathUtils.clamp(ai.z, -9.2, 9.2);
          }

          const surfStun = sampleSurface(ai.x, ai.z, ai.y + 3.0, ai.heading);
          ai.y = THREE.MathUtils.lerp(ai.y, surfStun.height, Math.min(1, 14 * dt));
          ai.pitch = THREE.MathUtils.lerp(ai.pitch, surfStun.slopePitch, Math.min(1, 8 * dt));

          // Flash brake/hazard lights while spinning out!
          ai.tailMat.emissiveIntensity = Math.sin(elapsed * 18) > 0 ? 4.2 : 0.9;
          ai.mesh.position.set(ai.x, ai.y, ai.z);
          ai.mesh.rotation.set(ai.pitch + ai.hitPitch, ai.heading, ai.hitRoll, "YXZ");
          continue;
        }

        if (ai.deadlockGrace > 0) ai.deadlockGrace -= dt;

        const fx = -Math.sin(ai.heading);
        const fz = -Math.cos(ai.heading);
        const rx = Math.cos(ai.heading);
        const rz = -Math.sin(ai.heading);

        let targetSpeed = ai.cruiseSpeed;
        let atRedLight = false;
        let blockedByPlayer = false;

        // 1) Obey Working Traffic Lights at stop lines
        const isNS = Math.abs(fz) > Math.abs(fx);
        for (let tIdx = 0; tIdx < trafficLights.length; tIdx++) {
          const tl = trafficLights[tIdx];
          const dx = tl.x - ai.x;
          const dz = tl.z - ai.z;
          if (Math.abs(dx) > 40 || Math.abs(dz) > 40) continue;

          const fwd = dx * fx + dz * fz;
          const lat = Math.abs(dx * rx + dz * rz);
          if (lat < 9.5 && fwd > tl.stopDist && fwd < tl.stopDist + 24) {
            const sig = isNS ? tl.nsState : tl.ewState;
            if (sig === "RED" || (sig === "YELLOW" && fwd > tl.stopDist + 4.5)) {
              const gapToLine = fwd - tl.stopDist - ai.halfL;
              atRedLight = true;
              if (gapToLine <= 0.8) targetSpeed = 0;
              else targetSpeed = Math.min(targetSpeed, ai.cruiseSpeed * THREE.MathUtils.clamp(gapToLine / 18, 0, 1));
              break;
            }
          }
        }

        // 2) Yield smoothly if Player Car is directly ahead in the same lane
        const pdx = playerCar.x - ai.x;
        const pdz = playerCar.z - ai.z;
        if (Math.abs(playerCar.y - ai.y) < 3.2) {
          const pFwd = pdx * fx + pdz * fz;
          const pLat = Math.abs(pdx * rx + pdz * rz);
          if (pFwd > 0 && pFwd < 26 && pLat < ai.halfW + 1.55) {
            const pGap = pFwd - ai.halfL - 2.4;
            blockedByPlayer = true;
            if (pGap <= 2.2) targetSpeed = 0;
            else targetSpeed = Math.min(targetSpeed, ai.cruiseSpeed * THREE.MathUtils.clamp((pGap - 2.2) / 18, 0, 1));
          }
        }

        // 3) Direction-Aware IDM Following & Cross-Traffic Yielding
        for (let j = 0; j < trafficCars.length; j++) {
          if (i === j) continue;
          const o = trafficCars[j];
          if (Math.abs(o.y - ai.y) > 3.0) continue;

          const odx = o.x - ai.x;
          const odz = o.z - ai.z;
          if (Math.abs(odx) > 28 || Math.abs(odz) > 28) continue;

          const ofx = -Math.sin(o.heading);
          const ofz = -Math.cos(o.heading);
          const align = fx * ofx + fz * ofz;

          if (align < -0.55) continue;

          const oFwd = odx * fx + odz * fz;
          if (oFwd <= 0) continue;
          const oLat = Math.abs(odx * rx + odz * rz);

          if (align > 0.55) {
            if (oLat < ai.halfW + o.halfW + 0.55 && oFwd < 26) {
              const gap = oFwd - ai.halfL - o.halfL;
              if (gap <= 2.6) {
                targetSpeed = 0;
              } else {
                const safeSpd = o.speed + Math.max(0, (gap - 3.2) * 1.15);
                targetSpeed = Math.min(targetSpeed, Math.max(0, safeSpd));
              }
            }
          } else if (ai.deadlockGrace <= 0) {
            if (oFwd < ai.halfL + o.halfW + 10.5 && oLat < o.halfL + ai.halfW + 1.2) {
              const crossGap = oFwd - ai.halfL - o.halfW;
              if (crossGap <= 3.0) targetSpeed = 0;
              else targetSpeed = Math.min(targetSpeed, ai.cruiseSpeed * THREE.MathUtils.clamp((crossGap - 2.5) / 8, 0, 1));
            }
          }
        }

        // 4) Anti-Deadlock Breaker
        if (ai.speed < 0.6 && !atRedLight && !blockedByPlayer) {
          ai.stuckTimer += dt;
          if (ai.stuckTimer > 4.5) {
            ai.deadlockGrace = 2.6;
            ai.stuckTimer = 0;
          }
        } else {
          ai.stuckTimer = Math.max(0, ai.stuckTimer - dt * 2);
        }

        const isBraking = targetSpeed < ai.speed - 0.8 || targetSpeed < 0.5;
        const accelRate = isBraking ? 8.5 : 3.2;
        ai.speed = THREE.MathUtils.lerp(ai.speed, targetSpeed, 1 - Math.exp(-accelRate * dt));
        ai.tailMat.emissiveIntensity = isBraking ? 3.8 : 0.85;

        ai.dist += ai.speed * dt;
        const p = sampleLoopPos(ai.loop, ai.dist);
        const look = sampleLoopPos(ai.loop, ai.dist + 5.5);
        const smoothHeading = Math.atan2(-(look.x - p.x), -(look.z - p.z));
        const surf = sampleSurface(p.x, p.z, ai.y + 3.0, smoothHeading);

        // Smooth lane re-entry after being knocked sideways
        const recoverRate = Math.hypot(ai.x - p.x, ai.z - p.z) > 2.5 ? 4.2 : 14.0;
        ai.x = THREE.MathUtils.lerp(ai.x, p.x, Math.min(1, recoverRate * dt));
        ai.z = THREE.MathUtils.lerp(ai.z, p.z, Math.min(1, recoverRate * dt));
        ai.y = THREE.MathUtils.lerp(ai.y, surf.height, Math.min(1, 14 * dt));
        ai.heading = lerpAngle(ai.heading, smoothHeading, Math.min(1, (recoverRate < 6 ? 4.5 : 9) * dt));
        ai.pitch = THREE.MathUtils.lerp(ai.pitch, surf.slopePitch, Math.min(1, 8 * dt));

        ai.mesh.position.set(ai.x, ai.y, ai.z);
        ai.mesh.rotation.set(ai.pitch + ai.hitPitch, ai.heading, ai.hitRoll, "YXZ");

        const spin = (ai.speed * dt) / 0.38;
        for (let w = 0; w < ai.wheels.length; w++) ai.wheels[w].rotation.x -= spin;

        if (
          roadMoisture > 0.38 &&
          ai.speed > 11 &&
          !surf.inTunnel &&
          Math.abs(ai.x - playerCar.x) < 95 &&
          Math.abs(ai.z - playerCar.z) < 95 &&
          Math.random() < 0.25 * roadMoisture
        ) {
          spawnAiMist(ai.x - fx * ai.halfL, ai.y + 0.28, ai.z - fz * ai.halfL);
        }
      }

      // --- Update Harbor & Ocean Boats ---
      for (let i = 0; i < boats.length; i++) {
        const b = boats[i];
        let vx = 0, vz = 0;
        if (b.mode === "orbit") {
          b.angle += b.angSpeed * dt;
          b.x = b.cx + Math.cos(b.angle) * b.rx;
          b.z = b.cz + Math.sin(b.angle) * b.rz;
          vx = -Math.sin(b.angle) * b.rx * b.angSpeed;
          vz = Math.cos(b.angle) * b.rz * b.angSpeed;
        } else {
          b.pos += b.dir * b.speed * dt;
          if (b.pos > b.max) { b.pos = b.max; b.dir = -1; }
          else if (b.pos < b.min) { b.pos = b.min; b.dir = 1; }
          if (b.axis === "x") { b.x = b.pos; b.z = b.fixed; vx = b.dir * b.speed; }
          else { b.x = b.fixed; b.z = b.pos; vz = b.dir * b.speed; }
        }

        b.heading = lerpAngle(b.heading, Math.atan2(-vx, -vz), Math.min(1, 5 * dt));
        const swell = Math.sin(b.x * 0.065 + elapsed * 1.5) * Math.cos(b.z * 0.06 - elapsed * 1.25);
        const bobY = -0.24 + swell * 0.12 * (0.5 + waveStrength);
        const pitch = Math.cos(elapsed * 2.0 + b.phase) * 0.025 * (0.5 + waveStrength);
        const roll = Math.sin(elapsed * 1.6 + b.phase) * 0.04 * (0.5 + waveStrength);

        b.mesh.position.set(b.x, bobY, b.z);
        b.mesh.rotation.set(pitch, b.heading, roll, "YXZ");
        b.wake.scale.x = 0.92 + Math.sin(elapsed * 5 + b.phase) * 0.1;
        b.wake.material.opacity = 0.28 + Math.sin(elapsed * 4 + b.phase) * 0.08;
      }
    }

    function setTrafficLighting(headlightsOn, rtOn) {
      aiHeadlightMat.emissiveIntensity = headlightsOn ? 3.8 : 0.45;
      aiHeadBeams.forEach((b) => (b.visible = headlightsOn && rtOn));
      boatCabinGlowMat.emissiveIntensity = headlightsOn ? 2.8 : 0.35;
      studAmberMat.emissiveIntensity = headlightsOn ? 3.2 : 0.5;
      studWhiteMat.emissiveIntensity = headlightsOn ? 2.6 : 0.4;
      gantrySignMaterials.forEach((m) => (m.emissiveIntensity = headlightsOn ? 0.95 : 0.22));
    }

    // =========================================================================
    // 16. 3D WEATHER SYSTEM (FALLING RAIN + 3D GROUND SPLASH CROWNS & RINGS)
    // =========================================================================
    const MAX_RAIN = 2000;
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
    const rainLines = new THREE.LineSegments(
      rainGeo,
      new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.42, depthWrite: false })
    );
    rainLines.frustumCulled = false;
    scene.add(rainLines);

    const MAX_SPLASHES = 200;
    const rainSplashGroup = new THREE.Group();
    scene.add(rainSplashGroup);

    const splashCrownGeo = new THREE.CylinderGeometry(0.18, 0.03, 0.26, 6, 1, true);
    splashCrownGeo.translate(0, 0.13, 0);
    const splashCrownInst = new THREE.InstancedMesh(
      splashCrownGeo,
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.52, depthWrite: false, side: THREE.DoubleSide }),
      MAX_SPLASHES
    );
    splashCrownInst.frustumCulled = false;

    const splashRingGeo = new THREE.RingGeometry(0.14, 0.22, 10);
    splashRingGeo.rotateX(-Math.PI / 2);
    const splashRingInst = new THREE.InstancedMesh(
      splashRingGeo,
      new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }),
      MAX_SPLASHES
    );
    splashRingInst.frustumCulled = false;

    rainSplashGroup.add(splashCrownInst);
    rainSplashGroup.add(splashRingInst);

    const splashes = [];
    for (let i = 0; i < MAX_SPLASHES; i++) {
      splashes.push({ x: 0, y: -50, z: 0, age: Math.random() * 0.35, life: 0.22 + Math.random() * 0.2, scale: 0.75 + Math.random() * 0.65 });
    }

    const lightningLight = new THREE.DirectionalLight(0xcbe8ff, 0.0);
    lightningLight.position.set(160, 280, -160);
    scene.add(lightningLight);

    const boltGeo = new THREE.BufferGeometry();
    boltGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(36), 3));
    const boltMat = new THREE.LineBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.0, fog: false });
    const lightningBolt = new THREE.Line(boltGeo, boltMat);
    lightningBolt.frustumCulled = false;
    scene.add(lightningBolt);

    let lightningFlash = 0;
    let nextLightningTimer = 3.8;

    function updateWeather(dt, weatherPreset, cameraPos, car, inTunnel, onThunder) {
      if (weatherPreset.rainCount > 0 && !inTunnel) {
        rainLines.visible = true;
        rainGeo.setDrawRange(0, weatherPreset.rainCount * 2);

        const cx = cameraPos.x;
        const cz = cameraPos.z;
        const cyBase = Math.max(0, cameraPos.y - 6);
        const halfXZ = RAIN_BOX_XZ * 0.5;
        const posAttr = rainGeo.attributes.position;

        for (let i = 0; i < weatherPreset.rainCount; i++) {
          const d = rainDrops[i];
          d.y -= weatherPreset.rainSpeed * d.spd * dt;
          d.x += weatherPreset.rainTiltX * dt;

          if (d.y < cyBase - 6) d.y += RAIN_BOX_Y;
          if (d.y > cyBase + RAIN_BOX_Y) d.y -= RAIN_BOX_Y;
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

        rainSplashGroup.visible = true;
        const activeSplashes = weatherPreset.splashCount;
        const fx = -Math.sin(car.heading);
        const fz = -Math.cos(car.heading);

        for (let i = 0; i < MAX_SPLASHES; i++) {
          const s = splashes[i];
          if (i >= activeSplashes) {
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            splashCrownInst.setMatrixAt(i, dummy.matrix);
            splashRingInst.setMatrixAt(i, dummy.matrix);
            continue;
          }

          s.age += dt;
          if (s.age >= s.life) {
            s.age = 0;
            s.life = 0.2 + Math.random() * 0.22;
            s.scale = 0.75 + Math.random() * 0.75;
            const ahead = -8 + Math.random() * 54;
            const side = (Math.random() - 0.5) * 44;
            const sx = car.x + fx * ahead + fz * side;
            const sz = car.z + fz * ahead - fx * side;
            const surf = sampleSurface(sx, sz, car.y + 4.5, car.heading);
            if (surf.inTunnel) {
              s.y = -999;
            } else {
              s.x = sx;
              s.y = surf.height + 0.06;
              s.z = sz;
            }
          }

          if (s.y < -10) {
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            splashCrownInst.setMatrixAt(i, dummy.matrix);
            splashRingInst.setMatrixAt(i, dummy.matrix);
            continue;
          }

          const t = s.age / s.life;
          const crownPulse = Math.sin(Math.min(1, t * 1.45) * Math.PI);
          const cXZ = (0.35 + t * 1.35) * s.scale;
          const cY = Math.max(0.001, crownPulse * 1.35 * s.scale);
          dummy.position.set(s.x, s.y, s.z);
          dummy.rotation.set(0, i * 1.3, 0);
          dummy.scale.set(cXZ, cY, cXZ);
          dummy.updateMatrix();
          splashCrownInst.setMatrixAt(i, dummy.matrix);

          const rScale = (0.28 + t * 2.15) * s.scale * (1 - t * 0.2);
          dummy.position.set(s.x, s.y + 0.02, s.z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(rScale, 1, rScale);
          dummy.updateMatrix();
          splashRingInst.setMatrixAt(i, dummy.matrix);
        }
        splashCrownInst.instanceMatrix.needsUpdate = true;
        splashRingInst.instanceMatrix.needsUpdate = true;
      } else {
        rainLines.visible = false;
        rainSplashGroup.visible = false;
      }

      if (weatherPreset.lightning) {
        nextLightningTimer -= dt;
        if (nextLightningTimer <= 0) {
          lightningFlash = 1.0;
          const angle = car.heading + (Math.random() - 0.5) * 1.4;
          const dist = 190 + Math.random() * 230;
          let bx = car.x - Math.sin(angle) * dist;
          let bz = car.z - Math.cos(angle) * dist;

          const attr = lightningBolt.geometry.attributes.position;
          for (let i = 0; i < 12; i++) {
            const y = 210 * (1 - i / 11);
            if (i > 0) {
              bx += (Math.random() - 0.5) * 18;
              bz += (Math.random() - 0.5) * 18;
            }
            attr.setXYZ(i, bx, y, bz);
          }
          attr.needsUpdate = true;
          boltMat.opacity = inTunnel ? 0 : 1.0;
          setTimeout(onThunder, 250 + Math.random() * 850);
          nextLightningTimer = 4.2 + Math.random() * 7.2;
        }
      }

      if (lightningFlash > 0.005) {
        lightningFlash *= Math.exp(-9.5 * dt);
        skyUniforms.uFlash.value = lightningFlash * 0.85;
        lightningLight.intensity = inTunnel ? 0 : lightningFlash * 4.2;
        boltMat.opacity = inTunnel ? 0 : Math.max(0, lightningFlash * 1.15);
      } else {
        skyUniforms.uFlash.value = 0;
        lightningLight.intensity = 0;
        boltMat.opacity = 0;
      }

      return lightningFlash;
    }

    function getZoneName(x, z) {
      if (isPointInTunnel(x, z)) return "ALPINE RIDGE TUNNEL";
      if (x >= BRIDGE.startX - 10 && x <= BRIDGE.endX + 10 && Math.abs(z) <= 28) {
        return "GOLDEN BAY SUSPENSION BRIDGE";
      }
      if (
        (x >= VIADUCT.eastStartX && x <= VIADUCT.curveCX + 160 && Math.abs(z + 1140) <= 30) ||
        (x >= 1120 && z <= -380 && z >= -1160)
      ) {
        return "NE COASTAL VIADUCT HIGHWAY";
      }
      for (let i = 0; i < ISLANDS.length; i++) {
        const isl = ISLANDS[i];
        if (x >= isl.minX && x <= isl.maxX && z >= isl.minZ && z <= isl.maxZ) {
          if (isl.hole && x > isl.hole.minX && x < isl.hole.maxX && z > isl.hole.minZ && z < isl.hole.maxZ) {
            return "PALM MARINA LAGOON";
          }
          return isl.name;
        }
      }
      return "GOLDEN BAY STRAIT";
    }

    const allRoadMats = [roadMatCity, roadMatHighway, roadMatBridge, roadMatInter];
    function setRoadUniform(name, val) {
      allRoadMats.forEach((m) => {
        if (!m.uniforms[name]) return;
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
      groundGroup,
      waterGroup,
      roadGroup,
      roadShadowGroup,
      trafficGroup,
      boatsGroup,
      trafficLightsGroup,
      rainLines,
      rainSplashGroup,
      colliders,
      minimapBuildings,
      roadSegments,
      ramps,
      trafficCars,
      boats,
      trafficLights,
      buildingMaterials,
      neonMaterials,
      bulbMat,
      getNearbyColliders,
      sampleSurface,
      isPointInTunnel,
      getZoneName,
      setRoadUniform,
      setWaterUniform,
      setTrafficLighting,
      updateTrafficAndBoats,
      updateWeather,
    };
  }

  return {
    CONFIG,
    WARP_POINTS,
    TIME_PRESETS,
    WEATHER_PRESETS,
    samplePuddleAt,
    createSoftBeamMaterial,
    buildWorld,
  };
})();