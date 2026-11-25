(() => {
  "use strict";

  // =========================================================================
  // 1. CONFIGURATION, TIME & WEATHER PRESETS
  // =========================================================================
  const ISLAND_HALF = 456;
  const WORLD_LIMIT = 535;
  const GRID_SPACING = 110;
  const ROAD_WIDTH = 16;

  // Grand Harbor basin right beside the starting avenue (x: -212..-8, z: -212..-8)
  const HARBOR = { minX: -212, maxX: -8, minZ: -212, maxZ: -8 };

  const CAMERA_MODES = ["CHASE", "HOOD", "ORBIT"];

  const TIME_PRESETS = [
    {
      name: "SUNSET",
      skyTop: 0x1e2952,
      skyHorizon: 0xf07848,
      skyBottom: 0x3b1d2e,
      fog: 0xb85247,
      fogDensity: 0.00145,
      sunColor: 0xffa45b,
      sunIntensity: 1.4,
      sunPos: [-240, 72, -180],
      hemiSky: 0xfdba74,
      hemiGround: 0x1e293b,
      hemiIntensity: 0.62,
      ambientRoad: 0x45303a,
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
      fogDensity: 0.00205,
      sunColor: 0x60a5fa,
      sunIntensity: 0.38,
      sunPos: [100, 220, -160],
      hemiSky: 0x1e3a5f,
      hemiGround: 0x050811,
      hemiIntensity: 0.45,
      ambientRoad: 0x16223d,
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
      fogDensity: 0.00105,
      sunColor: 0xfff6e5,
      sunIntensity: 1.45,
      sunPos: [180, 260, 140],
      hemiSky: 0xdbeafe,
      hemiGround: 0x3f6212,
      hemiIntensity: 0.75,
      ambientRoad: 0x525c6b,
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
      name: "RAIN",
      rainCount: 1100,
      rainSpeed: 42,
      rainTiltX: 3.5,
      rainIntensity: 0.72,
      wetness: 0.96,
      waveStrength: 0.65,
      fogMult: 1.35,
      skyDarken: 0.68,
      sunMult: 0.6,
      gripMult: 0.78,
      forceHeadlights: true,
      lightning: false,
      rainAudio: 0.14,
    },
    {
      name: "STORM",
      rainCount: 1800,
      rainSpeed: 62,
      rainTiltX: 11.0,
      rainIntensity: 1.0,
      wetness: 1.0,
      waveStrength: 1.35,
      fogMult: 1.75,
      skyDarken: 0.44,
      sunMult: 0.35,
      gripMult: 0.66,
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
      wetness: 0.48,
      waveStrength: 0.22,
      fogMult: 3.1,
      skyDarken: 0.78,
      sunMult: 0.45,
      gripMult: 0.92,
      forceHeadlights: true,
      lightning: false,
      rainAudio: 0.0,
    },
    {
      name: "CLEAR",
      rainCount: 0,
      rainSpeed: 0,
      rainTiltX: 0,
      rainIntensity: 0.0,
      wetness: 0.18,
      waveStrength: 0.38,
      fogMult: 1.0,
      skyDarken: 1.0,
      sunMult: 1.0,
      gripMult: 1.0,
      forceHeadlights: false,
      lightning: false,
      rainAudio: 0.0,
    },
  ];

  let rtEnabled = true;
  let timeIndex = 0;    // Start at SUNSET
  let weatherIndex = 0; // Start in RAIN so weather + water reflections shine immediately

  // =========================================================================
  // 2. THREE.JS SCENE, RENDERER & REAL-TIME REFLECTION TARGETS
  // =========================================================================
  const container = document.getElementById("canvas-container");
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.2,
    1400
  );
  const mirrorCamera = camera.clone();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  const drawingBufferSize = new THREE.Vector2();
  renderer.getDrawingBufferSize(drawingBufferSize);

  // Planar mirror render target shared by wet roads AND animated water surfaces
  const reflScale = 0.7;
  const reflTarget = new THREE.WebGLRenderTarget(
    Math.max(256, Math.floor(window.innerWidth * reflScale)),
    Math.max(256, Math.floor(window.innerHeight * reflScale)),
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    }
  );

  // Live 360-degree CubeCamera for car paint, glass & chrome reflections
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(0.5, 580, cubeRenderTarget);
  scene.add(cubeCamera);

  // Gradient Sky Dome
  const skyUniforms = {
    uTopColor: { value: new THREE.Color(0x1e2952) },
    uHorizonColor: { value: new THREE.Color(0xf07848) },
    uBottomColor: { value: new THREE.Color(0x3b1d2e) },
    uFlash: { value: 0.0 },
  };
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(1050, 24, 16),
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

  // Lights
  const hemiLight = new THREE.HemisphereLight(0xfdba74, 0x1e293b, 0.62);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffa45b, 1.4);
  sunLight.position.set(-240, 72, -180);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 700;
  const shadowExtent = 165;
  sunLight.shadow.camera.left = -shadowExtent;
  sunLight.shadow.camera.right = shadowExtent;
  sunLight.shadow.camera.top = shadowExtent;
  sunLight.shadow.camera.bottom = -shadowExtent;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Storm Lightning Light + 3D Bolt Mesh
  const lightningLight = new THREE.DirectionalLight(0xcbe8ff, 0.0);
  lightningLight.position.set(120, 260, -140);
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

  // Visible Sun / Moon Disc
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(32, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd199, fog: false })
  );
  scene.add(sunDisc);

  // =========================================================================
  // 3. PROCEDURAL TEXTURES
  // =========================================================================
  function createGrassTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#315429";
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 4000; i++) {
      const shade = 34 + Math.floor(Math.random() * 38);
      ctx.fillStyle = `rgb(${shade}, ${shade + 36}, ${shade - 8})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    // ShapeGeometry uses raw world coordinates as UVs (1 tile per 12.5m)
    tex.repeat.set(0.08, 0.08);
    return tex;
  }

  function createRoadTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#22262f";
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 2200; i++) {
      const v = 26 + Math.floor(Math.random() * 24);
      ctx.fillStyle = `rgb(${v},${v},${v + 5})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(10, 0, 5, 256);
    ctx.fillRect(241, 0, 5, 256);

    ctx.fillStyle = "#facc15";
    ctx.fillRect(124, 24, 8, 92);
    ctx.fillRect(124, 152, 8, 92);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  function createBuildingTexture(baseHex, windowHex) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext("2d");

    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 512);

    const cols = 6;
    const rows = 14;
    const padX = 11;
    const padY = 11;
    const winW = (256 - padX * (cols + 1)) / cols;
    const winH = (512 - padY * (rows + 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const lit = Math.random() > 0.28;
        ctx.fillStyle = lit ? windowHex : "#0d1320";
        ctx.fillRect(
          padX + col * (winW + padX),
          padY + r * (winH + padY),
          winW,
          winH
        );
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
  // 4. REAL-TIME REFLECTIVE ROAD & WATER SHADERS (LIVE PLANAR REFLECTIONS)
  // =========================================================================
  const roadTexBase = createRoadTexture();

  function createReflectiveRoadMaterial(isIntersection) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uRoadMap: { value: roadTexBase },
        uReflMap: { value: reflTarget.texture },
        uResolution: { value: drawingBufferSize.clone() },
        uUvScale: {
          value: isIntersection
            ? new THREE.Vector2(1.0, 1.0)
            : new THREE.Vector2(1.0, 56.0),
        },
        uIsIntersection: { value: isIntersection ? 1.0 : 0.0 },
        uTime: { value: 0.0 },
        uRTEnabled: { value: 1.0 },
        uWetness: { value: 0.96 },
        uRainIntensity: { value: 0.72 },
        uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.5).normalize() },
        uSunColor: { value: new THREE.Color(0xffa45b) },
        uAmbientColor: { value: new THREE.Color(0x45303a) },
        uFogColor: { value: new THREE.Color(0xb85247) },
        uFogDensity: { value: 0.00145 },
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
          vec4 wp = modelMatrix * vec4(position, 1.0);
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

        // Animated raindrop ripple rings on wet puddles
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
            ? vec3(0.14, 0.16, 0.2)
            : texture2D(uRoadMap, vUv * uUvScale).rgb;

          vec3 L = normalize(uSunDir);
          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 color;

          if (uRTEnabled > 0.5) {
            float p1 = noise2D(vWorldPos.xz * 0.045);
            float p2 = noise2D(vWorldPos.xz * 0.13);
            float puddle = smoothstep(0.32, 0.65, p1 * 0.68 + p2 * 0.32) * uWetness;

            float microX = noise2D(vWorldPos.xz * 2.1) - 0.5;
            float microZ = noise2D(vWorldPos.xz * 2.1 + 19.7) - 0.5;
            vec2 rip = uRainIntensity > 0.05
              ? rainRipples(vWorldPos.xz * 0.85, uTime) * uRainIntensity * puddle * 0.18
              : vec2(0.0);

            float roughAmt = mix(0.14, 0.012, puddle);
            vec3 N = normalize(vec3(microX * roughAmt + rip.x, 1.0, microZ * roughAmt + rip.y));

            float NdotL = max(dot(N, L), 0.0);
            vec3 H = normalize(L + V);
            float specPower = mix(28.0, 260.0, puddle);
            float spec = pow(max(dot(N, H), 0.0), specPower) * mix(0.2, 1.65, puddle);

            vec3 wetAlbedo = albedo * mix(0.96, 0.5, puddle);
            color = wetAlbedo * (uAmbientColor + uSunColor * NdotL * 0.85) + uSunColor * spec * 0.7;

            vec3 toFrag = vWorldPos - uCarPos;
            float carDist = length(toFrag.xz);
            if (uHeadlightsOn > 0.5 && carDist < 62.0) {
              vec2 dir2 = normalize(toFrag.xz + vec2(0.0001));
              float cone = dot(dir2, normalize(uCarForward.xz));
              float beam = smoothstep(0.66, 0.96, cone) * smoothstep(62.0, 2.5, carDist);
              color += vec3(1.0, 0.94, 0.82) * beam * (0.5 + puddle * 0.45);
            }

            vec3 rearPos = uCarPos - uCarForward * 2.3;
            float rearDist = length(vWorldPos.xz - rearPos.xz);
            if (rearDist < 15.0) {
              float tailFalloff = smoothstep(15.0, 0.5, rearDist);
              color += vec3(1.0, 0.1, 0.08) * tailFalloff * uBrakeIntensity * (0.35 + puddle * 0.6);
              if (uNitroActive > 0.5) {
                color += vec3(0.15, 0.78, 1.0) * tailFalloff * (0.6 + puddle * 0.85);
              }
            }

            vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
            vec2 reflUv = vec2(screenUv.x, 1.0 - screenUv.y);
            float distort = mix(0.015, 0.002, puddle);
            reflUv += vec2(microX, microZ) * distort + rip * 0.045;
            reflUv = clamp(reflUv, vec2(0.002), vec2(0.998));

            vec3 reflColor = texture2D(uReflMap, reflUv).rgb * 1.15;
            float fresnel = 0.12 + 0.88 * pow(1.0 - max(dot(N, V), 0.0), 2.6);
            float reflStrength = clamp(mix(0.14, 0.92, puddle) * (0.52 + fresnel * 0.65), 0.0, 0.92);
            color = mix(color, reflColor, reflStrength);
          } else {
            float NdotL = max(L.y, 0.0);
            color = albedo * (uAmbientColor * 1.15 + uSunColor * NdotL * 0.85);
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

  const roadMatStrip = createReflectiveRoadMaterial(false);
  const roadMatInter = createReflectiveRoadMaterial(true);

  // Dedicated Real-Time Reflective Water Shader (Grand Harbor + Coastal Ocean)
  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      uReflMap: { value: reflTarget.texture },
      uResolution: { value: drawingBufferSize.clone() },
      uTime: { value: 0.0 },
      uRTEnabled: { value: 1.0 },
      uWaveStrength: { value: 0.65 },
      uRainIntensity: { value: 0.72 },
      uDeepColor: { value: new THREE.Color(0x0a2540) },
      uShallowColor: { value: new THREE.Color(0x1c4e63) },
      uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.5).normalize() },
      uSunColor: { value: new THREE.Color(0xffa45b) },
      uFogColor: { value: new THREE.Color(0xb85247) },
      uFogDensity: { value: 0.00145 },
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
        // Subtle real geometric swell on the water mesh
        float swell = sin(wp.x * 0.08 + uTime * 1.6) * cos(wp.z * 0.07 - uTime * 1.3);
        wp.y += swell * 0.07 * uWaveStrength;
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

      // Layered directional ocean & harbor wave normals
      vec2 waveGradient(vec2 p, float t) {
        vec2 g = vec2(0.0);
        float w1 = p.x * 0.28 + p.y * 0.19 + t * 1.8;
        float w2 = p.x * -0.22 + p.y * 0.34 - t * 2.1;
        float w3 = p.x * 0.55 - p.y * 0.42 + t * 2.9;
        g += vec2(0.28, 0.19) * cos(w1) * 0.35;
        g += vec2(-0.22, 0.34) * cos(w2) * 0.28;
        g += vec2(0.55, -0.42) * cos(w3) * 0.16;

        // Fine wind chop
        float n1 = noise2D(p * 0.45 + vec2(t * 0.65, -t * 0.45));
        float n2 = noise2D(p * 0.45 + vec2(-t * 0.5, t * 0.72) + 17.3);
        g += vec2(n1 - 0.5, n2 - 0.5) * 0.45;
        return g;
      }

      // Expanding raindrop rings across the water surface
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

        // Shoreline proximity foam (near harbor walls x=-212,-8 / z=-212,-8, causeways x=-110 / z=-110, or coast +-456)
        float dHarbor = min(
          min(abs(vWorldPos.x + 212.0), abs(vWorldPos.x + 8.0)),
          min(abs(vWorldPos.z + 212.0), abs(vWorldPos.z + 8.0))
        );
        float dCauseway = min(abs(vWorldPos.x + 110.0), abs(vWorldPos.z + 110.0)) - 8.2;
        float dCoast = min(abs(abs(vWorldPos.x) - 456.0), abs(abs(vWorldPos.z) - 456.0));
        float edgeDist = min(dHarbor, min(abs(dCauseway), dCoast));

        float foamNoise = noise2D(vWorldPos.xz * 0.65 + vec2(uTime * 0.35, -uTime * 0.28));
        float shoreFoam = smoothstep(2.6, 0.15, edgeDist) * smoothstep(0.32, 0.72, foamNoise + 0.22);

        // Water base color (shallower emerald near edges, deep marine blue offshore)
        float shallowMix = smoothstep(18.0, 1.0, edgeDist);
        vec3 waterBase = mix(uDeepColor, uShallowColor, shallowMix);

        vec3 color;

        if (uRTEnabled > 0.5) {
          // Real-Time Planar Mirror Reflection distorted by live wave normals
          vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
          vec2 reflUv = vec2(screenUv.x, 1.0 - screenUv.y);
          reflUv += N.xz * (0.042 + uWaveStrength * 0.028);
          reflUv = clamp(reflUv, vec2(0.002), vec2(0.998));

          vec3 reflColor = texture2D(uReflMap, reflUv).rgb * 1.18;

          // Physically inspired Schlick Fresnel for water
          float NdotV = max(dot(N, V), 0.0);
          float fresnel = 0.16 + 0.84 * pow(1.0 - NdotV, 3.2);
          color = mix(waterBase, reflColor, clamp(fresnel * 1.05, 0.18, 0.96));

          // Sparkling sun/moon specular path across waves
          vec3 H = normalize(L + V);
          float glitter = pow(max(dot(N, H), 0.0), 260.0) * 2.2;
          float broadSpec = pow(max(dot(N, H), 0.0), 36.0) * 0.28;
          color += uSunColor * (glitter + broadSpec);

          // Dynamic car headlight & nitro reflection on water
          vec3 toFrag = vWorldPos - uCarPos;
          float carDist = length(toFrag.xz);
          if (uHeadlightsOn > 0.5 && carDist < 70.0) {
            vec2 dir2 = normalize(toFrag.xz + vec2(0.0001));
            float cone = dot(dir2, normalize(uCarForward.xz));
            float beam = smoothstep(0.62, 0.95, cone) * smoothstep(70.0, 2.0, carDist);
            color += vec3(1.0, 0.94, 0.82) * beam * 0.65;
          }
          if (uNitroActive > 0.5 && carDist < 18.0) {
            color += vec3(0.15, 0.8, 1.0) * smoothstep(18.0, 1.0, carDist) * 0.7;
          }
        } else {
          // RT OFF: basic flat stylized water without planar mirror reflections
          float NdotL = max(dot(N, L), 0.0);
          color = waterBase * (0.65 + NdotL * 0.65);
        }

        // Subtle white shoreline & rain splash foam
        color = mix(color, vec3(0.84, 0.92, 0.97), clamp(shoreFoam * 0.55, 0.0, 0.65));

        // Atmospheric fog
        float depth = length(cameraPosition - vWorldPos);
        float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
        color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
      }
    `,
  });

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

  // =========================================================================
  // 5. OPEN WORLD: ISLAND LANDMASS, GRAND HARBOR, OCEAN, ROADS & BUILDINGS
  // =========================================================================
  const buildings = [];
  const ramps = [];
  const buildingMaterials = [];
  const neonMaterials = [];

  // City Island Ground with Cutout for the Grand Harbor (x: -212..-8, z: -212..-8)
  const islandShape = new THREE.Shape();
  islandShape.moveTo(-ISLAND_HALF, -ISLAND_HALF);
  islandShape.lineTo(ISLAND_HALF, -ISLAND_HALF);
  islandShape.lineTo(ISLAND_HALF, ISLAND_HALF);
  islandShape.lineTo(-ISLAND_HALF, ISLAND_HALF);
  islandShape.closePath();

  // Remember: rotateX(-PI/2) maps shape +Y -> world -Z, so z in [-212, -8] maps to y in [8, 212]
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
  ground.position.y = 0.0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Seamless Reflective Water Plane (fills Grand Harbor + Surrounding Coastal Ocean)
  const waterGroup = new THREE.Group();
  const waterGeo = new THREE.PlaneGeometry(2400, 2400, 140, 140);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.y = -0.22;
  waterGroup.add(waterMesh);
  scene.add(waterGroup);

  // Concrete Seawalls around Grand Harbor & Island Coastline + Bridge Causeway Sides
  const seawallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x22d3ee,
    emissiveIntensity: 2.2,
  });
  neonMaterials.push(beaconMat);

  function addSeawall(x, z, w, d, h = 1.2) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), seawallMat);
    m.position.set(x, -h / 2 + 0.08, z);
    m.receiveShadow = true;
    scene.add(m);
  }

  // Harbor perimeter seawalls
  const hW = HARBOR.maxX - HARBOR.minX;
  const hD = HARBOR.maxZ - HARBOR.minZ;
  const hCX = (HARBOR.minX + HARBOR.maxX) / 2;
  const hCZ = (HARBOR.minZ + HARBOR.maxZ) / 2;
  addSeawall(hCX, HARBOR.minZ, hW + 2, 2.2);
  addSeawall(hCX, HARBOR.maxZ, hW + 2, 2.2);
  addSeawall(HARBOR.minX, hCZ, 2.2, hD + 2);
  addSeawall(HARBOR.maxX, hCZ, 2.2, hD + 2);

  // Outer island coastline seawalls
  const coastSpan = ISLAND_HALF * 2 + 2;
  addSeawall(0, -ISLAND_HALF, coastSpan, 2.4);
  addSeawall(0, ISLAND_HALF, coastSpan, 2.4);
  addSeawall(-ISLAND_HALF, 0, 2.4, coastSpan);
  addSeawall(ISLAND_HALF, 0, 2.4, coastSpan);

  // Causeway bridge concrete deck slabs & glowing waterfront bollards across the Grand Harbor
  const causewayDeckNS = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH + 1.8, 0.8, hD), seawallMat);
  causewayDeckNS.position.set(-110, -0.37, hCZ);
  scene.add(causewayDeckNS);

  const causewayDeckEW = new THREE.Mesh(new THREE.BoxGeometry(hW, 0.8, ROAD_WIDTH + 1.8), seawallMat);
  causewayDeckEW.position.set(hCX, -0.37, -110);
  scene.add(causewayDeckEW);

  // Harbor glowing marker beacons (reflect vividly across the ripples!)
  [
    [-55, -55],
    [-165, -55],
    [-55, -165],
    [-165, -165],
  ].forEach(([bx, bz]) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.0, 2.4, 8), seawallMat);
    base.position.set(bx, 0.4, bz);
    scene.add(base);

    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 12), beaconMat);
    orb.position.set(bx, 2.3, bz);
    scene.add(orb);
  });

  // Road Grid
  const roadGroup = new THREE.Group();
  const roadShadowGroup = new THREE.Group();
  scene.add(roadGroup);
  scene.add(roadShadowGroup);

  const roadLines = [-440, -330, -220, -110, 0, 110, 220, 330, 440];
  const roadLength = 896;
  const roadShadowMat = new THREE.ShadowMaterial({ opacity: 0.36 });

  roadLines.forEach((x) => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, roadLength), roadMatStrip);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.03, 0);
    roadGroup.add(road);

    const sh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, roadLength), roadShadowMat);
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(x, 0.06, 0);
    sh.receiveShadow = true;
    roadShadowGroup.add(sh);
  });

  roadLines.forEach((z) => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, roadLength), roadMatStrip);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = Math.PI / 2;
    road.position.set(0, 0.04, z);
    roadGroup.add(road);

    const sh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, roadLength), roadShadowMat);
    sh.rotation.x = -Math.PI / 2;
    sh.rotation.z = Math.PI / 2;
    sh.position.set(0, 0.065, z);
    sh.receiveShadow = true;
    roadShadowGroup.add(sh);
  });

  const interGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 0.5, ROAD_WIDTH + 0.5);
  roadLines.forEach((x) => {
    roadLines.forEach((z) => {
      const patch = new THREE.Mesh(interGeo, roadMatInter);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(x, 0.05, z);
      roadGroup.add(patch);
    });
  });

  // Stunt Ramps (including a Waterfront Jump over the Grand Harbor!)
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

  addRamp(0, -60, 12, 4.5, 22, 0);
  addRamp(0, -170, 12, 5.0, 24, Math.PI);
  addRamp(275, -55, 16, 6.5, 28, 0);
  addRamp(275, -165, 16, 6.5, 28, Math.PI);
  addRamp(-275, 55, 14, 5.5, 24, Math.PI / 2);
  addRamp(55, 275, 14, 5.0, 22, -Math.PI / 2);

  // City Buildings, Neon Towers & Trees
  const palette = [
    { wall: "#273449", win: "#fef08a" },
    { wall: "#334155", win: "#7dd3fc" },
    { wall: "#1e293b", win: "#fde68a" },
    { wall: "#312e45", win: "#93c5fd" },
    { wall: "#27272a", win: "#fdba74" },
  ];

  const neonColors = [0x38bdf8, 0xf43f5e, 0xa855f7, 0x22d3ee, 0xfbbf24];
  neonColors.forEach((hex) => {
    neonMaterials.push(
      new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 2.2,
        roughness: 0.2,
      })
    );
  });

  const sharedBuildingMats = palette.map((p) => {
    const tex = createBuildingTexture(p.wall, p.win);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(0xfff1c9),
      emissiveIntensity: 0.85,
      roughness: 0.35,
      metalness: 0.35,
    });
    buildingMaterials.push(mat);
    return mat;
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1e5c2e, roughness: 0.85 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.35 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 2.4,
  });

  function addTree(x, z, scale = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45 * scale, 0.65 * scale, 4 * scale, 7),
      trunkMat
    );
    trunk.position.y = 2 * scale;
    trunk.castShadow = true;
    g.add(trunk);

    const crown = new THREE.Mesh(new THREE.ConeGeometry(2.8 * scale, 7 * scale, 7), leafMat);
    crown.position.y = 6.5 * scale;
    crown.castShadow = true;
    g.add(crown);

    g.position.set(x, 0, z);
    scene.add(g);
  }

  function addStreetLamp(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 8.5, 6), poleMat);
    pole.position.y = 4.25;
    g.add(pole);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), bulbMat);
    bulb.position.y = 8.6;
    g.add(bulb);

    g.position.set(x, 0, z);
    scene.add(g);
  }

  let seed = 1337;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  for (let bx = -4; bx < 4; bx++) {
    for (let bz = -4; bz < 4; bz++) {
      const cx = (bx + 0.5) * GRID_SPACING;
      const cz = (bz + 0.5) * GRID_SPACING;

      // Skip building placement inside the Grand Harbor basin
      const isHarborBlock = bx >= -2 && bx <= -1 && bz >= -2 && bz <= -1;
      if (isHarborBlock) continue;

      const isStuntPark = cx > 210 && cx < 340 && cz > -230 && cz < 10;
      const isSpawnPlaza = Math.abs(cx) < 120 && Math.abs(cz) < 120 && rand() < 0.25;

      addStreetLamp(cx - 43, cz - 43);
      addStreetLamp(cx + 43, cz + 43);

      if (isStuntPark || isSpawnPlaza) {
        for (let t = 0; t < 6; t++) {
          const angle = (t / 6) * Math.PI * 2;
          addTree(cx + Math.cos(angle) * 38, cz + Math.sin(angle) * 38, 0.9 + rand() * 0.5);
        }
        continue;
      }

      const distFromCenter = Math.hypot(cx, cz);
      const isDowntown = distFromCenter < 255;

      const offsets = [
        [-21, -21],
        [21, -21],
        [-21, 21],
        [21, 21],
      ];

      offsets.forEach(([ox, oz]) => {
        const px = cx + ox;
        const pz = cz + oz;

        if (!isDowntown && rand() < 0.46) {
          addTree(px + (rand() - 0.5) * 16, pz + (rand() - 0.5) * 16, 0.9 + rand() * 0.6);
          addTree(px + (rand() - 0.5) * 16, pz + (rand() - 0.5) * 16, 0.8 + rand() * 0.5);
          return;
        }

        const w = 18 + rand() * 14;
        const d = 18 + rand() * 14;
        const h = isDowntown ? 28 + rand() * 68 : 10 + rand() * 20;

        const mat = sharedBuildingMats[Math.floor(rand() * sharedBuildingMats.length)];
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          [mat, mat, roofMat, roofMat, mat, mat]
        );
        mesh.position.set(px, h / 2, pz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        if (isDowntown && h > 38) {
          const neonMat = neonMaterials[Math.floor(rand() * neonMaterials.length)];
          const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 1.0, d + 0.6), neonMat);
          rim.position.set(px, h - 0.6, pz);
          scene.add(rim);

          const baseStrip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.7, d + 0.4), neonMat);
          baseStrip.position.set(px, 6.5, pz);
          scene.add(baseStrip);
        }

        buildings.push({
          minX: px - w / 2,
          maxX: px + w / 2,
          minZ: pz - d / 2,
          maxZ: pz + d / 2,
          x: px,
          z: pz,
          w,
          d,
          h,
        });
      });
    }
  }

  // Distant coastal mountain islands rising out of the outer ocean
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x26382b, roughness: 0.95 });
  for (let i = 0; i < 42; i++) {
    const a = (i / 42) * Math.PI * 2;
    const radius = 640 + (i % 3) * 55;
    const h = 55 + (i % 5) * 28;
    const m = new THREE.Mesh(new THREE.ConeGeometry(72, h, 7), mountainMat);
    m.position.set(Math.cos(a) * radius, h / 2 - 0.3, Math.sin(a) * radius);
    scene.add(m);
  }

  // =========================================================================
  // 6. 3D WEATHER SYSTEM (RAIN STREAKS, WIND & LIGHTNING)
  // =========================================================================
  const MAX_RAIN = 1800;
  const RAIN_BOX_XZ = 95;
  const RAIN_BOX_Y = 44;

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

  let lightningFlash = 0;
  let nextLightningTimer = 3.5;

  function triggerLightning() {
    lightningFlash = 1.0;

    // Generate jagged 3D lightning bolt in front/side sky
    const angle = car.heading + (Math.random() - 0.5) * 1.4;
    const dist = 160 + Math.random() * 190;
    const bx = car.x - Math.sin(angle) * dist;
    const bz = car.z - Math.cos(angle) * dist;

    const attr = lightningBolt.geometry.attributes.position;
    let cx = bx;
    let cz = bz;
    const segments = 12;
    for (let i = 0; i < segments; i++) {
      const y = 170 * (1 - i / (segments - 1));
      if (i > 0) {
        cx += (Math.random() - 0.5) * 16;
        cz += (Math.random() - 0.5) * 16;
      }
      attr.setXYZ(i, cx, y, cz);
    }
    attr.needsUpdate = true;
    boltMat.opacity = 1.0;

    // Schedule realistic speed-of-sound delayed thunder rumble
    const delayMs = 280 + Math.random() * 900;
    setTimeout(() => {
      audio.playThunder();
    }, delayMs);
  }

  function updateWeather(dt) {
    const w = WEATHER_PRESETS[weatherIndex];

    if (w.rainCount > 0) {
      rainLines.visible = true;
      rainGeo.setDrawRange(0, w.rainCount * 2);

      const cx = camera.position.x;
      const cz = camera.position.z;
      const halfXZ = RAIN_BOX_XZ / 2;
      const posAttr = rainGeo.attributes.position;

      for (let i = 0; i < w.rainCount; i++) {
        const d = rainDrops[i];
        d.y -= w.rainSpeed * d.spd * dt;
        d.x += w.rainTiltX * dt;

        // Wrap drops seamlessly around the moving camera
        if (d.y < -1) d.y += RAIN_BOX_Y;
        if (d.x - cx > halfXZ) d.x -= RAIN_BOX_XZ;
        else if (d.x - cx < -halfXZ) d.x += RAIN_BOX_XZ;
        if (d.z - cz > halfXZ) d.z -= RAIN_BOX_XZ;
        else if (d.z - cz < -halfXZ) d.z += RAIN_BOX_XZ;

        const dx = w.rainTiltX * 0.045 * d.len;
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

    // Storm lightning & sky flash decay
    if (w.lightning) {
      nextLightningTimer -= dt;
      if (nextLightningTimer <= 0) {
        triggerLightning();
        nextLightningTimer = 4.5 + Math.random() * 7.5;
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

  // =========================================================================
  // 7. PLAYER CAR 3D MODEL + SMOKE & WATER SPLASH PARTICLES
  // =========================================================================
  const carGroup = new THREE.Group();
  const carTiltGroup = new THREE.Group();
  carGroup.add(carTiltGroup);
  scene.add(carGroup);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xe11d48,
    metalness: 0.85,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.8,
  });

  const cabinMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1020,
    metalness: 0.94,
    roughness: 0.05,
    clearcoat: 1.0,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 2.0,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.5,
    roughness: 0.4,
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.62, 4.55), bodyMat);
  chassis.position.y = 0.62;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  carTiltGroup.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.56, 2.2), cabinMat);
  cabin.position.set(0, 1.16, 0.15);
  cabin.castShadow = true;
  carTiltGroup.add(cabin);

  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.1, 0.44), trimMat);
  spoilerWing.position.set(0, 1.22, 2.04);
  spoilerWing.castShadow = true;
  carTiltGroup.add(spoilerWing);

  [-0.7, 0.7].forEach((sx) => {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.25), trimMat);
    strut.position.set(sx, 1.04, 2.04);
    carTiltGroup.add(strut);
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 2.5,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    emissive: 0xff1e1e,
    emissiveIntensity: 0.6,
  });

  const volumetricBeams = [];
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff6d6,
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  [-0.72, 0.72].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.08), headlightMat);
    hl.position.set(lx, 0.68, -2.28);
    carTiltGroup.add(hl);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 15, 16, 1, true), beamMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(lx, 0.66, -9.8);
    carTiltGroup.add(cone);
    volumetricBeams.push(cone);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.08), brakeLightMat);
    tl.position.set(lx, 0.7, 2.28);
    carTiltGroup.add(tl);
  });

  const headSpot = new THREE.SpotLight(0xfff8e7, 3.0, 105, Math.PI / 4.8, 0.48, 1.15);
  headSpot.position.set(0, 0.95, -2.0);
  const headTarget = new THREE.Object3D();
  headTarget.position.set(0, 0.0, -28);
  carTiltGroup.add(headSpot);
  carTiltGroup.add(headTarget);
  headSpot.target = headTarget;

  const rearGlowLight = new THREE.PointLight(0xff2222, 1.0, 14);
  rearGlowLight.position.set(0, 0.7, 2.8);
  carTiltGroup.add(rearGlowLight);

  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9,
  });
  const flames = [-0.52, 0.52].map((fx) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.17, 1.25, 8), flameMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(fx, 0.42, 2.85);
    cone.visible = false;
    carTiltGroup.add(cone);
    return cone;
  });

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f1218, roughness: 0.88 });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.12,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.5,
  });

  const wheelMeshes = [];
  const frontWheelPivots = [];
  [
    { x: -1.08, y: 0.42, z: -1.35, front: true },
    { x: 1.08, y: 0.42, z: -1.35, front: true },
    { x: -1.08, y: 0.42, z: 1.35, front: false },
    { x: 1.08, y: 0.42, z: 1.35, front: false },
  ].forEach((wp) => {
    const pivot = new THREE.Group();
    pivot.position.set(wp.x, wp.y, wp.z);

    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    const hub = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.14), rimMat);
    tire.add(hub);

    pivot.add(tire);
    carTiltGroup.add(pivot);

    wheelMeshes.push(tire);
    if (wp.front) frontWheelPivots.push(pivot);
  });

  // Shared Particle Pool (Drift Smoke + Water Spray Splashes)
  const particlePool = [];
  const particleGeo = new THREE.SphereGeometry(0.38, 6, 6);
  for (let i = 0; i < 70; i++) {
    const m = new THREE.Mesh(
      particleGeo,
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.45 })
    );
    m.visible = false;
    scene.add(m);
    particlePool.push({ mesh: m, life: 0, maxLife: 0.65, vx: 0, vy: 0, vz: 0, gravity: 0 });
  }
  let particleIdx = 0;

  function spawnParticle(x, y, z, isWaterSplash) {
    const p = particlePool[particleIdx];
    particleIdx = (particleIdx + 1) % particlePool.length;
    p.mesh.position.set(x, y, z);
    p.mesh.visible = true;

    if (isWaterSplash) {
      p.mesh.material.color.setHex(0xdbeafe);
      p.mesh.material.opacity = 0.7;
      p.mesh.scale.setScalar(0.5);
      p.maxLife = 0.55;
      p.life = p.maxLife;
      p.vx = (Math.random() - 0.5) * 6.5;
      p.vy = 3.2 + Math.random() * 4.5;
      p.vz = (Math.random() - 0.5) * 6.5;
      p.gravity = 16.0;
    } else {
      p.mesh.material.color.setHex(0xe2e8f0);
      p.mesh.material.opacity = 0.42;
      p.mesh.scale.setScalar(0.6);
      p.maxLife = 0.65;
      p.life = p.maxLife;
      p.vx = (Math.random() - 0.5) * 1.4;
      p.vy = 1.2 + Math.random() * 1.1;
      p.vz = (Math.random() - 0.5) * 1.4;
      p.gravity = 0.0;
    }
  }

  // =========================================================================
  // 8. FULL PROCEDURAL WEB AUDIO ENGINE (ENGINE, RAIN, THUNDER & SPLASHES)
  // =========================================================================
  const soundBtn = document.getElementById("btn-sound");
  const soundLabel = document.getElementById("sound-label");

  const audio = {
    ctx: null,
    masterGain: null,
    enabled: false,
    userMuted: false,
    oscSub: null,
    oscMain: null,
    oscHarm: null,
    engineFilter: null,
    engineGain: null,
    screechFilter: null,
    screechGain: null,
    windGain: null,
    rainGain: null,
    nitroNoiseGain: null,
    turboOsc: null,
    turboGain: null,
    hornOsc1: null,
    hornOsc2: null,
    hornGain: null,
    noiseBuffer: null,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;

      const ctx = new AC();
      this.ctx = ctx;

      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = 0.72;
      this.masterGain.connect(ctx.destination);

      const bufLen = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;

      // V8 Engine
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = ((3 + 10) * x * 20 * (Math.PI / 180)) / (Math.PI + 10 * Math.abs(x));
      }
      shaper.curve = curve;

      this.engineFilter = ctx.createBiquadFilter();
      this.engineFilter.type = "lowpass";
      this.engineFilter.frequency.value = 280;
      this.engineFilter.Q.value = 2.2;

      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0.0;

      this.oscSub = ctx.createOscillator();
      this.oscSub.type = "triangle";
      this.oscSub.frequency.value = 42;

      this.oscMain = ctx.createOscillator();
      this.oscMain.type = "sawtooth";
      this.oscMain.frequency.value = 84;

      this.oscHarm = ctx.createOscillator();
      this.oscHarm.type = "square";
      this.oscHarm.frequency.value = 126;

      const harmGain = ctx.createGain();
      harmGain.gain.value = 0.25;

      this.oscSub.connect(shaper);
      this.oscMain.connect(shaper);
      this.oscHarm.connect(harmGain);
      harmGain.connect(shaper);

      shaper.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.oscSub.start();
      this.oscMain.start();
      this.oscHarm.start();

      // Drift screech
      const screechSrc = ctx.createBufferSource();
      screechSrc.buffer = buf;
      screechSrc.loop = true;

      this.screechFilter = ctx.createBiquadFilter();
      this.screechFilter.type = "bandpass";
      this.screechFilter.frequency.value = 1600;
      this.screechFilter.Q.value = 6.5;

      this.screechGain = ctx.createGain();
      this.screechGain.gain.value = 0;

      screechSrc.connect(this.screechFilter);
      this.screechFilter.connect(this.screechGain);
      this.screechGain.connect(this.masterGain);
      screechSrc.start();

      // Wind rush
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = buf;
      windSrc.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "lowpass";
      windFilter.frequency.value = 520;

      this.windGain = ctx.createGain();
      this.windGain.gain.value = 0;

      windSrc.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      windSrc.start();

      // Ambient Weather Rain Patter
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = buf;
      rainSrc.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = "bandpass";
      rainFilter.frequency.value = 2400;
      rainFilter.Q.value = 0.65;

      this.rainGain = ctx.createGain();
      this.rainGain.gain.value = 0;

      rainSrc.connect(rainFilter);
      rainFilter.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);
      rainSrc.start();

      // Nitro Jet + Turbo
      const nitroSrc = ctx.createBufferSource();
      nitroSrc.buffer = buf;
      nitroSrc.loop = true;

      const nitroFilter = ctx.createBiquadFilter();
      nitroFilter.type = "bandpass";
      nitroFilter.frequency.value = 900;
      nitroFilter.Q.value = 1.4;

      this.nitroNoiseGain = ctx.createGain();
      this.nitroNoiseGain.gain.value = 0;

      nitroSrc.connect(nitroFilter);
      nitroFilter.connect(this.nitroNoiseGain);
      this.nitroNoiseGain.connect(this.masterGain);
      nitroSrc.start();

      this.turboOsc = ctx.createOscillator();
      this.turboOsc.type = "sine";
      this.turboOsc.frequency.value = 2400;

      this.turboGain = ctx.createGain();
      this.turboGain.gain.value = 0;
      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(this.masterGain);
      this.turboOsc.start();

      // Dual-tone Horn
      this.hornOsc1 = ctx.createOscillator();
      this.hornOsc1.type = "sawtooth";
      this.hornOsc1.frequency.value = 392;

      this.hornOsc2 = ctx.createOscillator();
      this.hornOsc2.type = "sawtooth";
      this.hornOsc2.frequency.value = 493.88;

      const hornFilter = ctx.createBiquadFilter();
      hornFilter.type = "lowpass";
      hornFilter.frequency.value = 1400;

      this.hornGain = ctx.createGain();
      this.hornGain.gain.value = 0;

      this.hornOsc1.connect(hornFilter);
      this.hornOsc2.connect(hornFilter);
      hornFilter.connect(this.hornGain);
      this.hornGain.connect(this.masterGain);
      this.hornOsc1.start();
      this.hornOsc2.start();
    },

    unlockAuto() {
      if (this.userMuted || this.enabled) return;
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      this.enabled = true;
      soundLabel.textContent = "ON";
      soundBtn.classList.add("active");
    },

    toggle() {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      this.enabled = !this.enabled;
      this.userMuted = !this.enabled;
      soundLabel.textContent = this.enabled ? "ON" : "MUTED";
      soundBtn.classList.toggle("active", this.enabled);
      if (!this.enabled) {
        const now = this.ctx.currentTime;
        this.engineGain.gain.setTargetAtTime(0, now, 0.04);
        this.screechGain.gain.setTargetAtTime(0, now, 0.04);
        this.windGain.gain.setTargetAtTime(0, now, 0.04);
        this.rainGain.gain.setTargetAtTime(0, now, 0.05);
        this.nitroNoiseGain.gain.setTargetAtTime(0, now, 0.04);
        this.turboGain.gain.setTargetAtTime(0, now, 0.04);
        this.hornGain.gain.setTargetAtTime(0, now, 0.03);
      }
    },

    update(rpm, absSpeed, lateralSpeed, throttle, drifting, usingNitro, hornPressed, rainAudio) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;

      const normRpm = THREE.MathUtils.clamp((rpm - 800) / 7200, 0, 1);
      const baseFreq = 34 + normRpm * 92 + (usingNitro ? 14 : 0);

      this.oscSub.frequency.setTargetAtTime(baseFreq, now, 0.035);
      this.oscMain.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.035);
      this.oscHarm.frequency.setTargetAtTime(baseFreq * 3.01, now, 0.035);

      const cutoff = 220 + normRpm * 1350 + (throttle > 0 ? 350 : 0) + (usingNitro ? 500 : 0);
      this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);

      const loadVol = 0.09 + normRpm * 0.11 + (throttle > 0 ? 0.045 : 0);
      this.engineGain.gain.setTargetAtTime(loadVol, now, 0.05);

      const screechLevel = drifting ? Math.min(0.18, Math.abs(lateralSpeed) * 0.011) : 0;
      this.screechFilter.frequency.setTargetAtTime(1400 + Math.min(600, absSpeed * 8), now, 0.05);
      this.screechGain.gain.setTargetAtTime(screechLevel, now, 0.04);

      const windLevel = absSpeed > 22 ? Math.min(0.15, (absSpeed - 22) * 0.0024) : 0;
      this.windGain.gain.setTargetAtTime(windLevel, now, 0.08);

      this.rainGain.gain.setTargetAtTime(rainAudio, now, 0.25);

      this.nitroNoiseGain.gain.setTargetAtTime(usingNitro ? 0.19 : 0, now, 0.06);
      this.turboOsc.frequency.setTargetAtTime(2200 + normRpm * 2400, now, 0.06);
      this.turboGain.gain.setTargetAtTime(usingNitro ? 0.045 : normRpm > 0.65 ? 0.012 : 0, now, 0.07);

      this.hornGain.gain.setTargetAtTime(hornPressed ? 0.13 : 0, now, 0.018);
    },

    playGearShiftPop() {
      if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(110, now + 0.09);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.11);
    },

    playImpact(strength) {
      if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
      const now = this.ctx.currentTime;
      const vol = THREE.MathUtils.clamp(strength / 35, 0.08, 0.42);

      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.22);

      const gOsc = this.ctx.createGain();
      gOsc.gain.setValueAtTime(vol, now);
      gOsc.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gOsc);
      gOsc.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);

      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 950;

      const gNoise = this.ctx.createGain();
      gNoise.gain.setValueAtTime(vol * 0.65, now);
      gNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      src.connect(lp);
      lp.connect(gNoise);
      gNoise.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.17);
    },

    playWaterSplash(speed) {
      if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
      const now = this.ctx.currentTime;
      const vol = THREE.MathUtils.clamp(speed / 28, 0.12, 0.4);

      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(1100, now);
      bp.frequency.exponentialRampToValueAtTime(320, now + 0.55);
      bp.Q.value = 1.1;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.62);
    },

    playThunder() {
      if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
      const now = this.ctx.currentTime;

      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(260, now);
      lp.frequency.exponentialRampToValueAtTime(55, now + 1.9);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.01, now);
      g.gain.linearRampToValueAtTime(0.45, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.1);

      src.connect(lp);
      lp.connect(g);
      g.connect(this.masterGain);
      src.start(now);
      src.stop(now + 2.15);
    },
  };

  // =========================================================================
  // 9. INPUT HANDLING
  // =========================================================================
  const keys = {};

  window.addEventListener("keydown", (e) => {
    const code = e.code;
    keys[code] = true;

    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
      e.preventDefault();
    }
    if (code !== "KeyM") audio.unlockAuto();

    if (e.repeat) return;

    if (code === "KeyT") toggleRayTracing();
    if (code === "KeyV") cycleWeather();
    if (code === "KeyC") cycleCamera();
    if (code === "KeyN") cycleTimeOfDay();
    if (code === "KeyM") audio.toggle();
    if (code === "KeyR") resetCar();
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  window.addEventListener("pointerdown", (e) => {
    if (e.target.id !== "btn-sound" && !e.target.closest("#btn-sound")) {
      audio.unlockAuto();
    }
  });

  // =========================================================================
  // 10. VEHICLE PHYSICS & WATER INTERACTION
  // =========================================================================
  const car = {
    x: 0,
    y: 0,
    z: 20,
    vx: 0,
    vy: 0,
    vz: 0,
    heading: 0,
    steerAngle: 0,
    nitro: 100,
    grounded: true,
    inWater: false,
    pitch: 0,
    roll: 0,
    airTime: 0,
    drifting: false,
    gear: "N",
    rpm: 850,
  };

  let prevGearNum = 0;
  let impactCooldown = 0;
  let splashCooldown = 0;
  let bannerTimer = 0;
  const eventBanner = document.getElementById("event-banner");

  function showBanner(text) {
    eventBanner.textContent = text;
    eventBanner.classList.add("visible");
    bannerTimer = 1.4;
  }

  function resetCar() {
    car.x = 0;
    car.y = 0.2;
    car.z = 20;
    car.vx = 0;
    car.vy = 0;
    car.vz = 0;
    car.heading = 0;
    car.pitch = 0;
    car.roll = 0;
    car.nitro = 100;
    car.grounded = true;
    car.inWater = false;
    showBanner("CAR RESET");
  }

  function isOverWater(x, z) {
    // Outer Coastal Ocean
    if (Math.abs(x) > ISLAND_HALF || Math.abs(z) > ISLAND_HALF) return true;

    // Grand Harbor Basin (excluding the two causeway bridge decks at x=-110 & z=-110)
    if (x > HARBOR.minX && x < HARBOR.maxX && z > HARBOR.minZ && z < HARBOR.maxZ) {
      const onCauseway =
        Math.abs(x + 110) < ROAD_WIDTH / 2 + 1.1 ||
        Math.abs(z + 110) < ROAD_WIDTH / 2 + 1.1;
      return !onCauseway;
    }
    return false;
  }

  function sampleSurface(x, z, currentY) {
    const overWater = isOverWater(x, z);
    let bestH = overWater ? -0.32 : 0.0;
    let slopePitch = 0;
    let hitWall = false;

    for (let i = 0; i < ramps.length; i++) {
      const r = ramps[i];
      const dx = x - r.x;
      const dz = z - r.z;
      const cosA = Math.cos(r.angleY);
      const sinA = Math.sin(r.angleY);

      const lx = dx * cosA - dz * sinA;
      const lz = dx * sinA + dz * cosA;

      if (Math.abs(lx) <= r.width / 2 + 0.8 && Math.abs(lz) <= r.length / 2 + 0.5) {
        const t = THREE.MathUtils.clamp((r.length / 2 - lz) / r.length, 0, 1);
        const rampH = t * r.height;

        if (rampH - currentY > 1.1) {
          hitWall = true;
        } else if (rampH > bestH) {
          bestH = rampH;
          const rampFX = -Math.sin(r.angleY);
          const rampFZ = -Math.cos(r.angleY);
          const carFX = -Math.sin(car.heading);
          const carFZ = -Math.cos(car.heading);
          const align = rampFX * carFX + rampFZ * carFZ;
          slopePitch = Math.atan2(r.height, r.length) * align;
        }
      }
    }

    return { height: bestH, slopePitch, hitWall, overWater };
  }

  function resolveBuildingCollisions() {
    const radius = 2.05;
    let maxImpact = 0;

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const closestX = Math.max(b.minX, Math.min(car.x, b.maxX));
      const closestZ = Math.max(b.minZ, Math.min(car.z, b.maxZ));

      const dx = car.x - closestX;
      const dz = car.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = radius - dist;

        car.x += nx * overlap;
        car.z += nz * overlap;

        const vn = car.vx * nx + car.vz * nz;
        if (vn < 0) {
          maxImpact = Math.max(maxImpact, -vn);
          car.vx -= 1.35 * vn * nx;
          car.vz -= 1.35 * vn * nz;
          car.vx *= 0.72;
          car.vz *= 0.72;
        }
      }
    }

    if (car.x > WORLD_LIMIT) { maxImpact = Math.max(maxImpact, Math.abs(car.vx)); car.x = WORLD_LIMIT; car.vx *= -0.4; }
    if (car.x < -WORLD_LIMIT) { maxImpact = Math.max(maxImpact, Math.abs(car.vx)); car.x = -WORLD_LIMIT; car.vx *= -0.4; }
    if (car.z > WORLD_LIMIT) { maxImpact = Math.max(maxImpact, Math.abs(car.vz)); car.z = WORLD_LIMIT; car.vz *= -0.4; }
    if (car.z < -WORLD_LIMIT) { maxImpact = Math.max(maxImpact, Math.abs(car.vz)); car.z = -WORLD_LIMIT; car.vz *= -0.4; }

    if (maxImpact > 4.5 && impactCooldown <= 0) {
      audio.playImpact(maxImpact);
      impactCooldown = 0.25;
    }
  }

  function updatePhysics(dt) {
    impactCooldown = Math.max(0, impactCooldown - dt);
    splashCooldown = Math.max(0, splashCooldown - dt);
    const weather = WEATHER_PRESETS[weatherIndex];

    const throttle = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const steerInput = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
    const handbrake = Boolean(keys.Space);
    const wantsNitro = Boolean(keys.ShiftLeft || keys.ShiftRight);
    const hornPressed = Boolean(keys.KeyH);

    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    const rx = Math.cos(car.heading);
    const rz = -Math.sin(car.heading);

    let forwardSpeed = car.vx * fx + car.vz * fz;
    let lateralSpeed = car.vx * rx + car.vz * rz;

    const usingNitro = wantsNitro && car.nitro > 1 && throttle > 0;
    if (usingNitro) {
      car.nitro = Math.max(0, car.nitro - 28 * dt);
    } else {
      car.nitro = Math.min(100, car.nitro + 10 * dt);
    }

    flames.forEach((f) => {
      f.visible = usingNitro;
      if (usingNitro) f.scale.y = 0.8 + Math.random() * 0.7;
    });

    if (car.grounded) {
      const waterDragMult = car.inWater ? 0.55 : 1.0;
      const accel = (usingNitro ? 58 : 34) * waterDragMult;
      const maxSpeed = car.inWater ? 24 : usingNitro ? 86 : 62;

      if (throttle > 0) {
        forwardSpeed += accel * dt;
      } else if (throttle < 0) {
        if (forwardSpeed > 2) forwardSpeed -= 52 * dt;
        else forwardSpeed -= 20 * dt;
      } else {
        forwardSpeed *= Math.exp(-(car.inWater ? 3.2 : 1.1) * dt);
      }

      if (car.inWater) {
        forwardSpeed *= Math.exp(-1.5 * dt);
      }
      if (handbrake) forwardSpeed *= Math.exp(-1.8 * dt);
      forwardSpeed = THREE.MathUtils.clamp(forwardSpeed, -22, maxSpeed);

      const speedFactor = Math.min(1, Math.abs(forwardSpeed) / 7);
      const steerDir = forwardSpeed >= -0.5 ? 1 : -1;
      const turnRate = handbrake ? 2.85 : 2.15;
      const highSpeedDamp = 1 - Math.min(0.45, Math.abs(forwardSpeed) / 140);

      car.heading += steerInput * turnRate * speedFactor * highSpeedDamp * steerDir * dt;

      // Wet rain/storm roads reduce lateral grip for slicker drifts
      const grip = (handbrake ? 1.55 : 7.8) * weather.gripMult * (car.inWater ? 0.65 : 1.0);
      lateralSpeed *= Math.exp(-grip * dt);
    } else {
      forwardSpeed *= Math.exp(-0.15 * dt);
      lateralSpeed *= Math.exp(-0.15 * dt);
    }

    const nfx = -Math.sin(car.heading);
    const nfz = -Math.cos(car.heading);
    const nrx = Math.cos(car.heading);
    const nrz = -Math.sin(car.heading);

    car.vx = nfx * forwardSpeed + nrx * lateralSpeed;
    car.vz = nfz * forwardSpeed + nrz * lateralSpeed;

    const prevX = car.x;
    const prevZ = car.z;
    const prevY = car.y;

    car.x += car.vx * dt;
    car.z += car.vz * dt;

    const surf = sampleSurface(car.x, car.z, car.y);
    if (surf.hitWall) {
      if (Math.abs(forwardSpeed) > 6 && impactCooldown <= 0) {
        audio.playImpact(Math.abs(forwardSpeed));
        impactCooldown = 0.25;
      }
      car.x = prevX;
      car.z = prevZ;
      car.vx *= -0.35;
      car.vz *= -0.35;
    }

    const gravity = 28;
    car.vy -= gravity * dt;
    car.y += car.vy * dt;

    const wasInWater = car.inWater;

    if (car.y <= surf.height + 0.05) {
      if (!car.grounded) {
        if (surf.overWater) {
          audio.playWaterSplash(Math.abs(car.vy) + Math.abs(forwardSpeed));
          showBanner("WATER SPLASH!");
        } else {
          if (Math.abs(car.vy) > 7.5) audio.playImpact(Math.abs(car.vy) * 1.1);
          if (car.airTime > 0.55) showBanner(`AIR TIME ${car.airTime.toFixed(1)}S!`);
        }
      }
      car.y = surf.height;
      car.vy = Math.max(0, (car.y - prevY) / Math.max(dt, 0.008));
      car.grounded = true;
      car.inWater = surf.overWater;
      car.airTime = 0;
    } else {
      car.grounded = false;
      car.inWater = false;
      car.airTime += dt;
    }

    // Trigger splash sound & burst when driving into the harbor/ocean
    if (car.inWater && !wasInWater && splashCooldown <= 0) {
      audio.playWaterSplash(Math.abs(forwardSpeed) + 8);
      splashCooldown = 0.6;
      for (let s = 0; s < 10; s++) {
        spawnParticle(car.x + (Math.random() - 0.5) * 2.2, 0.0, car.z + (Math.random() - 0.5) * 2.2, true);
      }
    }

    resolveBuildingCollisions();

    // Automatic 6-Speed Gearbox
    const kmh = Math.abs(forwardSpeed) * 3.6;
    let gearStr = "N";
    let gearNum = 0;
    let gearRatio = 0;

    if (forwardSpeed < -0.5) {
      gearStr = "R";
      gearNum = -1;
      gearRatio = Math.min(1, kmh / 70);
    } else if (kmh > 1.2) {
      const thresholds = [48, 92, 138, 188, 242, 320];
      gearNum = 1;
      for (let i = 0; i < thresholds.length; i++) {
        if (kmh > thresholds[i]) gearNum = Math.min(6, i + 2);
      }
      gearStr = String(gearNum);
      const low = gearNum === 1 ? 0 : thresholds[gearNum - 2];
      const high = thresholds[gearNum - 1];
      gearRatio = THREE.MathUtils.clamp((kmh - low) / (high - low), 0.18, 1);
    }

    if (gearNum > prevGearNum && prevGearNum >= 1) {
      audio.playGearShiftPop();
    }
    prevGearNum = gearNum;

    car.gear = gearStr;
    const targetRpm = 850 + gearRatio * 7100 + (throttle > 0 && gearNum === 0 ? 1400 : 0);
    car.rpm = THREE.MathUtils.lerp(car.rpm, targetRpm, 12 * dt);

    // Water spray or tire drift smoke
    car.drifting =
      car.grounded && !car.inWater && Math.abs(lateralSpeed) > 5.5 && Math.abs(forwardSpeed) > 10;

    if (car.inWater && Math.abs(forwardSpeed) > 3.5) {
      const rearX = car.x - nfx * 1.4;
      const rearZ = car.z - nfz * 1.4;
      spawnParticle(rearX + nrx * 1.0, 0.05, rearZ + nrz * 1.0, true);
      spawnParticle(rearX - nrx * 1.0, 0.05, rearZ - nrz * 1.0, true);
    } else if (car.drifting && Math.random() < 0.75) {
      const rearX = car.x - nfx * 1.4;
      const rearZ = car.z - nfz * 1.4;
      spawnParticle(rearX + nrx * 0.9, car.y + 0.25, rearZ + nrz * 0.9, false);
      spawnParticle(rearX - nrx * 0.9, car.y + 0.25, rearZ - nrz * 0.9, false);
    }

    car.steerAngle = THREE.MathUtils.lerp(car.steerAngle, steerInput * 0.48, 12 * dt);
    frontWheelPivots.forEach((p) => (p.rotation.y = car.steerAngle));
    wheelMeshes.forEach((w) => (w.rotation.x -= (forwardSpeed * dt) / 0.42));

    const targetPitch = car.grounded
      ? surf.slopePitch + (throttle > 0 ? 0.025 : throttle < 0 ? -0.04 : 0)
      : THREE.MathUtils.clamp(car.vy * 0.018, -0.35, 0.35);
    const targetRoll = THREE.MathUtils.clamp(-lateralSpeed * 0.015 - steerInput * 0.04, -0.14, 0.14);

    car.pitch = THREE.MathUtils.lerp(car.pitch, targetPitch, 8 * dt);
    car.roll = THREE.MathUtils.lerp(car.roll, targetRoll, 8 * dt);

    carGroup.position.set(car.x, car.y, car.z);
    carGroup.rotation.y = car.heading;
    carTiltGroup.rotation.x = car.pitch;
    carTiltGroup.rotation.z = car.roll;

    const braking = (throttle < 0 && forwardSpeed > 1) || handbrake;
    brakeLightMat.emissiveIntensity = braking ? 2.6 : 0.55;
    rearGlowLight.color.setHex(usingNitro ? 0x38bdf8 : 0xff2222);
    rearGlowLight.intensity = rtEnabled ? (usingNitro ? 2.8 : braking ? 2.2 : 0.75) : 0;

    const fwdVec = new THREE.Vector3(nfx, 0, nfz);
    setRoadUniform("uCarPos", carGroup.position);
    setRoadUniform("uCarForward", fwdVec);
    setRoadUniform("uBrakeIntensity", braking ? 1.4 : 0.45);
    setRoadUniform("uNitroActive", usingNitro ? 1.0 : 0.0);

    setWaterUniform("uCarPos", carGroup.position);
    setWaterUniform("uCarForward", fwdVec);
    setWaterUniform("uNitroActive", usingNitro ? 1.0 : 0.0);

    // Update smoke & splash particles
    for (let i = 0; i < particlePool.length; i++) {
      const p = particlePool[i];
      if (p.life > 0) {
        p.life -= dt;
        p.vy -= p.gravity * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        const ratio = Math.max(0, p.life / p.maxLife);
        p.mesh.scale.setScalar(0.55 + (1 - ratio) * (p.gravity > 0 ? 1.1 : 1.9));
        p.mesh.material.opacity = ratio * (p.gravity > 0 ? 0.68 : 0.42);
        if (p.life <= 0) p.mesh.visible = false;
      }
    }

    const preset = TIME_PRESETS[timeIndex];
    skyDome.position.set(car.x, 0, car.z);
    sunLight.position.set(
      car.x + preset.sunPos[0] * 0.5,
      preset.sunPos[1] * 0.6,
      car.z + preset.sunPos[2] * 0.5
    );
    sunLight.target.position.set(car.x, 0, car.z);
    sunDisc.position.set(
      car.x + preset.sunPos[0] * 2.2,
      preset.sunPos[1] * 2.2,
      car.z + preset.sunPos[2] * 2.2
    );

    audio.update(
      car.rpm,
      Math.abs(forwardSpeed),
      lateralSpeed,
      throttle,
      car.drifting,
      usingNitro,
      hornPressed,
      weather.rainAudio
    );

    return { forwardSpeed, usingNitro };
  }

  // =========================================================================
  // 11. UNIFIED ENVIRONMENT (TIME + WEATHER + RT REFLECTIONS) & CAMERA
  // =========================================================================
  let cameraModeIdx = 0;
  const camPosCurrent = new THREE.Vector3(0, 5.5, 31);
  const camLookCurrent = new THREE.Vector3(0, 1.4, 14);

  function applyEnvironment() {
    const t = TIME_PRESETS[timeIndex];
    const w = WEATHER_PRESETS[weatherIndex];

    const skyTop = new THREE.Color(t.skyTop).multiplyScalar(w.skyDarken);
    const skyHorizon = new THREE.Color(t.skyHorizon).multiplyScalar(w.skyDarken);
    const skyBottom = new THREE.Color(t.skyBottom).multiplyScalar(w.skyDarken);
    const fogCol = new THREE.Color(t.fog).multiplyScalar(w.skyDarken);
    const fogDensity = t.fogDensity * w.fogMult;
    const headlightsOn = t.headlights || w.forceHeadlights;

    scene.background = fogCol.clone();
    scene.fog = new THREE.FogExp2(fogCol.getHex(), fogDensity);
    renderer.toneMappingExposure = t.exposure;

    skyUniforms.uTopColor.value.copy(skyTop);
    skyUniforms.uHorizonColor.value.copy(skyHorizon);
    skyUniforms.uBottomColor.value.copy(skyBottom);

    sunLight.color.setHex(t.sunColor);
    sunLight.intensity = t.sunIntensity * w.sunMult;
    sunDisc.material.color.setHex(t.sunColor);
    sunDisc.visible = w.name !== "STORM" && w.name !== "FOG";

    hemiLight.color.setHex(t.hemiSky);
    hemiLight.groundColor.setHex(t.hemiGround);
    hemiLight.intensity = t.hemiIntensity * (0.65 + 0.35 * w.skyDarken);

    buildingMaterials.forEach((m) => (m.emissiveIntensity = t.windowGlow));
    neonMaterials.forEach((m) => (m.emissiveIntensity = t.neonGlow));
    bulbMat.emissiveIntensity = headlightsOn ? 2.4 : 0.15;
    headlightMat.emissiveIntensity = headlightsOn ? 2.8 : 0.4;

    // Sync Road Shader
    const sunDir = new THREE.Vector3(...t.sunPos).normalize();
    const sunColor = new THREE.Color(t.sunColor).multiplyScalar(w.sunMult);
    const ambRoad = new THREE.Color(t.ambientRoad).multiplyScalar(0.75 + 0.25 * w.skyDarken);

    setRoadUniform("uSunDir", sunDir);
    setRoadUniform("uSunColor", sunColor);
    setRoadUniform("uAmbientColor", ambRoad);
    setRoadUniform("uFogColor", fogCol);
    setRoadUniform("uFogDensity", fogDensity);
    setRoadUniform("uHeadlightsOn", headlightsOn ? 1.0 : 0.0);
    setRoadUniform("uWetness", w.wetness);
    setRoadUniform("uRainIntensity", w.rainIntensity);
    setRoadUniform("uRTEnabled", rtEnabled ? 1.0 : 0.0);

    // Sync Water Shader
    setWaterUniform("uSunDir", sunDir);
    setWaterUniform("uSunColor", sunColor);
    setWaterUniform("uDeepColor", new THREE.Color(t.waterDeep).multiplyScalar(0.75 + 0.25 * w.skyDarken));
    setWaterUniform("uShallowColor", new THREE.Color(t.waterShallow).multiplyScalar(0.75 + 0.25 * w.skyDarken));
    setWaterUniform("uFogColor", fogCol);
    setWaterUniform("uFogDensity", fogDensity);
    setWaterUniform("uHeadlightsOn", headlightsOn ? 1.0 : 0.0);
    setWaterUniform("uWaveStrength", w.waveStrength);
    setWaterUniform("uRainIntensity", w.rainIntensity);
    setWaterUniform("uRTEnabled", rtEnabled ? 1.0 : 0.0);

    // Sync Car Reflections, Shadows & Beams
    bodyMat.envMap = rtEnabled ? cubeRenderTarget.texture : null;
    bodyMat.envMapIntensity = rtEnabled ? 1.8 : 0.0;
    bodyMat.clearcoat = rtEnabled ? 1.0 : 0.0;
    bodyMat.roughness = rtEnabled ? 0.12 : 0.58;
    bodyMat.needsUpdate = true;

    cabinMat.envMap = rtEnabled ? cubeRenderTarget.texture : null;
    cabinMat.envMapIntensity = rtEnabled ? 2.0 : 0.0;
    cabinMat.roughness = rtEnabled ? 0.05 : 0.45;
    cabinMat.needsUpdate = true;

    rimMat.envMap = rtEnabled ? cubeRenderTarget.texture : null;
    rimMat.envMapIntensity = rtEnabled ? 1.5 : 0.0;
    rimMat.needsUpdate = true;

    sunLight.castShadow = rtEnabled;
    roadShadowGroup.visible = rtEnabled;
    volumetricBeams.forEach((b) => (b.visible = rtEnabled && headlightsOn));
    headSpot.intensity = rtEnabled && headlightsOn ? 3.2 : headlightsOn ? 1.2 : 0;

    // Update HUD Labels & Active Button States
    document.getElementById("time-label").textContent = t.name;
    document.getElementById("weather-label").textContent = w.name;
    document.getElementById("btn-weather").classList.toggle("active", w.name !== "CLEAR");

    document.getElementById("rt-label").textContent = rtEnabled ? "ON" : "OFF";
    document.getElementById("btn-rt").classList.toggle("active", rtEnabled);
  }

  function toggleRayTracing() {
    rtEnabled = !rtEnabled;
    applyEnvironment();
    showBanner(rtEnabled ? "RT REFLECTIONS: ON" : "RT REFLECTIONS: OFF");
  }

  function cycleWeather() {
    weatherIndex = (weatherIndex + 1) % WEATHER_PRESETS.length;
    applyEnvironment();
    showBanner(`WEATHER: ${WEATHER_PRESETS[weatherIndex].name}`);
  }

  function cycleTimeOfDay() {
    timeIndex = (timeIndex + 1) % TIME_PRESETS.length;
    applyEnvironment();
  }

  function cycleCamera() {
    cameraModeIdx = (cameraModeIdx + 1) % CAMERA_MODES.length;
    document.getElementById("cam-label").textContent = CAMERA_MODES[cameraModeIdx];
  }

  function updateCamera(dt, speed, usingNitro) {
    const mode = CAMERA_MODES[cameraModeIdx];
    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);

    const targetFov =
      mode === "HOOD"
        ? 75
        : 64 + Math.min(20, Math.abs(speed) * 0.22) + (usingNitro ? 6 : 0);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 6 * dt);
    camera.updateProjectionMatrix();

    if (mode === "CHASE") {
      const dist = 10.2 + Math.min(3.4, Math.abs(speed) * 0.04);
      const desiredPos = new THREE.Vector3(car.x - fx * dist, car.y + 4.1, car.z - fz * dist);
      const desiredLook = new THREE.Vector3(car.x + fx * 6.5, car.y + 1.35, car.z + fz * 6.5);

      camPosCurrent.lerp(desiredPos, 1 - Math.exp(-7.5 * dt));
      camLookCurrent.lerp(desiredLook, 1 - Math.exp(-10 * dt));
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    } else if (mode === "HOOD") {
      camPosCurrent.set(car.x + fx * 0.5, car.y + 1.55, car.z + fz * 0.5);
      camLookCurrent.set(car.x + fx * 28, car.y + 1.2 + car.pitch * 12, car.z + fz * 28);
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    } else {
      const desiredPos = new THREE.Vector3(car.x - fx * 18, car.y + 24, car.z - fz * 18);
      camPosCurrent.lerp(desiredPos, 1 - Math.exp(-5 * dt));
      camLookCurrent.set(car.x, car.y + 1, car.z);
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    }
  }

  let frameCounter = 0;

  function renderRTPasses() {
    if (!rtEnabled) return;

    // Pass 1: Live planar mirror reflection shared by Water & Wet Roads
    mirrorCamera.fov = camera.fov;
    mirrorCamera.aspect = camera.aspect;
    mirrorCamera.near = camera.near;
    mirrorCamera.far = camera.far;
    mirrorCamera.updateProjectionMatrix();

    mirrorCamera.position.set(camera.position.x, -camera.position.y, camera.position.z);
    mirrorCamera.up.set(0, 1, 0);
    mirrorCamera.lookAt(camLookCurrent.x, -camLookCurrent.y, camLookCurrent.z);

    const prevRainVis = rainLines.visible;
    ground.visible = false;
    waterGroup.visible = false;
    roadGroup.visible = false;
    roadShadowGroup.visible = false;
    rainLines.visible = false;

    renderer.setRenderTarget(reflTarget);
    renderer.clear();
    renderer.render(scene, mirrorCamera);
    renderer.setRenderTarget(null);

    ground.visible = true;
    waterGroup.visible = true;
    roadGroup.visible = true;
    roadShadowGroup.visible = rtEnabled;
    rainLines.visible = prevRainVis;

    // Pass 2: Live 360-degree CubeCamera reflection on car paint & windows
    if (frameCounter % 2 === 0) {
      carGroup.visible = false;
      rainLines.visible = false;
      cubeCamera.position.set(car.x, car.y + 1.15, car.z);
      cubeCamera.update(renderer, scene);
      carGroup.visible = true;
      rainLines.visible = prevRainVis;
    }
  }

  // =========================================================================
  // 12. HUD TELEMETRY & WATERFRONT MINIMAP
  // =========================================================================
  const speedEl = document.getElementById("speed-value");
  const gearEl = document.getElementById("gear-value");
  const rpmFill = document.getElementById("rpm-fill");
  const rpmText = document.getElementById("rpm-text");
  const nitroFill = document.getElementById("nitro-fill");
  const nitroText = document.getElementById("nitro-text");
  const coordsEl = document.getElementById("coords-display");
  const zoneEl = document.getElementById("status-zone");

  const minimapCanvas = document.getElementById("minimap");
  const mapCtx = minimapCanvas.getContext("2d");

  function drawMinimap() {
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const scale = 0.28;

    // Outer ocean background
    mapCtx.clearRect(0, 0, w, h);
    mapCtx.fillStyle = "#082f49";
    mapCtx.fillRect(0, 0, w, h);

    mapCtx.save();
    mapCtx.translate(w / 2, h / 2);

    // City Island Landmass
    mapCtx.fillStyle = "#0f172a";
    mapCtx.fillRect(
      (-ISLAND_HALF - car.x) * scale,
      (-ISLAND_HALF - car.z) * scale,
      ISLAND_HALF * 2 * scale,
      ISLAND_HALF * 2 * scale
    );

    // Grand Harbor Water Basin
    mapCtx.fillStyle = "#0369a1";
    mapCtx.fillRect(
      (HARBOR.minX - car.x) * scale,
      (HARBOR.minZ - car.z) * scale,
      (HARBOR.maxX - HARBOR.minX) * scale,
      (HARBOR.maxZ - HARBOR.minZ) * scale
    );

    // Roads & Harbor Causeways
    mapCtx.strokeStyle = "#334155";
    mapCtx.lineWidth = ROAD_WIDTH * scale;

    roadLines.forEach((line) => {
      const rx = (line - car.x) * scale;
      mapCtx.beginPath();
      mapCtx.moveTo(rx, (-448 - car.z) * scale);
      mapCtx.lineTo(rx, (448 - car.z) * scale);
      mapCtx.stroke();

      const rz = (line - car.z) * scale;
      mapCtx.beginPath();
      mapCtx.moveTo((-448 - car.x) * scale, rz);
      mapCtx.lineTo((448 - car.x) * scale, rz);
      mapCtx.stroke();
    });

    // Buildings
    mapCtx.fillStyle = "#475569";
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const bx = (b.minX - car.x) * scale;
      const bz = (b.minZ - car.z) * scale;
      if (bx > w || bx < -w || bz > h || bz < -h) continue;
      mapCtx.fillRect(bx, bz, b.w * scale, b.d * scale);
    }

    // Stunt Ramps
    mapCtx.fillStyle = "#f97316";
    ramps.forEach((r) => {
      mapCtx.fillRect((r.x - car.x) * scale - 4, (r.z - car.z) * scale - 4, 8, 8);
    });

    // Player Arrow
    mapCtx.rotate(-car.heading);
    mapCtx.fillStyle = "#38bdf8";
    mapCtx.beginPath();
    mapCtx.moveTo(0, -8);
    mapCtx.lineTo(5.5, 6);
    mapCtx.lineTo(0, 3);
    mapCtx.lineTo(-5.5, 6);
    mapCtx.closePath();
    mapCtx.fill();

    mapCtx.restore();
  }

  function updateHUD(forwardSpeed) {
    speedEl.textContent = Math.round(Math.abs(forwardSpeed) * 3.6);
    gearEl.textContent = car.gear;

    const rpm = Math.round(car.rpm);
    rpmText.textContent = rpm;
    rpmFill.style.width = `${Math.min(100, (rpm / 8000) * 100)}%`;

    nitroFill.style.width = `${car.nitro}%`;
    nitroText.textContent = `${Math.round(car.nitro)}%`;

    coordsEl.textContent = `X: ${Math.round(car.x)} | Z: ${Math.round(car.z)}`;

    if (Math.abs(car.x) > ISLAND_HALF - 5 || Math.abs(car.z) > ISLAND_HALF - 5) {
      zoneEl.textContent = "COASTAL OCEAN";
    } else if (
      car.x > HARBOR.minX - 10 &&
      car.x < HARBOR.maxX + 10 &&
      car.z > HARBOR.minZ - 10 &&
      car.z < HARBOR.maxZ + 10
    ) {
      zoneEl.textContent = "GRAND HARBOR";
    } else if (car.x > 210 && car.x < 340 && car.z > -230 && car.z < 10) {
      zoneEl.textContent = "EAST STUNT PARK";
    } else if (Math.hypot(car.x, car.z) < 230) {
      zoneEl.textContent = "DOWNTOWN WATERFRONT";
    } else {
      zoneEl.textContent = "MIDTOWN SUBURBS";
    }

    drawMinimap();
  }

  // =========================================================================
  // 13. BUTTON BINDINGS, RESIZE & MAIN LOOP
  // =========================================================================
  function bindButton(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", (e) => {
      e.currentTarget.blur();
      handler();
    });
  }

  bindButton("btn-rt", toggleRayTracing);
  bindButton("btn-weather", cycleWeather);
  bindButton("btn-time", cycleTimeOfDay);
  bindButton("btn-camera", cycleCamera);
  bindButton("btn-sound", () => audio.toggle());
  bindButton("btn-reset", resetCar);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    reflTarget.setSize(
      Math.max(256, Math.floor(window.innerWidth * reflScale)),
      Math.max(256, Math.floor(window.innerHeight * reflScale))
    );
    renderer.getDrawingBufferSize(drawingBufferSize);
    setRoadUniform("uResolution", drawingBufferSize);
    setWaterUniform("uResolution", drawingBufferSize);
  });

  applyEnvironment();
  const clock = new THREE.Clock();
  let elapsed = 0;

  function animate() {
    requestAnimationFrame(animate);
    frameCounter++;
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    setRoadUniform("uTime", elapsed);
    setWaterUniform("uTime", elapsed);

    const { forwardSpeed, usingNitro } = updatePhysics(dt);
    updateCamera(dt, forwardSpeed, usingNitro);
    updateWeather(dt);
    renderRTPasses();
    updateHUD(forwardSpeed);

    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) eventBanner.classList.remove("visible");
    }

    renderer.render(scene, camera);
  }

  animate();
})();