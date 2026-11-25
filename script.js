(() => {
  "use strict";

  // =========================================================================
  // 1. CONFIGURATION & PRESETS
  // =========================================================================
  const WORLD_HALF = 560;
  const GRID_SPACING = 110;
  const ROAD_WIDTH = 16;

  const CAMERA_MODES = ["CHASE", "HOOD", "ORBIT"];
  const TIME_PRESETS = [
    {
      name: "SUNSET",
      sky: 0xd96b43,
      fog: 0xb85247,
      fogDensity: 0.00175,
      sunColor: 0xff9a52,
      sunIntensity: 1.35,
      sunPos: [-240, 75, -180],
      hemiSky: 0xfdba74,
      hemiGround: 0x1e293b,
      hemiIntensity: 0.6,
      ambientRoad: 0x3b2c35,
      windowGlow: 0.7,
      neonGlow: 1.8,
      headlights: true,
      wetness: 0.92,
      exposure: 1.12,
    },
    {
      name: "NIGHT",
      sky: 0x050914,
      fog: 0x080f22,
      fogDensity: 0.0023,
      sunColor: 0x60a5fa,
      sunIntensity: 0.35,
      sunPos: [100, 220, -160],
      hemiSky: 0x1e3a5f,
      hemiGround: 0x050811,
      hemiIntensity: 0.45,
      ambientRoad: 0x121c33,
      windowGlow: 1.35,
      neonGlow: 2.6,
      headlights: true,
      wetness: 1.0,
      exposure: 1.18,
    },
    {
      name: "DAY",
      sky: 0x7bc5f0,
      fog: 0x9bd2f5,
      fogDensity: 0.00125,
      sunColor: 0xfff6e5,
      sunIntensity: 1.4,
      sunPos: [180, 260, 140],
      hemiSky: 0xdbeafe,
      hemiGround: 0x3f6212,
      hemiIntensity: 0.72,
      ambientRoad: 0x4b5563,
      windowGlow: 0.08,
      neonGlow: 0.4,
      headlights: false,
      wetness: 0.65,
      exposure: 1.05,
    },
  ];

  let rtEnabled = true;

  // =========================================================================
  // 2. THREE.JS SCENE, RENDERER & REAL-TIME REFLECTION PIPELINE
  // =========================================================================
  const container = document.getElementById("canvas-container");
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.2,
    1200
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
  renderer.toneMappingExposure = 1.12;
  container.appendChild(renderer.domElement);

  // Planar Reflection Render Target (mirrors skyscrapers, sky, neon, & car onto wet roads)
  const reflScale = 0.55;
  const reflTarget = new THREE.WebGLRenderTarget(
    Math.max(256, Math.floor(window.innerWidth * reflScale)),
    Math.max(256, Math.floor(window.innerHeight * reflScale)),
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    }
  );

  // Live 360-degree CubeCamera for ray-traced-style clearcoat car paint reflections
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(0.5, 520, cubeRenderTarget);
  scene.add(cubeCamera);

  // Lights
  const hemiLight = new THREE.HemisphereLight(0xfdba74, 0x1e293b, 0.6);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xff9a52, 1.35);
  sunLight.position.set(-240, 75, -180);
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

  // Visible Sun / Moon Disc in the Sky (shows up sharply in wet road & car reflections)
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(28, 24, 24),
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
    tex.repeat.set(90, 90);
    return tex;
  }

  function createRoadTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#1c1f26";
    ctx.fillRect(0, 0, 256, 256);

    // Asphalt grain
    for (let i = 0; i < 2200; i++) {
      const v = 22 + Math.floor(Math.random() * 24);
      ctx.fillStyle = `rgb(${v},${v},${v + 5})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    // Crisp side lines + yellow center dashes
    ctx.fillStyle = "#cbd5e1";
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
  // 4. CUSTOM GLSL RAY-TRACED-STYLE WET ROAD REFLECTION SHADER
  // =========================================================================
  const roadTexBase = createRoadTexture();

  const sharedRoadUniforms = {
    uRoadMap: { value: roadTexBase },
    uReflMap: { value: reflTarget.texture },
    uResolution: {
      value: new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
    },
    uRTEnabled: { value: 1.0 },
    uWetness: { value: 0.92 },
    uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.5).normalize() },
    uSunColor: { value: new THREE.Color(0xff9a52) },
    uAmbientColor: { value: new THREE.Color(0x3b2c35) },
    uFogColor: { value: new THREE.Color(0xb85247) },
    uFogDensity: { value: 0.00175 },
    uCarPos: { value: new THREE.Vector3(0, 0, 20) },
    uCarForward: { value: new THREE.Vector3(0, 0, -1) },
    uHeadlightsOn: { value: 1.0 },
    uBrakeIntensity: { value: 0.4 },
    uNitroActive: { value: 0.0 },
  };

  function createReflectiveRoadMaterial(isIntersection) {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        sharedRoadUniforms,
        {
          uUvScale: { value: isIntersection ? new THREE.Vector2(1.0, 1.0) : new THREE.Vector2(1.0, 56.0) },
          uIsIntersection: { value: isIntersection ? 1.0 : 0.0 },
        },
      ]),
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
        uniform float uRTEnabled;
        uniform float uWetness;
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

        // Smooth procedural noise for organic puddles & asphalt micro-roughness
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

        void main() {
          vec3 albedo = uIsIntersection > 0.5
            ? vec3(0.11, 0.125, 0.155)
            : texture2D(uRoadMap, vUv * uUvScale).rgb;

          // Puddle patches & asphalt micro-bump
          float p1 = noise2D(vWorldPos.xz * 0.045);
          float p2 = noise2D(vWorldPos.xz * 0.13);
          float puddle = smoothstep(0.36, 0.68, p1 * 0.68 + p2 * 0.32) * uWetness;

          float microX = (noise2D(vWorldPos.xz * 2.1) - 0.5);
          float microZ = (noise2D(vWorldPos.xz * 2.1 + 19.7) - 0.5);
          float roughAmt = mix(0.18, 0.015, puddle);
          vec3 N = normalize(vec3(microX * roughAmt, 1.0, microZ * roughAmt));

          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 L = normalize(uSunDir);

          // Base diffuse + sun glossy reflection (Blinn-Phong)
          float NdotL = max(dot(N, L), 0.0);
          vec3 H = normalize(L + V);
          float specPower = mix(24.0, 220.0, puddle);
          float spec = pow(max(dot(N, H), 0.0), specPower) * mix(0.25, 1.5, puddle);

          // Darken wet asphalt realistically
          vec3 wetAlbedo = albedo * mix(1.0, 0.58, puddle);
          vec3 color = wetAlbedo * (uAmbientColor + uSunColor * NdotL * 0.85) + uSunColor * spec * 0.65;

          // Dynamic car headlight pool projected onto road
          vec3 toFrag = vWorldPos - uCarPos;
          float carDist = length(toFrag.xz);
          if (uHeadlightsOn > 0.5 && carDist < 58.0) {
            vec2 dir2 = normalize(toFrag.xz + vec2(0.0001));
            float cone = dot(dir2, normalize(uCarForward.xz));
            float beam = smoothstep(0.68, 0.96, cone) * smoothstep(58.0, 3.0, carDist);
            color += vec3(1.0, 0.94, 0.82) * beam * (0.45 + puddle * 0.35);
          }

          // Dynamic taillight / brake glow & nitro underglow reflected on asphalt
          vec3 rearPos = uCarPos - uCarForward * 2.3;
          float rearDist = length(vWorldPos.xz - rearPos.xz);
          if (rearDist < 14.0) {
            float tailFalloff = smoothstep(14.0, 0.6, rearDist);
            color += vec3(1.0, 0.1, 0.08) * tailFalloff * uBrakeIntensity * (0.32 + puddle * 0.5);
            if (uNitroActive > 0.5) {
              color += vec3(0.15, 0.72, 1.0) * tailFalloff * (0.5 + puddle * 0.75);
            }
          }

          // Real-Time Planar Mirror Reflection with Schlick Fresnel
          if (uRTEnabled > 0.5) {
            vec2 screenUv = gl_FragCoord.xy / uResolution;
            vec2 reflUv = vec2(screenUv.x, 1.0 - screenUv.y);
            // Distort reflection slightly by asphalt roughness (sharp in puddles, softer on dry road)
            float distort = mix(0.018, 0.002, puddle);
            reflUv += vec2(microX, microZ) * distort;
            reflUv = clamp(reflUv, vec2(0.002), vec2(0.998));

            vec3 reflColor = texture2D(uReflMap, reflUv).rgb;
            float fresnel = 0.08 + 0.92 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
            float reflStrength = clamp(mix(0.18, 0.84, puddle) * (0.55 + fresnel * 0.7), 0.0, 0.88);
            color = mix(color, reflColor, reflStrength);
          }

          // Match Three.js FogExp2 seamlessly
          float depth = length(cameraPosition - vWorldPos);
          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
          color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
        }
      `,
    });
  }

  // Keep shared uniform references synchronized across both road materials
  const roadMatStrip = createReflectiveRoadMaterial(false);
  const roadMatInter = createReflectiveRoadMaterial(true);
  const allRoadMats = [roadMatStrip, roadMatInter];

  function setRoadUniform(name, val) {
    allRoadMats.forEach((m) => {
      if (m.uniforms[name].value.copy) {
        m.uniforms[name].value.copy(val);
      } else {
        m.uniforms[name].value = val;
      }
    });
  }

  // =========================================================================
  // 5. OPEN WORLD GENERATION (ROADS, NEON SKYSCRAPERS, RAMPS, TREES)
  // =========================================================================
  const buildings = [];
  const ramps = [];
  const buildingMaterials = [];
  const neonMaterials = [];

  const groundMat = new THREE.MeshStandardMaterial({
    map: createGrassTexture(),
    roughness: 0.94,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF * 2.4, WORLD_HALF * 2.4),
    groundMat
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadGroup = new THREE.Group();
  const roadShadowGroup = new THREE.Group();
  scene.add(roadGroup);
  scene.add(roadShadowGroup);

  const roadLines = [-440, -330, -220, -110, 0, 110, 220, 330, 440];
  const roadLength = 896;
  const roadShadowMat = new THREE.ShadowMaterial({ opacity: 0.36 });

  // North-South roads
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

  // East-West roads
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

  // Intersections
  const interGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 0.5, ROAD_WIDTH + 0.5);
  roadLines.forEach((x) => {
    roadLines.forEach((z) => {
      const patch = new THREE.Mesh(interGeo, roadMatInter);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(x, 0.05, z);
      roadGroup.add(patch);
    });
  });

  // Stunt Ramps
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

  // Materials for City & Foliage
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
        emissiveIntensity: 1.8,
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
      emissiveIntensity: 0.7,
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
    emissiveIntensity: 2.2,
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

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 8), bulbMat);
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
      const isDowntown = distFromCenter < 245;

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
        const h = isDowntown ? 26 + rand() * 64 : 10 + rand() * 20;

        const mat = sharedBuildingMats[Math.floor(rand() * sharedBuildingMats.length)];
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          [mat, mat, roofMat, roofMat, mat, mat]
        );
        mesh.position.set(px, h / 2, pz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        // Glowing rooftop neon crown on tall downtown towers (creates dramatic wet road reflections)
        if (isDowntown && h > 44) {
          const neonMat = neonMaterials[Math.floor(rand() * neonMaterials.length)];
          const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.9, d + 0.5), neonMat);
          rim.position.set(px, h - 0.6, pz);
          scene.add(rim);
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

  // Outer perimeter mountains (positioned cleanly at y >= 0 for crisp planar reflections)
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x2f4232, roughness: 0.95 });
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const radius = WORLD_HALF + 55 + (i % 3) * 20;
    const h = 48 + (i % 5) * 24;
    const m = new THREE.Mesh(new THREE.ConeGeometry(55, h, 6), mountainMat);
    m.position.set(Math.cos(a) * radius, h / 2, Math.sin(a) * radius);
    scene.add(m);
  }

  // =========================================================================
  // 6. PLAYER CAR 3D MODEL (CLEARCOAT METALLIC PBR + LIVE CUBEMAP REFLECTIONS)
  // =========================================================================
  const carGroup = new THREE.Group();
  const carTiltGroup = new THREE.Group();
  carGroup.add(carTiltGroup);
  scene.add(carGroup);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xe11d48,
    metalness: 0.82,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.5,
  });

  const cabinMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1020,
    metalness: 0.92,
    roughness: 0.06,
    clearcoat: 1.0,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.85,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.5,
    roughness: 0.4,
  });

  // Chassis & Hood
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.62, 4.55), bodyMat);
  chassis.position.y = 0.62;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  carTiltGroup.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.56, 2.2), cabinMat);
  cabin.position.set(0, 1.16, 0.15);
  cabin.castShadow = true;
  carTiltGroup.add(cabin);

  // Rear Spoiler
  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.1, 0.44), trimMat);
  spoilerWing.position.set(0, 1.22, 2.04);
  spoilerWing.castShadow = true;
  carTiltGroup.add(spoilerWing);

  [-0.7, 0.7].forEach((sx) => {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.25), trimMat);
    strut.position.set(sx, 1.04, 2.04);
    carTiltGroup.add(strut);
  });

  // Emissive Headlights & Brake Lights
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
    opacity: 0.085,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  [-0.72, 0.72].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.08), headlightMat);
    hl.position.set(lx, 0.68, -2.28);
    carTiltGroup.add(hl);

    // Volumetric Headlight Light Cone
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 15, 16, 1, true), beamMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(lx, 0.66, -9.8);
    carTiltGroup.add(cone);
    volumetricBeams.push(cone);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.08), brakeLightMat);
    tl.position.set(lx, 0.7, 2.28);
    carTiltGroup.add(tl);
  });

  // Real Spotlight + Rear Brake/Nitro Dynamic Point Light
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

  // Nitro Flames
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

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f1218, roughness: 0.88 });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.12,
    envMap: cubeRenderTarget.texture,
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

  // Drift Smoke Particles
  const smokePool = [];
  const smokeGeo = new THREE.SphereGeometry(0.38, 6, 6);
  for (let i = 0; i < 45; i++) {
    const m = new THREE.Mesh(
      smokeGeo,
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.42 })
    );
    m.visible = false;
    scene.add(m);
    smokePool.push({ mesh: m, life: 0, maxLife: 0.65, vx: 0, vy: 0, vz: 0 });
  }
  let smokeIdx = 0;

  function spawnSmoke(x, y, z) {
    const p = smokePool[smokeIdx];
    smokeIdx = (smokeIdx + 1) % smokePool.length;
    p.mesh.position.set(x, y, z);
    p.mesh.scale.setScalar(0.6);
    p.mesh.material.opacity = 0.42;
    p.mesh.visible = true;
    p.life = p.maxLife;
    p.vx = (Math.random() - 0.5) * 1.4;
    p.vy = 1.2 + Math.random() * 1.1;
    p.vz = (Math.random() - 0.5) * 1.4;
  }

  // =========================================================================
  // 7. FULL PROCEDURAL WEB AUDIO SOUND ENGINE
  // =========================================================================
  const soundBtn = document.getElementById("btn-sound");
  const soundLabel = document.getElementById("sound-label");

  const audio = {
    ctx: null,
    masterGain: null,
    enabled: false,
    userMuted: false,
    // Engine channels
    oscSub: null,
    oscMain: null,
    oscHarm: null,
    engineFilter: null,
    engineGain: null,
    // Tire screech
    screechFilter: null,
    screechGain: null,
    // Wind & Nitro
    windGain: null,
    nitroNoiseGain: null,
    turboOsc: null,
    turboGain: null,
    // Horn
    hornOsc1: null,
    hornOsc2: null,
    hornGain: null,
    // Reusable noise buffer
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

      // Shared white noise buffer
      const bufLen = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;

      // Subtle soft-clipper for warm V8 growl
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

      // Tire Drift Screech
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

      // High-Speed Wind Rush
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

      // Nitro Jet Roar + Turbo Whistle
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

      // Dual-tone Car Horn
      this.hornOsc1 = ctx.createOscillator();
      this.hornOsc1.type = "sawtooth";
      this.hornOsc1.frequency.value = 392; // G4

      this.hornOsc2 = ctx.createOscillator();
      this.hornOsc2.type = "sawtooth";
      this.hornOsc2.frequency.value = 493.88; // B4

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
        this.nitroNoiseGain.gain.setTargetAtTime(0, now, 0.04);
        this.turboGain.gain.setTargetAtTime(0, now, 0.04);
        this.hornGain.gain.setTargetAtTime(0, now, 0.03);
      }
    },

    update(rpm, absSpeed, lateralSpeed, throttle, drifting, usingNitro, hornPressed) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;

      // Engine pitch & tone driven directly by gearbox RPM
      const normRpm = THREE.MathUtils.clamp((rpm - 800) / 7200, 0, 1);
      const baseFreq = 34 + normRpm * 92 + (usingNitro ? 14 : 0);

      this.oscSub.frequency.setTargetAtTime(baseFreq, now, 0.035);
      this.oscMain.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.035);
      this.oscHarm.frequency.setTargetAtTime(baseFreq * 3.01, now, 0.035);

      const cutoff = 220 + normRpm * 1350 + (throttle > 0 ? 350 : 0) + (usingNitro ? 500 : 0);
      this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);

      const loadVol = 0.09 + normRpm * 0.11 + (throttle > 0 ? 0.045 : 0);
      this.engineGain.gain.setTargetAtTime(loadVol, now, 0.05);

      // Drift tire screech
      const screechLevel = drifting
        ? Math.min(0.18, Math.abs(lateralSpeed) * 0.011)
        : 0;
      this.screechFilter.frequency.setTargetAtTime(1400 + Math.min(600, absSpeed * 8), now, 0.05);
      this.screechGain.gain.setTargetAtTime(screechLevel, now, 0.04);

      // High-speed aerodynamic wind rush
      const windLevel = absSpeed > 22 ? Math.min(0.15, (absSpeed - 22) * 0.0024) : 0;
      this.windGain.gain.setTargetAtTime(windLevel, now, 0.08);

      // Nitro whoosh & turbo whine
      this.nitroNoiseGain.gain.setTargetAtTime(usingNitro ? 0.19 : 0, now, 0.06);
      this.turboOsc.frequency.setTargetAtTime(2200 + normRpm * 2400, now, 0.06);
      this.turboGain.gain.setTargetAtTime(usingNitro ? 0.045 : normRpm > 0.65 ? 0.012 : 0, now, 0.07);

      // Car Horn
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

      // Low thud
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

      // Crunch noise
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
  };

  // =========================================================================
  // 8. INPUT HANDLING
  // =========================================================================
  const keys = {};

  window.addEventListener("keydown", (e) => {
    const code = e.code;
    keys[code] = true;

    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
      e.preventDefault();
    }
    if (code !== "KeyM") audio.unlockAuto();

    if (code === "KeyT") toggleRayTracing();
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
  // 9. VEHICLE PHYSICS ENGINE
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
    pitch: 0,
    roll: 0,
    airTime: 0,
    drifting: false,
    gear: "N",
    rpm: 850,
  };

  let prevGearNum = 0;
  let impactCooldown = 0;
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
    showBanner("CAR RESET");
  }

  function sampleSurface(x, z, currentY) {
    let bestH = 0;
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

    return { height: bestH, slopePitch, hitWall };
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

    const limit = WORLD_HALF - 18;
    if (car.x > limit) { maxImpact = Math.max(maxImpact, Math.abs(car.vx)); car.x = limit; car.vx *= -0.4; }
    if (car.x < -limit) { maxImpact = Math.max(maxImpact, Math.abs(car.vx)); car.x = -limit; car.vx *= -0.4; }
    if (car.z > limit) { maxImpact = Math.max(maxImpact, Math.abs(car.vz)); car.z = limit; car.vz *= -0.4; }
    if (car.z < -limit) { maxImpact = Math.max(maxImpact, Math.abs(car.vz)); car.z = -limit; car.vz *= -0.4; }

    if (maxImpact > 4.5 && impactCooldown <= 0) {
      audio.playImpact(maxImpact);
      impactCooldown = 0.25;
    }
  }

  function updatePhysics(dt) {
    impactCooldown = Math.max(0, impactCooldown - dt);

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
      const accel = usingNitro ? 58 : 34;
      const maxSpeed = usingNitro ? 86 : 62;

      if (throttle > 0) {
        forwardSpeed += accel * dt;
      } else if (throttle < 0) {
        if (forwardSpeed > 2) forwardSpeed -= 52 * dt;
        else forwardSpeed -= 20 * dt;
      } else {
        forwardSpeed *= Math.exp(-1.1 * dt);
      }

      if (handbrake) forwardSpeed *= Math.exp(-1.8 * dt);
      forwardSpeed = THREE.MathUtils.clamp(forwardSpeed, -22, maxSpeed);

      const speedFactor = Math.min(1, Math.abs(forwardSpeed) / 7);
      const steerDir = forwardSpeed >= -0.5 ? 1 : -1;
      const turnRate = handbrake ? 2.85 : 2.15;
      const highSpeedDamp = 1 - Math.min(0.45, Math.abs(forwardSpeed) / 140);

      car.heading += steerInput * turnRate * speedFactor * highSpeedDamp * steerDir * dt;

      const grip = handbrake ? 1.6 : 7.8;
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

    if (car.y <= surf.height + 0.05) {
      if (!car.grounded) {
        if (Math.abs(car.vy) > 7.5) audio.playImpact(Math.abs(car.vy) * 1.1);
        if (car.airTime > 0.55) showBanner(`AIR TIME ${car.airTime.toFixed(1)}S!`);
      }
      car.y = surf.height;
      car.vy = Math.max(0, (car.y - prevY) / Math.max(dt, 0.008));
      car.grounded = true;
      car.airTime = 0;
    } else {
      car.grounded = false;
      car.airTime += dt;
    }

    resolveBuildingCollisions();

    // Automatic 6-Speed Gearbox & RPM Calculation
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

    // Drift & Smoke
    car.drifting = car.grounded && Math.abs(lateralSpeed) > 5.5 && Math.abs(forwardSpeed) > 10;
    if (car.drifting && Math.random() < 0.75) {
      const rearX = car.x - nfx * 1.4;
      const rearZ = car.z - nfz * 1.4;
      spawnSmoke(rearX + nrx * 0.9, car.y + 0.25, rearZ + nrz * 0.9);
      spawnSmoke(rearX - nrx * 0.9, car.y + 0.25, rearZ - nrz * 0.9);
    }

    // Wheel rotation, steering & suspension tilt
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

    // Brake & Nitro dynamic lights + road shader uniforms
    const braking = (throttle < 0 && forwardSpeed > 1) || handbrake;
    const brakeGlow = braking ? 2.6 : 0.55;
    brakeLightMat.emissiveIntensity = brakeGlow;
    rearGlowLight.color.setHex(usingNitro ? 0x38bdf8 : 0xff2222);
    rearGlowLight.intensity = usingNitro ? 2.8 : braking ? 2.2 : 0.75;

    setRoadUniform("uCarPos", carGroup.position);
    setRoadUniform("uCarForward", new THREE.Vector3(nfx, 0, nfz));
    setRoadUniform("uBrakeIntensity", braking ? 1.4 : 0.45);
    setRoadUniform("uNitroActive", usingNitro ? 1.0 : 0.0);

    // Update smoke
    for (let i = 0; i < smokePool.length; i++) {
      const p = smokePool[i];
      if (p.life > 0) {
        p.life -= dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        const ratio = Math.max(0, p.life / p.maxLife);
        p.mesh.scale.setScalar(0.6 + (1 - ratio) * 1.9);
        p.mesh.material.opacity = ratio * 0.42;
        if (p.life <= 0) p.mesh.visible = false;
      }
    }

    // Move shadow camera & sky disc with player
    const preset = TIME_PRESETS[timeIndex];
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

    // Update Web Audio engine
    audio.update(
      car.rpm,
      Math.abs(forwardSpeed),
      lateralSpeed,
      throttle,
      car.drifting,
      usingNitro,
      hornPressed
    );

    return { forwardSpeed, usingNitro };
  }

  // =========================================================================
  // 10. CAMERA, RT REFLECTION PASSES & TIME OF DAY
  // =========================================================================
  let cameraModeIdx = 0;
  let timeIndex = 0;
  const camPosCurrent = new THREE.Vector3(0, 5.5, 31);
  const camLookCurrent = new THREE.Vector3(0, 1.4, 14);

  function toggleRayTracing() {
    rtEnabled = !rtEnabled;
    const rtBtn = document.getElementById("btn-rt");
    document.getElementById("rt-label").textContent = rtEnabled ? "ON" : "OFF";
    rtBtn.classList.toggle("active", rtEnabled);

    setRoadUniform("uRTEnabled", rtEnabled ? 1.0 : 0.0);
    bodyMat.envMapIntensity = rtEnabled ? 1.5 : 0.0;
    cabinMat.envMapIntensity = rtEnabled ? 1.85 : 0.0;
    showBanner(rtEnabled ? "RT REFLECTIONS ENABLED" : "RT REFLECTIONS OFF");
  }

  function cycleCamera() {
    cameraModeIdx = (cameraModeIdx + 1) % CAMERA_MODES.length;
    document.getElementById("cam-label").textContent = CAMERA_MODES[cameraModeIdx];
  }

  function applyTimePreset(idx) {
    const p = TIME_PRESETS[idx];
    scene.background = new THREE.Color(p.sky);
    scene.fog = new THREE.FogExp2(p.fog, p.fogDensity);
    renderer.toneMappingExposure = p.exposure;

    sunLight.color.setHex(p.sunColor);
    sunLight.intensity = p.sunIntensity;
    sunDisc.material.color.setHex(p.sunColor);

    hemiLight.color.setHex(p.hemiSky);
    hemiLight.groundColor.setHex(p.hemiGround);
    hemiLight.intensity = p.hemiIntensity;

    buildingMaterials.forEach((m) => (m.emissiveIntensity = p.windowGlow));
    neonMaterials.forEach((m) => (m.emissiveIntensity = p.neonGlow));
    bulbMat.emissiveIntensity = p.headlights ? 2.4 : 0.15;

    headSpot.intensity = p.headlights ? 3.2 : 0;
    headlightMat.emissiveIntensity = p.headlights ? 2.8 : 0.4;
    volumetricBeams.forEach((b) => (b.visible = p.headlights));

    // Sync wet road reflection shader lighting
    setRoadUniform("uSunDir", new THREE.Vector3(...p.sunPos).normalize());
    setRoadUniform("uSunColor", new THREE.Color(p.sunColor));
    setRoadUniform("uAmbientColor", new THREE.Color(p.ambientRoad));
    setRoadUniform("uFogColor", new THREE.Color(p.fog));
    setRoadUniform("uFogDensity", p.fogDensity);
    setRoadUniform("uHeadlightsOn", p.headlights ? 1.0 : 0.0);
    setRoadUniform("uWetness", p.wetness);

    document.getElementById("time-label").textContent = p.name;
  }

  function cycleTimeOfDay() {
    timeIndex = (timeIndex + 1) % TIME_PRESETS.length;
    applyTimePreset(timeIndex);
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

    // Pass 1: Planar Mirror Reflection for all wet asphalt roads
    mirrorCamera.fov = camera.fov;
    mirrorCamera.aspect = camera.aspect;
    mirrorCamera.near = camera.near;
    mirrorCamera.far = camera.far;
    mirrorCamera.updateProjectionMatrix();

    mirrorCamera.position.set(camera.position.x, -camera.position.y, camera.position.z);
    mirrorCamera.up.set(0, 1, 0);
    mirrorCamera.lookAt(camLookCurrent.x, -camLookCurrent.y, camLookCurrent.z);

    ground.visible = false;
    roadGroup.visible = false;
    roadShadowGroup.visible = false;

    renderer.setRenderTarget(reflTarget);
    renderer.clear();
    renderer.render(scene, mirrorCamera);
    renderer.setRenderTarget(null);

    ground.visible = true;
    roadGroup.visible = true;
    roadShadowGroup.visible = true;

    // Pass 2: Dynamic 360-degree CubeCamera Reflection on the car paint (every 2 frames for 60fps smoothness)
    if (frameCounter % 2 === 0) {
      carGroup.visible = false;
      cubeCamera.position.set(car.x, car.y + 1.15, car.z);
      cubeCamera.update(renderer, scene);
      carGroup.visible = true;
    }
  }

  // =========================================================================
  // 11. HUD TELEMETRY & REAL-TIME MINIMAP
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

    mapCtx.clearRect(0, 0, w, h);
    mapCtx.fillStyle = "#0f172a";
    mapCtx.fillRect(0, 0, w, h);

    mapCtx.save();
    mapCtx.translate(w / 2, h / 2);

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

    mapCtx.fillStyle = "#475569";
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const bx = (b.minX - car.x) * scale;
      const bz = (b.minZ - car.z) * scale;
      if (bx > w || bx < -w || bz > h || bz < -h) continue;
      mapCtx.fillRect(bx, bz, b.w * scale, b.d * scale);
    }

    mapCtx.fillStyle = "#f97316";
    ramps.forEach((r) => {
      mapCtx.fillRect((r.x - car.x) * scale - 4, (r.z - car.z) * scale - 4, 8, 8);
    });

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

    const dist = Math.hypot(car.x, car.z);
    if (car.x > 210 && car.x < 340 && car.z > -230 && car.z < 10) {
      zoneEl.textContent = "EAST STUNT PARK";
    } else if (dist < 220) {
      zoneEl.textContent = "DOWNTOWN CORE";
    } else if (dist < 420) {
      zoneEl.textContent = "MIDTOWN SUBURBS";
    } else {
      zoneEl.textContent = "OUTER RING HIGHWAY";
    }

    drawMinimap();
  }

  // =========================================================================
  // 12. BUTTONS, RESIZE & MAIN LOOP
  // =========================================================================
  document.getElementById("btn-rt").addEventListener("click", toggleRayTracing);
  document.getElementById("btn-camera").addEventListener("click", cycleCamera);
  document.getElementById("btn-time").addEventListener("click", cycleTimeOfDay);
  document.getElementById("btn-sound").addEventListener("click", () => audio.toggle());
  document.getElementById("btn-reset").addEventListener("click", resetCar);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    reflTarget.setSize(
      Math.max(256, Math.floor(window.innerWidth * reflScale)),
      Math.max(256, Math.floor(window.innerHeight * reflScale))
    );
    setRoadUniform(
      "uResolution",
      new THREE.Vector2(renderer.domElement.width, renderer.domElement.height)
    );
  });

  // Start in SUNSET preset to immediately showcase wet reflections & neon lighting
  applyTimePreset(0);
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    frameCounter++;
    const dt = Math.min(clock.getDelta(), 0.05);

    const { forwardSpeed, usingNitro } = updatePhysics(dt);
    updateCamera(dt, forwardSpeed, usingNitro);
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