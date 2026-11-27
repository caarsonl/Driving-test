window.HorizonWorld = (() => {
  "use strict";

  // =========================================================================
  // 1. 6-CITY ARCHIPELAGO, MULTI-LEVEL SKYWAYS, PRESETS & FAST TRAVEL
  // =========================================================================
  const CONFIG = {
    WORLD_BOUNDS: { minX: -1360, maxX: 2060, minZ: -1660, maxZ: 1680 },
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
      { id: "apexia", name: "APEXIA METROPOLIS", minX: -420, maxX: 1620, minZ: 640, maxZ: 1480 },
      { id: "kuroshio", name: "KUROSHIO NEON DISTRICT", minX: -1160, maxX: -540, minZ: -140, maxZ: 780 },
      { id: "solara", name: "SOLARA MESA TECH CITY", minX: 1220, maxX: 1880, minZ: -1460, maxZ: -780 },
    ],

    BRIDGE: { startX: 320, endX: 960, z: 0, halfW: 11.0, peakH: 24.0 },
    SOUTH_WEST_BRIDGE: { x: 0, startZ: 380, endZ: 640, halfW: 11.0, peakH: 13.5 },
    SOUTH_EAST_BRIDGE: { x: 1280, startZ: 360, endZ: 640, halfW: 11.0, peakH: 14.5 },
    WEST_APEXIA_BRIDGE: { z: 720, startX: -540, endX: -420, halfW: 10.0, peakH: 9.5 },
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

    SKYWAY_EW: {
      axis: "x",
      coord: 60,
      rampUpStart: -960,
      rampUpEnd: -820,
      rampDownStart: 60,
      rampDownEnd: 200,
      deckH: 11.5,
      halfW: 9.2,
    },
    SKYWAY_NS: {
      axis: "z",
      coord: -72,
      rampUpStart: -225,
      rampUpEnd: -85,
      rampDownStart: 1040,
      rampDownEnd: 1185,
      deckH: 22.0,
      halfW: 9.2,
    },
    SKYWAY_SOLARA: {
      axis: "x",
      coord: -1140,
      rampUpStart: 1140,
      rampUpEnd: 1140,
      rampDownStart: 1600,
      rampDownEnd: 1745,
      deckH: 12.04,
      halfW: 9.8,
    },
  };

  const WARP_POINTS = [
    { name: "METRO BAY", x: 0, y: 0.2, z: 45, heading: 0 },
    { name: "SKYWAY STACK", x: -72, y: 22.2, z: 180, heading: 0 },
    { name: "LEVEL-4 OVERPASS", x: 85, y: 31.8, z: 582, heading: -Math.PI / 2 },
    { name: "METRO UNDERWAY", x: 165, y: 0.2, z: -215, heading: Math.PI },
    { name: "SUBSEA TUNNEL", x: 1540, y: 0.2, z: -285, heading: 0 },
    { name: "PINECREST TOUGE", x: -305, y: 0.2, z: -1025, heading: Math.PI / 2 },
    { name: "KUROSHIO NEON", x: -860, y: 0.2, z: 280, heading: 0 },
    { name: "APEXIA GP CIRCUIT", x: 460, y: 0.2, z: 915, heading: Math.PI },
    { name: "APEXIA SKYLINE", x: 0, y: 0.2, z: 820, heading: Math.PI },
    { name: "SOLARA MESA", x: 1520, y: 0.2, z: -960, heading: -Math.PI / 2 },
    { name: "SUSPENSION BRIDGE", x: 270, y: 0.2, z: 0, heading: -Math.PI / 2 },
    { name: "PALM ISLAND", x: 1030, y: 0.2, z: 0, heading: -Math.PI / 2 },
    { name: "ALPINE TUNNEL", x: 0, y: 0.2, z: -295, heading: 0 },
    { name: "PINECREST", x: 0, y: 0.2, z: -960, heading: 0 },
  ];

  const TIME_PRESETS = [
    {
      name: "SUNSET",
      skyTop: 0x16224a,
      skyHorizon: 0xf47b47,
      skyBottom: 0x3b1d2e,
      fog: 0xb65549,
      fogDensity: 0.0006,
      sunColor: 0xffa85c,
      sunIntensity: 1.55,
      sunPos: [-360, 102, -280],
      hemiSky: 0xfdba74,
      hemiGround: 0x1e293b,
      hemiIntensity: 0.7,
      ambientRoad: 0x543e49,
      waterDeep: 0x071e38,
      waterShallow: 0x185c72,
      windowGlow: 0.92,
      neonGlow: 2.35,
      headlights: true,
      nightMix: 0.18,
      dryRate: 0.045,
      puddleDryRate: 0.011,
      exposure: 1.14,
    },
    {
      name: "NIGHT",
      skyTop: 0x020510,
      skyHorizon: 0x0d1b38,
      skyBottom: 0x040710,
      fog: 0x071024,
      fogDensity: 0.00095,
      sunColor: 0x7cb8ff,
      sunIntensity: 0.46,
      sunPos: [160, 310, -240],
      hemiSky: 0x22416b,
      hemiGround: 0x050811,
      hemiIntensity: 0.52,
      ambientRoad: 0x1e2e4d,
      waterDeep: 0x020a18,
      waterShallow: 0x0a2847,
      windowGlow: 1.55,
      neonGlow: 3.1,
      headlights: true,
      nightMix: 1.0,
      dryRate: 0.022,
      puddleDryRate: 0.0055,
      exposure: 1.2,
    },
    {
      name: "DAY",
      skyTop: 0x1e56d9,
      skyHorizon: 0x99dafc,
      skyBottom: 0x60a5fa,
      fog: 0x9cd4f7,
      fogDensity: 0.00048,
      sunColor: 0xfff7e8,
      sunIntensity: 1.62,
      sunPos: [280, 380, 220],
      hemiSky: 0xdbeafe,
      hemiGround: 0x3f6212,
      hemiIntensity: 0.82,
      ambientRoad: 0x6b7482,
      waterDeep: 0x05385e,
      waterShallow: 0x0f8cb3,
      windowGlow: 0.08,
      neonGlow: 0.45,
      headlights: false,
      nightMix: 0.0,
      dryRate: 0.072,
      puddleDryRate: 0.017,
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
      puddleFillRate: 0.0,
      targetPuddle: 0.0,
      waveStrength: 0.48,
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
      splashCount: 95,
      rainSpeed: 46,
      rainTiltX: 3.8,
      rainIntensity: 0.75,
      cloudCover: 0.82,
      wetRate: 0.085,
      targetMoisture: 0.84,
      puddleFillRate: 0.052,
      targetPuddle: 0.82,
      waveStrength: 0.92,
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
      splashCount: 150,
      rainSpeed: 66,
      rainTiltX: 12.0,
      rainIntensity: 1.0,
      cloudCover: 0.96,
      wetRate: 0.145,
      targetMoisture: 1.0,
      puddleFillRate: 0.095,
      targetPuddle: 1.0,
      waveStrength: 1.55,
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
      wetRate: 0.018,
      targetMoisture: 0.24,
      puddleFillRate: 0.0,
      targetPuddle: 0.0,
      waveStrength: 0.3,
      fogMult: 3.3,
      skyDarken: 0.78,
      sunMult: 0.45,
      forceHeadlights: true,
      lightning: false,
      rainAudio: 0.0,
    },
  ];

  // =========================================================================
  // 2. SHARED NOISE, PUDDLE & ELEVATION MATH (MATCHED 1:1 BETWEEN JS & GLSL)
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

  function isPointInTunnel(x, z, y = 0) {
    const T = CONFIG.TUNNEL;
    if (Math.abs(x - T.x) <= T.halfW + 1.8 && z <= T.startZ && z >= T.endZ) return true;
    if (y < -2.0 && x >= 1515 && x <= 1545 && z >= -784 && z <= -374) return true;
    return false;
  }

  function samplePuddleAt(x, z, puddleLevel) {
    if (puddleLevel <= 0.02 || isPointInTunnel(x, z)) return 0.0;
    const p1 = noise2DJS(x * 0.032, z * 0.032);
    const p2 = noise2DJS(x * 0.075 + 11.3, z * 0.075 + 7.1);
    const p3 = noise2DJS(x * 0.17 + 3.7, z * 0.17 + 19.4);
    const raw = p1 * 0.56 + p2 * 0.30 + p3 * 0.14;
    const n = Math.max(0.0, Math.min(1.0, (raw - 0.24) / 0.52));
    const thresh = 0.84 - puddleLevel * 0.44;
    return smoothstep(thresh - 0.025, thresh + 0.025, n) * smoothstep(0.02, 0.22, puddleLevel);
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

  function evalSpanBridgeX(x, cfg) {
    const span = cfg.endX - cfg.startX;
    const t = THREE.MathUtils.clamp((x - cfg.startX) / span, 0, 1);
    const s = Math.sin(Math.PI * t);
    const h = cfg.peakH * Math.pow(Math.max(0, s), 1.5);
    const dhdx =
      s > 0.0001
        ? ((cfg.peakH * 1.5 * Math.PI) / span) * Math.pow(s, 0.5) * Math.cos(Math.PI * t)
        : 0;
    return { h, dhdx };
  }

  function evalSpanBridgeZ(z, cfg) {
    const span = cfg.endZ - cfg.startZ;
    const t = THREE.MathUtils.clamp((z - cfg.startZ) / span, 0, 1);
    const s = Math.sin(Math.PI * t);
    const h = cfg.peakH * Math.pow(Math.max(0, s), 1.55);
    const dhdz =
      s > 0.0001
        ? ((cfg.peakH * 1.55 * Math.PI) / span) * Math.pow(s, 0.55) * Math.cos(Math.PI * t)
        : 0;
    return { h, dhdz };
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

  function evalSkywayDeck(coord, cfg) {
    if (coord < cfg.rampUpStart || coord > cfg.rampDownEnd) return { h: 0, slope: 0 };
    if (coord >= cfg.rampUpEnd && coord <= cfg.rampDownStart) return { h: cfg.deckH, slope: 0 };
    if (coord < cfg.rampUpEnd && cfg.rampUpEnd > cfg.rampUpStart) {
      const span = cfg.rampUpEnd - cfg.rampUpStart;
      const t = (coord - cfg.rampUpStart) / span;
      return {
        h: cfg.deckH * (3 * t * t - 2 * t * t * t),
        slope: (cfg.deckH * (6 * t - 6 * t * t)) / span,
      };
    }
    const span = cfg.rampDownEnd - cfg.rampDownStart;
    if (span <= 0.001) return { h: cfg.deckH, slope: 0 };
    const t = (cfg.rampDownEnd - coord) / span;
    return {
      h: cfg.deckH * (3 * t * t - 2 * t * t * t),
      slope: -(cfg.deckH * (6 * t - 6 * t * t)) / span,
    };
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
          float lengthFade = smoothstep(0.0, 0.72, vUv.y) * (1.0 - smoothstep(0.84, 1.0, vUv.y));
          float alpha = edgeSoft * lengthFade * uOpacity;
          gl_FragColor = vec4(uColor * alpha, alpha);
        }
      `,
    });
  }

  // =========================================================================
  // 4. HIGH-RES SMOOTH PROCEDURAL TEXTURES (ROADS, GP CIRCUIT & SKYSCRAPERS)
  // =========================================================================
  function configureSmoothTexture(tex, repeatX = 1, repeatY = 1) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  }

  function paintSmoothAsphaltBase(ctx, w, h, baseHex) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 220; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const rad = 18 + Math.random() * 72;
      const v = 40 + Math.floor(Math.random() * 34);
      const grad = ctx.createRadialGradient(x, y, 2, x, y, rad);
      grad.addColorStop(0, `rgba(${v},${v + 2},${v + 5},0.12)`);
      grad.addColorStop(1, `rgba(${v},${v + 2},${v + 5},0.0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n + 1));
    }
    ctx.putImageData(img, 0, 0);
  }

  function paintSoftWearBand(ctx, centerX, halfW, h, alpha = 0.22) {
    const grad = ctx.createLinearGradient(centerX - halfW, 0, centerX + halfW, 0);
    grad.addColorStop(0.0, "rgba(12, 16, 22, 0.0)");
    grad.addColorStop(0.28, `rgba(12, 16, 22, ${alpha})`);
    grad.addColorStop(0.5, `rgba(14, 18, 24, ${alpha * 0.65})`);
    grad.addColorStop(0.72, `rgba(12, 16, 22, ${alpha})`);
    grad.addColorStop(1.0, "rgba(12, 16, 22, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(centerX - halfW, 0, halfW * 2, h);
  }

  function createRoadTexture() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext("2d");

    paintSmoothAsphaltBase(ctx, 1024, 1024, "#363d47");

    const leftEdge = ctx.createLinearGradient(0, 0, 44, 0);
    leftEdge.addColorStop(0, "rgba(148, 163, 184, 0.34)");
    leftEdge.addColorStop(0.55, "rgba(100, 116, 139, 0.14)");
    leftEdge.addColorStop(1, "rgba(54, 61, 71, 0.0)");
    ctx.fillStyle = leftEdge;
    ctx.fillRect(0, 0, 44, 1024);

    const rightEdge = ctx.createLinearGradient(980, 0, 1024, 0);
    rightEdge.addColorStop(0, "rgba(54, 61, 71, 0.0)");
    rightEdge.addColorStop(0.45, "rgba(100, 116, 139, 0.14)");
    rightEdge.addColorStop(1, "rgba(148, 163, 184, 0.34)");
    ctx.fillStyle = rightEdge;
    ctx.fillRect(980, 0, 44, 1024);

    paintSoftWearBand(ctx, 275, 115, 1024, 0.22);
    paintSoftWearBand(ctx, 749, 115, 1024, 0.22);

    ctx.fillStyle = "rgba(235, 241, 248, 0.92)";
    ctx.fillRect(46, 0, 16, 1024);
    ctx.fillRect(962, 0, 16, 1024);

    ctx.fillStyle = "rgba(246, 200, 32, 0.94)";
    for (let y = 70; y < 1024; y += 512) {
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(500, y, 24, 340, 5) : ctx.rect(500, y, 24, 340);
      ctx.fill();
    }

    return configureSmoothTexture(new THREE.CanvasTexture(c));
  }

  function createHighwayTexture(isBridge = false) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext("2d");

    paintSmoothAsphaltBase(ctx, 1024, 1024, isBridge ? "#303743" : "#2d333e");

    ctx.fillStyle = "rgba(148, 163, 184, 0.09)";
    ctx.fillRect(0, 0, 74, 1024);
    ctx.fillRect(950, 0, 74, 1024);

    [182, 388, 636, 842].forEach((cx) => paintSoftWearBand(ctx, cx, 72, 1024, 0.2));

    if (isBridge) {
      const jointGrad = ctx.createLinearGradient(0, 0, 0, 22);
      jointGrad.addColorStop(0, "rgba(15, 23, 42, 0.62)");
      jointGrad.addColorStop(0.55, "rgba(148, 163, 184, 0.2)");
      jointGrad.addColorStop(1, "rgba(15, 23, 42, 0.0)");
      ctx.fillStyle = jointGrad;
      ctx.fillRect(0, 0, 1024, 22);

      ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
      for (let y = 24; y < 1024; y += 36) {
        ctx.fillRect(28, y, 30, 10);
        ctx.fillRect(966, y, 30, 10);
      }
    }

    ctx.fillStyle = "rgba(241, 245, 249, 0.94)";
    ctx.fillRect(72, 0, 13, 1024);
    ctx.fillRect(939, 0, 13, 1024);

    ctx.fillStyle = "rgba(246, 200, 32, 0.94)";
    ctx.fillRect(492, 0, 13, 1024);
    ctx.fillRect(519, 0, 13, 1024);

    ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
    for (let y = 52; y < 1024; y += 256) {
      ctx.fillRect(282, y, 11, 136);
      ctx.fillRect(731, y, 11, 136);
    }

    return configureSmoothTexture(new THREE.CanvasTexture(c));
  }

  function createCircuitTexture() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext("2d");

    paintSmoothAsphaltBase(ctx, 1024, 1024, "#252b36");

    paintSoftWearBand(ctx, 512, 290, 1024, 0.30);
    paintSoftWearBand(ctx, 310, 95, 1024, 0.16);
    paintSoftWearBand(ctx, 714, 95, 1024, 0.16);

    ctx.fillStyle = "rgba(148, 163, 184, 0.08)";
    ctx.fillRect(0, 0, 56, 1024);
    ctx.fillRect(968, 0, 56, 1024);

    ctx.fillStyle = "rgba(248, 250, 252, 0.96)";
    ctx.fillRect(56, 0, 18, 1024);
    ctx.fillRect(950, 0, 18, 1024);

    ctx.fillStyle = "rgba(226, 232, 240, 0.24)";
    for (let y = 80; y < 1024; y += 512) {
      ctx.fillRect(508, y, 8, 220);
    }

    return configureSmoothTexture(new THREE.CanvasTexture(c));
  }

  function createGantrySignTexture(title, subtitle, arrow = "↑") {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 320;
    const ctx = c.getContext("2d");

    const bg = ctx.createLinearGradient(0, 0, 0, 320);
    bg.addColorStop(0, "#047857");
    bg.addColorStop(1, "#064e3b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 320);

    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, 984, 280);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 74px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, 512, 136);

    ctx.fillStyle = "#fde047";
    ctx.font = "bold 52px Segoe UI, sans-serif";
    ctx.fillText(`${arrow}  ${subtitle}  ${arrow}`, 512, 238);

    return configureSmoothTexture(new THREE.CanvasTexture(c));
  }

  function drawDetailedWindow(ctx, x, y, w, h, lit, warmHex, darkHex, mullion = true) {
    ctx.fillStyle = "rgba(8, 12, 18, 0.45)";
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);

    const g = ctx.createLinearGradient(x, y, x, y + h);
    if (lit) {
      g.addColorStop(0, warmHex);
      g.addColorStop(0.55, warmHex);
      g.addColorStop(1, "rgba(180, 130, 70, 0.85)");
    } else {
      g.addColorStop(0, darkHex);
      g.addColorStop(0.65, "#0d1624");
      g.addColorStop(1, "#1e2e45");
    }
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = lit ? "rgba(0, 0, 0, 0.14)" : "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(x, y, w, h * 0.24);

    ctx.fillStyle = "rgba(255, 255, 255, 0.09)";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y);
    ctx.lineTo(x + w * 0.48, y);
    ctx.lineTo(x + w * 0.22, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(215, 224, 235, 0.36)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);
    if (mullion) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y);
      ctx.lineTo(x + w * 0.5, y + h);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(226, 232, 240, 0.28)";
    ctx.fillRect(x - 4, y + h + 1, w + 8, 5);
  }

  function createFacadeTexture(style) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 1024;
    const ctx = c.getContext("2d");

    if (style === "glass") {
      const bg = ctx.createLinearGradient(0, 0, 0, 1024);
      bg.addColorStop(0, "#1c334f");
      bg.addColorStop(1, "#0e1b2c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 512, 1024);

      for (let r = 0; r < 24; r++) {
        const y = r * 42.6;
        ctx.fillStyle = "#0b1422";
        ctx.fillRect(0, y, 512, 8);
        ctx.fillStyle = "rgba(148, 163, 184, 0.18)";
        ctx.fillRect(0, y + 8, 512, 2);
        for (let col = 0; col < 8; col++) {
          const lit = Math.random() > 0.44;
          drawDetailedWindow(
            ctx,
            col * 64 + 6,
            y + 11,
            52,
            26,
            lit,
            Math.random() > 0.35 ? "#93c5fd" : "#fef08a",
            "#1a324e",
            false
          );
        }
      }
    } else if (style === "solara") {
      const bg = ctx.createLinearGradient(0, 0, 0, 1024);
      bg.addColorStop(0, "#e2e8f0");
      bg.addColorStop(1, "#94a3b8");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 512, 1024);

      for (let r = 0; r < 18; r++) {
        const y = r * 56.8;
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, y, 512, 12);
        ctx.fillStyle = "rgba(245, 158, 11, 0.25)";
        ctx.fillRect(0, y + 12, 512, 3);
        for (let col = 0; col < 5; col++) {
          const lit = Math.random() > 0.42;
          drawDetailedWindow(ctx, col * 102 + 10, y + 16, 82, 34, lit, "#fde68a", "#0f334a", false);
        }
      }
    } else if (style === "artdeco") {
      const bg = ctx.createLinearGradient(0, 0, 512, 0);
      bg.addColorStop(0, "#4b4843");
      bg.addColorStop(0.5, "#5c5851");
      bg.addColorStop(1, "#4b4843");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 512, 1024);

      for (let col = 0; col < 6; col++) {
        const px = col * 85.3;
        const pilaster = ctx.createLinearGradient(px, 0, px + 18, 0);
        pilaster.addColorStop(0, "#767168");
        pilaster.addColorStop(1, "#4f4c46");
        ctx.fillStyle = pilaster;
        ctx.fillRect(px, 0, 18, 1024);

        for (let r = 0; r < 16; r++) {
          const lit = Math.random() > 0.38;
          drawDetailedWindow(ctx, px + 23, r * 64 + 12, 54, 40, lit, "#fde68a", "#171c26", true);
        }
      }
    } else if (style === "resort") {
      const bg = ctx.createLinearGradient(0, 0, 0, 1024);
      bg.addColorStop(0, "#e7e5e4");
      bg.addColorStop(1, "#cbd5e1");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 512, 1024);

      for (let r = 0; r < 14; r++) {
        const y = r * 73.1;
        ctx.fillStyle = "rgba(15, 23, 42, 0.16)";
        ctx.fillRect(0, y + 66, 512, 7);
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, y + 52, 512, 14);
        ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
        ctx.fillRect(0, y + 36, 512, 16);

        for (let col = 0; col < 4; col++) {
          const lit = Math.random() > 0.38;
          drawDetailedWindow(ctx, col * 128 + 16, y + 8, 96, 42, lit, "#fef3c7", "#0f4c64", true);
        }
      }
    } else if (style === "alpine") {
      const woodGrad = ctx.createLinearGradient(0, 0, 0, 760);
      woodGrad.addColorStop(0, "#75523b");
      woodGrad.addColorStop(1, "#5c3e2b");
      ctx.fillStyle = woodGrad;
      ctx.fillRect(0, 0, 512, 760);

      for (let y = 0; y < 760; y += 22) {
        ctx.fillStyle = "rgba(24, 14, 8, 0.16)";
        ctx.fillRect(0, y, 512, 2);
        ctx.fillStyle = "rgba(255, 232, 210, 0.05)";
        ctx.fillRect(0, y + 2, 512, 2);
      }

      const stoneGrad = ctx.createLinearGradient(0, 760, 0, 1024);
      stoneGrad.addColorStop(0, "#5e5a55");
      stoneGrad.addColorStop(1, "#44413d");
      ctx.fillStyle = stoneGrad;
      ctx.fillRect(0, 760, 512, 264);

      ctx.strokeStyle = "rgba(20, 20, 22, 0.24)";
      ctx.lineWidth = 2;
      for (let sy = 760; sy < 1024; sy += 33) {
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(512, sy);
        ctx.stroke();
        const off = ((sy - 760) / 33) % 2 === 0 ? 0 : 32;
        for (let sx = off; sx < 512; sx += 64) {
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy + 33);
          ctx.stroke();
        }
      }

      ctx.fillStyle = "#8a847c";
      ctx.fillRect(0, 754, 512, 10);

      for (let r = 0; r < 8; r++) {
        for (let col = 0; col < 4; col++) {
          const wx = col * 128 + 28;
          const wy = r * 118 + 26;
          const lit = Math.random() > 0.32;
          ctx.fillStyle = "#3f2b1e";
          ctx.fillRect(wx - 12, wy, 10, 54);
          ctx.fillRect(wx + 74, wy, 10, 54);
          drawDetailedWindow(ctx, wx, wy, 72, 54, lit, "#fed7aa", "#181d24", true);
        }
      }
    } else if (style === "warehouse") {
      const bg = ctx.createLinearGradient(0, 0, 0, 1024);
      bg.addColorStop(0, "#525c6b");
      bg.addColorStop(1, "#3b434f");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 512, 1024);

      for (let x = 0; x < 512; x += 16) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
        ctx.fillRect(x, 0, 5, 1024);
        ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
        ctx.fillRect(x + 8, 0, 4, 1024);
      }

      for (let col = 0; col < 6; col++) {
        drawDetailedWindow(ctx, col * 84 + 12, 92, 60, 72, true, "#fef08a", "#1e293b", true);
      }

      [48, 296].forEach((bx) => {
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(bx, 680, 168, 344);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, 680, 168, 344);
        for (let by = 710; by < 1024; by += 28) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          ctx.fillRect(bx + 4, by, 160, 3);
        }
      });
    } else {
      const bg = ctx.createLinearGradient(0, 0, 0, 1024);
      bg.addColorStop(0, "#151b2b");
      bg.addColorStop(1, "#0b0f1a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 512, 1024);

      for (let r = 0; r < 20; r++) {
        const y = r * 51.2;
        ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
        ctx.fillRect(0, y, 512, 3);
        for (let col = 0; col < 5; col++) {
          const lit = Math.random() > 0.34;
          drawDetailedWindow(
            ctx,
            col * 102 + 14,
            y + 12,
            74,
            26,
            lit,
            Math.random() > 0.5 ? "#38bdf8" : "#f472b6",
            "#0b1120",
            false
          );
        }
      }
    }

    return configureSmoothTexture(new THREE.CanvasTexture(c));
  }

  function createRampTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#334155";
    ctx.fillRect(0, 0, 256, 512);

    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let y = 80; y < 480; y += 128) {
      ctx.beginPath();
      ctx.moveTo(44, y + 52);
      ctx.lineTo(128, y);
      ctx.lineTo(212, y + 52);
      ctx.stroke();
    }

    ctx.fillStyle = "#facc15";
    ctx.fillRect(0, 0, 18, 512);
    ctx.fillRect(238, 0, 18, 512);

    return configureSmoothTexture(new THREE.CanvasTexture(c));
  }

  // =========================================================================
  // 5A. ENHANCED PROCEDURAL GRASS SHADER (FIBROUS TURF, WIND WAVES & DEW)
  // =========================================================================
  function createRealisticGrassMaterial(lushHex, warmHex, soilHex) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uLushColor: { value: new THREE.Color(lushHex) },
        uWarmColor: { value: new THREE.Color(warmHex) },
        uSoilColor: { value: new THREE.Color(soilHex) },
        uTime: { value: 0.0 },
        uRoadMoisture: { value: 0.0 },
        uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.5).normalize() },
        uSunColor: { value: new THREE.Color(0xffa45b) },
        uAmbientColor: { value: new THREE.Color(0x523c46) },
        uFogColor: { value: new THREE.Color(0xb85247) },
        uFogDensity: { value: 0.0006 },
        uCarPos: { value: new THREE.Vector3(0, 0, 45) },
        uCarForward: { value: new THREE.Vector3(0, 0, -1) },
        uCarHalfW: { value: 1.15 },
        uCarHalfL: { value: 2.35 },
        uHeadlightsOn: { value: 1.0 },
        uSparkPos: { value: new THREE.Vector3(0, -100, 0) },
        uSparkIntensity: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uLushColor;
        uniform vec3 uWarmColor;
        uniform vec3 uSoilColor;
        uniform float uTime;
        uniform float uRoadMoisture;
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
        uniform vec3 uSparkPos;
        uniform float uSparkIntensity;

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
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        void main() {
          vec3 toCam = cameraPosition - vWorldPos;
          float camDist = length(toCam);
          vec3 V = toCam / max(camDist, 0.0001);
          vec3 L = normalize(uSunDir);

          float macro = noise2D(vWorldPos.xz * 0.015);
          float med = noise2D(vWorldPos.xz * 0.072 + vec2(9.2, 4.1));
          float tuftMacro = noise2D(vWorldPos.xz * 0.34 + vec2(3.7, 17.3));

          float windWave = sin(vWorldPos.x * 0.08 + vWorldPos.z * 0.055 - uTime * 1.9 + macro * 3.5);
          float windSheen = smoothstep(-0.15, 0.9, windWave) * (0.45 + 0.55 * med);

          float nearMask = 1.0 - smoothstep(22.0, 165.0, camDist);
          vec2 pXZ = vWorldPos.xz - (V.xz / max(V.y, 0.35)) * (tuftMacro * 0.08 * nearMask);

          float e = 0.09;
          float b0 = noise2D(pXZ * 2.9 + vec2(windWave * 0.14, 0.0)) * 0.58 + noise2D(pXZ * 7.8) * 0.42;
          float bX = noise2D((pXZ + vec2(e, 0.0)) * 2.9 + vec2(windWave * 0.14, 0.0)) * 0.58 + noise2D((pXZ + vec2(e, 0.0)) * 7.8) * 0.42;
          float bZ = noise2D((pXZ + vec2(0.0, e)) * 2.9 + vec2(windWave * 0.14, 0.0)) * 0.58 + noise2D((pXZ + vec2(0.0, e)) * 7.8) * 0.42;

          vec3 baseCol = mix(uLushColor, uWarmColor, smoothstep(0.24, 0.78, macro * 0.62 + med * 0.38));
          baseCol = mix(baseCol, uSoilColor, smoothstep(0.68, 0.94, (1.0 - macro) * 0.52 + (1.0 - tuftMacro) * 0.48) * 0.42);
          baseCol *= 0.80 + b0 * 0.44 + windSheen * 0.11;

          float inCircuitPark = step(420.0, vWorldPos.x) * step(vWorldPos.x, 1595.0) * step(720.0, vWorldPos.z) * step(vWorldPos.z, 1455.0);
          if (inCircuitPark > 0.5) {
            float mowStripe = 0.5 + 0.5 * sin(vWorldPos.x * 0.30);
            baseCol *= 0.92 + mowStripe * 0.14;
          } else if (nearMask > 0.05) {
            float fl = hash21(floor(vWorldPos.xz * 2.4));
            float flMask = smoothstep(0.986, 0.998, fl) * nearMask * smoothstep(0.35, 0.75, med);
            vec3 flCol = fl > 0.993 ? vec3(0.98, 0.96, 0.84) : vec3(0.96, 0.82, 0.24);
            baseCol = mix(baseCol, flCol, flMask * 0.65);
          }

          baseCol *= 1.0 - uRoadMoisture * 0.20;

          vec3 N = normalize(vec3(
            (b0 - bX) * 2.6 * nearMask + windWave * 0.11,
            1.0,
            (b0 - bZ) * 2.6 * nearMask - windWave * 0.08
          ));

          float NdotL = max(dot(N, L), 0.0);
          vec3 H = normalize(L + V);
          float rimVelvet = pow(1.0 - max(dot(N, V), 0.0), 2.8) * (0.22 + uRoadMoisture * 0.26);
          float dewSpec = pow(max(dot(N, H), 0.0), mix(24.0, 78.0, uRoadMoisture)) * (0.09 + uRoadMoisture * 0.42);

          vec3 ambBounce = max(uAmbientColor * 1.38, vec3(0.14, 0.18, 0.16));
          vec3 color = baseCol * (ambBounce + uSunColor * (NdotL * 1.05 + rimVelvet))
                     + uSunColor * (dewSpec + windSheen * 0.06);

          vec3 toFrag = vWorldPos - uCarPos;
          float carDist = length(toFrag.xz);
          if (carDist < 5.5 && toFrag.y < 0.8 && toFrag.y > -4.5) {
            vec2 carF = normalize(uCarForward.xz + vec2(0.0001));
            vec2 carR = vec2(-carF.y, carF.x);
            float lx = abs(dot(toFrag.xz, carR)) / max(0.8, uCarHalfW * 1.15);
            float lz = abs(dot(toFrag.xz, carF)) / max(1.6, uCarHalfL * 1.1);
            float footprint = (1.0 - smoothstep(0.62, 1.18, max(lx, lz))) * (1.0 - smoothstep(0.7, 1.38, length(vec2(lx, lz))));
            float heightFade = 1.0 - smoothstep(0.0, 3.2, max(0.0, uCarPos.y - vWorldPos.y));
            color *= 1.0 - footprint * heightFade * 0.68;
          }

          if (uHeadlightsOn > 0.5 && carDist < 72.0 && abs(toFrag.y) < 6.0) {
            vec2 dir2 = normalize(toFrag.xz + vec2(0.0001));
            float cone = dot(dir2, normalize(uCarForward.xz));
            float beam = smoothstep(0.62, 0.96, cone) * (1.0 - smoothstep(2.5, 72.0, carDist));
            color += vec3(1.0, 0.94, 0.82) * beam * (0.30 + b0 * 0.18);
          }

          if (uSparkIntensity > 0.02) {
            float sDist = length(vWorldPos - uSparkPos);
            if (sDist < 12.0) {
              float sFall = 1.0 - smoothstep(0.4, 12.0, sDist);
              color += vec3(1.0, 0.58, 0.14) * sFall * sFall * uSparkIntensity * 0.6;
            }
          }

          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * camDist * camDist);
          color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
        }
      `,
    });
  }

  // =========================================================================
  // 5B. OPTIMIZED 3D PUDDLE ROAD SHADER (SMOOTH BRIDGE RT FADE + FAST PATH)
  // =========================================================================
  function createRealisticRoadMaterial(roadTex, reflTexture, resolution, isIntersection) {
    const emptyTrailPos = Array.from({ length: 14 }, () => new THREE.Vector4(0, 0, 0, -999));
    const emptyTrailMeta = Array.from({ length: 14 }, () => new THREE.Vector4(1.0, 1.4, 0, 0));

    return new THREE.ShaderMaterial({
      uniforms: {
        uRoadMap: { value: roadTex },
        uReflMap: { value: reflTexture },
        uResolution: { value: resolution.clone() },
        uIsIntersection: { value: isIntersection ? 1.0 : 0.0 },
        uTime: { value: 0.0 },
        uRTEnabled: { value: 1.0 },
        uRoadMoisture: { value: 0.0 },
        uPuddleLevel: { value: 0.0 },
        uRainIntensity: { value: 0.0 },
        uHasTrails: { value: 0.0 },
        uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.5).normalize() },
        uSunColor: { value: new THREE.Color(0xffa45b) },
        uAmbientColor: { value: new THREE.Color(0x523c46) },
        uFogColor: { value: new THREE.Color(0xb85247) },
        uFogDensity: { value: 0.0006 },
        uCarPos: { value: new THREE.Vector3(0, 0, 45) },
        uCarForward: { value: new THREE.Vector3(0, 0, -1) },
        uCarHalfW: { value: 1.15 },
        uCarHalfL: { value: 2.35 },
        uHeadlightsOn: { value: 1.0 },
        uBrakeIntensity: { value: 0.45 },
        uNitroActive: { value: 0.0 },
        uSparkPos: { value: new THREE.Vector3(0, -100, 0) },
        uSparkIntensity: { value: 0.0 },
        uTrailPos: { value: emptyTrailPos },
        uTrailMeta: { value: emptyTrailMeta },
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
        uniform float uPuddleLevel;
        uniform float uRainIntensity;
        uniform float uHasTrails;
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
        uniform vec4 uTrailPos[14];
        uniform vec4 uTrailMeta[14];

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

        float puddleField(vec2 p) {
          float p1 = noise2D(p * 0.032);
          float p2 = noise2D(p * 0.075 + vec2(11.3, 7.1));
          float p3 = noise2D(p * 0.17 + vec2(3.7, 19.4));
          return clamp((p1 * 0.56 + p2 * 0.30 + p3 * 0.14 - 0.24) / 0.52, 0.0, 1.0);
        }

        vec3 rainWaveNormalLayer(vec2 pos, float t, float speed) {
          vec2 cell = floor(pos);
          vec2 local = fract(pos) - 0.5;
          float rnd = hash21(cell);
          float phase = fract(t * speed + rnd * 13.71);
          vec2 center = (vec2(hash21(cell + 7.1), hash21(cell + 19.3)) - 0.5) * 0.40;
          vec2 diff = local - center;
          float dist = length(diff);

          float radius = phase * 0.44;
          float delta = dist - radius;
          float radialMask = 1.0 - smoothstep(0.04, 0.46, dist);
          float env = exp(-delta * delta * 34.0) * radialMask * (1.0 - phase) * smoothstep(0.0, 0.07, phase);
          float slope = cos(delta * 34.0) * env;

          float delta2 = dist - radius * 0.60;
          float env2 = exp(-delta2 * delta2 * 44.0) * radialMask * (1.0 - phase) * 0.58;
          slope += cos(delta2 * 42.0) * env2;

          float centerPinpoint = exp(-dist * dist * 360.0) * (1.0 - smoothstep(0.0, 0.16, phase));
          vec2 dir = diff / max(dist, 0.001);
          return vec3(dir * slope, centerPinpoint);
        }

        vec3 sampleGlossyRT(vec2 uv, float blurRadius) {
          if (blurRadius < 0.0022) return texture2D(uReflMap, uv).rgb;
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
          float inAlpineTun = step(-880.0, vWorldPos.z) * step(vWorldPos.z, -340.0) * step(abs(vWorldPos.x), 13.5);
          float inSubseaTun = step(-784.0, vWorldPos.z) * step(vWorldPos.z, -374.0) * step(1515.0, vWorldPos.x) * step(vWorldPos.x, 1545.0) * step(vWorldPos.y, -2.0);
          float inTunnel = max(inAlpineTun, inSubseaTun);
          float baseMoisture = uRoadMoisture * (1.0 - inTunnel);
          float basePuddleLvl = uPuddleLevel * (1.0 - inTunnel);
          float activeRain = uRainIntensity * (1.0 - inTunnel);

          vec3 toCam = cameraPosition - vWorldPos;
          float camDist = length(toCam);
          vec3 V = toCam / max(camDist, 0.0001);
          vec3 L = normalize(uSunDir);

          float puddle = 0.0;
          float puddleDepth = 0.0;
          float puddleRim = 0.0;
          float rimBand = 0.0;
          float edgeCrease = 0.0;
          vec2 meniscusSlope = vec2(0.0);

          if (basePuddleLvl > 0.02) {
            float drainFactor = 1.0 - smoothstep(2.0, 12.0, abs(vWorldPos.y)) * 0.42;
            float pNoise = puddleField(vWorldPos.xz);
            float thresh = 0.84 - basePuddleLvl * 0.44;
            float puddleVis = smoothstep(0.02, 0.22, basePuddleLvl) * drainFactor;

            puddle = smoothstep(thresh - 0.025, thresh + 0.025, pNoise) * puddleVis;
            puddleDepth = smoothstep(thresh - 0.01, thresh + 0.18, pNoise) * puddleVis;
            puddleRim = smoothstep(thresh - 0.15, thresh - 0.005, pNoise) * puddleVis;

            rimBand = smoothstep(0.02, 0.45, puddle) * (1.0 - smoothstep(0.45, 0.98, puddle));
            edgeCrease = smoothstep(thresh - 0.04, thresh, pNoise) * (1.0 - smoothstep(thresh, thresh + 0.03, pNoise)) * puddleVis;

            if (rimBand > 0.01) {
              float eps = 0.18;
              float pX = puddleField(vWorldPos.xz + vec2(eps, 0.0));
              float pZ = puddleField(vWorldPos.xz + vec2(0.0, eps));
              vec2 gradP = vec2(pX - pNoise, pZ - pNoise) / eps;
              vec2 edgeDir = gradP / (length(gradP) + 0.015);
              meniscusSlope = -edgeDir * rimBand * 0.82;
            }
          }

          vec2 wakeGrad = vec2(0.0);
          float wakeRidge = 0.0;
          float puddlePart = 0.0;
          float wetTrack = 0.0;

          vec3 toFrag = vWorldPos - uCarPos;
          float carDist = length(toFrag.xz);

          if (uHasTrails > 0.5 && carDist < 56.0 && abs(toFrag.y) < 4.0) {
            for (int i = 0; i < 14; i++) {
              vec4 tp = uTrailPos[i];
              float age = uTime - tp.w;
              if (age < 0.0 || age > 8.5) continue;

              vec2 rel = vWorldPos.xz - tp.xy;
              if (dot(rel, rel) > 28.0) continue;

              vec4 tm = uTrailMeta[i];
              float cH = cos(tp.z);
              float sH = sin(tp.z);
              float lr = rel.x * cH - rel.y * sH;
              float lf = -rel.x * sH - rel.y * cH;

              float df = max(0.0, abs(lf) - tm.y);
              float sideDiff = abs(lr) - tm.x;
              float dtire = length(vec2(sideDiff, df));

              if (tm.w > 0.01) {
                float trackFade = 1.0 - smoothstep(0.0, 8.0, age);
                float trackBand = (1.0 - smoothstep(0.09, 0.34, dtire)) * trackFade * tm.w;
                wetTrack = max(wetTrack, trackBand);
              }

              if (tm.z > 0.01 && age < 4.2) {
                float wakeFade = exp(-age * 0.88) * tm.z;
                puddlePart = max(puddlePart, (1.0 - smoothstep(0.08, 0.42, dtire)) * exp(-age * 0.72) * tm.z * 0.74);

                float waveR = 0.24 + age * 1.45;
                float ringEnv = exp(-abs(dtire - waveR) * 2.6) * (1.0 - smoothstep(0.12, 3.2, dtire));
                float ringSlope = cos((dtire - waveR) * 14.0) * ringEnv * wakeFade;

                vec2 worldRight = vec2(cH, -sH);
                vec2 outDir = worldRight * (lr >= 0.0 ? 1.0 : -1.0) * (sideDiff >= 0.0 ? 1.0 : -1.0);
                wakeGrad += outDir * ringSlope * 0.85;
                wakeRidge += max(0.0, ringSlope) * 0.26 * wakeFade;
              }
            }
          }

          float localMoisture = clamp(max(max(baseMoisture, puddleRim * 0.78), wetTrack * 0.90), 0.0, 1.0);
          float effectivePuddle = clamp(puddle * (1.0 - puddlePart), 0.0, 1.0);
          float effectiveDepth = clamp(puddleDepth * (1.0 - puddlePart * 0.82), 0.0, 1.0);

          vec2 waterWaveSlope = wakeGrad * clamp(puddle * 1.4, 0.0, 1.0) + meniscusSlope;
          if (effectivePuddle > 0.05) {
            float windShimmer = cos(vWorldPos.x * 1.7 + vWorldPos.z * 1.2 + uTime * 2.6) * 0.045;
            waterWaveSlope += vec2(windShimmer, -windShimmer * 0.7) * effectivePuddle;
          }

          float centerGlint = 0.0;
          if (activeRain > 0.03 && camDist < 115.0) {
            float ripFade = 1.0 - smoothstep(14.0, 115.0, camDist);
            vec3 r1 = rainWaveNormalLayer(vWorldPos.xz * 0.72, uTime, 1.45);
            vec3 r2 = rainWaveNormalLayer(vWorldPos.xz * 1.32 + vec2(11.4, 5.7), uTime + 0.37, 1.95);
            float waterPresence = clamp(effectivePuddle * 1.35 + localMoisture * 0.16, 0.0, 1.0);
            waterWaveSlope += (r1.xy * 0.95 + r2.xy * 0.65) * activeRain * ripFade * waterPresence;
            centerGlint = (r1.z + r2.z) * activeRain * ripFade * effectivePuddle;
          }

          vec2 parallaxShift = (V.xz / max(V.y, 0.28)) * (effectiveDepth * 0.24);
          vec2 refractUV = (waterWaveSlope * 0.020 + meniscusSlope * 0.008) * effectivePuddle;
          vec3 rawAlbedo = uIsIntersection > 0.5
            ? vec3(0.215, 0.235, 0.275)
            : texture2D(uRoadMap, vUv + refractUV).rgb;

          vec2 parallaxXZ = vWorldPos.xz - parallaxShift;
          float macroWear = noise2D(parallaxXZ * 0.075);
          float softGrain = noise2D(parallaxXZ * 1.75) * 0.65 + noise2D(parallaxXZ * 3.6) * 0.35;

          float eA = 0.08;
          float g0 = noise2D(vWorldPos.xz * 2.8);
          float gX = noise2D(vWorldPos.xz * 2.8 + vec2(eA, 0.0));
          float gZ = noise2D(vWorldPos.xz * 2.8 + vec2(0.0, eA));
          vec2 asphaltBump = vec2(g0 - gX, g0 - gZ) * (1.0 / eA) * 0.11;
          float roughAmt = mix(1.0, 0.58, localMoisture) * (1.0 - effectivePuddle * 0.98);

          vec3 N = normalize(
            normalize(vWorldNormal)
            + vec3(asphaltBump.x * roughAmt + waterWaveSlope.x * 0.62, 0.0, asphaltBump.y * roughAmt + waterWaveSlope.y * 0.62)
          );

          float isMarking = smoothstep(0.48, 0.65, max(rawAlbedo.r, rawAlbedo.g));
          vec3 dryTex = rawAlbedo * (0.91 + softGrain * 0.12 + (macroWear - 0.5) * 0.06);
          float darkenAmt = mix(localMoisture * 0.38 + effectivePuddle * 0.24, localMoisture * 0.12 + effectivePuddle * 0.16, isMarking);
          vec3 albedo = dryTex * (1.0 - clamp(darkenAmt, 0.0, 0.62));

          vec3 deepWaterTint = albedo * vec3(0.34, 0.44, 0.55);
          albedo = mix(albedo, deepWaterTint, effectiveDepth * 0.72);
          albedo *= 1.0 - edgeCrease * 0.34;

          float NdotL = max(dot(N, L), 0.0) * (1.0 - inTunnel);
          vec3 H = normalize(L + V);
          float NdotH = max(dot(N, H), 0.0);
          float specPow = mix(mix(20.0, 60.0, localMoisture), 320.0, effectivePuddle);
          float specStr = mix(mix(0.05, 0.26, localMoisture), 2.2, effectivePuddle) * (1.0 - inTunnel);
          float spec = pow(NdotH, specPow) * specStr;

          float meniscusRimGlow = (pow(NdotH, 48.0) * 1.1 + max(dot(N, normalize(vec3(L.x, 0.6, L.z))), 0.0) * 0.24) * rimBand * (1.0 - inTunnel);
          float rippleRelief = clamp(dot(waterWaveSlope, normalize(L.xz + V.xz * 0.5 + vec2(0.001))), -0.6, 0.8);

          vec3 lampGlow = vec3(0.0);
          if (inTunnel > 0.5 || vWorldPos.y < -1.5) {
            float lampCycle = 0.5 + 0.5 * cos((vWorldPos.z + 340.0) * (6.28318 / 28.0));
            vec3 tunTint = inSubseaTun > 0.5 ? vec3(0.30, 0.48, 0.58) : vec3(0.48, 0.38, 0.26);
            lampGlow = tunTint * (0.58 + 0.42 * pow(lampCycle, 2.0));
          } else if (uHeadlightsOn > 0.5 && vWorldPos.y > 1.0) {
            float spanCoord = abs(vWorldPos.z) < 25.0 || abs(vWorldPos.z - 60.0) < 25.0 || abs(vWorldPos.z + 1140.0) < 25.0 ? vWorldPos.x : vWorldPos.z;
            float pool = 0.5 + 0.5 * cos(spanCoord * (6.28318 / 48.0));
            lampGlow = vec3(0.38, 0.3, 0.2) * pow(pool, 3.0) * (0.55 + localMoisture * 0.7);
          }

          vec3 color = albedo * (uAmbientColor * (1.0 - inTunnel * 0.65) + lampGlow + uSunColor * NdotL * 0.94)
                     + uSunColor * (spec * 0.85 + meniscusRimGlow);

          float contactAO = 1.0;
          if (carDist < 5.5 && toFrag.y < 0.8 && toFrag.y > -4.5) {
            vec2 carF = normalize(uCarForward.xz + vec2(0.0001));
            vec2 carR = vec2(-carF.y, carF.x);
            float lx = abs(dot(toFrag.xz, carR)) / max(0.8, uCarHalfW * 1.12);
            float lz = abs(dot(toFrag.xz, carF)) / max(1.6, uCarHalfL * 1.08);
            float footprint = (1.0 - smoothstep(0.62, 1.18, max(lx, lz))) * (1.0 - smoothstep(0.7, 1.38, length(vec2(lx, lz))));
            float heightFade = 1.0 - smoothstep(0.0, 3.2, max(0.0, uCarPos.y - vWorldPos.y));
            contactAO = 1.0 - footprint * heightFade * 0.68;
          }
          color *= contactAO;

          if ((uHeadlightsOn > 0.5 || inTunnel > 0.5 || vWorldPos.y < -1.5) && carDist < 76.0 && abs(toFrag.y) < 6.0) {
            vec2 dir2 = normalize(toFrag.xz + vec2(0.0001));
            float cone = dot(dir2, normalize(uCarForward.xz));
            float headlightFactor = smoothstep(0.62, 0.96, cone) * (1.0 - smoothstep(2.5, 76.0, carDist));
            vec3 headL = normalize(vec3(uCarPos.x - vWorldPos.x, 0.95, uCarPos.z - vWorldPos.z));
            vec3 headH = normalize(headL + V);
            float headSpec = pow(max(dot(N, headH), 0.0), mix(28.0, 150.0, effectivePuddle));
            color += vec3(1.0, 0.94, 0.82) * headlightFactor * (mix(0.30, 0.48, localMoisture) + headSpec * mix(0.24, 1.85, effectivePuddle) + rimBand * 0.35);
          }

          color += (uSunColor * 0.4 + vec3(0.55, 0.72, 0.88)) * (centerGlint * 0.45 + wakeRidge * effectivePuddle * 0.42);

          vec3 rearPos = uCarPos - uCarForward * (uCarHalfL + 0.1);
          float rearDist = length(vWorldPos.xz - rearPos.xz);
          if (rearDist < 16.0 && abs(toFrag.y) < 4.0) {
            float tailFalloff = 1.0 - smoothstep(0.5, 16.0, rearDist);
            color += vec3(1.0, 0.1, 0.08) * tailFalloff * uBrakeIntensity * mix(0.16, 0.88, max(localMoisture * 0.45, effectivePuddle));
            if (uNitroActive > 0.5) {
              color += vec3(0.15, 0.82, 1.0) * tailFalloff * mix(0.3, 1.1, max(localMoisture * 0.45, effectivePuddle));
            }
          }

          if (uSparkIntensity > 0.02) {
            float sDist = length(vWorldPos - uSparkPos);
            if (sDist < 14.0) {
              float sFall = 1.0 - smoothstep(0.4, 14.0, sDist);
              color += vec3(1.0, 0.58, 0.14) * sFall * sFall * uSparkIntensity * mix(0.65, 1.5, max(localMoisture * 0.5, effectivePuddle));
            }
          }

          if (uRTEnabled > 0.5) {
            float NdotV = max(dot(N, V), 0.0);
            float fresnel = 0.03 + 0.97 * pow(1.0 - NdotV, 3.8);
            float drySheen = (1.0 - inTunnel) * 0.035 * fresnel;
            float flatRoadMask = 1.0 - smoothstep(0.14, 1.35, abs(vWorldPos.y));

            if (flatRoadMask > 0.01 && (localMoisture > 0.03 || effectivePuddle > 0.01 || drySheen > 0.01)) {
              vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
              vec2 reflUv = vec2(screenUv.x, 1.0 - screenUv.y);

              vec2 normalBend = vec2(N.x * 0.075, N.z * 0.115);
              reflUv = clamp(reflUv + normalBend, vec2(0.002), vec2(0.998));

              float blurRad = mix(0.012, 0.0007, effectivePuddle);
              vec3 reflSample = sampleGlossyRT(reflUv, blurRad);
              reflSample *= 1.0 + rippleRelief * effectivePuddle * 0.38;

              float dampRefl = localMoisture * 0.24 * (0.14 + fresnel * 0.86);
              float puddleRefl = effectivePuddle * (0.28 + fresnel * 0.64);
              float reflFactor = clamp(max(max(dampRefl, puddleRefl), drySheen), 0.0, 0.92)
                               * (1.0 - isMarking * (0.36 - effectivePuddle * 0.22))
                               * flatRoadMask;
              color = mix(color, reflSample * 1.12 * mix(0.42, 1.0, contactAO), reflFactor);
            }
            if (flatRoadMask < 0.99 && (localMoisture > 0.04 || effectivePuddle > 0.02)) {
              float deckSheen = clamp((localMoisture * 0.24 + effectivePuddle * 0.45) * (0.25 + fresnel * 0.75), 0.0, 0.58) * (1.0 - flatRoadMask);
              color = mix(color, (uFogColor * 1.12 + uSunColor * 0.34 + lampGlow * 0.9) * (1.0 + rippleRelief * 0.25), deckSheen);
            }
          }

          float fogFactor = (1.0 - exp(-uFogDensity * uFogDensity * camDist * camDist)) * (1.0 - inTunnel * 0.78);
          color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
        }
      `,
    });
  }

  // =========================================================================
  // 5C. TRUE 3D GERSTNER OCEAN SHADER (6-ISLAND HARD CLIP + LIVE WAVE SIM)
  // =========================================================================
  function createWaterMaterial(reflTexture, resolution) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uReflMap: { value: reflTexture },
        uWaveSimMap: { value: null },
        uSimOrigin: { value: new THREE.Vector2(0, 0) },
        uSimSize: { value: 35.84 },
        uResolution: { value: resolution.clone() },
        uPatchCenter: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0.0 },
        uRTEnabled: { value: 1.0 },
        uWaveStrength: { value: 0.48 },
        uRainIntensity: { value: 0.0 },
        uDeepColor: { value: new THREE.Color(0x071e38) },
        uShallowColor: { value: new THREE.Color(0x185c72) },
        uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.5).normalize() },
        uSunColor: { value: new THREE.Color(0xffa85c) },
        uFogColor: { value: new THREE.Color(0xb65549) },
        uFogDensity: { value: 0.0006 },
        uCarPos: { value: new THREE.Vector3(0, 0, 45) },
        uCarForward: { value: new THREE.Vector3(0, 0, -1) },
        uHeadlightsOn: { value: 1.0 },
        uNitroActive: { value: 0.0 },
      },
      vertexShader: `
        uniform sampler2D uWaveSimMap;
        uniform vec2 uSimOrigin;
        uniform float uSimSize;
        uniform vec2 uPatchCenter;
        uniform float uTime;
        uniform float uWaveStrength;

        varying vec3 vWorldPos;
        varying vec3 vGeoNormal;
        varying float vWaveCrest;
        varying float vSimFoam;

        float decode16(vec2 p) {
          float v = floor(p.x * 255.0 + 0.5) * 256.0 + floor(p.y * 255.0 + 0.5);
          return (v / 65534.0) * 2.0 - 1.0;
        }

        float sampleSimH(vec2 uv) {
          vec2 texel = uv * 128.0 - 0.5;
          vec2 i0 = floor(texel);
          vec2 f = fract(texel);
          float h00 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(0.5, 0.5)) / 128.0, 0.004, 0.996)).rg);
          float h10 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(1.5, 0.5)) / 128.0, 0.004, 0.996)).rg);
          float h01 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(0.5, 1.5)) / 128.0, 0.004, 0.996)).rg);
          float h11 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(1.5, 1.5)) / 128.0, 0.004, 0.996)).rg);
          return mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y);
        }

        float boxDist2D(vec2 p, vec2 bmin, vec2 bmax) {
          vec2 c = (bmin + bmax) * 0.5;
          vec2 ext = (bmax - bmin) * 0.5;
          vec2 d = abs(p - c) - ext;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        }

        float signedWaterDist(vec2 p) {
          float dMetro = boxDist2D(p, vec2(-420.0, -340.0), vec2(320.0, 380.0));
          float dPalmOuter = boxDist2D(p, vec2(960.0, -380.0), vec2(1660.0, 360.0));
          float dLagoon = boxDist2D(p, vec2(1340.0, 60.0), vec2(1600.0, 290.0));
          float dPalm = max(dPalmOuter, -dLagoon);
          float dPine = boxDist2D(p, vec2(-420.0, -1440.0), vec2(460.0, -880.0));
          float dApexia = boxDist2D(p, vec2(-420.0, 640.0), vec2(1620.0, 1480.0));
          float dKuro = boxDist2D(p, vec2(-1160.0, -140.0), vec2(-540.0, 780.0));
          float dSolara = boxDist2D(p, vec2(1220.0, -1460.0), vec2(1880.0, -780.0));
          float dTunnelRidge = boxDist2D(p, vec2(-145.0, -885.0), vec2(145.0, -335.0));
          float dA = min(min(dMetro, dPalm), min(dPine, dApexia));
          float dB = min(min(dKuro, dSolara), dTunnelRidge);
          return min(dA, dB);
        }

        void addGerstner(vec2 p, vec2 dir, float freq, float amp, float speed, float steep,
                         inout vec3 disp, inout vec3 tangentX, inout vec3 tangentZ) {
          vec2 d = normalize(dir);
          float ph = dot(d, p) * freq + uTime * speed;
          float c = cos(ph);
          float s = sin(ph);
          float qa = steep * amp;

          disp.x += d.x * qa * c;
          disp.z += d.y * qa * c;
          disp.y += amp * s;

          float wa = freq * amp;
          tangentX += vec3(-d.x * d.x * steep * wa * s, d.x * wa * c, -d.x * d.y * steep * wa * s);
          tangentZ += vec3(-d.x * d.y * steep * wa * s, d.y * wa * c, -d.y * d.y * steep * wa * s);
        }

        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);

          vec2 relPatch = abs(wp.xz - uPatchCenter);
          float patchFade = 1.0 - smoothstep(152.0, 206.0, max(relPatch.x, relPatch.y));

          float landDist = signedWaterDist(wp.xz);
          float openWaterMask = smoothstep(0.0, 5.0, landDist);
          float shoreCalm = (0.15 + 0.85 * smoothstep(2.0, 26.0, max(0.0, landDist))) * openWaterMask;

          wp.y -= 3.0 * (1.0 - openWaterMask);

          float ampScale = uWaveStrength * patchFade * shoreCalm;
          vec3 disp = vec3(0.0);
          vec3 tX = vec3(1.0, 0.0, 0.0);
          vec3 tZ = vec3(0.0, 0.0, 1.0);

          if (ampScale > 0.002) {
            addGerstner(wp.xz, vec2( 0.85,  0.52), 0.11, 0.24 * ampScale,  1.65, 0.55, disp, tX, tZ);
            addGerstner(wp.xz, vec2(-0.62,  0.78), 0.16, 0.17 * ampScale,  2.05, 0.50, disp, tX, tZ);
            addGerstner(wp.xz, vec2( 0.35, -0.94), 0.24, 0.10 * ampScale, -2.55, 0.45, disp, tX, tZ);
            addGerstner(wp.xz, vec2(-0.92, -0.38), 0.36, 0.055 * ampScale, 3.10, 0.40, disp, tX, tZ);
          }

          float simFoam = 0.0;
          vec2 simUv = (wp.xz - uSimOrigin) / uSimSize + 0.5;
          if (openWaterMask > 0.05 && simUv.x > 0.04 && simUv.x < 0.96 && simUv.y > 0.04 && simUv.y < 0.96) {
            float simEdge = smoothstep(0.04, 0.14, simUv.x) * (1.0 - smoothstep(0.86, 0.96, simUv.x))
                          * smoothstep(0.04, 0.14, simUv.y) * (1.0 - smoothstep(0.86, 0.96, simUv.y));
            float sh = sampleSimH(simUv) * simEdge * openWaterMask;
            float epsUv = 1.0 / 128.0;
            float shX = sampleSimH(simUv + vec2(epsUv, 0.0)) * simEdge * openWaterMask;
            float shZ = sampleSimH(simUv + vec2(0.0, epsUv)) * simEdge * openWaterMask;
            disp.y += sh * 0.52;
            tX.y += (shX - sh) * 2.0;
            tZ.y += (shZ - sh) * 2.0;
            simFoam = clamp(abs(sh) * 1.4 + max(0.0, sh) * 0.85, 0.0, 0.78);
          }

          wp.xyz += disp;
          vWorldPos = wp.xyz;
          vGeoNormal = normalize(cross(tZ, tX));
          vWaveCrest = disp.y / max(0.25, uWaveStrength * 0.55);
          vSimFoam = simFoam;

          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform sampler2D uReflMap;
        uniform sampler2D uWaveSimMap;
        uniform vec2 uSimOrigin;
        uniform float uSimSize;
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
        varying vec3 vGeoNormal;
        varying float vWaveCrest;
        varying float vSimFoam;

        float decode16(vec2 p) {
          float v = floor(p.x * 255.0 + 0.5) * 256.0 + floor(p.y * 255.0 + 0.5);
          return (v / 65534.0) * 2.0 - 1.0;
        }

        float sampleSimH(vec2 uv) {
          vec2 texel = uv * 128.0 - 0.5;
          vec2 i0 = floor(texel);
          vec2 f = fract(texel);
          float h00 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(0.5, 0.5)) / 128.0, 0.004, 0.996)).rg);
          float h10 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(1.5, 0.5)) / 128.0, 0.004, 0.996)).rg);
          float h01 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(0.5, 1.5)) / 128.0, 0.004, 0.996)).rg);
          float h11 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(1.5, 1.5)) / 128.0, 0.004, 0.996)).rg);
          return mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y);
        }

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

        vec2 fineWaveGradient(vec2 p, float t) {
          vec2 g = vec2(0.0);
          g += vec2(0.42, 0.28) * cos(p.x * 0.42 + p.y * 0.28 + t * 2.45) * 0.16;
          g += vec2(-0.34, 0.52) * cos(p.x * -0.34 + p.y * 0.52 - t * 2.85) * 0.14;
          g += vec2(0.76, -0.58) * cos(p.x * 0.76 - p.y * 0.58 + t * 3.55) * 0.09;
          g += vec2(-0.92, -0.78) * cos(p.x * -0.92 - p.y * 0.78 + t * 4.25) * 0.065;
          g += vec2(1.45, 0.88) * cos(p.x * 1.45 + p.y * 0.88 - t * 5.1) * 0.038;
          return g;
        }

        vec2 waterRainSlope(vec2 pos, float t) {
          vec2 cell = floor(pos);
          vec2 local = fract(pos) - 0.5;
          float rnd = hash21(cell);
          float phase = fract(t * 1.45 + rnd * 6.2831);
          vec2 center = (vec2(hash21(cell + 4.3), hash21(cell + 19.1)) - 0.5) * 0.46;
          vec2 diff = local - center;
          float dist = length(diff);
          float delta = dist - phase * 0.44;
          float env = exp(-delta * delta * 34.0) * (1.0 - smoothstep(0.04, 0.46, dist)) * (1.0 - phase);
          return (diff / max(dist, 0.001)) * cos(delta * 32.0) * env;
        }

        vec3 sampleWaterRT(vec2 uv, float spread) {
          vec3 c = texture2D(uReflMap, uv).rgb * 0.40;
          c += texture2D(uReflMap, clamp(uv + vec2(spread, spread * 0.4), vec2(0.002), vec2(0.998))).rgb * 0.15;
          c += texture2D(uReflMap, clamp(uv + vec2(-spread, spread * 0.4), vec2(0.002), vec2(0.998))).rgb * 0.15;
          c += texture2D(uReflMap, clamp(uv + vec2(spread * 0.4, -spread), vec2(0.002), vec2(0.998))).rgb * 0.15;
          c += texture2D(uReflMap, clamp(uv + vec2(-spread * 0.4, -spread), vec2(0.002), vec2(0.998))).rgb * 0.15;
          return c;
        }

        float boxDist2D(vec2 p, vec2 bmin, vec2 bmax) {
          vec2 c = (bmin + bmax) * 0.5;
          vec2 ext = (bmax - bmin) * 0.5;
          vec2 d = abs(p - c) - ext;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        }

        float signedWaterDist(vec2 p) {
          float dMetro = boxDist2D(p, vec2(-420.0, -340.0), vec2(320.0, 380.0));
          float dPalmOuter = boxDist2D(p, vec2(960.0, -380.0), vec2(1660.0, 360.0));
          float dLagoon = boxDist2D(p, vec2(1340.0, 60.0), vec2(1600.0, 290.0));
          float dPalm = max(dPalmOuter, -dLagoon);
          float dPine = boxDist2D(p, vec2(-420.0, -1440.0), vec2(460.0, -880.0));
          float dApexia = boxDist2D(p, vec2(-420.0, 640.0), vec2(1620.0, 1480.0));
          float dKuro = boxDist2D(p, vec2(-1160.0, -140.0), vec2(-540.0, 780.0));
          float dSolara = boxDist2D(p, vec2(1220.0, -1460.0), vec2(1880.0, -780.0));
          float dTunnelRidge = boxDist2D(p, vec2(-145.0, -885.0), vec2(145.0, -335.0));
          float dA = min(min(dMetro, dPalm), min(dPine, dApexia));
          float dB = min(min(dKuro, dSolara), dTunnelRidge);
          return min(dA, dB);
        }

        void main() {
          float rawLandDist = signedWaterDist(vWorldPos.xz);
          if (rawLandDist < -0.15) discard;

          vec3 toCam = cameraPosition - vWorldPos;
          float camDist = length(toCam);
          vec3 V = toCam / max(camDist, 0.0001);
          vec3 L = normalize(uSunDir);

          float distAtten = 1.0 - smoothstep(35.0, 850.0, camDist);
          vec2 fineG = fineWaveGradient(vWorldPos.xz, uTime) * (0.45 + uWaveStrength * 0.55) * (0.28 + 0.72 * distAtten);

          vec2 simSlope = vec2(0.0);
          vec2 simUv = (vWorldPos.xz - uSimOrigin) / uSimSize + 0.5;
          if (simUv.x > 0.04 && simUv.x < 0.96 && simUv.y > 0.04 && simUv.y < 0.96) {
            float e = 1.0 / 128.0;
            float hL = sampleSimH(simUv - vec2(e, 0.0));
            float hR = sampleSimH(simUv + vec2(e, 0.0));
            float hD = sampleSimH(simUv - vec2(0.0, e));
            float hU = sampleSimH(simUv + vec2(0.0, e));
            simSlope = vec2(hL - hR, hD - hU) * 1.35;
          }

          vec2 rainG = uRainIntensity > 0.05
            ? waterRainSlope(vWorldPos.xz * 0.55, uTime) * uRainIntensity * distAtten * 0.34
            : vec2(0.0);

          vec3 N = normalize(normalize(vGeoNormal) + vec3(fineG.x + rainG.x + simSlope.x, 0.0, fineG.y + rainG.y + simSlope.y));
          float edgeDist = max(0.0, rawLandDist);

          float foamNoise = noise2D(vWorldPos.xz * 0.42 + vec2(uTime * 0.28, -uTime * 0.22));
          float shoreWave = 0.5 + 0.5 * sin(edgeDist * 1.4 - uTime * 2.2);
          float shoreFoam = (1.0 - smoothstep(0.15, 4.2, edgeDist)) * smoothstep(0.26, 0.72, foamNoise + shoreWave * 0.3);

          float crestFoamNoise = noise2D(vWorldPos.xz * 0.35 + vec2(uTime * 0.4, -uTime * 0.3));
          float whitecap = smoothstep(0.32, 0.85, vWaveCrest * (0.65 + uWaveStrength * 0.35) + crestFoamNoise * 0.35)
                         * smoothstep(0.45, 1.3, uWaveStrength) * distAtten * 0.52;

          float shallowMix = 1.0 - smoothstep(2.0, 46.0, edgeDist);
          vec2 caustXZ = vWorldPos.xz - (V.xz / max(V.y, 0.35)) * (1.2 - shallowMix * 0.7) + N.xz * 1.4;
          float caustics = noise2D(caustXZ * 0.55 + vec2(uTime * 0.65, uTime * 0.42))
                         * noise2D(caustXZ * 0.74 - vec2(uTime * 0.48, -uTime * 0.55));
          vec3 waterBase = mix(uDeepColor, uShallowColor, shallowMix);
          waterBase += uShallowColor * pow(caustics, 1.8) * shallowMix * 0.68;

          float NdotL = max(dot(N, L), 0.0);
          float troughShade = clamp(0.76 + vWaveCrest * 0.28 + NdotL * 0.35, 0.58, 1.28);
          waterBase *= troughShade;
          float sss = smoothstep(-0.1, 0.75, vWaveCrest) * (0.28 + 0.72 * pow(max(dot(V, -L), 0.0), 2.8));
          waterBase += mix(uShallowColor, vec3(0.14, 0.68, 0.68), 0.45) * sss * 0.62;

          vec3 toFrag = vWorldPos - uCarPos;
          float carDist = length(toFrag.xz);

          vec3 color;
          if (uRTEnabled > 0.5) {
            vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
            vec2 reflUv = vec2(screenUv.x, 1.0 - screenUv.y);
            vec2 uvShift = vec2(N.x * 0.045, N.z * 0.078) * (0.5 + uWaveStrength * 0.4) * (0.3 + 0.7 * distAtten);
            reflUv = clamp(reflUv + uvShift, vec2(0.002), vec2(0.998));

            float reflBlur = 0.002 + (1.0 - distAtten) * 0.0025 + uWaveStrength * 0.0012;
            vec3 reflColor = sampleWaterRT(reflUv, reflBlur) * 1.2;

            float NdotV = max(dot(N, V), 0.0);
            float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 4.4);
            color = mix(waterBase, reflColor, clamp(fresnel * 1.1, 0.14, 0.96));

            vec3 H = normalize(L + V);
            float NdotH = max(dot(N, H), 0.0);
            float glitter = pow(NdotH, 420.0) * 3.8;
            float midSpec = pow(NdotH, 62.0) * 0.52;
            color += uSunColor * (glitter + midSpec);

            if (uHeadlightsOn > 0.5 && carDist < 72.0 && abs(toFrag.y) < 12.0) {
              vec2 dir2 = normalize(toFrag.xz + vec2(0.0001));
              float cone = dot(dir2, normalize(uCarForward.xz));
              float beam = smoothstep(0.62, 0.95, cone) * (1.0 - smoothstep(2.0, 72.0, carDist));
              color += vec3(1.0, 0.94, 0.82) * beam * 0.7;
            }
            if (uNitroActive > 0.5 && carDist < 18.0 && abs(toFrag.y) < 8.0) {
              color += vec3(0.15, 0.8, 1.0) * (1.0 - smoothstep(1.0, 18.0, carDist)) * 0.75;
            }
          } else {
            color = waterBase * (0.72 + NdotL * 0.62);
          }

          float totalFoam = clamp(shoreFoam * 0.55 + whitecap + vSimFoam * 0.62, 0.0, 0.82);
          color = mix(color, vec3(0.84, 0.92, 0.98) * (0.45 + 0.55 * max(uSunColor.r, 0.35)), totalFoam);

          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * camDist * camDist);
          color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
        }
      `,
    });
  }

  // =========================================================================
  // 6. WORLD BUILDER (6 TRENCH-CUT ISLANDS, GRASS, OCEAN & GROUND ROADS)
  // =========================================================================
  function buildWorld(scene, reflTarget, drawingBufferSize) {
    const {
      ISLANDS,
      BRIDGE,
      SOUTH_WEST_BRIDGE,
      SOUTH_EAST_BRIDGE,
      WEST_APEXIA_BRIDGE,
      TUNNEL,
      VIADUCT,
      SKYWAY_EW,
      SKYWAY_NS,
      SKYWAY_SOLARA,
      ROAD_WIDTH,
      HIGHWAY_WIDTH,
    } = CONFIG;

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
      new THREE.SphereGeometry(3800, 32, 20),
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

            vec3 sDir = normalize(uSunDir);
            float sunDot = max(dot(d, sDir), 0.0);
            float sunHalo = pow(sunDot, 12.0) * 0.42 + pow(sunDot, 180.0) * 1.15;
            col += uSunColor * sunHalo * (1.0 - uCloudCover * 0.55) * (1.0 - uNightMix * 0.72);

            if (uNightMix > 0.05 && h > 0.04) {
              vec2 starUv = floor(d.xz / (h + 0.35) * 165.0);
              float sVal = hash21(starUv);
              if (sVal > 0.992) {
                float twinkle = 0.55 + 0.45 * sin(uTime * 3.5 + sVal * 90.0);
                float starVis = smoothstep(0.04, 0.25, h) * uNightMix * (1.0 - uCloudCover * 0.85);
                col += vec3(0.85, 0.92, 1.0) * twinkle * starVis * 1.1;
              }
            }

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

    const groundGroup = new THREE.Group();
    const roadGroup = new THREE.Group();
    const roadShadowGroup = new THREE.Group();
    const bridgeUndersideGroup = new THREE.Group();
    scene.add(groundGroup);
    scene.add(roadGroup);
    scene.add(roadShadowGroup);
    scene.add(bridgeUndersideGroup);

    const seawallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.78 });
    const roadShadowMat = new THREE.ShadowMaterial({ opacity: 0.36 });

    const islandMaterials = {
      metro: createRealisticGrassMaterial(0x2a5724, 0x437631, 0x3b3d26),
      palm: createRealisticGrassMaterial(0x3a6a2e, 0x628c3b, 0x6c6541),
      pinecrest: createRealisticGrassMaterial(0x1f4725, 0x346234, 0x363628),
      apexia: createRealisticGrassMaterial(0x265429, 0x3f7537, 0x363c29),
      kuroshio: createRealisticGrassMaterial(0x204d2c, 0x326a3b, 0x2c3630),
      solara: createRealisticGrassMaterial(0x47682e, 0x738e3d, 0x705d3c),
    };
    const allGrassMats = Object.values(islandMaterials);

    function addSeawallBox(x, z, w, d, h = 1.6) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), seawallMat);
      m.position.set(x, -h / 2 - 0.02, z);
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

      const trenchHoles = window.HorizonRoads && window.HorizonRoads.ISLAND_TRENCH_HOLES[isl.id];
      if (trenchHoles) {
        trenchHoles.forEach((th) => {
          const hole = new THREE.Path();
          hole.moveTo(th.minX, -th.maxZ);
          hole.lineTo(th.minX, -th.minZ);
          hole.lineTo(th.maxX, -th.minZ);
          hole.lineTo(th.maxX, -th.maxZ);
          hole.closePath();
          shape.holes.push(hole);
        });
      }

      const islandGeo = new THREE.ShapeGeometry(shape);
      const mesh = new THREE.Mesh(islandGeo, islandMaterials[isl.id]);
      mesh.rotation.x = -Math.PI / 2;
      groundGroup.add(mesh);

      const grassShadow = new THREE.Mesh(islandGeo, roadShadowMat);
      grassShadow.rotation.x = -Math.PI / 2;
      grassShadow.position.y = 0.012;
      grassShadow.receiveShadow = true;
      roadShadowGroup.add(grassShadow);

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
    beachStrip.position.set(1310, 0.018, 328);
    beachStrip.receiveShadow = true;
    groundGroup.add(beachStrip);

    // 2-Tier 3D Gerstner Ocean Surface (104x104 optimized near patch)
    const waterMat = createWaterMaterial(reflTarget.texture, drawingBufferSize);
    const waterGroup = new THREE.Group();
    const WATER_NEAR_SIZE = 420;
    const WATER_NEAR_SEGS = 104;
    const WATER_GRID_STEP = WATER_NEAR_SIZE / WATER_NEAR_SEGS;

    const waterNearGeo = new THREE.PlaneGeometry(WATER_NEAR_SIZE, WATER_NEAR_SIZE, WATER_NEAR_SEGS, WATER_NEAR_SEGS);
    waterNearGeo.rotateX(-Math.PI / 2);
    const waterNearMesh = new THREE.Mesh(waterNearGeo, waterMat);
    waterNearMesh.position.set(0, -0.26, 0);
    waterNearMesh.frustumCulled = false;
    waterGroup.add(waterNearMesh);

    const farOuter = 4800;
    const farHole = WATER_NEAR_SIZE * 0.5 - 0.5;
    const farShape = new THREE.Shape();
    farShape.moveTo(-farOuter, -farOuter);
    farShape.lineTo(farOuter, -farOuter);
    farShape.lineTo(farOuter, farOuter);
    farShape.lineTo(-farOuter, farOuter);
    farShape.closePath();

    const farCutout = new THREE.Path();
    farCutout.moveTo(-farHole, -farHole);
    farCutout.lineTo(-farHole, farHole);
    farCutout.lineTo(farHole, farHole);
    farCutout.lineTo(farHole, -farHole);
    farCutout.closePath();
    farShape.holes.push(farCutout);

    const waterFarGeo = new THREE.ShapeGeometry(farShape);
    waterFarGeo.rotateX(-Math.PI / 2);
    const waterFarMesh = new THREE.Mesh(waterFarGeo, waterMat);
    waterFarMesh.position.set(0, -0.26, 0);
    waterFarMesh.frustumCulled = false;
    waterGroup.add(waterFarMesh);
    scene.add(waterGroup);

    function syncOceanPatch(camX, camZ) {
      const snapX = Math.round(camX / WATER_GRID_STEP) * WATER_GRID_STEP;
      const snapZ = Math.round(camZ / WATER_GRID_STEP) * WATER_GRID_STEP;
      waterNearMesh.position.set(snapX, -0.26, snapZ);
      waterFarMesh.position.set(snapX, -0.26, snapZ);
      waterMat.uniforms.uPatchCenter.value.set(snapX, snapZ);
    }

    const roadTexCity = createRoadTexture();
    const roadTexHighway = createHighwayTexture(false);
    const roadTexBridge = createHighwayTexture(true);
    const roadTexCircuit = createCircuitTexture();

    const roadMatCity = createRealisticRoadMaterial(roadTexCity, reflTarget.texture, drawingBufferSize, false);
    const roadMatHighway = createRealisticRoadMaterial(roadTexHighway, reflTarget.texture, drawingBufferSize, false);
    const roadMatBridge = createRealisticRoadMaterial(roadTexBridge, reflTarget.texture, drawingBufferSize, false);
    const roadMatCircuit = createRealisticRoadMaterial(roadTexCircuit, reflTarget.texture, drawingBufferSize, false);
    const roadMatInter = createRealisticRoadMaterial(roadTexCity, reflTarget.texture, drawingBufferSize, true);

    const flatRoadRects = [];
    const roadSegments = [];
    const dummy = new THREE.Object3D();

    function isOnFlatRoad(x, z) {
      for (let i = 0; i < flatRoadRects.length; i++) {
        const r = flatRoadRects[i];
        if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return true;
      }
      return false;
    }

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

    // 1) Metro Bay City Streets + Skyway Ramp Connectors
    addFlatRoad("z", 0, -340, 380, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("x", 0, -260, 320, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("z", -260, -240, 260, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", 220, -240, 260, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", -240, -260, 220, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", 260, -260, 220, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", -130, -240, 120, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", 120, -260, 220, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", 60, 195, 226, 18.4, 0.034, true);
    addFlatRoad("z", -72, -244, -220, 18.4, 0.034, true);

    [
      [0, 0, HIGHWAY_WIDTH + 0.8], [0, -240, HIGHWAY_WIDTH + 0.6], [0, 120, HIGHWAY_WIDTH + 0.6], [0, 260, HIGHWAY_WIDTH + 0.6],
      [-260, -240, ROAD_WIDTH + 0.8], [-260, 0, HIGHWAY_WIDTH + 0.6], [-260, 120, ROAD_WIDTH + 0.8], [-260, 260, ROAD_WIDTH + 0.8],
      [220, -240, ROAD_WIDTH + 0.8], [220, 0, HIGHWAY_WIDTH + 0.6], [220, 60, 19.2], [220, 120, ROAD_WIDTH + 0.8], [220, 260, ROAD_WIDTH + 0.8],
      [-130, -240, ROAD_WIDTH + 0.8], [-130, 0, HIGHWAY_WIDTH + 0.6], [-130, 120, ROAD_WIDTH + 0.8], [-72, -240, 19.2],
      [165, -240, 19.2], [165, 260, 19.2],
    ].forEach(([ix, iz, sz]) => addIntersection(ix, iz, sz));

    // 2) Palm Island Marina Streets (split at Palm Roundabout center 1080, -140)
    addFlatRoad("x", 0, 960, 1540, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("z", 1080, -280, -172, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", 1080, -108, 260, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", 1280, -380, 360, HIGHWAY_WIDTH, 0.038, true);
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

    // 4) Apexia Metropolis Skyscraper District Streets + Skyway & Circuit Connectors
    addFlatRoad("z", 0, 640, 1400, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("x", 720, -420, 340, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("x", 950, -320, 452, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("x", 1200, -320, 340, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", 1400, -320, 340, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", -320, 720, 1400, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", -160, 720, 1400, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", 180, 720, 1400, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", 340, 720, 1400, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", 1280, 640, 695, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("z", -72, 1180, 1204, 18.4, 0.034, true);

    [
      [0, 720, HIGHWAY_WIDTH + 0.6], [0, 950, HIGHWAY_WIDTH + 0.8], [0, 1200, HIGHWAY_WIDTH + 0.6], [0, 1400, HIGHWAY_WIDTH + 0.6],
      [-320, 720, HIGHWAY_WIDTH + 0.6], [-320, 950, HIGHWAY_WIDTH + 0.6], [-320, 1200, ROAD_WIDTH + 0.8], [-320, 1400, ROAD_WIDTH + 0.8],
      [-160, 720, HIGHWAY_WIDTH + 0.6], [-160, 950, HIGHWAY_WIDTH + 0.6], [-160, 1200, ROAD_WIDTH + 0.8], [-160, 1400, ROAD_WIDTH + 0.8],
      [180, 720, HIGHWAY_WIDTH + 0.6], [180, 950, HIGHWAY_WIDTH + 0.6], [180, 1200, ROAD_WIDTH + 0.8], [180, 1400, ROAD_WIDTH + 0.8],
      [340, 720, HIGHWAY_WIDTH + 0.6], [340, 950, HIGHWAY_WIDTH + 0.6], [340, 1200, ROAD_WIDTH + 0.8], [340, 1400, ROAD_WIDTH + 0.8],
      [-72, 1200, 19.2],
    ].forEach(([ix, iz, sz]) => addIntersection(ix, iz, sz));

    // 5) Kuroshio Neon District Streets
    addFlatRoad("x", -60, -1080, -620, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", 60, -1080, -955, 18.4, 0.034, true);
    addFlatRoad("x", 280, -1080, -620, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("x", 520, -1080, -620, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", 720, -1080, -540, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("z", -1080, -60, 720, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", -860, -60, 720, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("z", -620, -60, 720, ROAD_WIDTH, 0.032, false);

    [
      [-1080, -60, ROAD_WIDTH + 0.8], [-1080, 60, 19.2], [-1080, 280, HIGHWAY_WIDTH + 0.6], [-1080, 520, ROAD_WIDTH + 0.8], [-1080, 720, HIGHWAY_WIDTH + 0.6],
      [-860, -60, HIGHWAY_WIDTH + 0.6], [-860, 280, HIGHWAY_WIDTH + 0.8], [-860, 520, HIGHWAY_WIDTH + 0.6], [-860, 720, HIGHWAY_WIDTH + 0.8],
      [-620, -60, ROAD_WIDTH + 0.8], [-620, 280, HIGHWAY_WIDTH + 0.6], [-620, 520, ROAD_WIDTH + 0.8], [-620, 720, HIGHWAY_WIDTH + 0.6],
    ].forEach(([ix, iz, sz]) => addIntersection(ix, iz, sz));

    // 6) Solara Mesa Tech City Streets
    addFlatRoad("x", -1380, 1280, 1760, ROAD_WIDTH, 0.032, false);
    addFlatRoad("x", -960, 1280, 1760, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("x", -840, 1280, 1760, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", 1280, -1380, -840, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", 1520, -1380, -840, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("z", 1760, -1380, -840, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("x", -1140, 1740, 1768, 19.6, 0.036, true);

    [
      [1280, -1380, ROAD_WIDTH + 0.8], [1280, -960, HIGHWAY_WIDTH + 0.6], [1280, -840, ROAD_WIDTH + 0.8],
      [1520, -1380, HIGHWAY_WIDTH + 0.6], [1520, -960, HIGHWAY_WIDTH + 0.8], [1520, -840, HIGHWAY_WIDTH + 0.6],
      [1760, -1380, HIGHWAY_WIDTH + 0.6], [1760, -1140, HIGHWAY_WIDTH + 0.6], [1760, -960, HIGHWAY_WIDTH + 0.8], [1760, -840, HIGHWAY_WIDTH + 0.6],
    ].forEach(([ix, iz, sz]) => addIntersection(ix, iz, sz));

    // 7) Sheltered 4-Lane Alpine Tunnel Expressway Floor
    addFlatRoad("z", 0, TUNNEL.endZ, TUNNEL.startZ, HIGHWAY_WIDTH, 0.042, true);

    // Counter-Clockwise (+Y Upward) Winding so Circuit Tarmac, Skyways & ALL Bridge Decks render face-up
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
          indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      return new THREE.Mesh(geo, mat);
    }

    // === END OF PART 1/2 — PASTE PART 2A DIRECTLY BELOW THIS LINE ===
    // =========================================================================
    // 7. BRIDGES, MULTI-LEVEL URBAN SKYWAYS & INSTANCED DECK BATCHING
    // =========================================================================
    const bridgeSteelRed = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.48, roughness: 0.38 });
    const bridgeDeckUndersideMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.55, roughness: 0.48 });
    const cableMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.82, roughness: 0.22 });
    const jerseyBarrierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.76, metalness: 0.16 });
    const steelRailMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.78, roughness: 0.25 });
    const gantrySteelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.72, roughness: 0.34 });
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
    const apexiaPylonMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.55, roughness: 0.28 });

    // North Apexia Coastal Connector linking SE Bridge (1280, 685) -> Apexia Skyline (340, 685) & GP North Gate
    addFlatRoad("x", 685, 340, 1280, HIGHWAY_WIDTH, 0.038, true);
    addFlatRoad("z", 340, 685, 725, ROAD_WIDTH, 0.032, false);
    addFlatRoad("z", 1280, 685, 755, ROAD_WIDTH, 0.036, false);
    addIntersection(340, 685, HIGHWAY_WIDTH + 0.6);
    addIntersection(1280, 685, HIGHWAY_WIDTH + 0.8);

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

    const girderBatch = [];
    const barrierBatch = [];
    const railBatch = [];
    const pierBatch = [];
    const skywayNeonBatch = [];
    const catsEyeAmberBatch = [];
    const catsEyeWhiteBatch = [];
    const highwayLampBatch = [];
    const gantrySignMaterials = [];

    function pushOriented(list, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
      list.push({ x, y, z, sx, sy, sz, rx, ry, rz });
    }

    function isMergeOpen(x, z, y, side = 0) {
      return Boolean(window.HorizonRoads && window.HorizonRoads.isMergeOpening(x, z, y, side));
    }

    function addHighwayGantry(x, z, rotY, title, subtitle, arrow = "↑", yBase = 0) {
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

      g.position.set(x, yBase, z);
      g.rotation.y = rotY;
      scene.add(g);

      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);
      [-spanHalf, spanHalf].forEach((lx) => {
        const wx = x + lx * cosR;
        const wz = z - lx * sinR;
        addCircleCollider(wx, wz, 0.65, yBase - 2, yBase + 12, false);
      });
    }

    addHighwayGantry(292, 0, Math.PI / 2, "GOLDEN BAY BRIDGE", "PALM ISLAND MARINA");
    addHighwayGantry(988, 0, -Math.PI / 2, "GOLDEN BAY BRIDGE", "METRO BAY CITY");
    addHighwayGantry(0, -315, 0, "ALPINE RIDGE TUNNEL", "PINECREST VALLEY");
    addHighwayGantry(0, -905, Math.PI, "ALPINE RIDGE TUNNEL", "METRO BAY CITY");
    addHighwayGantry(435, -1140, Math.PI / 2, "COASTAL VIADUCT", "SOLARA MESA · PALM");
    addHighwayGantry(1280, -355, 0, "COASTAL VIADUCT", "PINECREST · SOLARA");
    addHighwayGantry(0, 352, Math.PI, "APEXIA SKYWAY BRIDGE", "APEXIA METROPOLIS & GP");
    addHighwayGantry(1280, 336, Math.PI, "GRAND PRIX BRIDGE", "APEXIA GP CIRCUIT");
    addHighwayGantry(-565, 720, Math.PI / 2, "KUROSHIO HARBOR LINK", "APEXIA METROPOLIS");
    addHighwayGantry(-395, 720, -Math.PI / 2, "KUROSHIO HARBOR LINK", "KUROSHIO NEON DISTRICT");
    addHighwayGantry(-72, 185, 0, "METRO-APEXIA SKYWAY", "UPPER LEVEL +22M", "↑", 22.0);
    addHighwayGantry(-310, 60, -Math.PI / 2, "KUROSHIO SKYWAY", "NEON EXPRESSWAY", "↑", 11.5);
    addHighwayGantry(1350, -1140, Math.PI / 2, "SOLARA SKYWAY", "TECH TERRACE CITY", "↑", 12.04);

    // 7A) Golden Bay Suspension Bridge (X = 320 -> 960, Z = 0)
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

      pushOriented(girderBatch, mx, my - 1.15, 0, segLen + 0.4, 2.3, HIGHWAY_WIDTH + 2.2, 0, 0, pitch);

      catsEyeAmberBatch.push({ x: mx, y: my + 0.08, z: 0 });
      catsEyeWhiteBatch.push({ x: mx, y: my + 0.08, z: -(BRIDGE.halfW - 0.8) });
      catsEyeWhiteBatch.push({ x: mx, y: my + 0.08, z: BRIDGE.halfW - 0.8 });

      if (i % 3 === 1) {
        if (!isMergeOpen(mx, -(BRIDGE.halfW + 0.85), my, -1)) {
          highwayLampBatch.push({ x: mx, y: my, z: -(BRIDGE.halfW + 0.85), rotY: 0 });
        }
        if (!isMergeOpen(mx, BRIDGE.halfW + 0.85, my, 1)) {
          highwayLampBatch.push({ x: mx, y: my, z: BRIDGE.halfW + 0.85, rotY: Math.PI });
        }
      }

      [-1, 1].forEach((side) => {
        const rz = side * (BRIDGE.halfW + 0.55);
        if (isMergeOpen(mx, rz, my, side)) return;
        pushOriented(barrierBatch, mx, my + 0.52, rz, segLen + 0.25, 1.05, 0.85, 0, 0, pitch);
        pushOriented(railBatch, mx, my + 1.32, rz, segLen + 0.25, 0.22, 0.24, 0, 0, pitch);
        addAABB(Math.min(a.x, b.x), Math.max(a.x, b.x), rz - 0.5, rz + 0.5, Math.min(a.y, b.y) - 1.5, Math.max(a.y, b.y) + 3.5, false);
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

    // 7B) Twin Southern Cable-Stayed Bridges + Kuroshio-Apexia West Bridge
    function buildSouthSpanBridge(cfg) {
      const segs = 22;
      const samples = [];
      for (let i = 0; i <= segs; i++) {
        const z = cfg.startZ + (i / segs) * (cfg.endZ - cfg.startZ);
        const { h, dhdz } = evalSpanBridgeZ(z, cfg);
        const nLen = Math.hypot(dhdz, 1);
        samples.push({ x: cfg.x, y: h, z, rx: -1, rz: 0, nx: 0, ny: 1 / nLen, nz: -dhdz / nLen });
      }
      roadGroup.add(buildElevatedRibbon(samples, cfg.halfW, roadMatBridge));
      roadSegments.push({ x1: cfg.x, z1: cfg.startZ, x2: cfg.x, z2: cfg.endZ, w: cfg.halfW * 2, kind: "bridge" });

      for (let i = 0; i < segs; i++) {
        const a = samples[i];
        const b = samples[i + 1];
        const mz = (a.z + b.z) * 0.5;
        const my = (a.y + b.y) * 0.5;
        const segLen = Math.hypot(b.z - a.z, b.y - a.y);
        const pitch = -Math.atan2(b.y - a.y, b.z - a.z);

        pushOriented(girderBatch, cfg.x, my - 0.95, mz, cfg.halfW * 2 + 1.8, 1.9, segLen + 0.4, pitch, 0, 0);

        catsEyeAmberBatch.push({ x: cfg.x, y: my + 0.08, z: mz });
        catsEyeWhiteBatch.push({ x: cfg.x - (cfg.halfW - 0.8), y: my + 0.08, z: mz });
        catsEyeWhiteBatch.push({ x: cfg.x + (cfg.halfW - 0.8), y: my + 0.08, z: mz });

        if (i % 3 === 1) {
          if (my > 2.5) pushOriented(pierBatch, cfg.x, (my - 4) * 0.5, mz, 2.2, my + 4, 2.2);
          highwayLampBatch.push({ x: cfg.x + (cfg.halfW + 0.85), y: my, z: mz, rotY: Math.PI / 2 });
          highwayLampBatch.push({ x: cfg.x - (cfg.halfW + 0.85), y: my, z: mz, rotY: -Math.PI / 2 });
        }

        [-1, 1].forEach((side) => {
          const rx = cfg.x + side * (cfg.halfW + 0.52);
          pushOriented(barrierBatch, rx, my + 0.52, mz, 0.82, 1.05, segLen + 0.25, pitch, 0, 0);
          pushOriented(railBatch, rx, my + 1.28, mz, 0.22, 0.22, segLen + 0.25, pitch, 0, 0);
          addAABB(rx - 0.45, rx + 0.45, Math.min(a.z, b.z), Math.max(a.z, b.z), Math.min(a.y, b.y) - 1.5, Math.max(a.y, b.y) + 3.5, false);
        });
      }

      const midZ = (cfg.startZ + cfg.endZ) * 0.5;
      const pylonH = 58;
      [-13.4, 13.4].forEach((ox) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(2.6, pylonH, 3.2), apexiaPylonMat);
        leg.position.set(cfg.x + ox, pylonH * 0.5 - 4, midZ);
        leg.castShadow = true;
        scene.add(leg);
        addAABB(cfg.x + ox - 1.4, cfg.x + ox + 1.4, midZ - 1.7, midZ + 1.7, -4, pylonH, false);

        for (let k = -3; k <= 3; k++) {
          if (k === 0) continue;
          const tz = midZ + k * 28;
          const deckH = evalSpanBridgeZ(tz, cfg).h + 1.0;
          const pTop = new THREE.Vector3(cfg.x + ox, pylonH - 6, midZ);
          const pBot = new THREE.Vector3(cfg.x + ox * 0.92, deckH, tz);
          const len = pTop.distanceTo(pBot);
          const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, len, 5), cableMat);
          cable.position.copy(pTop).add(pBot).multiplyScalar(0.5);
          cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pBot.clone().sub(pTop).normalize());
          scene.add(cable);
        }
      });

      const archTop = new THREE.Mesh(new THREE.BoxGeometry(29.4, 2.4, 2.6), apexiaPylonMat);
      archTop.position.set(cfg.x, pylonH - 5, midZ);
      scene.add(archTop);
      const neonBar = new THREE.Mesh(new THREE.BoxGeometry(27.0, 0.7, 0.7), neonMaterials[0]);
      neonBar.position.set(cfg.x, pylonH - 3.3, midZ);
      scene.add(neonBar);
    }

    buildSouthSpanBridge(SOUTH_WEST_BRIDGE);
    buildSouthSpanBridge(SOUTH_EAST_BRIDGE);

    (function buildWestApexiaBridge() {
      const cfg = WEST_APEXIA_BRIDGE;
      const segs = 14;
      const samples = [];
      for (let i = 0; i <= segs; i++) {
        const x = cfg.startX + (i / segs) * (cfg.endX - cfg.startX);
        const { h, dhdx } = evalSpanBridgeX(x, cfg);
        const nLen = Math.hypot(dhdx, 1);
        samples.push({ x, y: h, z: cfg.z, rx: 0, rz: 1, nx: -dhdx / nLen, ny: 1 / nLen, nz: 0 });
      }
      roadGroup.add(buildElevatedRibbon(samples, cfg.halfW, roadMatBridge));
      roadSegments.push({ x1: cfg.startX, z1: cfg.z, x2: cfg.endX, z2: cfg.z, w: cfg.halfW * 2, kind: "bridge" });

      for (let i = 0; i < segs; i++) {
        const a = samples[i];
        const b = samples[i + 1];
        const mx = (a.x + b.x) * 0.5;
        const my = (a.y + b.y) * 0.5;
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);
        const pitch = Math.atan2(b.y - a.y, b.x - a.x);

        pushOriented(girderBatch, mx, my - 0.9, cfg.z, segLen + 0.35, 1.8, cfg.halfW * 2 + 1.8, 0, 0, pitch);
        if (i % 4 === 2 && my > 2.5) pushOriented(pierBatch, mx, (my - 4) * 0.5, cfg.z, 2.0, my + 4, 2.0);
        if (i % 3 === 1) {
          highwayLampBatch.push({ x: mx, y: my, z: cfg.z - (cfg.halfW + 0.8), rotY: 0 });
          highwayLampBatch.push({ x: mx, y: my, z: cfg.z + (cfg.halfW + 0.8), rotY: Math.PI });
        }
        [-1, 1].forEach((side) => {
          const rz = cfg.z + side * (cfg.halfW + 0.5);
          pushOriented(barrierBatch, mx, my + 0.52, rz, segLen + 0.25, 1.05, 0.8, 0, 0, pitch);
          pushOriented(railBatch, mx, my + 1.28, rz, segLen + 0.25, 0.2, 0.22, 0, 0, pitch);
          addAABB(Math.min(a.x, b.x), Math.max(a.x, b.x), rz - 0.45, rz + 0.45, Math.min(a.y, b.y) - 1.5, Math.max(a.y, b.y) + 3.5, false);
        });
      }
    })();

    // =========================================================================
    // 7C. MULTI-LEVEL URBAN SKYWAYS (WITH CLEAN MERGE OPENINGS FOR DIVERSIONS)
    // =========================================================================
    function buildUrbanSkyway(cfg) {
      const totalSpan = cfg.rampDownEnd - cfg.rampUpStart;
      const segs = Math.max(24, Math.round(totalSpan / 18));
      const samples = [];

      for (let i = 0; i <= segs; i++) {
        const c = cfg.rampUpStart + (i / segs) * totalSpan;
        const { h, slope } = evalSkywayDeck(c, cfg);
        const nLen = Math.hypot(slope, 1);
        if (cfg.axis === "x") {
          samples.push({ x: c, y: h, z: cfg.coord, rx: 0, rz: 1, nx: -slope / nLen, ny: 1 / nLen, nz: 0 });
        } else {
          samples.push({ x: cfg.coord, y: h, z: c, rx: -1, rz: 0, nx: 0, ny: 1 / nLen, nz: -slope / nLen });
        }
      }

      roadGroup.add(buildElevatedRibbon(samples, cfg.halfW, roadMatBridge));
      if (cfg.axis === "x") {
        roadSegments.push({ x1: cfg.rampUpStart, z1: cfg.coord, x2: cfg.rampDownEnd, z2: cfg.coord, w: cfg.halfW * 2, kind: "viaduct" });
      } else {
        roadSegments.push({ x1: cfg.coord, z1: cfg.rampUpStart, x2: cfg.coord, z2: cfg.rampDownEnd, w: cfg.halfW * 2, kind: "viaduct" });
      }

      for (let i = 0; i < segs; i++) {
        const a = samples[i];
        const b = samples[i + 1];
        const mx = (a.x + b.x) * 0.5;
        const my = (a.y + b.y) * 0.5;
        const mz = (a.z + b.z) * 0.5;

        if (cfg.axis === "x") {
          const segLen = Math.hypot(b.x - a.x, b.y - a.y);
          const pitch = Math.atan2(b.y - a.y, b.x - a.x);

          pushOriented(girderBatch, mx, my - 0.85, cfg.coord, segLen + 0.35, 1.7, cfg.halfW * 2 + 1.6, 0, 0, pitch);
          if (my > 5.0) {
            [-1, 1].forEach((side) => {
              if (!isMergeOpen(mx, cfg.coord, my, side)) {
                pushOriented(skywayNeonBatch, mx, my - 0.65, cfg.coord + side * (cfg.halfW + 0.9), segLen + 0.2, 0.28, 0.22, 0, 0, pitch);
              }
            });
          }

          catsEyeAmberBatch.push({ x: mx, y: my + 0.08, z: cfg.coord });
          if (i % 3 === 1) {
            if (!isMergeOpen(mx, cfg.coord, my, 0)) {
              highwayLampBatch.push({ x: mx, y: my, z: cfg.coord - (cfg.halfW + 0.78), rotY: 0 });
            }
            if (my > 5.5) {
              [-1, 1].forEach((side) => {
                if (isMergeOpen(mx, cfg.coord, my, side)) return;
                const pz = cfg.coord + side * (cfg.halfW + 0.85);
                if (isOnFlatRoad(mx, pz)) return;
                pushOriented(pierBatch, mx, (my - 3.0) * 0.5, pz, 1.1, my + 2.0, 1.1);
                addCircleCollider(mx, pz, 0.7, -2, my, false);
              });
            }
          }

          [-1, 1].forEach((side) => {
            if (isMergeOpen(mx, cfg.coord, my, side)) return;
            const rz = cfg.coord + side * (cfg.halfW + 0.48);
            pushOriented(barrierBatch, mx, my + 0.52, rz, segLen + 0.25, 1.04, 0.78, 0, 0, pitch);
            pushOriented(railBatch, mx, my + 1.24, rz, segLen + 0.25, 0.2, 0.2, 0, 0, pitch);
            addAABB(Math.min(a.x, b.x), Math.max(a.x, b.x), rz - 0.45, rz + 0.45, Math.min(a.y, b.y) - 1.5, Math.max(a.y, b.y) + 3.4, false);
          });
        } else {
          const segLen = Math.hypot(b.z - a.z, b.y - a.y);
          const pitch = -Math.atan2(b.y - a.y, b.z - a.z);

          pushOriented(girderBatch, cfg.coord, my - 0.85, mz, cfg.halfW * 2 + 1.6, 1.7, segLen + 0.35, pitch, 0, 0);
          if (my > 5.0) {
            [-1, 1].forEach((side) => {
              if (!isMergeOpen(cfg.coord, mz, my, side)) {
                pushOriented(skywayNeonBatch, cfg.coord + side * (cfg.halfW + 0.9), my - 0.65, mz, 0.22, 0.28, segLen + 0.2, pitch, 0, 0);
              }
            });
          }

          catsEyeAmberBatch.push({ x: cfg.coord, y: my + 0.08, z: mz });
          if (i % 3 === 1) {
            if (!isMergeOpen(cfg.coord, mz, my, 0)) {
              highwayLampBatch.push({ x: cfg.coord + (cfg.halfW + 0.78), y: my, z: mz, rotY: Math.PI / 2 });
            }
            if (my > 5.5 && Math.abs(mz - SKYWAY_EW.coord) > 18) {
              [-1, 1].forEach((side) => {
                if (isMergeOpen(cfg.coord, mz, my, side)) return;
                const px = cfg.coord + side * (cfg.halfW + 0.85);
                if (isOnFlatRoad(px, mz)) return;
                pushOriented(pierBatch, px, (my - 3.0) * 0.5, mz, 1.1, my + 2.0, 1.1);
                addCircleCollider(px, mz, 0.7, -2, my, false);
              });
            }
          }

          [-1, 1].forEach((side) => {
            if (isMergeOpen(cfg.coord, mz, my, side)) return;
            const rx = cfg.coord + side * (cfg.halfW + 0.48);
            pushOriented(barrierBatch, rx, my + 0.52, mz, 0.78, 1.04, segLen + 0.25, pitch, 0, 0);
            pushOriented(railBatch, rx, my + 1.24, mz, 0.2, 0.2, segLen + 0.25, pitch, 0, 0);
            addAABB(rx - 0.45, rx + 0.45, Math.min(a.z, b.z), Math.max(a.z, b.z), Math.min(a.y, b.y) - 1.5, Math.max(a.y, b.y) + 3.4, false);
          });
        }
      }
    }

    buildUrbanSkyway(SKYWAY_EW);
    buildUrbanSkyway(SKYWAY_NS);
    buildUrbanSkyway(SKYWAY_SOLARA);

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
    // 9. NE COASTAL VIADUCT HIGHWAY (CLEAN OPEN Y-SPLIT INTO SOLARA SKYWAY)
    // =========================================================================
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

      pushOriented(girderBatch, mx, my - 0.92, -1140, segLen + 0.4, 1.8, HIGHWAY_WIDTH + 1.8, 0, 0, pitch);
      catsEyeAmberBatch.push({ x: mx, y: my + 0.08, z: -1140 });
      catsEyeWhiteBatch.push({ x: mx, y: my + 0.08, z: -1140 - (VIADUCT.halfW - 0.8) });
      catsEyeWhiteBatch.push({ x: mx, y: my + 0.08, z: -1140 + (VIADUCT.halfW - 0.8) });

      if (i % 3 === 1) {
        if (my > 3) pushOriented(pierBatch, mx, (my - 4) * 0.5, -1140, 2.4, my + 4, 2.4);
        highwayLampBatch.push({ x: mx, y: my, z: -1140 - (VIADUCT.halfW + 0.8), rotY: 0 });
      }

      [-1, 1].forEach((side) => {
        const rz = -1140 + side * (VIADUCT.halfW + 0.5);
        pushOriented(barrierBatch, mx, my + 0.52, rz, segLen + 0.25, 1.05, 0.8, 0, 0, pitch);
        pushOriented(railBatch, mx, my + 1.28, rz, segLen + 0.25, 0.2, 0.22, 0, 0, pitch);
        addAABB(Math.min(a.x, b.x), Math.max(a.x, b.x), rz - 0.45, rz + 0.45, Math.min(a.y, b.y) - 1.5, Math.max(a.y, b.y) + 3.5, false);
      });
    }

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
      pushOriented(girderBatch, mx, VIADUCT.deckH - 0.92, mz, HIGHWAY_WIDTH + 1.8, 1.8, segLen + 0.8, 0, yaw, 0);

      const midAng = -Math.PI * 0.5 + ((i + 0.5) / curveSegs) * (Math.PI * 0.5);
      catsEyeAmberBatch.push({ x: mx, y: VIADUCT.deckH + 0.08, z: mz });
      catsEyeWhiteBatch.push({
        x: VIADUCT.curveCX + Math.cos(midAng) * (VIADUCT.curveR + VIADUCT.halfW - 0.8),
        y: VIADUCT.deckH + 0.08,
        z: VIADUCT.curveCZ + Math.sin(midAng) * (VIADUCT.curveR + VIADUCT.halfW - 0.8),
      });

      if (i % 3 === 1) {
        pushOriented(pierBatch, mx, (VIADUCT.deckH - 4) * 0.5, mz, 2.4, VIADUCT.deckH + 4, 2.4);
        if (i >= 7) {
          const outerR = VIADUCT.curveR + VIADUCT.halfW + 0.8;
          highwayLampBatch.push({
            x: VIADUCT.curveCX + Math.cos(midAng) * outerR,
            y: VIADUCT.deckH,
            z: VIADUCT.curveCZ + Math.sin(midAng) * outerR,
            rotY: -midAng - Math.PI * 0.5,
          });
        }
      }

      [-1, 1].forEach((side) => {
        if (side === 1 && i < 9) return;
        const rr = VIADUCT.curveR + side * (VIADUCT.halfW + 0.5);
        const gx = VIADUCT.curveCX + Math.cos(midAng) * rr;
        const gz = VIADUCT.curveCZ + Math.sin(midAng) * rr;
        const railLen = (rr / VIADUCT.curveR) * segLen + 0.35;

        pushOriented(barrierBatch, gx, VIADUCT.deckH + 0.52, gz, 0.8, 1.05, railLen, 0, yaw, 0);
        pushOriented(railBatch, gx, VIADUCT.deckH + 1.28, gz, 0.22, 0.2, railLen, 0, yaw, 0);
        addOBB(gx, gz, 0.5, railLen * 0.5, yaw, VIADUCT.deckH - 1.5, VIADUCT.deckH + 3.5);
      });
    }

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

      pushOriented(girderBatch, 1280, my - 0.92, mz, HIGHWAY_WIDTH + 1.8, 1.8, segLen + 0.4, pitch, 0, 0);
      catsEyeAmberBatch.push({ x: 1280, y: my + 0.08, z: mz });
      catsEyeWhiteBatch.push({ x: 1280 - (VIADUCT.halfW - 0.8), y: my + 0.08, z: mz });
      catsEyeWhiteBatch.push({ x: 1280 + (VIADUCT.halfW - 0.8), y: my + 0.08, z: mz });

      if (i % 3 === 1) {
        if (my > 3 && mz < -780) {
          [-1, 1].forEach((side) => pushOriented(pierBatch, 1280 + side * (VIADUCT.halfW + 0.9), (my - 3) * 0.5, mz, 1.2, my + 2, 1.2));
        } else if (my > 3) {
          pushOriented(pierBatch, 1280, (my - 4) * 0.5, mz, 2.4, my + 4, 2.4);
        }
        highwayLampBatch.push({ x: 1280 + (VIADUCT.halfW + 0.8), y: my, z: mz, rotY: Math.PI / 2 });
      }

      [-1, 1].forEach((side) => {
        const rx = 1280 + side * (VIADUCT.halfW + 0.5);
        pushOriented(barrierBatch, rx, my + 0.52, mz, 0.8, 1.05, segLen + 0.25, pitch, 0, 0);
        pushOriented(railBatch, rx, my + 1.28, mz, 0.22, 0.2, segLen + 0.25, pitch, 0, 0);
        addAABB(rx - 0.45, rx + 0.45, Math.min(a.z, b.z), Math.max(a.z, b.z), Math.min(a.y, b.y) - 1.5, Math.max(a.y, b.y) + 3.5, false);
      });
    }

    const structBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const structCylGeo = new THREE.CylinderGeometry(0.85, 1.0, 1, 8);

    function flushOrientedInst(geo, mat, list, targetParent, castShadow = false) {
      if (!list.length) return null;
      const inst = new THREE.InstancedMesh(geo, mat, list.length);
      inst.castShadow = castShadow;
      inst.receiveShadow = true;
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(it.rx, it.ry, it.rz, "YXZ");
        dummy.scale.set(it.sx, it.sy, it.sz);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      targetParent.add(inst);
      return inst;
    }

    flushOrientedInst(structBoxGeo, bridgeDeckUndersideMat, girderBatch, bridgeUndersideGroup, false);
    flushOrientedInst(structBoxGeo, jerseyBarrierMat, barrierBatch, scene, false);
    flushOrientedInst(structBoxGeo, steelRailMat, railBatch, scene, false);
    flushOrientedInst(structCylGeo, pierMat, pierBatch, scene, true);
    flushOrientedInst(structBoxGeo, neonMaterials[0], skywayNeonBatch, scene, false);

    // =========================================================================
    // 9B. APEXIA GRAND PRIX CIRCUIT (GRADE 1 TRACK, KERBS, PITS & GRANDSTANDS)
    // =========================================================================
    const CIRCUIT_HALF_W = 9.2;
    const circuitCtrlPts = [
      new THREE.Vector3(460, 0, 830),
      new THREE.Vector3(460, 0, 980),
      new THREE.Vector3(460, 0, 1150),
      new THREE.Vector3(460, 0, 1315),
      new THREE.Vector3(520, 0, 1405),
      new THREE.Vector3(655, 0, 1418),
      new THREE.Vector3(805, 0, 1398),
      new THREE.Vector3(915, 0, 1318),
      new THREE.Vector3(1045, 0, 1388),
      new THREE.Vector3(1195, 0, 1322),
      new THREE.Vector3(1345, 0, 1406),
      new THREE.Vector3(1495, 0, 1372),
      new THREE.Vector3(1545, 0, 1235),
      new THREE.Vector3(1460, 0, 1125),
      new THREE.Vector3(1275, 0, 1142),
      new THREE.Vector3(1135, 0, 1055),
      new THREE.Vector3(1245, 0, 965),
      new THREE.Vector3(1445, 0, 948),
      new THREE.Vector3(1532, 0, 855),
      new THREE.Vector3(1430, 0, 755),
      new THREE.Vector3(1180, 0, 755),
      new THREE.Vector3(880, 0, 755),
      new THREE.Vector3(605, 0, 755),
      new THREE.Vector3(492, 0, 770),
    ];

    const circuitCurve = new THREE.CatmullRomCurve3(circuitCtrlPts, true, "centripetal", 0.5);
    const CIRCUIT_SEGS = 280;
    const circuitSamples = [];
    let circuitTotalLen = 0;

    for (let i = 0; i <= CIRCUIT_SEGS; i++) {
      const u = (i % CIRCUIT_SEGS) / CIRCUIT_SEGS;
      const pt = circuitCurve.getPointAt(u);
      const tan = circuitCurve.getTangentAt(u).normalize();
      if (i > 0) {
        const prev = circuitSamples[i - 1];
        circuitTotalLen += Math.hypot(pt.x - prev.x, pt.z - prev.z);
      }
      const rx = -tan.z;
      const rz = tan.x;
      circuitSamples.push({
        x: pt.x, y: 0.02, z: pt.z,
        tx: tan.x, tz: tan.z,
        rx, rz,
        nx: 0, ny: 1, nz: 0,
        dist: circuitTotalLen,
      });
    }

    roadGroup.add(buildElevatedRibbon(circuitSamples, CIRCUIT_HALF_W, roadMatCircuit));
    const circuitShadowMesh = buildElevatedRibbon(circuitSamples, CIRCUIT_HALF_W, roadShadowMat);
    circuitShadowMesh.position.y = 0.022;
    circuitShadowMesh.receiveShadow = true;
    roadShadowGroup.add(circuitShadowMesh);

    for (let i = 0; i < CIRCUIT_SEGS; i += 2) {
      const a = circuitSamples[i];
      const b = circuitSamples[Math.min(CIRCUIT_SEGS, i + 2)];
      roadSegments.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, w: CIRCUIT_HALF_W * 2, kind: "circuit" });
    }

    const kerbRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.52 });
    const kerbWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.48 });
    const barrierRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.62 });
    const barrierWhiteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.62 });

    const kerbRedBatch = [];
    const kerbWhiteBatch = [];
    const barRedBatch = [];
    const barWhiteBatch = [];

    for (let i = 0; i < CIRCUIT_SEGS; i++) {
      const a = circuitSamples[i];
      const b = circuitSamples[i + 1];
      const mx = (a.x + b.x) * 0.5;
      const mz = (a.z + b.z) * 0.5;
      const segLen = Math.hypot(b.x - a.x, b.z - a.z);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      const isRed = i % 2 === 0;

      [-1, 1].forEach((side) => {
        const kx = mx + a.rx * side * (CIRCUIT_HALF_W + 0.85);
        const kz = mz + a.rz * side * (CIRCUIT_HALF_W + 0.85);
        const inWestGate = kx < 458 && kz > 922 && kz < 978;
        const inNorthGate = kz < 752 && kx > 1254 && kx < 1306;

        if (!inWestGate && !inNorthGate) {
          (isRed ? kerbRedBatch : kerbWhiteBatch).push({
            x: kx, y: 0.075, z: kz, sx: 1.75, sy: 0.11, sz: segLen + 0.35, ry: yaw,
          });
        }

        const bx = mx + a.rx * side * (CIRCUIT_HALF_W + 5.6);
        const bz = mz + a.rz * side * (CIRCUIT_HALF_W + 5.6);
        const barInWestGate = bx < 458 && bz > 916 && bz < 984;
        const barInNorthGate = bz < 754 && bx > 1250 && bx < 1310;

        if (!barInWestGate && !barInNorthGate) {
          (isRed ? barRedBatch : barWhiteBatch).push({
            x: bx, y: 0.62, z: bz, sx: 0.9, sy: 1.24, sz: segLen + 0.55, ry: yaw,
          });
          addOBB(bx, bz, 0.55, segLen * 0.5 + 0.25, yaw, -1, 3.0);
        }
      });
    }

    const gpUnitBox = new THREE.BoxGeometry(1, 1, 1);
    function addSimpleInst(geo, mat, list, castShadow = false) {
      if (!list.length) return;
      const inst = new THREE.InstancedMesh(geo, mat, list.length);
      inst.castShadow = castShadow;
      inst.receiveShadow = true;
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(0, it.ry, 0);
        dummy.scale.set(it.sx, it.sy, it.sz);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      scene.add(inst);
    }

    addSimpleInst(gpUnitBox, kerbRedMat, kerbRedBatch, false);
    addSimpleInst(gpUnitBox, kerbWhiteMat, kerbWhiteBatch, false);
    addSimpleInst(gpUnitBox, barrierRedMat, barRedBatch, true);
    addSimpleInst(gpUnitBox, barrierWhiteMat, barWhiteBatch, true);

    let startIdx = 0;
    let bestStartD = Infinity;
    for (let i = 0; i < CIRCUIT_SEGS; i++) {
      const d = Math.hypot(circuitSamples[i].x - 460, circuitSamples[i].z - 980);
      if (d < bestStartD) {
        bestStartD = d;
        startIdx = i;
      }
    }
    const startDist = circuitSamples[startIdx].dist;
    const s1Dist = (startDist + circuitTotalLen * 0.34) % circuitTotalLen;
    const s2Dist = (startDist + circuitTotalLen * 0.67) % circuitTotalLen;

    function getCircuitSampleAtDist(targetDist) {
      const d = ((targetDist % circuitTotalLen) + circuitTotalLen) % circuitTotalLen;
      for (let i = 0; i < CIRCUIT_SEGS; i++) {
        if (circuitSamples[i].dist >= d) return circuitSamples[i];
      }
      return circuitSamples[0];
    }

    const checkCanvas = document.createElement("canvas");
    checkCanvas.width = 512;
    checkCanvas.height = 128;
    const cctx = checkCanvas.getContext("2d");
    for (let cy = 0; cy < 4; cy++) {
      for (let cx = 0; cx < 16; cx++) {
        cctx.fillStyle = (cx + cy) % 2 === 0 ? "#f8fafc" : "#0f172a";
        cctx.fillRect(cx * 32, cy * 32, 32, 32);
      }
    }
    const checkMat = new THREE.MeshStandardMaterial({ map: configureSmoothTexture(new THREE.CanvasTexture(checkCanvas)), roughness: 0.45 });
    const sfStrip = new THREE.Mesh(new THREE.PlaneGeometry(CIRCUIT_HALF_W * 2 - 1.2, 3.8), checkMat);
    sfStrip.rotation.x = -Math.PI / 2;
    sfStrip.position.set(460, 0.085, 980);
    scene.add(sfStrip);

    const gridLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    for (let g = 0; g < 12; g++) {
      const gz = 966 - g * 8.5;
      const gx = 460 + (g % 2 === 0 ? -3.4 : 3.4);
      const boxF = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.32), gridLineMat);
      boxF.rotation.x = -Math.PI / 2;
      boxF.position.set(gx, 0.085, gz);
      scene.add(boxF);
    }

    const tlHousingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.35 });

    function buildCircuitArch(sample, title, accentHex, isStartGantry = false) {
      const arch = new THREE.Group();
      const span = CIRCUIT_HALF_W + 3.6;
      const yaw = Math.atan2(sample.tx, sample.tz);

      [-span, span].forEach((lx) => {
        const col = new THREE.Mesh(new THREE.BoxGeometry(1.1, 10.6, 1.4), gantrySteelMat);
        col.position.set(lx, 5.3, 0);
        arch.add(col);
      });

      const bridge = new THREE.Mesh(new THREE.BoxGeometry(span * 2 + 1.4, 2.5, 1.8), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.5 }));
      bridge.position.set(0, 9.6, 0);
      arch.add(bridge);

      const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity: 3.0 });
      const strip = new THREE.Mesh(new THREE.BoxGeometry(span * 2 + 1.5, 0.34, 1.9), accentMat);
      strip.position.set(0, 10.9, 0);
      arch.add(strip);

      const sc = document.createElement("canvas");
      sc.width = 512;
      sc.height = 96;
      const sctx = sc.getContext("2d");
      sctx.fillStyle = "#0b1120";
      sctx.fillRect(0, 0, 512, 96);
      sctx.fillStyle = "#ffffff";
      sctx.font = "bold 40px Segoe UI, sans-serif";
      sctx.textAlign = "center";
      sctx.fillText(title, 256, 62);
      const sTex = configureSmoothTexture(new THREE.CanvasTexture(sc));
      const sMat = new THREE.MeshStandardMaterial({ map: sTex, emissiveMap: sTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.8 });
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(span * 1.8, 2.0), sMat);
      banner.position.set(0, 9.6, -0.92);
      banner.rotation.y = Math.PI;
      arch.add(banner);
      const bannerBack = banner.clone();
      bannerBack.position.z = 0.92;
      bannerBack.rotation.y = 0;
      arch.add(bannerBack);

      if (isStartGantry) {
        const podGlow = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 3.6 });
        for (let p = -2; p <= 2; p++) {
          const pod = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.35, 0.4), tlHousingMat);
          pod.position.set(p * 2.2, 7.6, 0);
          arch.add(pod);
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), podGlow);
          lamp.position.set(p * 2.2, 7.6, -0.22);
          arch.add(lamp);
        }
      }

      arch.position.set(sample.x, 0, sample.z);
      arch.rotation.y = yaw;
      scene.add(arch);
    }

    buildCircuitArch(circuitSamples[startIdx], "APEXIA GRAND PRIX", 0xef4444, true);
    buildCircuitArch(getCircuitSampleAtDist(s1Dist), "SECTOR 1 · TIMING", 0x38bdf8, false);
    buildCircuitArch(getCircuitSampleAtDist(s2Dist), "SECTOR 2 · TIMING", 0xf59e0b, false);

    const pitWallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.45 });
    const pitGlassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x38bdf8, emissiveIntensity: 0.55, roughness: 0.14, metalness: 0.85 });
    const standRoofMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.3 });

    const pitBldg = new THREE.Mesh(new THREE.BoxGeometry(24, 15, 165), pitWallMat);
    pitBldg.position.set(496, 7.5, 1020);
    pitBldg.castShadow = true;
    scene.add(pitBldg);
    const pitSuiteGlass = new THREE.Mesh(new THREE.BoxGeometry(24.5, 4.2, 158), pitGlassMat);
    pitSuiteGlass.position.set(496, 10.8, 1020);
    scene.add(pitSuiteGlass);
    const pitNeon = new THREE.Mesh(new THREE.BoxGeometry(24.8, 0.7, 165.4), neonMaterials[1]);
    pitNeon.position.set(496, 15.2, 1020);
    scene.add(pitNeon);
    addAABB(484, 508, 937, 1103, -2, 16, true);

    const ctrlTower = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 5.5, 36, 12), pitWallMat);
    ctrlTower.position.set(500, 18, 1126);
    ctrlTower.castShadow = true;
    scene.add(ctrlTower);
    const ctrlDeck = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 9.2, 5.5, 12), pitGlassMat);
    ctrlDeck.position.set(500, 34, 1126);
    scene.add(ctrlDeck);
    const ctrlRing = new THREE.Mesh(new THREE.TorusGeometry(11.6, 0.45, 8, 20), neonMaterials[0]);
    ctrlRing.rotation.x = Math.PI / 2;
    ctrlRing.position.set(500, 36.8, 1126);
    scene.add(ctrlRing);
    addCircleCollider(500, 1126, 8.2, -2, 38, true);

    function addGrandstand(x, z, len, rotY) {
      const gs = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(16, 10, len), pitWallMat);
      base.position.set(0, 5, 0);
      base.castShadow = true;
      gs.add(base);

      const tierCols = [0xef4444, 0xf8fafc, 0x38bdf8, 0xf59e0b];
      for (let t = 0; t < 4; t++) {
        const tier = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 1.5, len - 2),
          new THREE.MeshStandardMaterial({ color: tierCols[t], roughness: 0.7 })
        );
        tier.position.set(-5.8 + t * 3.6, 2.2 + t * 2.2, 0);
        gs.add(tier);
      }

      const canopy = new THREE.Mesh(new THREE.BoxGeometry(20, 0.8, len + 2), standRoofMat);
      canopy.position.set(-1.5, 14.5, 0);
      canopy.rotation.z = 0.14;
      gs.add(canopy);

      gs.position.set(x, 0, z);
      gs.rotation.y = rotY;
      scene.add(gs);
      addOBB(x, z, 8.2, len * 0.5, rotY, -2, 16);
    }

    addGrandstand(424, 1130, 175, Math.PI);
    addGrandstand(1070, 1055, 110, 0);
    addGrandstand(615, 718, 115, -Math.PI / 2);

    const floodBulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe0f2fe, emissiveIntensity: 3.4 });
    [
      [434, 860], [434, 1265], [640, 1445], [960, 1422], [1345, 1435],
      [1570, 1235], [1485, 1060], [1165, 920], [1560, 845], [1220, 725], [840, 725],
    ].forEach(([fx, fz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 26, 6), gantrySteelMat);
      pole.position.set(fx, 13, fz);
      scene.add(pole);
      const bank = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.1, 0.7), floodBulbMat);
      bank.position.set(fx, 25.5, fz);
      bank.lookAt(980, 0, 1060);
      scene.add(bank);
      addCircleCollider(fx, fz, 0.7, -2, 26, false);
    });

    function getTrackProgress(x, z) {
      if (x < 425 || x > 1585 || z < 720 || z > 1455) {
        return { onTrack: false, onTarmac: false, dist: 0, distToCenter: 999 };
      }
      let bestCoarse = 0;
      let bestCoarseSq = Infinity;
      for (let i = 0; i < CIRCUIT_SEGS; i += 7) {
        const s = circuitSamples[i];
        const dSq = (x - s.x) * (x - s.x) + (z - s.z) * (z - s.z);
        if (dSq < bestCoarseSq) {
          bestCoarseSq = dSq;
          bestCoarse = i;
        }
      }

      let bestDistSq = Infinity;
      let bestS = 0;
      for (let off = -9; off <= 9; off++) {
        const idx = (bestCoarse + off + CIRCUIT_SEGS) % CIRCUIT_SEGS;
        const a = circuitSamples[idx];
        const b = circuitSamples[idx + 1];
        const abx = b.x - a.x;
        const abz = b.z - a.z;
        const lenSq = abx * abx + abz * abz || 1;
        const t = THREE.MathUtils.clamp(((x - a.x) * abx + (z - a.z) * abz) / lenSq, 0, 1);
        const px = a.x + abx * t;
        const pz = a.z + abz * t;
        const dSq = (x - px) * (x - px) + (z - pz) * (z - pz);
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestS = a.dist + t * Math.sqrt(lenSq);
        }
      }
      const d = Math.sqrt(bestDistSq);
      return {
        onTrack: d <= CIRCUIT_HALF_W + 6.5,
        onTarmac: d <= CIRCUIT_HALF_W + 1.4,
        dist: bestS % circuitTotalLen,
        distToCenter: d,
      };
    }

    const circuitData = {
      name: "APEXIA GRAND PRIX CIRCUIT",
      samples: circuitSamples,
      totalLength: circuitTotalLen,
      startDist,
      s1Dist,
      s2Dist,
      getTrackProgress,
    };

    // =========================================================================
    // 9C. 6-CITY A* GPS GRAPH + HORIZONROADS COMPLEX NETWORK (4 LAYERS, CURVES, U-TURNS)
    // =========================================================================
    const gpsNodes = [];
    const gpsAdj = new Map();
    const gpsNodeIndex = new Map();

    function addGpsNode(key, x, z) {
      if (gpsNodeIndex.has(key)) return gpsNodeIndex.get(key);
      const id = gpsNodes.length;
      gpsNodes.push({ id, key, x, z });
      gpsAdj.set(id, []);
      gpsNodeIndex.set(key, id);
      return id;
    }

    function linkGps(k1, k2) {
      const a = gpsNodeIndex.get(k1);
      const b = gpsNodeIndex.get(k2);
      if (a === undefined || b === undefined || a === b) return;
      const dist = Math.hypot(gpsNodes[a].x - gpsNodes[b].x, gpsNodes[a].z - gpsNodes[b].z);
      gpsAdj.get(a).push({ to: b, cost: dist });
      gpsAdj.get(b).push({ to: a, cost: dist });
    }

    const navCoords = {
      m_0_n: [0, -340], m_0_240n: [0, -240], m_0_0: [0, 0], m_0_120: [0, 120], m_0_260: [0, 260], m_0_s: [0, 380],
      m_w_240n: [-260, -240], m_w_0: [-260, 0], m_w_120: [-260, 120], m_w_260: [-260, 260],
      m_mw_240n: [-130, -240], m_mw_0: [-130, 0], m_mw_120: [-130, 120],
      m_e_240n: [220, -240], m_e_0: [220, 0], m_e_60: [220, 60], m_e_120: [220, 120], m_e_260: [220, 260],
      m_ns_n: [-72, -240],
      br_w: [320, 0], br_mid: [640, 0], br_e: [960, 0],
      p_1080_0: [1080, 0], p_1280_0: [1280, 0], p_1540_0: [1540, 0],
      p_1080_n: [1080, -280], p_1280_n: [1280, -280], p_1540_n: [1540, -280],
      p_1080_s: [1080, 260], p_1280_s: [1280, 260], p_1280_se: [1280, 360], p_1280_v: [1280, -380],
      tun_mid: [0, -610], pc_0_s: [0, -880], pc_0_1020: [0, -1020], pc_0_1140: [0, -1140], pc_0_1340: [0, -1340],
      pc_w_1020: [-300, -1020], pc_w_1340: [-300, -1340],
      pc_e_1020: [340, -1020], pc_e_1140: [340, -1140], pc_e_1340: [340, -1340],
      v_1: [460, -1140], v_2: [850, -1140], v_3: [1140, -1140], v_4: [1239, -1099], v_5: [1280, -1000], v_6: [1280, -690],
      sw_mid: [0, 510], se_mid: [1280, 500],
      a_0_n: [0, 640], a_0_720: [0, 720], a_0_950: [0, 950], a_0_1200: [0, 1200], a_0_1400: [0, 1400],
      a_w2_720: [-320, 720], a_w2_950: [-320, 950], a_w2_1200: [-320, 1200], a_w2_1400: [-320, 1400],
      a_w1_720: [-160, 720], a_w1_950: [-160, 950], a_w1_1200: [-160, 1200], a_w1_1400: [-160, 1400],
      a_ns_s: [-72, 1200],
      a_e1_720: [180, 720], a_e1_950: [180, 950], a_e1_1200: [180, 1200], a_e1_1400: [180, 1400],
      a_e2_685: [340, 685], a_e2_720: [340, 720], a_e2_950: [340, 950], a_e2_1200: [340, 1200], a_e2_1400: [340, 1400],
      a_n_mid: [820, 685], a_se_640: [1280, 640], a_se_685: [1280, 685],
      gp_grid: [460, 950], gp_t1: [480, 1365], gp_s_mid: [850, 1380], gp_se: [1485, 1360],
      gp_hairpin: [1155, 1055], gp_ne: [1500, 825], gp_back_e: [1280, 755], gp_back_w: [610, 755],
      k_w_n: [-1080, -60], k_w_60: [-1080, 60], k_w_280: [-1080, 280], k_w_520: [-1080, 520], k_w_720: [-1080, 720],
      k_m_n: [-860, -60], k_m_280: [-860, 280], k_m_520: [-860, 520], k_m_720: [-860, 720],
      k_e_n: [-620, -60], k_e_280: [-620, 280], k_e_520: [-620, 520], k_e_720: [-620, 720],
      wa_mid: [-480, 720],
      sky_ew_w: [-700, 60], sky_ew_e: [-220, 60],
      sky_ns_m: [-72, 420],
      s_w_n: [1280, -1380], s_w_960: [1280, -960], s_w_s: [1280, -840],
      s_m_n: [1520, -1380], s_m_960: [1520, -960], s_m_s: [1520, -840],
      s_e_n: [1760, -1380], s_e_1140: [1760, -1140], s_e_960: [1760, -960], s_e_s: [1760, -840],
      sky_sol_mid: [1480, -1140],
    };

    Object.entries(navCoords).forEach(([k, [nx, nz]]) => addGpsNode(k, nx, nz));

    [
      ["m_0_n", "m_0_240n"], ["m_0_240n", "m_0_0"], ["m_0_0", "m_0_120"], ["m_0_120", "m_0_260"], ["m_0_260", "m_0_s"],
      ["m_w_240n", "m_mw_240n"], ["m_mw_240n", "m_ns_n"], ["m_ns_n", "m_0_240n"], ["m_0_240n", "m_e_240n"],
      ["m_w_0", "m_mw_0"], ["m_mw_0", "m_0_0"], ["m_0_0", "m_e_0"], ["m_e_0", "br_w"],
      ["m_w_120", "m_mw_120"], ["m_mw_120", "m_0_120"], ["m_0_120", "m_e_120"],
      ["m_w_260", "m_0_260"], ["m_0_260", "m_e_260"],
      ["m_w_240n", "m_w_0"], ["m_w_0", "m_w_120"], ["m_w_120", "m_w_260"],
      ["m_mw_240n", "m_mw_0"], ["m_mw_0", "m_mw_120"],
      ["m_e_240n", "m_e_0"], ["m_e_0", "m_e_60"], ["m_e_60", "m_e_120"], ["m_e_120", "m_e_260"],
      ["br_w", "br_mid"], ["br_mid", "br_e"], ["br_e", "p_1080_0"],
      ["p_1080_0", "p_1280_0"], ["p_1280_0", "p_1540_0"],
      ["p_1080_n", "p_1280_n"], ["p_1280_n", "p_1540_n"], ["p_1080_s", "p_1280_s"],
      ["p_1080_n", "p_1080_0"], ["p_1080_0", "p_1080_s"],
      ["p_1280_v", "p_1280_n"], ["p_1280_n", "p_1280_0"], ["p_1280_0", "p_1280_s"], ["p_1280_s", "p_1280_se"],
      ["p_1540_n", "p_1540_0"],
      ["m_0_n", "tun_mid"], ["tun_mid", "pc_0_s"],
      ["pc_0_s", "pc_0_1020"], ["pc_0_1020", "pc_0_1140"], ["pc_0_1140", "pc_0_1340"],
      ["pc_w_1020", "pc_0_1020"], ["pc_0_1020", "pc_e_1020"],
      ["pc_0_1140", "pc_e_1140"], ["pc_e_1140", "v_1"],
      ["pc_w_1340", "pc_0_1340"], ["pc_0_1340", "pc_e_1340"],
      ["pc_w_1020", "pc_w_1340"], ["pc_e_1020", "pc_e_1140"], ["pc_e_1140", "pc_e_1340"],
      ["v_1", "v_2"], ["v_2", "v_3"], ["v_3", "v_4"], ["v_4", "v_5"], ["v_5", "v_6"], ["v_6", "p_1280_v"],
      ["m_0_s", "sw_mid"], ["sw_mid", "a_0_n"], ["a_0_n", "a_0_720"],
      ["p_1280_se", "se_mid"], ["se_mid", "a_se_640"], ["a_se_640", "a_se_685"],
      ["a_w2_720", "a_w1_720"], ["a_w1_720", "a_0_720"], ["a_0_720", "a_e1_720"], ["a_e1_720", "a_e2_720"],
      ["a_w2_950", "a_w1_950"], ["a_w1_950", "a_0_950"], ["a_0_950", "a_e1_950"], ["a_e1_950", "a_e2_950"],
      ["a_w2_1200", "a_w1_1200"], ["a_w1_1200", "a_ns_s"], ["a_ns_s", "a_0_1200"], ["a_0_1200", "a_e1_1200"], ["a_e1_1200", "a_e2_1200"],
      ["a_w2_1400", "a_w1_1400"], ["a_w1_1400", "a_0_1400"], ["a_0_1400", "a_e1_1400"], ["a_e1_1400", "a_e2_1400"],
      ["a_w2_720", "a_w2_950"], ["a_w2_950", "a_w2_1200"], ["a_w2_1200", "a_w2_1400"],
      ["a_w1_720", "a_w1_950"], ["a_w1_950", "a_w1_1200"], ["a_w1_1200", "a_w1_1400"],
      ["a_0_720", "a_0_950"], ["a_0_950", "a_0_1200"], ["a_0_1200", "a_0_1400"],
      ["a_e1_720", "a_e1_950"], ["a_e1_950", "a_e1_1200"], ["a_e1_1200", "a_e1_1400"],
      ["a_e2_685", "a_e2_720"], ["a_e2_720", "a_e2_950"], ["a_e2_950", "a_e2_1200"], ["a_e2_1200", "a_e2_1400"],
      ["a_e2_685", "a_n_mid"], ["a_n_mid", "a_se_685"],
      ["a_e2_950", "gp_grid"], ["a_se_685", "gp_back_e"],
      ["gp_grid", "gp_t1"], ["gp_t1", "gp_s_mid"], ["gp_s_mid", "gp_se"], ["gp_se", "gp_hairpin"],
      ["gp_hairpin", "gp_ne"], ["gp_ne", "gp_back_e"], ["gp_back_e", "gp_back_w"], ["gp_back_w", "gp_grid"],
      ["k_w_n", "k_m_n"], ["k_m_n", "k_e_n"],
      ["k_w_280", "k_m_280"], ["k_m_280", "k_e_280"],
      ["k_w_520", "k_m_520"], ["k_m_520", "k_e_520"],
      ["k_w_720", "k_m_720"], ["k_m_720", "k_e_720"], ["k_e_720", "wa_mid"], ["wa_mid", "a_w2_720"],
      ["k_w_n", "k_w_60"], ["k_w_60", "k_w_280"], ["k_w_280", "k_w_520"], ["k_w_520", "k_w_720"],
      ["k_m_n", "k_m_280"], ["k_m_280", "k_m_520"], ["k_m_520", "k_m_720"],
      ["k_e_n", "k_e_280"], ["k_e_280", "k_e_520"], ["k_e_520", "k_e_720"],
      ["k_w_60", "sky_ew_w"], ["sky_ew_w", "sky_ew_e"], ["sky_ew_e", "m_e_60"],
      ["m_ns_n", "sky_ns_m"], ["sky_ns_m", "a_ns_s"],
      ["v_3", "sky_sol_mid"], ["sky_sol_mid", "s_e_1140"],
      ["s_w_n", "s_m_n"], ["s_m_n", "s_e_n"],
      ["s_w_960", "s_m_960"], ["s_m_960", "s_e_960"],
      ["s_w_s", "s_m_s"], ["s_m_s", "s_e_s"],
      ["s_w_n", "s_w_960"], ["s_w_960", "s_w_s"],
      ["s_m_n", "s_m_960"], ["s_m_960", "s_m_s"],
      ["s_e_n", "s_e_1140"], ["s_e_1140", "s_e_960"], ["s_e_960", "s_e_s"],
    ].forEach(([a, b]) => linkGps(a, b));

    // Build all 13 complex corridors (Level -1 Underway & Subsea Tunnel, Level 0 Touge/Roundabout/U-Turns,
    // Level 3 Spiral Flyover & Level 4 Trans-Bay Overpass) BEFORE cities so buildings stay 100% clear!
    const customRoads = window.HorizonRoads
      ? window.HorizonRoads.buildComplexNetwork({
          scene,
          roadGroup,
          roadShadowGroup,
          bridgeUndersideGroup,
          roadMatCity,
          roadMatHighway,
          roadMatBridge,
          roadShadowMat,
          bridgeDeckUndersideMat,
          jerseyBarrierMat,
          steelRailMat,
          pierMat,
          neonMaterials,
          roadSegments,
          addOBB,
          addCircleCollider,
          addGpsNode,
          linkGps,
          isOnFlatRoad,
        })
      : null;

    // Instanced Highway Cat's-Eye Studs & Cobra-Head Streetlamps
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
    // 10. WORKING 3D TRAFFIC LIGHTS (20 SIGNALIZED INTERSECTIONS ACROSS 6 CITIES)
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
      { x: 0, z: 720, halfW: 12.2, phaseIdx: 0 },
      { x: 0, z: 950, halfW: 12.2, phaseIdx: 1 },
      { x: 0, z: 1200, halfW: 12.2, phaseIdx: 2 },
      { x: 340, z: 950, halfW: 11.8, phaseIdx: 0 },
      { x: -860, z: 280, halfW: 12.2, phaseIdx: 0 },
      { x: -860, z: 720, halfW: 12.2, phaseIdx: 1 },
      { x: 1520, z: -960, halfW: 12.2, phaseIdx: 2 },
      { x: 1760, z: -960, halfW: 12.2, phaseIdx: 0 },
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
        if (t < 8.5) { ns = "GREEN"; ew = "RED"; }
        else if (t < 10.0) { ns = "YELLOW"; ew = "RED"; }
        else if (t < 11.0) { ns = "RED"; ew = "RED"; }
        else if (t < 19.5) { ns = "RED"; ew = "GREEN"; }
        else if (t < 21.0) { ns = "RED"; ew = "YELLOW"; }

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
    // 11. STUNT RAMPS (CLEAR OF ALL CURVED ROADS) & ICONIC LANDMARKS
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
    addRamp(1215, 195, 15, 5.8, 26, -Math.PI / 2);
    addRamp(1595, -140, 14, 5.5, 24, 0);
    addRamp(-210, -945, 14, 5.5, 24, 0);
    addRamp(-365, 1080, 14, 5.8, 26, Math.PI);
    addRamp(-1010, 620, 14, 5.6, 25, 0);
    addRamp(1400, -885, 14, 5.6, 25, 0);

    const needleMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.72, roughness: 0.25 });
    const landmarkGroup = new THREE.Group();
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
    // 12. SIX ARCHITECTURAL CITIES (ZERO OVERLAP WITH ROADS, CURVES & SKYWAYS)
    // =========================================================================
    function isClearOfRoadsAndWater(cx, cz, hw, hd) {
      const pad = 6.2;
      for (let i = 0; i < flatRoadRects.length; i++) {
        const r = flatRoadRects[i];
        if (cx + hw + pad > r.minX && cx - hw - pad < r.maxX && cz + hd + pad > r.minZ && cz - hd - pad < r.maxZ) {
          return false;
        }
      }
      if (customRoads && customRoads.isNearAnyCorridor(cx, cz, Math.max(hw, hd) + 5.5)) {
        return false;
      }
      if (cx + hw > 148 && cx - hw < 182 && cz + hd > -245 && cz - hd < 265) {
        return false;
      }
      if (cx + hw > SKYWAY_EW.rampUpStart - 10 && cx - hw < SKYWAY_EW.rampDownEnd + 10 && Math.abs(cz - SKYWAY_EW.coord) < SKYWAY_EW.halfW + hd + 3.2) {
        return false;
      }
      if (cz + hd > SKYWAY_NS.rampUpStart - 10 && cz - hd < SKYWAY_NS.rampDownEnd + 10 && Math.abs(cx - SKYWAY_NS.coord) < SKYWAY_NS.halfW + hw + 3.2) {
        return false;
      }
      if (cx + hw > SKYWAY_SOLARA.rampUpStart - 12 && cx - hw < SKYWAY_SOLARA.rampDownEnd + 10 && Math.abs(cz - SKYWAY_SOLARA.coord) < SKYWAY_SOLARA.halfW + hd + 3.2) {
        return false;
      }
      if (cx + hw > 1255 && cx - hw < 1305 && cz + hd > -1155 && cz - hd < -775) {
        return false;
      }

      const hole = ISLANDS[1].hole;
      if (cx + hw + 6 > hole.minX && cx - hw - 6 < hole.maxX && cz + hd + 6 > hole.minZ && cz - hd - 6 < hole.maxZ) {
        return false;
      }
      for (let i = 0; i < ramps.length; i++) {
        if (Math.hypot(cx - ramps[i].x, cz - ramps[i].z) < 28) return false;
      }
      if (Math.hypot(cx - 110, cz + 120) < 36) return false;
      if (Math.hypot(cx - 90, cz - 1075) < 42) return false;
      if (Math.hypot(cx - 1640, cz + 1260) < 42) return false;
      return true;
    }

    const facadeStyles = ["glass", "solara", "artdeco", "resort", "alpine", "warehouse", "cyber"];
    const buildingMaterials = [];
    const facadeMats = {};
    facadeStyles.forEach((st) => {
      const tex = createFacadeTexture(st);
      const isGlass = st === "glass" || st === "cyber" || st === "solara";
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

    // Iconic 260m Apexia Spire Landmark
    const apexSpireGrp = new THREE.Group();
    [
      { w: 34, h: 78, y: 39, mat: facadeMats.glass },
      { w: 26, h: 72, y: 114, mat: facadeMats.cyber },
      { w: 18, h: 58, y: 179, mat: facadeMats.glass },
    ].forEach((tr, idx) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(tr.w, tr.h, tr.w), tr.mat);
      m.position.y = tr.y;
      m.rotation.y = idx * 0.25;
      m.castShadow = true;
      apexSpireGrp.add(m);
      const nRing = new THREE.Mesh(new THREE.BoxGeometry(tr.w + 0.8, 1.2, tr.w + 0.8), neonMaterials[idx % 2 === 0 ? 0 : 1]);
      nRing.position.y = tr.y + tr.h * 0.5;
      nRing.rotation.y = idx * 0.25;
      apexSpireGrp.add(nRing);
    });
    const spireNeedle = new THREE.Mesh(new THREE.ConeGeometry(2.6, 56, 8), needleMat);
    spireNeedle.position.y = 236;
    apexSpireGrp.add(spireNeedle);
    const spireBeacon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 10), neonMaterials[3]);
    spireBeacon.position.y = 264;
    apexSpireGrp.add(spireBeacon);
    apexSpireGrp.position.set(90, 0, 1075);
    scene.add(apexSpireGrp);
    addAABB(72.5, 107.5, 1057.5, 1092.5, -2, 265, true);

    // Solara Mesa Solar Halo Spire Landmark
    const solaraSpire = new THREE.Group();
    const sShaft = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 15.0, 175, 14), facadeMats.solara);
    sShaft.position.y = 87.5;
    sShaft.castShadow = true;
    solaraSpire.add(sShaft);
    const sHalo = new THREE.Mesh(new THREE.TorusGeometry(22.0, 2.2, 10, 28), neonMaterials[4]);
    sHalo.position.y = 185;
    solaraSpire.add(sHalo);
    solaraSpire.position.set(1640, 0, -1260);
    scene.add(solaraSpire);
    addCircleCollider(1640, -1260, 15.2, -2, 195, true);

    // Kuroshio Neon Twin-Tower Skybridge
    const kuroBridge = new THREE.Mesh(new THREE.BoxGeometry(58, 5.2, 8.5), facadeMats.cyber);
    kuroBridge.position.set(-860, 48, 400);
    scene.add(kuroBridge);
    const kuroBridgeNeon = new THREE.Mesh(new THREE.BoxGeometry(58.4, 0.9, 8.9), neonMaterials[2]);
    kuroBridgeNeon.position.set(-860, 45.2, 400);
    scene.add(kuroBridgeNeon);

    const roofDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const spireMetalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 });
    const pitchedRoofMat = new THREE.MeshStandardMaterial({ color: 0x6b3228, roughness: 0.85 });
    const siloMetalMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.65, roughness: 0.35 });
    const containerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.3 });

    const boxBatches = { glass: [], solara: [], artdeco: [], resort: [], alpine: [], warehouse: [], cyber: [], roof: [], container: [] };
    const cylBatches = { glass: [], solara: [], cyber: [], resort: [], silo: [] };
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

    // 1) Metro Bay City
    const metroZones = [
      [-245, -145, -225, -20], [-115, -20, -225, -20], [22, 205, -225, -20],
      [-245, -145, 20, 105], [-115, -20, 20, 105], [22, 205, 20, 105],
      [-245, -20, 138, 245], [22, 205, 138, 245], [-395, -280, -240, 260],
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

    // 2) Palm Island Marina
    const palmZones = [
      [1098, 1260, -262, -20], [1300, 1522, -262, -20], [1098, 1260, 20, 242],
      [980, 1062, -260, 260], [1560, 1640, -280, 20],
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

    // 3) Pinecrest Alpine
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

    // 4) Apexia Metropolis
    const apexiaZones = [
      [-300, -180, 740, 930], [-140, -22, 740, 930], [22, 160, 740, 930], [200, 320, 740, 930],
      [-300, -180, 972, 1180], [-140, -22, 972, 1180], [22, 160, 972, 1180], [200, 320, 972, 1180],
      [-300, -180, 1220, 1380], [-140, -22, 1220, 1380], [22, 160, 1220, 1380], [200, 320, 1220, 1380],
      [-400, -340, 720, 1380],
    ];

    apexiaZones.forEach(([x0, x1, z0, z1]) => {
      const cols = Math.max(1, Math.floor((x1 - x0) / 56));
      const rows = Math.max(1, Math.floor((z1 - z0) / 58));
      const stepX = (x1 - x0) / cols;
      const stepZ = (z1 - z0) / rows;

      for (let ix = 0; ix < cols; ix++) {
        for (let iz = 0; iz < rows; iz++) {
          const px = x0 + (ix + 0.5) * stepX + (rand() - 0.5) * 6;
          const pz = z0 + (iz + 0.5) * stepZ + (rand() - 0.5) * 6;
          const w = Math.min(stepX - 10, 24 + rand() * 18);
          const d = Math.min(stepZ - 10, 24 + rand() * 18);
          if (!isClearOfRoadsAndWater(px, pz, w * 0.5, d * 0.5)) continue;

          const roll = rand();
          if (roll < 0.44) {
            const h1 = 54 + rand() * 44;
            const h2 = 42 + rand() * 58;
            const h3 = 22 + rand() * 34;
            const st = rand() > 0.45 ? "glass" : "cyber";
            pushT(boxBatches[st], px, h1 / 2, pz, w, h1, d);
            pushT(boxBatches[st], px, h1 + h2 / 2, pz, w * 0.72, h2, d * 0.72);
            pushT(boxBatches.glass, px, h1 + h2 + h3 / 2, pz, w * 0.45, h3, d * 0.45);
            pushT(spireBatch, px, h1 + h2 + h3 + 16, pz, 1.5, 32, 1.5);
            pushT(neonBatches[Math.floor(rand() * neonBatches.length)], px, h1 + h2 - 0.8, pz, w * 0.75, 1.1, d * 0.75);
            addAABB(px - w / 2, px + w / 2, pz - d / 2, pz + d / 2, -2, h1 + h2 + h3, true);
          } else if (roll < 0.76) {
            const r = Math.min(w, d) * 0.47;
            const h = 76 + rand() * 98;
            const st = rand() > 0.4 ? "cyber" : "glass";
            pushT(cylBatches[st], px, h / 2, pz, r, h, r);
            pushT(cylBatches.silo, px, h + 1.5, pz, r * 0.78, 3, r * 0.78);
            pushT(neonBatches[Math.floor(rand() * neonBatches.length)], px, h - 1.0, pz, r * 1.52, 1.1, r * 1.52);
            addCircleCollider(px, pz, r + 0.2, -2, h, true);
          } else {
            const h = 68 + rand() * 82;
            pushT(boxBatches.artdeco, px, h / 2, pz, w, h, d);
            pushT(boxBatches.roof, px, h + 1.8, pz, w * 0.6, 3.6, d * 0.6);
            pushT(neonBatches[4], px, h - 0.7, pz, w + 0.5, 1.0, d + 0.5);
            addAABB(px - w / 2, px + w / 2, pz - d / 2, pz + d / 2, -2, h, true);
          }
        }
      }
    });

    // 5) Kuroshio Neon District
    const kuroshioZones = [
      [-1060, -885, -40, 255], [-835, -645, -40, 255],
      [-1060, -885, 305, 500], [-835, -645, 305, 500],
      [-1060, -885, 545, 695], [-835, -645, 545, 695],
      [-600, -552, -40, 695], [-1145, -1100, -40, 695],
    ];

    kuroshioZones.forEach(([x0, x1, z0, z1]) => {
      const cols = Math.max(1, Math.floor((x1 - x0) / 50));
      const rows = Math.max(1, Math.floor((z1 - z0) / 52));
      const stepX = (x1 - x0) / cols;
      const stepZ = (z1 - z0) / rows;

      for (let ix = 0; ix < cols; ix++) {
        for (let iz = 0; iz < rows; iz++) {
          const px = x0 + (ix + 0.5) * stepX + (rand() - 0.5) * 5;
          const pz = z0 + (iz + 0.5) * stepZ + (rand() - 0.5) * 5;
          const w = Math.min(stepX - 9, 22 + rand() * 16);
          const d = Math.min(stepZ - 9, 22 + rand() * 16);
          if (!isClearOfRoadsAndWater(px, pz, w * 0.5, d * 0.5)) continue;

          const roll = rand();
          if (roll < 0.55) {
            const h1 = 48 + rand() * 52;
            const h2 = 36 + rand() * 56;
            pushT(boxBatches.cyber, px, h1 / 2, pz, w, h1, d);
            pushT(boxBatches.glass, px, h1 + h2 / 2, pz, w * 0.72, h2, d * 0.72);
            pushT(neonBatches[1 + Math.floor(rand() * 3)], px, h1 - 0.6, pz, w + 0.6, 1.0, d + 0.6);
            pushT(neonBatches[Math.floor(rand() * neonBatches.length)], px, h1 + h2 - 0.6, pz, w * 0.74, 1.0, d * 0.74);
            addAABB(px - w / 2, px + w / 2, pz - d / 2, pz + d / 2, -2, h1 + h2, true);
          } else {
            const r = Math.min(w, d) * 0.46;
            const h = 65 + rand() * 88;
            pushT(cylBatches.cyber, px, h / 2, pz, r, h, r);
            pushT(neonBatches[2], px, h - 0.9, pz, r * 1.54, 1.1, r * 1.54);
            addCircleCollider(px, pz, r + 0.2, -2, h, true);
          }
        }
      }
    });

    // 6) Solara Mesa Tech City
    const solaraZones = [
      [1305, 1495, -1355, -1165], [1545, 1735, -1355, -1165],
      [1305, 1495, -1115, -985], [1545, 1735, -1115, -985],
      [1305, 1495, -935, -860], [1545, 1735, -935, -860],
      [1785, 1860, -1360, -860],
    ];

    solaraZones.forEach(([x0, x1, z0, z1]) => {
      const cols = Math.max(1, Math.floor((x1 - x0) / 56));
      const rows = Math.max(1, Math.floor((z1 - z0) / 56));
      const stepX = (x1 - x0) / cols;
      const stepZ = (z1 - z0) / rows;

      for (let ix = 0; ix < cols; ix++) {
        for (let iz = 0; iz < rows; iz++) {
          const px = x0 + (ix + 0.5) * stepX + (rand() - 0.5) * 6;
          const pz = z0 + (iz + 0.5) * stepZ + (rand() - 0.5) * 6;
          const w = Math.min(stepX - 10, 24 + rand() * 16);
          const d = Math.min(stepZ - 10, 24 + rand() * 16);
          if (!isClearOfRoadsAndWater(px, pz, w * 0.5, d * 0.5)) continue;

          const roll = rand();
          if (roll < 0.52) {
            const h1 = 42 + rand() * 44;
            const h2 = 34 + rand() * 52;
            pushT(boxBatches.solara, px, h1 / 2, pz, w, h1, d);
            pushT(boxBatches.solara, px, h1 + h2 / 2, pz, w * 0.74, h2, d * 0.74);
            pushT(neonBatches[4], px, h1 + h2 - 0.6, pz, w * 0.78, 0.9, d * 0.78);
            addAABB(px - w / 2, px + w / 2, pz - d / 2, pz + d / 2, -2, h1 + h2, true);
          } else if (roll < 0.84) {
            const r = Math.min(w, d) * 0.45;
            const h = 58 + rand() * 76;
            pushT(cylBatches.solara, px, h / 2, pz, r, h, r);
            pushT(neonBatches[0], px, h - 0.8, pz, r * 1.5, 0.9, r * 1.5);
            addCircleCollider(px, pz, r + 0.2, -2, h, true);
          } else {
            for (let t = 0; t < 4; t++) {
              treeBatch.push({ x: px + (rand() - 0.5) * 20, z: pz + (rand() - 0.5) * 20, s: 1.0 + rand() * 0.5 });
            }
          }
        }
      }
    });

    [
      [-15, -180], [15, -180], [-15, -70], [15, -70], [-15, 70], [15, 70], [-15, 190], [15, 190],
      [-180, -15], [110, -15], [250, -15], [1020, -15], [1180, -15], [1410, -15],
      [1265, -140], [1265, 130], [-15, -950], [15, -1240], [-160, -1034], [180, -1156],
      [-15, 790], [15, 890], [-15, 1080], [15, 1290], [100, 935], [260, 935], [560, 670], [960, 670],
      [-845, 160], [-845, 420], [-845, 620], [-740, 265], [-980, 265],
      [1505, -1060], [1505, -1260], [1640, -945], [1745, -1240],
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
    buildInstanced(unitBoxGeo, facadeMats.solara, boxBatches.solara);
    buildInstanced(unitBoxGeo, facadeMats.artdeco, boxBatches.artdeco);
    buildInstanced(unitBoxGeo, facadeMats.resort, boxBatches.resort);
    buildInstanced(unitBoxGeo, facadeMats.alpine, boxBatches.alpine);
    buildInstanced(unitBoxGeo, facadeMats.warehouse, boxBatches.warehouse);
    buildInstanced(unitBoxGeo, facadeMats.cyber, boxBatches.cyber);
    buildInstanced(unitBoxGeo, roofDarkMat, boxBatches.roof);
    buildInstanced(unitBoxGeo, containerMat, boxBatches.container);

    buildInstanced(unitCylGeo, facadeMats.glass, cylBatches.glass);
    buildInstanced(unitCylGeo, facadeMats.solara, cylBatches.solara);
    buildInstanced(unitCylGeo, facadeMats.cyber, cylBatches.cyber);
    buildInstanced(unitCylGeo, facadeMats.resort, cylBatches.resort);
    buildInstanced(unitCylGeo, siloMetalMat, cylBatches.silo);

    buildInstanced(spireConeGeo, spireMetalMat, spireBatch, false, false);
    buildInstanced(unitConeGeo, pitchedRoofMat, pitchedRoofBatch);
    neonBatches.forEach((b, idx) => buildInstanced(unitBoxGeo, neonMaterials[idx], b, false, false));

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x56361f, roughness: 0.92 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86 });

    if (treeBatch.length) {
      const nTrees = treeBatch.length;
      const trunkInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.36, 0.58, 3.8, 7), trunkMat, nTrees);
      const lowTierInst = new THREE.InstancedMesh(new THREE.ConeGeometry(3.15, 4.4, 8), leafMat, nTrees);
      const midTierInst = new THREE.InstancedMesh(new THREE.ConeGeometry(2.45, 4.2, 8), leafMat, nTrees);
      const topTierInst = new THREE.InstancedMesh(new THREE.ConeGeometry(1.55, 3.6, 7), leafMat, nTrees);
      const bushInst = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1.15, 1), bushMat, nTrees * 2);

      trunkInst.castShadow = true;
      lowTierInst.castShadow = true;
      midTierInst.castShadow = true;
      topTierInst.castShadow = true;
      bushInst.castShadow = true;

      const foliagePalette = [0x1f5c2b, 0x2a6e33, 0x357a36, 0x22542d, 0x3f8034];
      const cCol = new THREE.Color();

      treeBatch.forEach((t, i) => {
        const s = t.s;
        const rot = hash21JS(t.x, t.z) * Math.PI * 2;
        const shadeHex = foliagePalette[i % foliagePalette.length];

        dummy.scale.set(s, s, s);
        dummy.rotation.set(0, rot, 0);
        dummy.position.set(t.x, 1.9 * s, t.z);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(i, dummy.matrix);

        dummy.position.set(t.x, 4.5 * s, t.z);
        dummy.updateMatrix();
        lowTierInst.setMatrixAt(i, dummy.matrix);

        dummy.rotation.set(0, rot + 0.55, 0);
        dummy.position.set(t.x, 6.9 * s, t.z);
        dummy.updateMatrix();
        midTierInst.setMatrixAt(i, dummy.matrix);

        dummy.rotation.set(0, rot + 1.1, 0);
        dummy.position.set(t.x, 9.1 * s, t.z);
        dummy.updateMatrix();
        topTierInst.setMatrixAt(i, dummy.matrix);

        cCol.setHex(shadeHex).multiplyScalar(0.86);
        lowTierInst.setColorAt(i, cCol);
        cCol.setHex(shadeHex);
        midTierInst.setColorAt(i, cCol);
        cCol.setHex(shadeHex).multiplyScalar(1.14);
        topTierInst.setColorAt(i, cCol);

        for (let b = 0; b < 2; b++) {
          const ang = rot + b * 2.65 + 0.4;
          const dist = (1.6 + b * 0.9) * s;
          const bs = (0.65 + hash21JS(t.x + b * 7, t.z - b * 5) * 0.55) * s;
          dummy.position.set(t.x + Math.cos(ang) * dist, 0.52 * bs, t.z + Math.sin(ang) * dist);
          dummy.rotation.set(0, ang, 0);
          dummy.scale.set(bs * 1.25, bs * 0.72, bs * 1.15);
          dummy.updateMatrix();
          bushInst.setMatrixAt(i * 2 + b, dummy.matrix);
          cCol.setHex(foliagePalette[(i + b + 2) % foliagePalette.length]).multiplyScalar(0.95 + b * 0.12);
          bushInst.setColorAt(i * 2 + b, cCol);
        }
      });

      [trunkInst, lowTierInst, midTierInst, topTierInst, bushInst].forEach((inst) => {
        inst.instanceMatrix.needsUpdate = true;
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
        scene.add(inst);
      });
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

    const farMtnMat = new THREE.MeshStandardMaterial({ color: 0x3b4d58, roughness: 0.96, flatShading: true });
    const farMtnGeo = new THREE.ConeGeometry(1, 1, 14, 5);
    const mPos = farMtnGeo.attributes.position;
    for (let i = 0; i < mPos.count; i++) {
      const mx = mPos.getX(i);
      const my = mPos.getY(i);
      const mz = mPos.getZ(i);
      const ang = Math.atan2(mz, mx);
      const hNorm = my + 0.5;
      const ridge = 1.0 + 0.24 * Math.sin(ang * 3.0 + hNorm * 2.5) + 0.14 * Math.cos(ang * 5.0 - hNorm * 3.0);
      mPos.setXYZ(i, mx * ridge, my * (hNorm > 0.85 ? 0.92 : 1.0), mz * ridge);
    }
    farMtnGeo.computeVertexNormals();

    const farMtnInst = new THREE.InstancedMesh(farMtnGeo, farMtnMat, 60);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const rad = 2650 + (i % 4) * 180;
      const h = 95 + (i % 5) * 44;
      const w = 260 + (i % 3) * 90;
      dummy.position.set(450 + Math.cos(a) * rad, h * 0.5 - 4, Math.sin(a) * rad);
      dummy.rotation.set(0, a * 1.7, 0);
      dummy.scale.set(w, h, w * 0.82);
      dummy.updateMatrix();
      farMtnInst.setMatrixAt(i, dummy.matrix);
    }
    farMtnInst.instanceMatrix.needsUpdate = true;
    scene.add(farMtnInst);

    // === END OF PART 2A — PASTE PART 2B DIRECTLY BELOW THIS LINE ===
    // =========================================================================
    // 13. MULTI-LEVEL SURFACE SAMPLER, SPATIAL COLLIDERS & A* GPS PATHFINDER
    // =========================================================================
    function isOnIslandLand(x, z) {
      for (let i = 0; i < ISLANDS.length; i++) {
        const isl = ISLANDS[i];
        if (x >= isl.minX && x <= isl.maxX && z >= isl.minZ && z <= isl.maxZ) {
          if (isl.hole && x > isl.hole.minX && x < isl.hole.maxX && z > isl.hole.minZ && z < isl.hole.maxZ) {
            return false;
          }
          const tHoles = window.HorizonRoads && window.HorizonRoads.ISLAND_TRENCH_HOLES[isl.id];
          if (tHoles) {
            for (let k = 0; k < tHoles.length; k++) {
              const th = tHoles[k];
              if (x > th.minX && x < th.maxX && z > th.minZ && z < th.maxZ) return false;
            }
          }
          return true;
        }
      }
      return false;
    }

    function sampleSurface(x, z, currentY = 0, heading = 0) {
      const carFX = -Math.sin(heading);
      const carFZ = -Math.cos(heading);
      const inTunnel = isPointInTunnel(x, z, currentY);
      let groundCustomHit = null;

      // 0) Complex Corridors (Level 4 Overpass, Spiral Flyover, Diversions, Level -1 Underway & Subsea Tunnel)
      if (customRoads) {
        const crHit = customRoads.sampleSurface(x, z, currentY, heading);
        if (crHit) {
          if (crHit.height > 1.2 || crHit.height < -0.08 || crHit.surfaceType === "TUNNEL") {
            return crHit;
          }
          groundCustomHit = crHit;
        }
      }

      // 1) Upper-Level Urban Skyway (+22m, Metro Bay <-> Apexia)
      if (
        z >= SKYWAY_NS.rampUpStart &&
        z <= SKYWAY_NS.rampDownEnd &&
        Math.abs(x - SKYWAY_NS.coord) <= SKYWAY_NS.halfW + 0.6
      ) {
        const { h, slope } = evalSkywayDeck(z, SKYWAY_NS);
        if (currentY >= h - 1.35) {
          return { height: h, slopePitch: Math.atan(slope * carFZ), surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      // 2) Mid-Level Urban Skyway (+11.5m, Kuroshio <-> Metro Bay)
      if (
        x >= SKYWAY_EW.rampUpStart &&
        x <= SKYWAY_EW.rampDownEnd &&
        Math.abs(z - SKYWAY_EW.coord) <= SKYWAY_EW.halfW + 0.6
      ) {
        const { h, slope } = evalSkywayDeck(x, SKYWAY_EW);
        if (currentY >= h - 1.35) {
          return { height: h, slopePitch: Math.atan(slope * carFX), surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      // 3) Solara Mesa Skyway (+12.04m, Coastal Viaduct Y-split -> Solara Tech City)
      if (
        x >= SKYWAY_SOLARA.rampUpStart &&
        x <= SKYWAY_SOLARA.rampDownEnd &&
        Math.abs(z - SKYWAY_SOLARA.coord) <= SKYWAY_SOLARA.halfW + 0.6
      ) {
        const { h, slope } = evalSkywayDeck(x, SKYWAY_SOLARA);
        if (currentY >= h - 1.35) {
          return { height: h, slopePitch: Math.atan(slope * carFX), surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      // 4) Major Bay & Inter-City Bridges
      if (x >= BRIDGE.startX && x <= BRIDGE.endX && Math.abs(z - BRIDGE.z) <= BRIDGE.halfW + 0.6) {
        const { h, dhdx } = evalBridge(x);
        if (currentY >= h - 1.35) {
          return { height: h, slopePitch: Math.atan(dhdx * carFX), surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      if (z >= SOUTH_WEST_BRIDGE.startZ && z <= SOUTH_WEST_BRIDGE.endZ && Math.abs(x - SOUTH_WEST_BRIDGE.x) <= SOUTH_WEST_BRIDGE.halfW + 0.6) {
        const { h, dhdz } = evalSpanBridgeZ(z, SOUTH_WEST_BRIDGE);
        if (currentY >= h - 1.35) {
          return { height: h, slopePitch: Math.atan(dhdz * carFZ), surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      if (z >= SOUTH_EAST_BRIDGE.startZ && z <= SOUTH_EAST_BRIDGE.endZ && Math.abs(x - SOUTH_EAST_BRIDGE.x) <= SOUTH_EAST_BRIDGE.halfW + 0.6) {
        const { h, dhdz } = evalSpanBridgeZ(z, SOUTH_EAST_BRIDGE);
        if (currentY >= h - 1.35) {
          return { height: h, slopePitch: Math.atan(dhdz * carFZ), surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      if (x >= WEST_APEXIA_BRIDGE.startX && x <= WEST_APEXIA_BRIDGE.endX && Math.abs(z - WEST_APEXIA_BRIDGE.z) <= WEST_APEXIA_BRIDGE.halfW + 0.6) {
        const { h, dhdx } = evalSpanBridgeX(x, WEST_APEXIA_BRIDGE);
        if (currentY >= h - 1.35) {
          return { height: h, slopePitch: Math.atan(dhdx * carFX), surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      // 5) NE Coastal Viaduct Highway
      if (x >= VIADUCT.eastStartX && x <= VIADUCT.curveCX && Math.abs(z + 1140) <= VIADUCT.halfW + 0.6) {
        const { h, dhdx } = evalEastViaduct(x);
        if (currentY >= h - 1.35) {
          return { height: h, slopePitch: Math.atan(dhdx * carFX), surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      if (x >= VIADUCT.curveCX && z <= VIADUCT.curveCZ) {
        const r = Math.hypot(x - VIADUCT.curveCX, z - VIADUCT.curveCZ);
        if (Math.abs(r - VIADUCT.curveR) <= VIADUCT.halfW + 0.6 && currentY >= VIADUCT.deckH - 1.35) {
          return { height: VIADUCT.deckH, slopePitch: 0, surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      if (z >= VIADUCT.curveCZ && z <= VIADUCT.southEndZ && Math.abs(x - 1280) <= VIADUCT.halfW + 0.6) {
        const { h, dhdz } = evalSouthViaduct(z);
        if (currentY >= h - 1.35) {
          return { height: h, slopePitch: Math.atan(dhdz * carFZ), surfaceType: "BRIDGE", onRoad: true, overWater: false, inTunnel: false, hitWall: false };
        }
      }

      // Alpine Ridge Tunnel only (Subsea Tunnel is handled by customRoads without clamping y to 0)
      if (Math.abs(x - TUNNEL.x) <= TUNNEL.halfW + 1.8 && z <= TUNNEL.startZ && z >= TUNNEL.endZ) {
        return { height: 0.0, slopePitch: 0, surfaceType: "TUNNEL", onRoad: true, overWater: false, inTunnel: true, hitWall: false };
      }

      const onLand = isOnIslandLand(x, z);
      const onFlatOverpass = isOnFlatRoad(x, z);
      const hasGroundSupport = onLand || onFlatOverpass;
      const circuitProg = onLand ? circuitData.getTrackProgress(x, z) : { onTarmac: false };
      const onCircuit = circuitProg.onTarmac;
      const onRoad = hasGroundSupport && (onCircuit || onFlatOverpass || Boolean(groundCustomHit));
      let bestH = hasGroundSupport ? 0.0 : -0.35;
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

      if (groundCustomHit && !onRamp) return groundCustomHit;

      return {
        height: bestH,
        slopePitch,
        surfaceType: !hasGroundSupport && !onRamp ? "WATER" : onCircuit ? "CIRCUIT" : onRoad || onRamp ? "ROAD" : "GRASS",
        onRoad: onRoad || onRamp,
        overWater: !hasGroundSupport && !onRamp,
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

    function findNearestGpsNode(x, z) {
      let bestId = 0;
      let bestD = Infinity;
      for (let i = 0; i < gpsNodes.length; i++) {
        const d = Math.hypot(gpsNodes[i].x - x, gpsNodes[i].z - z);
        if (d < bestD) {
          bestD = d;
          bestId = i;
        }
      }
      return bestId;
    }

    function computeGPSRoute(startX, startZ, goalX, goalZ) {
      const sId = findNearestGpsNode(startX, startZ);
      const gId = findNearestGpsNode(goalX, goalZ);

      const gScore = new Float64Array(gpsNodes.length).fill(Infinity);
      const fScore = new Float64Array(gpsNodes.length).fill(Infinity);
      const cameFrom = new Int32Array(gpsNodes.length).fill(-1);
      const closed = new Uint8Array(gpsNodes.length);
      const open = [sId];

      gScore[sId] = 0;
      fScore[sId] = Math.hypot(gpsNodes[gId].x - gpsNodes[sId].x, gpsNodes[gId].z - gpsNodes[sId].z);

      while (open.length > 0) {
        let bestIdx = 0;
        for (let i = 1; i < open.length; i++) {
          if (fScore[open[i]] < fScore[open[bestIdx]]) bestIdx = i;
        }
        const cur = open.splice(bestIdx, 1)[0];
        if (cur === gId) break;
        if (closed[cur]) continue;
        closed[cur] = 1;

        const edges = gpsAdj.get(cur) || [];
        for (let i = 0; i < edges.length; i++) {
          const e = edges[i];
          if (closed[e.to]) continue;
          const tentative = gScore[cur] + e.cost;
          if (tentative < gScore[e.to]) {
            cameFrom[e.to] = cur;
            gScore[e.to] = tentative;
            fScore[e.to] = tentative + Math.hypot(gpsNodes[gId].x - gpsNodes[e.to].x, gpsNodes[gId].z - gpsNodes[e.to].z);
            if (!open.includes(e.to)) open.push(e.to);
          }
        }
      }

      const path = [];
      let trace = gId;
      while (trace !== -1) {
        path.push({ x: gpsNodes[trace].x, z: gpsNodes[trace].z });
        if (trace === sId) break;
        trace = cameFrom[trace];
      }
      path.reverse();

      if (path.length >= 2) {
        const d01 = Math.hypot(path[1].x - path[0].x, path[1].z - path[0].z);
        const dP1 = Math.hypot(path[1].x - startX, path[1].z - startZ);
        if (dP1 < d01 && Math.hypot(path[0].x - startX, path[0].z - startZ) < d01) {
          path.shift();
        }
      }

      if (!path.length || Math.hypot(path[path.length - 1].x - goalX, path[path.length - 1].z - goalZ) > 8) {
        path.push({ x: goalX, z: goalZ });
      }
      return path;
    }

    // =========================================================================
    // 14. SMOOTH SCULPTED AI TRAFFIC (6 CITIES & SKYWAYS — GP CIRCUIT CLEAR!)
    // =========================================================================
    const trafficGroup = new THREE.Group();
    scene.add(trafficGroup);
    const trafficCars = [];

    const aiGlassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.88, roughness: 0.12 });
    const aiTireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const aiRimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.25 });
    const aiHeadlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff8d6, emissiveIntensity: 3.4 });
    const aiHeadBeamMat = createSoftBeamMaterial(0xfff4d0, 0.12);
    const aiHeadBeams = [];

    const aiWheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14);
    aiWheelGeo.rotateZ(Math.PI / 2);
    const aiHubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.32, 10);
    aiHubGeo.rotateZ(Math.PI / 2);
    const aiBeamGeo = new THREE.ConeGeometry(1.5, 9.5, 12, 1, true);
    aiBeamGeo.rotateX(Math.PI / 2);

    function makeRoundedBodyGeo(pointsFn, width, bevel = 0.11) {
      const s = new THREE.Shape();
      pointsFn(s);
      s.closePath();
      const core = Math.max(0.1, width - bevel * 2);
      const geo = new THREE.ExtrudeGeometry(s, {
        depth: core,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: bevel,
        bevelThickness: bevel,
        curveSegments: 8,
      });
      geo.translate(0, 0, -core * 0.5);
      geo.rotateY(-Math.PI / 2);
      geo.computeVertexNormals();
      return geo;
    }

    const aiBodyCache = {
      sedan: makeRoundedBodyGeo((s) => {
        s.moveTo(-2.12, 0.32); s.quadraticCurveTo(-2.05, 0.72, -1.05, 0.82);
        s.lineTo(1.92, 0.86); s.quadraticCurveTo(2.14, 0.74, 2.10, 0.34);
      }, 1.94, 0.11),
      sedanCab: makeRoundedBodyGeo((s) => {
        s.moveTo(-0.96, 0.78); s.quadraticCurveTo(-0.42, 1.36, 0.22, 1.36);
        s.quadraticCurveTo(0.88, 1.34, 1.44, 0.82);
      }, 1.62, 0.08),
      coupe: makeRoundedBodyGeo((s) => {
        s.moveTo(-2.18, 0.28); s.quadraticCurveTo(-2.08, 0.62, -1.12, 0.72);
        s.lineTo(1.98, 0.78); s.quadraticCurveTo(2.18, 0.66, 2.15, 0.30);
      }, 2.04, 0.12),
      coupeCab: makeRoundedBodyGeo((s) => {
        s.moveTo(-0.92, 0.70); s.quadraticCurveTo(-0.28, 1.20, 0.32, 1.18);
        s.quadraticCurveTo(1.06, 1.14, 1.66, 0.74);
      }, 1.60, 0.09),
      hatch: makeRoundedBodyGeo((s) => {
        s.moveTo(-1.84, 0.32); s.quadraticCurveTo(-1.76, 0.74, -0.88, 0.84);
        s.quadraticCurveTo(-0.38, 1.38, 0.22, 1.40); s.lineTo(1.32, 1.36);
        s.quadraticCurveTo(1.82, 1.18, 1.84, 0.36);
      }, 1.82, 0.11),
      suv: makeRoundedBodyGeo((s) => {
        s.moveTo(-2.28, 0.38); s.quadraticCurveTo(-2.22, 0.94, -1.08, 1.02);
        s.quadraticCurveTo(-0.74, 1.68, -0.22, 1.70); s.lineTo(1.86, 1.68);
        s.quadraticCurveTo(2.26, 1.56, 2.28, 0.42);
      }, 2.04, 0.12),
      van: makeRoundedBodyGeo((s) => {
        s.moveTo(-2.40, 0.40); s.quadraticCurveTo(-2.32, 1.24, -1.52, 1.88);
        s.lineTo(2.24, 1.88); s.quadraticCurveTo(2.42, 1.74, 2.40, 0.42);
      }, 2.02, 0.11),
    };

    const aiPalette = [
      0xf59e0b, 0xf8fafc, 0x3b82f6, 0x94a3b8, 0x10b981,
      0xef4444, 0x8b5cf6, 0x334155, 0xf97316, 0x06b6d4,
    ];

    const AI_CLASS_MASS = {
      hatchback: 1180, coupe: 1440, sedan: 1560, taxi: 1620,
      suv: 2180, van: 2520, truck: 6200, bus: 9800,
    };

    function createAIVehicle(type, colorHex) {
      const g = new THREE.Group();
      const paintMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.62, roughness: 0.24 });
      let len = 4.3, w = 1.98;

      if (type === "bus") {
        len = 8.4; w = 2.4;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 2.3, len), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.38 }));
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
        const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.26, 2.25, 4.15), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.58 }));
        cargo.position.set(0, 1.65, 1.0);
        cargo.castShadow = true;
        g.add(cargo);
      } else if (type === "van") {
        len = 4.9; w = 2.05;
        const body = new THREE.Mesh(aiBodyCache.van, new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.38 }));
        body.castShadow = true;
        g.add(body);
        const ws = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.56, 0.14), aiGlassMat);
        ws.position.set(0, 1.48, -2.14);
        ws.rotation.x = -0.42;
        g.add(ws);
      } else if (type === "suv") {
        len = 4.65; w = 2.08;
        const body = new THREE.Mesh(aiBodyCache.suv, paintMat);
        body.castShadow = true;
        g.add(body);
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.54, 2.6), aiGlassMat);
        win.position.set(0, 1.36, 0.38);
        g.add(win);
      } else if (type === "coupe") {
        len = 4.4; w = 2.08;
        const body = new THREE.Mesh(aiBodyCache.coupe, paintMat);
        body.castShadow = true;
        g.add(body);
        g.add(new THREE.Mesh(aiBodyCache.coupeCab, aiGlassMat));
      } else if (type === "hatchback") {
        len = 3.75; w = 1.86;
        const body = new THREE.Mesh(aiBodyCache.hatch, paintMat);
        body.castShadow = true;
        g.add(body);
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.44, 1.88), aiGlassMat);
        win.position.set(0, 1.12, 0.25);
        g.add(win);
      } else {
        const isTaxi = type === "taxi";
        const bodyMat = isTaxi ? new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.45, roughness: 0.3 }) : paintMat;
        const body = new THREE.Mesh(aiBodyCache.sedan, bodyMat);
        body.castShadow = true;
        g.add(body);
        g.add(new THREE.Mesh(aiBodyCache.sedanCab, aiGlassMat));
        if (isTaxi) {
          const sign = new THREE.Mesh(
            new THREE.BoxGeometry(0.68, 0.20, 0.24),
            new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 2.2 })
          );
          sign.position.set(0, 1.48, 0.08);
          g.add(sign);
        }
      }

      const wheels = [];
      const wz = len * 0.31, wx = w * 0.49;
      [[-wx, -wz], [wx, -wz], [-wx, wz], [wx, wz]].forEach(([px, pz]) => {
        const wh = new THREE.Mesh(aiWheelGeo, aiTireMat);
        wh.add(new THREE.Mesh(aiHubGeo, aiRimMat));
        wh.position.set(px, 0.38, pz);
        g.add(wh);
        wheels.push(wh);
      });

      const halfL = len * 0.5;
      const halfW = w * 0.5;
      [-0.64, 0.64].forEach((lx) => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.08), aiHeadlightMat);
        hl.position.set(lx, 0.66, -halfL - 0.01);
        g.add(hl);
      });

      const beam = new THREE.Mesh(aiBeamGeo, aiHeadBeamMat);
      beam.position.set(0, 0.52, -halfL - 4.75);
      beam.rotation.x = -0.06;
      g.add(beam);
      aiHeadBeams.push(beam);

      const tailMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xff1e1e, emissiveIntensity: 0.85 });
      [-0.64, 0.64].forEach((lx) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.08), tailMat);
        tl.position.set(lx, 0.68, halfL + 0.01);
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

    const AI_MIST_MAX = 48;
    const aiMistPool = [];
    const aiMistGeo = new THREE.SphereGeometry(0.42, 6, 6);
    for (let i = 0; i < AI_MIST_MAX; i++) {
      const m = new THREE.Mesh(
        aiMistGeo,
        new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.2, depthWrite: false })
      );
      m.visible = false;
      scene.add(m);
      aiMistPool.push({ mesh: m, life: 0, maxLife: 0.4, vx: 0, vy: 0, vz: 0 });
    }
    let aiMistIdx = 0;

    function spawnAiMist(x, y, z) {
      const p = aiMistPool[aiMistIdx];
      aiMistIdx = (aiMistIdx + 1) % AI_MIST_MAX;
      p.mesh.position.set(x, y, z);
      p.mesh.scale.setScalar(0.5);
      p.mesh.material.opacity = 0.2;
      p.mesh.visible = true;
      p.life = p.maxLife;
      p.vx = (Math.random() - 0.5) * 1.4;
      p.vy = 1.0 + Math.random() * 0.7;
      p.vz = (Math.random() - 0.5) * 1.4;
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
      [[-320, 720], [340, 720], [340, 1400], [-320, 1400]],
      [[0, 0], [0, 380], [0, 640], [0, 720], [340, 720], [340, 685], [1280, 685], [1280, 640], [1280, 360], [1280, 0], [960, 0], [320, 0]],
      [[-1080, 60], [220, 60], [220, 260], [0, 260], [0, 720], [-1080, 720]],
      [[1280, -1380], [1760, -1380], [1760, -840], [1280, -840]],
      [[-72, -240], [-72, 1200], [0, 1200], [0, -240]],
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
            smoothPts.push([
              mu * mu * pA[0] + 2 * mu * u * cur[0] + u * u * pB[0],
              mu * mu * pA[1] + 2 * mu * u * cur[1] + u * u * pB[1],
            ]);
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
      { loop: buildSmoothLaneLoop(ROUTES[0], false, 3.2), count: 8 },
      { loop: buildSmoothLaneLoop(ROUTES[0], false, 7.2), count: 6 },
      { loop: buildSmoothLaneLoop(ROUTES[0], true, 3.2), count: 8 },
      { loop: buildSmoothLaneLoop(ROUTES[0], true, 7.2), count: 6 },
      { loop: buildSmoothLaneLoop(ROUTES[1], false, 3.8), count: 4 },
      { loop: buildSmoothLaneLoop(ROUTES[2], false, 3.8), count: 4 },
      { loop: buildSmoothLaneLoop(ROUTES[3], false, 3.8), count: 4 },
      { loop: buildSmoothLaneLoop(ROUTES[4], false, 3.8), count: 6 },
      { loop: buildSmoothLaneLoop(ROUTES[5], false, 3.6), count: 6 },
      { loop: buildSmoothLaneLoop(ROUTES[6], false, 3.4), count: 8 },
      { loop: buildSmoothLaneLoop(ROUTES[7], false, 3.8), count: 6 },
      { loop: buildSmoothLaneLoop(ROUTES[8], false, 3.2), count: 7 },
    ];

    compiledLoops.forEach(({ loop, count }, loopIdx) => {
      const isOuterSlowLane = loopIdx === 1 || loopIdx === 3;
      const isSkywayRoute = loopIdx === 9 || loopIdx === 11;
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
        const surf = sampleSurface(p.x, p.z, isSkywayRoute ? 24 : 30, p.heading);
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
    // 15. HARBOR YACHTS & OCEAN SHIPS (MATCHED TO 3D GERSTNER OCEAN SWELLS)
    // =========================================================================
    const boatsGroup = new THREE.Group();
    scene.add(boatsGroup);
    const boats = [];

    const boatCabinGlowMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfde68a, emissiveIntensity: 2.3, roughness: 0.2 });
    const navPortMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 3.4 });
    const navStbdMat = new THREE.MeshStandardMaterial({ color: 0x22ff55, emissive: 0x22ff55, emissiveIntensity: 3.4 });
    const navSternMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.2 });
    const wakeMatBase = new THREE.MeshBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });

    function sampleGerstnerWaveHeight(x, z, t, waveStrength) {
      const w1 = Math.sin((0.85 * x + 0.52 * z) * 0.11 + t * 1.65) * 0.24;
      const w2 = Math.sin((-0.62 * x + 0.78 * z) * 0.16 + t * 2.05) * 0.17;
      const w3 = Math.sin((0.35 * x - 0.94 * z) * 0.24 - t * 2.55) * 0.1;
      return (w1 + w2 + w3) * waveStrength * 0.85;
    }

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
          const stack = new THREE.Mesh(new THREE.BoxGeometry(8.2, 3.4, 8.2), new THREE.MeshStandardMaterial({ color: cCols[r] }));
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
      { mode: "patrol", kind: "yacht", color: 0x06b6d4, axis: "x", fixed: 510, min: 140, max: 1140, pos: 500, dir: 1, speed: 18 },
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
          m.mesh.material.opacity = r * 0.2;
          if (m.life <= 0) m.mesh.visible = false;
        }
      }

      if (!enabled) return;

      for (let i = 0; i < trafficCars.length; i++) {
        const ai = trafficCars[i];
        ai.hitRoll *= Math.exp(-7.5 * dt);
        ai.hitPitch *= Math.exp(-7.5 * dt);

        if (ai.stunTimer > 0) {
          ai.stunTimer -= dt;
          ai.x += ai.knockVx * dt;
          ai.z += ai.knockVz * dt;
          ai.heading += ai.knockYaw * dt;

          ai.knockVx *= Math.exp(-2.8 * dt);
          ai.knockVz *= Math.exp(-2.8 * dt);
          ai.knockYaw *= Math.exp(-3.4 * dt);
          ai.speed = Math.hypot(ai.knockVx, ai.knockVz);

          if (isPointInTunnel(ai.x, ai.z, ai.y)) ai.x = THREE.MathUtils.clamp(ai.x, -9.2, 9.2);
          else if (ai.x >= BRIDGE.startX && ai.x <= BRIDGE.endX && Math.abs(ai.z) < 16) ai.z = THREE.MathUtils.clamp(ai.z, -9.2, 9.2);

          const surfStun = sampleSurface(ai.x, ai.z, ai.y + 3.0, ai.heading);
          ai.y = THREE.MathUtils.lerp(ai.y, surfStun.height, Math.min(1, 14 * dt));
          ai.pitch = THREE.MathUtils.lerp(ai.pitch, surfStun.slopePitch, Math.min(1, 8 * dt));

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

        if (ai.y < 3.0) {
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
        }

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
              if (gap <= 2.6) targetSpeed = 0;
              else targetSpeed = Math.min(targetSpeed, Math.max(0, o.speed + Math.max(0, (gap - 3.2) * 1.15)));
            }
          } else if (ai.deadlockGrace <= 0) {
            if (oFwd < ai.halfL + o.halfW + 10.5 && oLat < o.halfL + ai.halfW + 1.2) {
              const crossGap = oFwd - ai.halfL - o.halfW;
              if (crossGap <= 3.0) targetSpeed = 0;
              else targetSpeed = Math.min(targetSpeed, ai.cruiseSpeed * THREE.MathUtils.clamp((crossGap - 2.5) / 8, 0, 1));
            }
          }
        }

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
        ai.speed = THREE.MathUtils.lerp(ai.speed, targetSpeed, 1 - Math.exp(-(isBraking ? 8.5 : 3.2) * dt));
        ai.tailMat.emissiveIntensity = isBraking ? 3.8 : 0.85;

        ai.dist += ai.speed * dt;
        const p = sampleLoopPos(ai.loop, ai.dist);
        const look = sampleLoopPos(ai.loop, ai.dist + 5.5);
        const smoothHeading = Math.atan2(-(look.x - p.x), -(look.z - p.z));
        const surf = sampleSurface(p.x, p.z, ai.y + 3.0, smoothHeading);

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
          Math.random() < 0.22 * roadMoisture
        ) {
          spawnAiMist(ai.x - fx * ai.halfL, ai.y + 0.28, ai.z - fz * ai.halfL);
        }
      }

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
        const bfx = -Math.sin(b.heading);
        const bfz = -Math.cos(b.heading);
        const brx = Math.cos(b.heading);
        const brz = -Math.sin(b.heading);

        const hCenter = sampleGerstnerWaveHeight(b.x, b.z, elapsed, waveStrength);
        const spanL = b.kind === "ship" ? 14 : 4.5;
        const spanW = b.kind === "ship" ? 5 : 1.8;
        const hBow = sampleGerstnerWaveHeight(b.x + bfx * spanL, b.z + bfz * spanL, elapsed, waveStrength);
        const hStern = sampleGerstnerWaveHeight(b.x - bfx * spanL, b.z - bfz * spanL, elapsed, waveStrength);
        const hPort = sampleGerstnerWaveHeight(b.x - brx * spanW, b.z - brz * spanW, elapsed, waveStrength);
        const hStbd = sampleGerstnerWaveHeight(b.x + brx * spanW, b.z + brz * spanW, elapsed, waveStrength);

        const dampScale = b.kind === "ship" ? 0.45 : 0.85;
        b.mesh.position.set(b.x, -0.24 + hCenter * dampScale, b.z);
        b.mesh.rotation.set(Math.atan2((hBow - hStern) * dampScale, spanL * 2), b.heading, Math.atan2((hPort - hStbd) * dampScale, spanW * 2), "YXZ");
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
      floodBulbMat.emissiveIntensity = headlightsOn ? 3.8 : 0.6;
      gantrySignMaterials.forEach((m) => (m.emissiveIntensity = headlightsOn ? 0.95 : 0.22));
    }

    // =========================================================================
    // 16. 3D WEATHER SYSTEM (RAIN + MICRO-DROPLET SPLASH BURSTS + LIGHTNING)
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

    const MAX_BURSTS = 150;
    const DROPS_PER_BURST = 5;
    const rainSplashGroup = new THREE.Group();
    scene.add(rainSplashGroup);

    const microDropGeo = new THREE.SphereGeometry(0.026, 5, 5);
    const microDropMat = new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const microDropInst = new THREE.InstancedMesh(microDropGeo, microDropMat, MAX_BURSTS * DROPS_PER_BURST);
    microDropInst.frustumCulled = false;
    rainSplashGroup.add(microDropInst);

    const bursts = [];
    for (let i = 0; i < MAX_BURSTS; i++) {
      bursts.push({
        x: 0, y: -999, z: 0,
        age: Math.random() * 0.25,
        life: 0.16 + Math.random() * 0.14,
        phase: Math.random() * Math.PI * 2,
        power: 0.75 + Math.random() * 0.6,
      });
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

    // =========================================================================
    // 16B. TOROIDAL 1-DRAW-CALL 3D GRASS FIELD (ZERO OVERLAP WITH ROADS & RAMPS)
    // =========================================================================
    const GRASS_GRID = 64;
    const GRASS_HALF = GRASS_GRID >> 1;
    const GRASS_STEP = 1.65;
    const GRASS_COUNT = GRASS_GRID * GRASS_GRID;

    function createGrassTuftGeometry() {
      const positions = [];
      const uvs = [];
      const bladeMeta = [];
      const indices = [];
      const bladesPerTuft = 6;

      for (let b = 0; b < bladesPerTuft; b++) {
        const ang = (b / bladesPerTuft) * Math.PI * 2 + (b % 2) * 0.28;
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        const radOff = 0.08 + (b % 3) * 0.14;
        const bx = c * radOff;
        const bz = s * radOff;

        const w = 0.085 + (b % 2) * 0.025;
        const px = -s * w;
        const pz = c * w;

        const h = 0.72 + ((b * 37) % 10) * 0.045;
        const leanMid = 0.11 + (b % 3) * 0.04;
        const leanTop = 0.28 + (b % 3) * 0.08;
        const bRand = ((b * 53 + 17) % 100) / 100;
        const baseV = b * 5;

        positions.push(
          bx - px, 0.0, bz - pz,
          bx + px, 0.0, bz + pz,
          bx - px * 0.56 + c * leanMid, h * 0.52, bz - pz * 0.56 + s * leanMid,
          bx + px * 0.56 + c * leanMid, h * 0.52, bz + pz * 0.56 + s * leanMid,
          bx + c * leanTop, h, bz + s * leanTop
        );

        uvs.push(0.0, 0.0, 1.0, 0.0, 0.15, 0.52, 0.85, 0.52, 0.5, 1.0);
        for (let k = 0; k < 5; k++) bladeMeta.push(c, s, bRand);
        indices.push(baseV, baseV + 1, baseV + 2, baseV + 1, baseV + 3, baseV + 2, baseV + 2, baseV + 3, baseV + 4);
      }

      const instGeo = new THREE.InstancedBufferGeometry();
      instGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
      instGeo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
      instGeo.setAttribute("aBladeMeta", new THREE.BufferAttribute(new Float32Array(bladeMeta), 3));
      instGeo.setIndex(indices);
      instGeo.instanceCount = GRASS_COUNT;
      return instGeo;
    }

    const grassInstGeo = createGrassTuftGeometry();
    const grassPosArr = new Float32Array(GRASS_COUNT * 4);
    const grassStyleArr = new Float32Array(GRASS_COUNT * 4);
    const grassPosAttr = new THREE.InstancedBufferAttribute(grassPosArr, 4);
    const grassStyleAttr = new THREE.InstancedBufferAttribute(grassStyleArr, 4);
    grassInstGeo.setAttribute("aInstPos", grassPosAttr);
    grassInstGeo.setAttribute("aInstStyle", grassStyleAttr);

    const grassBladesMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uRoadMoisture: { value: 0.0 },
        uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.5).normalize() },
        uSunColor: { value: new THREE.Color(0xffa45b) },
        uAmbientColor: { value: new THREE.Color(0x523c46) },
        uFogColor: { value: new THREE.Color(0xb85247) },
        uFogDensity: { value: 0.0006 },
        uCarPos: { value: new THREE.Vector3(0, 0, 45) },
        uCarForward: { value: new THREE.Vector3(0, 0, -1) },
        uCarHalfW: { value: 1.15 },
        uCarHalfL: { value: 2.35 },
        uHeadlightsOn: { value: 1.0 },
        uSparkPos: { value: new THREE.Vector3(0, -100, 0) },
        uSparkIntensity: { value: 0.0 },
      },
      side: THREE.DoubleSide,
      vertexShader: `
        attribute vec3 aBladeMeta;
        attribute vec4 aInstPos;
        attribute vec4 aInstStyle;

        uniform float uTime;
        uniform vec3 uCarPos;
        uniform vec3 uCarForward;
        uniform float uCarHalfW;
        uniform float uCarHalfL;

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vTint;
        varying float vFlower;
        varying float vBladeRand;
        varying float vWind;

        void main() {
          vUv = uv;
          vTint = aInstStyle.rgb;
          vFlower = aInstStyle.a;
          vBladeRand = aBladeMeta.z;

          float hScale = aInstPos.y;
          vec2 baseXZ = aInstPos.xz;

          float camDist = length(baseXZ - cameraPosition.xz);
          float distScale = 1.0 - smoothstep(34.0, 51.0, camDist);
          float finalScale = hScale * distScale;

          if (finalScale < 0.005) {
            vWorldPos = vec3(baseXZ.x, -50.0, baseXZ.y);
            vWind = 0.0;
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
          }

          float cR = cos(aInstPos.w);
          float sR = sin(aInstPos.w);
          vec3 lp = position * vec3(0.85 + hScale * 0.45, finalScale, 0.85 + hScale * 0.45);
          vec3 rotPos = vec3(lp.x * cR - lp.z * sR, lp.y, lp.x * sR + lp.z * cR);

          float bendW = uv.y * uv.y;
          float gust = sin(baseXZ.x * 0.08 + baseXZ.y * 0.055 - uTime * 1.9 + aBladeMeta.z * 2.5);
          float flutter = sin(uTime * 3.8 + baseXZ.x * 0.7 + aBladeMeta.z * 12.0) * 0.04;
          rotPos.x += (gust * 0.20 + flutter) * bendW * finalScale;
          rotPos.z += (gust * 0.13 - flutter * 0.7) * bendW * finalScale;
          vWind = gust;

          vec2 relCar = baseXZ - uCarPos.xz;
          if (dot(relCar, relCar) < 18.0 && uCarPos.y < 1.8 && uCarPos.y > -1.0) {
            vec2 carF = normalize(uCarForward.xz + vec2(0.0001));
            vec2 carR = vec2(-carF.y, carF.x);
            float lx = abs(dot(relCar, carR)) / max(0.8, uCarHalfW + 0.32);
            float lz = abs(dot(relCar, carF)) / max(1.6, uCarHalfL + 0.35);
            float foot = (1.0 - smoothstep(0.65, 1.48, max(lx, lz))) * (1.0 - smoothstep(0.0, 1.8, max(0.0, uCarPos.y)));
            if (foot > 0.01) {
              vec2 pushDir = normalize(relCar + vec2(0.001));
              rotPos.xz += pushDir * foot * bendW * 0.55;
              rotPos.y *= mix(1.0, 0.14, foot);
            }
          }

          vec3 wp = vec3(baseXZ.x + rotPos.x, rotPos.y, baseXZ.y + rotPos.z);
          vWorldPos = wp;
          gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uRoadMoisture;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uAmbientColor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uCarPos;
        uniform vec3 uCarForward;
        uniform float uHeadlightsOn;
        uniform vec3 uSparkPos;
        uniform float uSparkIntensity;

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vTint;
        varying float vFlower;
        varying float vBladeRand;
        varying float vWind;

        void main() {
          vec3 toCam = cameraPosition - vWorldPos;
          float camDist = length(toCam);
          vec3 V = toCam / max(camDist, 0.0001);
          vec3 L = normalize(uSunDir);

          float h = vUv.y;
          vec3 rootCol = vTint * vec3(0.46, 0.50, 0.42);
          vec3 tipCol = vTint * vec3(1.26, 1.34, 0.94);
          vec3 albedo = mix(rootCol, tipCol, smoothstep(0.0, 0.92, h));
          albedo *= 0.88 + vBladeRand * 0.24;

          if (vFlower > 0.5 && vBladeRand > 0.72 && h > 0.76) {
            vec3 flowerCol = vFlower < 1.5
              ? vec3(1.0, 0.84, 0.22)
              : (vFlower < 2.5 ? vec3(0.98, 0.97, 0.92) : vec3(0.76, 0.66, 0.98));
            albedo = mix(albedo, flowerCol, smoothstep(0.76, 0.94, h));
          }

          albedo *= 1.0 - uRoadMoisture * 0.16;

          float wrapDiffuse = clamp(dot(vec3(0.0, 1.0, 0.0), L) * 0.6 + 0.45, 0.0, 1.0);
          float backLight = pow(max(dot(V, -L), 0.0), 3.0) * h * 0.78;
          float dewGlint = pow(max(dot(normalize(L + V), vec3(0.0, 1.0, 0.0)), 0.0), 42.0) * uRoadMoisture * h * 0.45;

          vec3 ambBounce = max(uAmbientColor * 1.42, vec3(0.14, 0.18, 0.16));
          vec3 color = albedo * (ambBounce * (0.58 + 0.52 * h) + uSunColor * (wrapDiffuse * 0.95 + backLight))
                     + uSunColor * (dewGlint + max(0.0, vWind) * h * 0.06);

          vec3 toFrag = vWorldPos - uCarPos;
          float carDist = length(toFrag.xz);
          if (uHeadlightsOn > 0.5 && carDist < 68.0 && abs(toFrag.y) < 5.0) {
            vec2 dir2 = normalize(toFrag.xz + vec2(0.0001));
            float cone = dot(dir2, normalize(uCarForward.xz));
            float beam = smoothstep(0.60, 0.95, cone) * (1.0 - smoothstep(2.0, 68.0, carDist));
            color += vec3(1.0, 0.94, 0.82) * beam * (0.28 + h * 0.42);
          }

          if (uSparkIntensity > 0.02) {
            float sDist = length(vWorldPos - uSparkPos);
            if (sDist < 12.0) {
              float sFall = 1.0 - smoothstep(0.4, 12.0, sDist);
              color += vec3(1.0, 0.58, 0.14) * sFall * sFall * uSparkIntensity * 0.65;
            }
          }

          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * camDist * camDist);
          color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
        }
      `,
    });

    allGrassMats.push(grassBladesMat);
    const grassBladesMesh = new THREE.Mesh(grassInstGeo, grassBladesMat);
    grassBladesMesh.frustumCulled = false;
    groundGroup.add(grassBladesMesh);

    const grassCellX = new Int32Array(GRASS_COUNT).fill(999999);
    const grassCellZ = new Int32Array(GRASS_COUNT).fill(999999);
    let lastGrassCX = 999999;
    let lastGrassCZ = 999999;

    const biomeRGB = {
      metro: [0.22, 0.44, 0.18],
      palm: [0.30, 0.52, 0.22],
      pinecrest: [0.16, 0.38, 0.18],
      apexia: [0.20, 0.44, 0.20],
      kuroshio: [0.16, 0.40, 0.22],
      solara: [0.34, 0.50, 0.20],
    };

    function classifyGrassPoint(wx, wz) {
      if (isPointInTunnel(wx, wz, 0)) return null;

      let islandId = null;
      for (let i = 0; i < ISLANDS.length; i++) {
        const isl = ISLANDS[i];
        if (wx >= isl.minX + 2.5 && wx <= isl.maxX - 2.5 && wz >= isl.minZ + 2.5 && wz <= isl.maxZ - 2.5) {
          if (isl.hole && wx > isl.hole.minX - 2.5 && wx < isl.hole.maxX + 2.5 && wz > isl.hole.minZ - 2.5 && wz < isl.hole.maxZ + 2.5) {
            return null;
          }
          islandId = isl.id;
          break;
        }
      }
      if (!islandId) return null;
      if (islandId === "palm" && wx > 975 && wx < 1645 && wz > 296 && wz < 360) return null;

      const tHoles = window.HorizonRoads && window.HorizonRoads.ISLAND_TRENCH_HOLES[islandId];
      if (tHoles) {
        for (let i = 0; i < tHoles.length; i++) {
          const th = tHoles[i];
          if (wx >= th.minX - 2.0 && wx <= th.maxX + 2.0 && wz >= th.minZ - 2.0 && wz <= th.maxZ + 2.0) return null;
        }
      }

      for (let i = 0; i < flatRoadRects.length; i++) {
        const r = flatRoadRects[i];
        if (wx >= r.minX - 1.35 && wx <= r.maxX + 1.35 && wz >= r.minZ - 1.35 && wz <= r.maxZ + 1.35) return null;
      }

      if (customRoads && customRoads.isPointOnRoad(wx, wz, 1.65, 3.6)) return null;

      if (wx >= SKYWAY_EW.rampUpStart - 5 && wx <= SKYWAY_EW.rampDownEnd + 5 && Math.abs(wz - SKYWAY_EW.coord) <= SKYWAY_EW.halfW + 2.0) {
        if (evalSkywayDeck(wx, SKYWAY_EW).h < 3.8) return null;
      }
      if (wz >= SKYWAY_NS.rampUpStart - 5 && wz <= SKYWAY_NS.rampDownEnd + 5 && Math.abs(wx - SKYWAY_NS.coord) <= SKYWAY_NS.halfW + 2.0) {
        if (evalSkywayDeck(wz, SKYWAY_NS).h < 3.8) return null;
      }
      if (wx >= SKYWAY_SOLARA.rampUpStart - 5 && wx <= SKYWAY_SOLARA.rampDownEnd + 5 && Math.abs(wz - SKYWAY_SOLARA.coord) <= SKYWAY_SOLARA.halfW + 2.0) {
        if (evalSkywayDeck(wx, SKYWAY_SOLARA).h < 3.8) return null;
      }

      let inCircuitInfield = false;
      if (islandId === "apexia" && wx >= 425 && wx <= 1585 && wz >= 720 && wz <= 1455) {
        const tp = circuitData.getTrackProgress(wx, wz);
        if (tp.distToCenter < CIRCUIT_HALF_W + 2.15) return null;
        inCircuitInfield = true;
      }

      for (let i = 0; i < ramps.length; i++) {
        if (Math.abs(wx - ramps[i].x) < 16 && Math.abs(wz - ramps[i].z) < 16) return null;
      }

      const nearby = getNearbyColliders(wx, wz);
      for (let i = 0; i < nearby.length; i++) {
        const c = nearby[i];
        if (c.minY > 1.5) continue;
        if (wx >= c.minX - 0.8 && wx <= c.maxX + 0.8 && wz >= c.minZ - 0.8 && wz <= c.maxZ + 0.8) return null;
      }

      return { islandId, inCircuitInfield };
    }

    function updateGrassField(camX, camZ) {
      const cIX = Math.floor(camX / GRASS_STEP);
      const cIZ = Math.floor(camZ / GRASS_STEP);
      if (cIX === lastGrassCX && cIZ === lastGrassCZ) return;
      lastGrassCX = cIX;
      lastGrassCZ = cIZ;

      let dirty = false;
      for (let dz = -GRASS_HALF; dz < GRASS_HALF; dz++) {
        const iz = cIZ + dz;
        const sz = ((iz % GRASS_GRID) + GRASS_GRID) % GRASS_GRID;
        const rowOff = sz * GRASS_GRID;

        for (let dx = -GRASS_HALF; dx < GRASS_HALF; dx++) {
          const ix = cIX + dx;
          const sx = ((ix % GRASS_GRID) + GRASS_GRID) % GRASS_GRID;
          const slot = rowOff + sx;

          if (grassCellX[slot] === ix && grassCellZ[slot] === iz) continue;
          grassCellX[slot] = ix;
          grassCellZ[slot] = iz;
          dirty = true;

          const jx = hash21JS(ix * 1.13, iz * 1.71);
          const jz = hash21JS(ix * 2.31 + 13.7, iz * 0.91 + 7.3);
          const wx = (ix + 0.1 + jx * 0.8) * GRASS_STEP;
          const wz = (iz + 0.1 + jz * 0.8) * GRASS_STEP;

          const pIdx = slot * 4;
          const info = classifyGrassPoint(wx, wz);

          if (!info) {
            grassPosArr[pIdx] = wx;
            grassPosArr[pIdx + 1] = 0.0;
            grassPosArr[pIdx + 2] = wz;
            grassPosArr[pIdx + 3] = 0.0;
            continue;
          }

          const meadowNoise = noise2DJS(wx * 0.06, wz * 0.06);
          const hScale = info.inCircuitInfield ? 0.34 + meadowNoise * 0.24 : 0.48 + meadowNoise * 0.56 + jx * 0.16;

          grassPosArr[pIdx] = wx;
          grassPosArr[pIdx + 1] = hScale;
          grassPosArr[pIdx + 2] = wz;
          grassPosArr[pIdx + 3] = jz * Math.PI * 2;

          const base = biomeRGB[info.islandId] || biomeRGB.metro;
          const warmth = 0.85 + meadowNoise * 0.34;
          grassStyleArr[pIdx] = base[0] * warmth;
          grassStyleArr[pIdx + 1] = base[1] * (0.9 + jx * 0.22);
          grassStyleArr[pIdx + 2] = base[2] * (0.85 + jz * 0.24);

          const flRoll = hash21JS(ix + 31.4, iz - 19.2);
          grassStyleArr[pIdx + 3] = !info.inCircuitInfield && flRoll > 0.86
            ? (flRoll > 0.95 ? 3.0 : flRoll > 0.91 ? 2.0 : 1.0)
            : 0.0;
        }
      }

      if (dirty) {
        grassPosAttr.needsUpdate = true;
        grassStyleAttr.needsUpdate = true;
      }
    }

    // =========================================================================
    // 16C. PHYSICALLY CALIBRATED 128x128 SHALLOW-WATER SIM + 3D PUDDLE SURFACE
    // =========================================================================
    const SIM_RES = 128;
    const SIM_TEXEL_WORLD = 0.28;
    const SIM_SIZE = SIM_RES * SIM_TEXEL_WORLD;

    const simOpts = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    };
    let simTargetRead = new THREE.WebGLRenderTarget(SIM_RES, SIM_RES, simOpts);
    let simTargetWrite = new THREE.WebGLRenderTarget(SIM_RES, SIM_RES, simOpts);

    const simOrthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const simScene = new THREE.Scene();
    const simQuadGeo = new THREE.PlaneGeometry(2, 2);

    const simClearMat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      vertexShader: `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `void main() { gl_FragColor = vec4(127.0 / 255.0, 1.0, 127.0 / 255.0, 1.0); }`,
    });

    const simStepMat = new THREE.ShaderMaterial({
      uniforms: {
        tPrev: { value: simTargetRead.texture },
        uSimOrigin: { value: new THREE.Vector2(0, 0) },
        uSimSize: { value: SIM_SIZE },
        uScrollTexels: { value: new THREE.Vector2(0, 0) },
        uPuddleLevel: { value: 0.0 },
        uInOcean: { value: 0.0 },
        uCarPos: { value: new THREE.Vector3(0, 0, 45) },
        uCarForward: { value: new THREE.Vector3(0, 0, -1) },
        uCarVel: { value: new THREE.Vector3(0, 0, 0) },
        uWheelX: { value: 1.08 },
        uWheelZ: { value: 1.38 },
        uCarHalfW: { value: 1.1 },
        uCarHalfL: { value: 2.3 },
        uBrakePedal: { value: 0.0 },
        uImpactPulse: { value: 0.0 },
        uRainIntensity: { value: 0.0 },
        uTime: { value: 0.0 },
      },
      depthTest: false,
      depthWrite: false,
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tPrev;
        uniform vec2 uSimOrigin;
        uniform float uSimSize;
        uniform vec2 uScrollTexels;
        uniform float uPuddleLevel;
        uniform float uInOcean;
        uniform vec3 uCarPos;
        uniform vec3 uCarForward;
        uniform vec3 uCarVel;
        uniform float uWheelX;
        uniform float uWheelZ;
        uniform float uCarHalfW;
        uniform float uCarHalfL;
        uniform float uBrakePedal;
        uniform float uImpactPulse;
        uniform float uRainIntensity;
        uniform float uTime;

        varying vec2 vUv;
        const float INV_RES = 1.0 / 128.0;

        vec2 encode16(float h) {
          float v = clamp(floor((h * 0.5 + 0.5) * 65534.0 + 0.5), 0.0, 65534.0);
          float hi = floor(v / 256.0);
          float lo = v - hi * 256.0;
          return vec2(hi / 255.0, lo / 255.0);
        }

        float decode16(vec2 p) {
          float v = floor(p.x * 255.0 + 0.5) * 256.0 + floor(p.y * 255.0 + 0.5);
          return (v / 65534.0) * 2.0 - 1.0;
        }

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
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

        float sampleWaterDomain(vec2 xz) {
          if (uInOcean > 0.5) return 1.0;
          if (uPuddleLevel <= 0.02) return 0.0;
          float p1 = noise2D(xz * 0.032);
          float p2 = noise2D(xz * 0.075 + vec2(11.3, 7.1));
          float p3 = noise2D(xz * 0.17 + vec2(3.7, 19.4));
          float n = clamp((p1 * 0.56 + p2 * 0.30 + p3 * 0.14 - 0.24) / 0.52, 0.0, 1.0);
          float thresh = 0.84 - uPuddleLevel * 0.44;
          return smoothstep(thresh - 0.02, thresh + 0.04, n) * smoothstep(0.02, 0.22, uPuddleLevel);
        }

        vec2 readState(vec2 uv) {
          if (uv.x < 0.008 || uv.x > 0.992 || uv.y < 0.008 || uv.y > 0.992) return vec2(0.0);
          vec4 s = texture2D(tPrev, uv);
          return vec2(decode16(s.rg), decode16(s.ba));
        }

        float tireWaterImpulse(vec2 worldXZ, vec2 wheelXZ, vec2 velDir, vec2 sideDir, float speed, float driftLat, float isFront) {
          vec2 d = worldXZ - wheelXZ;
          float dSq = dot(d, d);
          if (dSq > 1.8) return 0.0;

          float spdFactor = clamp(speed / 28.0, 0.0, 1.0);
          float tread = exp(-dSq * 10.5);
          float imp = -tread * (0.055 + 0.11 * spdFactor);

          float latOff = dot(d, sideDir);
          float fwdOff = dot(d, velDir);
          float shoulder = exp(-pow(abs(latOff) - 0.36, 2.0) * 14.0 - fwdOff * fwdOff * 6.5);
          imp += shoulder * (0.032 + 0.068 * spdFactor);

          if (abs(driftLat) > 2.2) {
            float driftMag = clamp((abs(driftLat) - 2.2) / 14.0, 0.0, 1.0);
            vec2 slidePos = wheelXZ + velDir * 0.42;
            imp += exp(-dot(worldXZ - slidePos, worldXZ - slidePos) * 4.5) * 0.095 * driftMag;
          }

          if (isFront > 0.5 && uBrakePedal > 0.35 && speed > 5.0) {
            vec2 brkPos = wheelXZ + velDir * 0.55;
            imp += exp(-dot(worldXZ - brkPos, worldXZ - brkPos) * 6.0) * 0.065 * uBrakePedal * spdFactor;
          }

          return imp;
        }

        void main() {
          vec2 worldXZ = uSimOrigin + (vUv - 0.5) * uSimSize;
          float waterDomain = sampleWaterDomain(worldXZ);

          if (waterDomain < 0.01) {
            gl_FragColor = vec4(127.0 / 255.0, 1.0, 127.0 / 255.0, 1.0);
            return;
          }

          vec2 oldUv = vUv + uScrollTexels * INV_RES;
          vec2 cState = readState(oldUv);
          float hCur = cState.x;
          float hPrev = cState.y;

          float hL = readState(oldUv + vec2(-INV_RES, 0.0)).x;
          float hR = readState(oldUv + vec2( INV_RES, 0.0)).x;
          float hD = readState(oldUv + vec2(0.0, -INV_RES)).x;
          float hU = readState(oldUv + vec2(0.0,  INV_RES)).x;

          float waveC2 = mix(0.065, 0.22, uInOcean);
          float damp = mix(0.932, 0.972, uInOcean);

          float lap = (hL + hR + hD + hU) - 4.0 * hCur;
          float hNext = (2.0 * hCur - hPrev) + waveC2 * lap;

          vec2 edgeDist = min(vUv, 1.0 - vUv);
          float borderDamp = smoothstep(0.0, 0.08, min(edgeDist.x, edgeDist.y));
          float shoreDamp = mix(0.75, 1.0, smoothstep(0.05, 0.45, waterDomain));
          hNext *= damp * borderDamp * shoreDamp;

          vec2 carV = uCarVel.xz;
          float speed = length(carV);
          if (uCarPos.y < 1.35 && uCarPos.y > -1.0) {
            vec2 cF = normalize(uCarForward.xz + vec2(0.0001));
            vec2 cR = vec2(-cF.y, cF.x);

            if (speed > 0.45) {
              vec2 velDir = carV / speed;
              vec2 sideDir = vec2(-velDir.y, velDir.x);
              float driftLat = dot(carV, cR);

              vec2 wFL = uCarPos.xz - cR * uWheelX + cF * uWheelZ;
              vec2 wFR = uCarPos.xz + cR * uWheelX + cF * uWheelZ;
              vec2 wRL = uCarPos.xz - cR * uWheelX - cF * uWheelZ;
              vec2 wRR = uCarPos.xz + cR * uWheelX - cF * uWheelZ;

              float imp = 0.0;
              imp += tireWaterImpulse(worldXZ, wFL, velDir, sideDir, speed, driftLat, 1.0);
              imp += tireWaterImpulse(worldXZ, wFR, velDir, sideDir, speed, driftLat, 1.0);
              imp += tireWaterImpulse(worldXZ, wRL, velDir, sideDir, speed, driftLat, 0.0);
              imp += tireWaterImpulse(worldXZ, wRR, velDir, sideDir, speed, driftLat, 0.0);

              if (uInOcean > 0.5 && speed > 4.0) {
                vec2 rel = worldXZ - uCarPos.xz;
                float lf = dot(rel, cF);
                float lr = dot(rel, cR);
                float bow = exp(-pow(lf - uCarHalfL * 0.85, 2.0) * 1.1 - pow(lr / max(0.8, uCarHalfW * 1.15), 2.0));
                imp += bow * 0.22 * clamp(speed / 18.0, 0.0, 1.0);
              }
              hNext += imp * waterDomain;
            }

            if (uImpactPulse > 0.01) {
              vec2 rel = worldXZ - uCarPos.xz;
              float d = length(rel);
              float crater = -exp(-d * d * 0.55) * 0.42 + exp(-pow(d - 1.9, 2.0) * 1.4) * 0.30;
              hNext += crater * uImpactPulse * waterDomain;
            }
          }

          if (uRainIntensity > 0.05) {
            vec2 cell = floor(vUv * 128.0);
            float tTick = floor(uTime * 22.0);
            float rVal = hash21(cell + vec2(tTick * 1.37, tTick * 2.91));
            if (rVal > 1.0 - 0.0024 * uRainIntensity) {
              hNext -= 0.085 * uRainIntensity * waterDomain;
            }
          }

          hNext = clamp(hNext, -0.65, 0.65);
          gl_FragColor = vec4(encode16(hNext), encode16(hCur));
        }
      `,
    });

    const simQuad = new THREE.Mesh(simQuadGeo, simClearMat);
    simScene.add(simQuad);

    waterMat.uniforms.uWaveSimMap.value = simTargetRead.texture;
    waterMat.uniforms.uSimSize.value = SIM_SIZE;

    const PUDDLE_GRID = 84;
    const PUDDLE_STEP = 0.42;
    const PUDDLE_SIZE = PUDDLE_GRID * PUDDLE_STEP;
    const PUDDLE_VERTS = (PUDDLE_GRID + 1) * (PUDDLE_GRID + 1);

    const puddle3DGeo = new THREE.PlaneGeometry(PUDDLE_SIZE, PUDDLE_SIZE, PUDDLE_GRID, PUDDLE_GRID);
    puddle3DGeo.rotateX(-Math.PI / 2);
    const puddleMaskArr = new Float32Array(PUDDLE_VERTS);
    const puddleMaskAttr = new THREE.BufferAttribute(puddleMaskArr, 1);
    puddle3DGeo.setAttribute("aRoadMask", puddleMaskAttr);

    const puddle3DMat = new THREE.ShaderMaterial({
      uniforms: {
        uReflMap: { value: reflTarget.texture },
        uWaveSimMap: { value: simTargetRead.texture },
        uSimOrigin: { value: new THREE.Vector2(0, 0) },
        uSimSize: { value: SIM_SIZE },
        uResolution: { value: drawingBufferSize.clone() },
        uTime: { value: 0.0 },
        uRTEnabled: { value: 1.0 },
        uPuddleLevel: { value: 0.0 },
        uRainIntensity: { value: 0.0 },
        uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.5).normalize() },
        uSunColor: { value: new THREE.Color(0xffa45b) },
        uAmbientColor: { value: new THREE.Color(0x523c46) },
        uFogColor: { value: new THREE.Color(0xb85247) },
        uFogDensity: { value: 0.0006 },
        uCarPos: { value: new THREE.Vector3(0, 0, 45) },
        uCarForward: { value: new THREE.Vector3(0, 0, -1) },
        uCarHalfL: { value: 2.35 },
        uHeadlightsOn: { value: 1.0 },
        uBrakeIntensity: { value: 0.45 },
        uNitroActive: { value: 0.0 },
      },
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      vertexShader: `
        attribute float aRoadMask;
        uniform sampler2D uWaveSimMap;
        uniform vec2 uSimOrigin;
        uniform float uSimSize;
        uniform float uTime;
        uniform float uPuddleLevel;

        varying vec3 vWorldPos;
        varying vec3 vNormal3D;
        varying float vRoadMask;
        varying float vEdgeFade;

        float decode16(vec2 p) {
          float v = floor(p.x * 255.0 + 0.5) * 256.0 + floor(p.y * 255.0 + 0.5);
          return (v / 65534.0) * 2.0 - 1.0;
        }

        float sampleSimH(vec2 uv) {
          vec2 texel = uv * 128.0 - 0.5;
          vec2 i0 = floor(texel);
          vec2 f = fract(texel);
          float h00 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(0.5, 0.5)) / 128.0, 0.004, 0.996)).rg);
          float h10 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(1.5, 0.5)) / 128.0, 0.004, 0.996)).rg);
          float h01 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(0.5, 1.5)) / 128.0, 0.004, 0.996)).rg);
          float h11 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(1.5, 1.5)) / 128.0, 0.004, 0.996)).rg);
          return mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y);
        }

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
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

        float puddleField(vec2 p) {
          float p1 = noise2D(p * 0.032);
          float p2 = noise2D(p * 0.075 + vec2(11.3, 7.1));
          float p3 = noise2D(p * 0.17 + vec2(3.7, 19.4));
          return clamp((p1 * 0.56 + p2 * 0.30 + p3 * 0.14 - 0.24) / 0.52, 0.0, 1.0);
        }

        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);

          vec2 localDist = abs(position.xz);
          float edgeFade = 1.0 - smoothstep(13.5, 17.4, max(localDist.x, localDist.y));
          vRoadMask = aRoadMask;
          vEdgeFade = edgeFade;

          float pNoise = puddleField(wp.xz);
          float thresh = 0.84 - uPuddleLevel * 0.44;
          float p = smoothstep(thresh - 0.02, thresh + 0.04, pNoise) * smoothstep(0.02, 0.22, uPuddleLevel) * aRoadMask * edgeFade;

          if (p > 0.005) {
            vec2 simUv = (wp.xz - uSimOrigin) / uSimSize + 0.5;
            float e = 1.0 / 128.0;
            float shC = sampleSimH(simUv);
            float shL = sampleSimH(simUv - vec2(e, 0.0));
            float shR = sampleSimH(simUv + vec2(e, 0.0));
            float shD = sampleSimH(simUv - vec2(0.0, e));
            float shU = sampleSimH(simUv + vec2(0.0, e));

            float baseDome = 0.006 + 0.014 * pow(p, 0.55);
            float windRipple = sin(wp.x * 2.2 + wp.z * 1.6 + uTime * 2.8) * 0.003;
            float waveDisp = clamp(shC * 0.06, -0.018, 0.048);

            wp.y = 0.046 + max(0.0, (baseDome + windRipple + waveDisp) * p);
            vec2 grad = vec2(shL - shR, shD - shU) * (1.25 * p);
            vNormal3D = normalize(vec3(grad.x, 1.0, grad.y));
          } else {
            wp.y = 0.046;
            vNormal3D = vec3(0.0, 1.0, 0.0);
          }

          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform sampler2D uReflMap;
        uniform sampler2D uWaveSimMap;
        uniform vec2 uSimOrigin;
        uniform float uSimSize;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uRTEnabled;
        uniform float uPuddleLevel;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uAmbientColor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uCarPos;
        uniform vec3 uCarForward;
        uniform float uCarHalfL;
        uniform float uHeadlightsOn;
        uniform float uBrakeIntensity;
        uniform float uNitroActive;

        varying vec3 vWorldPos;
        varying vec3 vNormal3D;
        varying float vRoadMask;
        varying float vEdgeFade;

        float decode16(vec2 p) {
          float v = floor(p.x * 255.0 + 0.5) * 256.0 + floor(p.y * 255.0 + 0.5);
          return (v / 65534.0) * 2.0 - 1.0;
        }

        float sampleSimH(vec2 uv) {
          vec2 texel = uv * 128.0 - 0.5;
          vec2 i0 = floor(texel);
          vec2 f = fract(texel);
          float h00 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(0.5, 0.5)) / 128.0, 0.004, 0.996)).rg);
          float h10 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(1.5, 0.5)) / 128.0, 0.004, 0.996)).rg);
          float h01 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(0.5, 1.5)) / 128.0, 0.004, 0.996)).rg);
          float h11 = decode16(texture2D(uWaveSimMap, clamp((i0 + vec2(1.5, 1.5)) / 128.0, 0.004, 0.996)).rg);
          return mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y);
        }

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
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

        float puddleField(vec2 p) {
          float p1 = noise2D(p * 0.032);
          float p2 = noise2D(p * 0.075 + vec2(11.3, 7.1));
          float p3 = noise2D(p * 0.17 + vec2(3.7, 19.4));
          return clamp((p1 * 0.56 + p2 * 0.30 + p3 * 0.14 - 0.24) / 0.52, 0.0, 1.0);
        }

        void main() {
          float pNoise = puddleField(vWorldPos.xz);
          float thresh = 0.84 - uPuddleLevel * 0.44;
          float puddle = smoothstep(thresh - 0.02, thresh + 0.035, pNoise)
                       * smoothstep(0.02, 0.22, uPuddleLevel)
                       * smoothstep(0.35, 0.85, vRoadMask)
                       * vEdgeFade;
          if (puddle < 0.015) discard;

          vec3 toCam = cameraPosition - vWorldPos;
          float camDist = length(toCam);
          vec3 V = toCam / max(camDist, 0.0001);
          vec3 L = normalize(uSunDir);

          vec2 simUv = (vWorldPos.xz - uSimOrigin) / uSimSize + 0.5;
          float e = 1.0 / 128.0;
          float hC = sampleSimH(simUv);
          float hL = sampleSimH(simUv - vec2(e, 0.0));
          float hR = sampleSimH(simUv + vec2(e, 0.0));
          float hD = sampleSimH(simUv - vec2(0.0, e));
          float hU = sampleSimH(simUv + vec2(0.0, e));

          vec2 simGrad = vec2(hL - hR, hD - hU) * 2.1;
          float gradMag = length(simGrad);
          vec3 N = normalize(normalize(vNormal3D) + vec3(simGrad.x, 0.0, simGrad.y));

          float NdotV = max(dot(N, V), 0.0);
          float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 4.4);

          float partedMask = 1.0 - smoothstep(-0.14, -0.025, hC);
          float rippleActivity = clamp(gradMag * 1.9 + abs(hC) * 2.6, 0.0, 1.0);

          vec3 color = vec3(0.03, 0.05, 0.08) * (uAmbientColor * 1.1 + uSunColor * 0.3);

          if (uRTEnabled > 0.5) {
            vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
            vec2 reflUv = vec2(screenUv.x, 1.0 - screenUv.y);
            reflUv = clamp(reflUv + vec2(N.x * 0.085, N.z * 0.125), vec2(0.002), vec2(0.998));
            vec3 refl = texture2D(uReflMap, reflUv).rgb * 1.06;
            color = mix(color, refl, clamp(0.18 + fresnel * 0.78, 0.0, 0.92));
          }

          vec3 H = normalize(L + V);
          color += uSunColor * pow(max(dot(N, H), 0.0), 220.0) * (1.2 + gradMag * 2.8);

          vec3 toFrag = vWorldPos - uCarPos;
          float carDist = length(toFrag.xz);
          vec3 localLight = uAmbientColor * 1.3 + uSunColor * 0.45;

          if (uHeadlightsOn > 0.5 && carDist < 58.0) {
            vec2 dir2 = normalize(toFrag.xz + vec2(0.0001));
            float cone = dot(dir2, normalize(uCarForward.xz));
            float beam = smoothstep(0.58, 0.95, cone) * (1.0 - smoothstep(2.0, 58.0, carDist));
            vec3 hL = normalize(vec3(uCarPos.x - vWorldPos.x, 0.95, uCarPos.z - vWorldPos.z));
            float hSpec = pow(max(dot(N, normalize(hL + V)), 0.0), 90.0);
            color += vec3(1.0, 0.94, 0.82) * beam * (0.14 + hSpec * 1.85);
            localLight += vec3(0.95, 0.9, 0.8) * beam * 0.65;
          }

          vec3 rearPos = uCarPos - uCarForward * (uCarHalfL + 0.1);
          float rearDist = length(vWorldPos.xz - rearPos.xz);
          if (rearDist < 14.0) {
            float tFall = 1.0 - smoothstep(0.5, 14.0, rearDist);
            vec3 tailCol = vec3(1.0, 0.12, 0.08) * tFall * uBrakeIntensity;
            color += tailCol * (0.28 + rippleActivity * 0.75);
            localLight += tailCol * 0.8;
            if (uNitroActive > 0.5) {
              vec3 nitroCol = vec3(0.18, 0.84, 1.0) * tFall;
              color += nitroCol * (0.35 + rippleActivity * 0.85);
              localLight += nitroCol * 0.8;
            }
          }

          float microFoam = smoothstep(0.16, 0.44, hC + gradMag * 0.22) * 0.24;
          color = mix(color, clamp(localLight * 1.15, vec3(0.08), vec3(0.85)), microFoam);

          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * camDist * camDist);
          color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

          float baseAlpha = puddle * clamp(0.10 + fresnel * 0.68 + rippleActivity * 0.28, 0.0, 0.78);
          float finalAlpha = baseAlpha * (1.0 - partedMask * 0.82);
          gl_FragColor = vec4(color, finalAlpha);
          #include <tonemapping_fragment>
        }
      `,
    });

    const puddle3DMesh = new THREE.Mesh(puddle3DGeo, puddle3DMat);
    puddle3DMesh.frustumCulled = false;
    puddle3DMesh.visible = false;
    waterGroup.add(puddle3DMesh);

    let simInitialized = false;
    let simSnapIX = 0;
    let simSnapIZ = 0;
    let simAccum = 0;
    let lastPuddleSnapX = 999999;
    let lastPuddleSnapZ = 999999;

    function resetWaterSim(renderer, cx = 0, cz = 45) {
      if (!renderer) return;
      simSnapIX = Math.round(cx / SIM_TEXEL_WORLD);
      simSnapIZ = Math.round(cz / SIM_TEXEL_WORLD);
      const ox = simSnapIX * SIM_TEXEL_WORLD;
      const oz = simSnapIZ * SIM_TEXEL_WORLD;

      const prevRT = renderer.getRenderTarget();
      simQuad.material = simClearMat;
      renderer.setRenderTarget(simTargetRead);
      renderer.render(simScene, simOrthoCam);
      renderer.setRenderTarget(simTargetWrite);
      renderer.render(simScene, simOrthoCam);
      renderer.setRenderTarget(prevRT);

      simStepMat.uniforms.uSimOrigin.value.set(ox, oz);
      puddle3DMat.uniforms.uSimOrigin.value.set(ox, oz);
      waterMat.uniforms.uSimOrigin.value.set(ox, oz);
      simInitialized = true;
    }

    function stepWaterSim(renderer, dt, elapsed, carState, spec, rainIntensity, impactPulse = 0) {
      if (!renderer) return;
      if (!simInitialized) resetWaterSim(renderer, carState.x, carState.z);

      const pLvl = puddle3DMat.uniforms.uPuddleLevel.value;
      if (pLvl <= 0.025 && !carState.inWater) return;

      const nextIX = Math.round(carState.x / SIM_TEXEL_WORLD);
      const nextIZ = Math.round(carState.z / SIM_TEXEL_WORLD);
      const dIX = nextIX - simSnapIX;
      const dIZ = nextIZ - simSnapIZ;

      if (Math.abs(dIX) > 48 || Math.abs(dIZ) > 48) {
        resetWaterSim(renderer, carState.x, carState.z);
        return;
      }

      simAccum = Math.min(simAccum + dt, 0.045);
      const FIXED_DT = 1 / 60;
      const steps = Math.max(1, Math.min(2, Math.floor(simAccum / FIXED_DT)));
      simAccum = Math.max(0, simAccum - steps * FIXED_DT);

      const ox = nextIX * SIM_TEXEL_WORLD;
      const oz = nextIZ * SIM_TEXEL_WORLD;
      const fx = -Math.sin(carState.heading);
      const fz = -Math.cos(carState.heading);

      simStepMat.uniforms.uSimOrigin.value.set(ox, oz);
      simStepMat.uniforms.uPuddleLevel.value = carState.inTunnel ? 0.0 : pLvl;
      simStepMat.uniforms.uInOcean.value = carState.inWater ? 1.0 : 0.0;
      simStepMat.uniforms.uCarPos.value.set(carState.x, carState.y, carState.z);
      simStepMat.uniforms.uCarForward.value.set(fx, 0, fz);
      simStepMat.uniforms.uCarVel.value.set(carState.vx, carState.vy, carState.vz);
      simStepMat.uniforms.uWheelX.value = spec.wheelX;
      simStepMat.uniforms.uWheelZ.value = spec.wheelZ;
      simStepMat.uniforms.uCarHalfW.value = spec.bodyW * 0.5;
      simStepMat.uniforms.uCarHalfL.value = spec.bodyLen * 0.5;
      simStepMat.uniforms.uBrakePedal.value = carState.brakePedal || 0;
      simStepMat.uniforms.uRainIntensity.value = carState.inTunnel ? 0.0 : rainIntensity;
      simStepMat.uniforms.uTime.value = elapsed;

      const prevRT = renderer.getRenderTarget();
      simQuad.material = simStepMat;

      for (let s = 0; s < steps; s++) {
        simStepMat.uniforms.tPrev.value = simTargetRead.texture;
        simStepMat.uniforms.uScrollTexels.value.set(s === 0 ? dIX : 0, s === 0 ? dIZ : 0);
        simStepMat.uniforms.uImpactPulse.value = s === 0 ? impactPulse : 0.0;

        renderer.setRenderTarget(simTargetWrite);
        renderer.render(simScene, simOrthoCam);

        const tmp = simTargetRead;
        simTargetRead = simTargetWrite;
        simTargetWrite = tmp;
      }

      renderer.setRenderTarget(prevRT);
      simSnapIX = nextIX;
      simSnapIZ = nextIZ;

      puddle3DMat.uniforms.uWaveSimMap.value = simTargetRead.texture;
      puddle3DMat.uniforms.uSimOrigin.value.set(ox, oz);
      waterMat.uniforms.uWaveSimMap.value = simTargetRead.texture;
      waterMat.uniforms.uSimOrigin.value.set(ox, oz);
    }

    function syncPuddle3DMesh(carX, carZ, carY) {
      const pLvl = puddle3DMat.uniforms.uPuddleLevel.value;
      if (pLvl <= 0.025 || carY > 2.2 || carY < -1.0) {
        puddle3DMesh.visible = false;
        return;
      }
      puddle3DMesh.visible = true;

      const snapX = Math.round(carX / PUDDLE_STEP) * PUDDLE_STEP;
      const snapZ = Math.round(carZ / PUDDLE_STEP) * PUDDLE_STEP;
      if (snapX === lastPuddleSnapX && snapZ === lastPuddleSnapZ) return;
      lastPuddleSnapX = snapX;
      lastPuddleSnapZ = snapZ;

      puddle3DMesh.position.set(snapX, 0, snapZ);

      const half = PUDDLE_SIZE * 0.5;
      const minBX = snapX - half;
      const maxBX = snapX + half;
      const minBZ = snapZ - half;
      const maxBZ = snapZ + half;

      const activeRects = [];
      for (let i = 0; i < flatRoadRects.length; i++) {
        const r = flatRoadRects[i];
        if (r.maxX >= minBX && r.minX <= maxBX && r.maxZ >= minBZ && r.minZ <= maxBZ) {
          activeRects.push(r);
        }
      }
      const checkCircuit = maxBX >= 425 && minBX <= 1585 && maxBZ >= 720 && minBZ <= 1455;
      const cols = PUDDLE_GRID + 1;

      for (let r = 0; r < cols; r++) {
        const wz = minBZ + r * PUDDLE_STEP;
        const rowOff = r * cols;
        for (let c = 0; c < cols; c++) {
          const wx = minBX + c * PUDDLE_STEP;
          let onPave = false;
          if (!isPointInTunnel(wx, wz, 0)) {
            for (let k = 0; k < activeRects.length; k++) {
              const rect = activeRects[k];
              if (wx >= rect.minX + 0.3 && wx <= rect.maxX - 0.3 && wz >= rect.minZ + 0.3 && wz <= rect.maxZ - 0.3) {
                onPave = true;
                break;
              }
            }
            if (!onPave && customRoads && customRoads.isPointOnRoad(wx, wz, -0.2, 0.45)) {
              onPave = true;
            }
            if (!onPave && checkCircuit) {
              const tp = circuitData.getTrackProgress(wx, wz);
              if (tp.distToCenter <= CIRCUIT_HALF_W - 0.2) onPave = true;
            }
          }
          puddleMaskArr[rowOff + c] = onPave ? 1.0 : 0.0;
        }
      }
      puddleMaskAttr.needsUpdate = true;
    }

    syncOceanPatch(0, 45);
    updateGrassField(0, 45);

    function updateWeather(dt, weatherPreset, cameraPos, car, inTunnel, onThunder) {
      syncOceanPatch(cameraPos.x, cameraPos.z);
      updateGrassField(cameraPos.x, cameraPos.z);
      syncPuddle3DMesh(car.x, car.z, car.y);

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
        const activeBursts = Math.min(MAX_BURSTS, weatherPreset.splashCount);
        const fx = -Math.sin(car.heading);
        const fz = -Math.cos(car.heading);

        for (let i = 0; i < MAX_BURSTS; i++) {
          const b = bursts[i];
          if (i >= activeBursts) {
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            for (let k = 0; k < DROPS_PER_BURST; k++) {
              microDropInst.setMatrixAt(i * DROPS_PER_BURST + k, dummy.matrix);
            }
            continue;
          }

          b.age += dt;
          if (b.age >= b.life) {
            b.age = 0;
            b.life = 0.16 + Math.random() * 0.14;
            b.phase = Math.random() * Math.PI * 2;
            b.power = 0.72 + Math.random() * 0.58;
            const ahead = -6 + Math.random() * 44;
            const side = (Math.random() - 0.5) * 32;
            const sx = car.x + fx * ahead + fz * side;
            const sz = car.z + fz * ahead - fx * side;
            const surf = sampleSurface(sx, sz, car.y + 4.5, car.heading);
            if (surf.inTunnel || (!surf.onRoad && !surf.overWater)) {
              b.y = -999;
            } else {
              b.x = sx;
              b.y = surf.height + 0.05;
              b.z = sz;
            }
          }

          if (b.y < -10) {
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            for (let k = 0; k < DROPS_PER_BURST; k++) {
              microDropInst.setMatrixAt(i * DROPS_PER_BURST + k, dummy.matrix);
            }
            continue;
          }

          const t = b.age / b.life;
          const fadeScale = Math.sin(t * Math.PI) * b.power;
          const timeS = b.age;
          dummy.rotation.set(0, 0, 0);

          for (let k = 0; k < DROPS_PER_BURST; k++) {
            const ang = b.phase + k * ((Math.PI * 2) / DROPS_PER_BURST);
            const horizSpd = (0.75 + (k % 2) * 0.42) * b.power;
            const upSpd = (1.65 + (k % 3) * 0.38) * b.power;
            const dx = Math.cos(ang) * horizSpd * timeS;
            const dz = Math.sin(ang) * horizSpd * timeS;
            const dy = Math.max(0.0, upSpd * timeS - 6.8 * timeS * timeS);

            dummy.position.set(b.x + dx, b.y + dy, b.z + dz);
            const sc = Math.max(0.001, fadeScale * (0.72 + (k % 2) * 0.35));
            dummy.scale.set(sc, sc * 1.4, sc);
            dummy.updateMatrix();
            microDropInst.setMatrixAt(i * DROPS_PER_BURST + k, dummy.matrix);
          }
        }
        microDropInst.instanceMatrix.needsUpdate = true;
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

    function getZoneName(x, z, y = 0) {
      if (customRoads) {
        const cr = customRoads.sampleSurface(x, z, y, 0);
        if (cr && cr.zone && Math.abs(cr.height - y) < 3.5) return cr.zone;
      }
      if (isPointInTunnel(x, z, y)) return y < -2.0 ? "PALM-SOLARA SUBSEA BAY TUNNEL" : "ALPINE RIDGE TUNNEL";
      if (y > 16.5 && z >= SKYWAY_NS.rampUpStart && z <= SKYWAY_NS.rampDownEnd && Math.abs(x - SKYWAY_NS.coord) <= 22) {
        return "METRO-APEXIA UPPER SKYWAY";
      }
      if (y > 6.5 && x >= SKYWAY_EW.rampUpStart && x <= SKYWAY_EW.rampDownEnd && Math.abs(z - SKYWAY_EW.coord) <= 22) {
        return "KUROSHIO-METRO SKYWAY";
      }
      if (y > 6.5 && x >= SKYWAY_SOLARA.rampUpStart && x <= SKYWAY_SOLARA.rampDownEnd && Math.abs(z - SKYWAY_SOLARA.coord) <= 22) {
        return "SOLARA ELEVATED SKYWAY";
      }
      if (x >= BRIDGE.startX - 10 && x <= BRIDGE.endX + 10 && Math.abs(z) <= 28) {
        return "GOLDEN BAY SUSPENSION BRIDGE";
      }
      if (z >= SOUTH_WEST_BRIDGE.startZ - 8 && z <= SOUTH_WEST_BRIDGE.endZ + 8 && Math.abs(x) <= 24) {
        return "APEXIA SKYWAY BRIDGE";
      }
      if (z >= SOUTH_EAST_BRIDGE.startZ - 8 && z <= SOUTH_EAST_BRIDGE.endZ + 8 && Math.abs(x - 1280) <= 24) {
        return "GRAND PRIX BRIDGE";
      }
      if (x >= WEST_APEXIA_BRIDGE.startX - 8 && x <= WEST_APEXIA_BRIDGE.endX + 8 && Math.abs(z - WEST_APEXIA_BRIDGE.z) <= 24) {
        return "KUROSHIO HARBOR LINK";
      }
      if (
        (x >= VIADUCT.eastStartX && x <= VIADUCT.curveCX + 160 && Math.abs(z + 1140) <= 30) ||
        (x >= 1120 && z <= -380 && z >= -1160)
      ) {
        return "NE COASTAL VIADUCT HIGHWAY";
      }
      if (x >= 415 && x <= 1595 && z >= 715 && z <= 1465) {
        return "APEXIA GRAND PRIX CIRCUIT";
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

    const allRoadMats = [roadMatCity, roadMatHighway, roadMatBridge, roadMatCircuit, roadMatInter, puddle3DMat];

    function setGrassUniform(name, val) {
      for (let i = 0; i < allGrassMats.length; i++) {
        const u = allGrassMats[i].uniforms[name];
        if (!u) continue;
        if (u.value && typeof u.value.copy === "function") u.value.copy(val);
        else u.value = val;
      }
    }

    function setRoadUniform(name, val) {
      for (let i = 0; i < allRoadMats.length; i++) {
        const u = allRoadMats[i].uniforms[name];
        if (!u) continue;
        if (u.value && typeof u.value.copy === "function") u.value.copy(val);
        else u.value = val;
      }
      setGrassUniform(name, val);
    }

    function setWaterUniform(name, val) {
      const u = waterMat.uniforms[name];
      if (!u) return;
      if (u.value && typeof u.value.copy === "function") u.value.copy(val);
      else u.value = val;
    }

    return {
      skyDome,
      skyUniforms,
      groundGroup,
      waterGroup,
      roadGroup,
      roadShadowGroup,
      bridgeUndersideGroup,
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
      circuitData,
      buildingMaterials,
      neonMaterials,
      bulbMat,
      getNearbyColliders,
      sampleSurface,
      isPointInTunnel,
      getZoneName,
      computeGPSRoute,
      setRoadUniform,
      setGrassUniform,
      setWaterUniform,
      setTrafficLighting,
      stepWaterSim,
      resetWaterSim,
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