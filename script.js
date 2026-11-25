(() => {
  "use strict";

  // =========================================================================
  // 1. CONFIGURATION & WORLD CONSTANTS
  // =========================================================================
  const WORLD_HALF = 560;
  const GRID_SPACING = 110;
  const ROAD_WIDTH = 16;

  const CAMERA_MODES = ["CHASE", "HOOD", "ORBIT"];
  const TIME_PRESETS = [
    {
      name: "DAY",
      sky: 0x87ceeb,
      fog: 0xaad4f5,
      fogDensity: 0.0014,
      sunColor: 0xfff5e0,
      sunIntensity: 1.25,
      sunPos: [180, 260, 140],
      hemiSky: 0xdbeafe,
      hemiGround: 0x3f6212,
      hemiIntensity: 0.7,
      windowGlow: 0.05,
      headlights: false,
    },
    {
      name: "SUNSET",
      sky: 0xea7a4f,
      fog: 0xd96b52,
      fogDensity: 0.0019,
      sunColor: 0xff8c42,
      sunIntensity: 1.15,
      sunPos: [-280, 70, -140],
      hemiSky: 0xfdba74,
      hemiGround: 0x292524,
      hemiIntensity: 0.55,
      windowGlow: 0.45,
      headlights: true,
    },
    {
      name: "NIGHT",
      sky: 0x070d1f,
      fog: 0x091228,
      fogDensity: 0.0026,
      sunColor: 0x64748b,
      sunIntensity: 0.3,
      sunPos: [100, 220, -160],
      hemiSky: 0x1e293b,
      hemiGround: 0x090d16,
      hemiIntensity: 0.4,
      windowGlow: 1.0,
      headlights: true,
    },
  ];

  // =========================================================================
  // 2. THREE.JS SCENE, RENDERER & LIGHTING
  // =========================================================================
  const container = document.getElementById("canvas-container");
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.2,
    1200
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f6212, 0.7);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.25);
  sunLight.position.set(180, 260, 140);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 700;
  const shadowExtent = 160;
  sunLight.shadow.camera.left = -shadowExtent;
  sunLight.shadow.camera.right = shadowExtent;
  sunLight.shadow.camera.top = shadowExtent;
  sunLight.shadow.camera.bottom = -shadowExtent;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // =========================================================================
  // 3. PROCEDURAL CANVAS TEXTURES
  // =========================================================================
  function createGrassTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#3f6a34";
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const shade = 45 + Math.floor(Math.random() * 45);
      ctx.fillStyle = `rgb(${shade}, ${shade + 42}, ${shade - 8})`;
      ctx.fillRect(x, y, 2, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(90, 90);
    return tex;
  }

  function createRoadTexture(vertical = true) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#262930";
    ctx.fillRect(0, 0, 256, 256);

    // Asphalt grain
    for (let i = 0; i < 1800; i++) {
      const v = 30 + Math.floor(Math.random() * 26);
      ctx.fillStyle = `rgb(${v},${v},${v + 4})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    // Side edges & dashed center line
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(10, 0, 5, 256);
    ctx.fillRect(241, 0, 5, 256);

    ctx.fillStyle = "#facc15";
    ctx.fillRect(124, 24, 8, 92);
    ctx.fillRect(124, 152, 8, 92);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (!vertical) {
      tex.center.set(0.5, 0.5);
      tex.rotation = Math.PI / 2;
    }
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
    const padX = 12;
    const padY = 12;
    const winW = (256 - padX * (cols + 1)) / cols;
    const winH = (512 - padY * (rows + 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const lit = Math.random() > 0.3;
        ctx.fillStyle = lit ? windowHex : "#111827";
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

    // Chevron speed arrows
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

    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  // =========================================================================
  // 4. OPEN WORLD GENERATION (ROADS, BUILDINGS, RAMPS, TREES, RING HIGHWAY)
  // =========================================================================
  const buildings = []; // AABB colliders + minimap footprints
  const ramps = [];     // Physics ramps
  const buildingMaterials = [];
  const streetLampBulbs = [];

  // Ground plane
  const groundMat = new THREE.MeshStandardMaterial({
    map: createGrassTexture(),
    roughness: 0.95,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF * 2.4, WORLD_HALF * 2.4),
    groundMat
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Road Grid + Outer Ring
  const roadLines = [-440, -330, -220, -110, 0, 110, 220, 330, 440];
  const roadTexV = createRoadTexture(true);
  roadTexV.repeat.set(1, 55);

  const roadTexH = createRoadTexture(true);
  roadTexH.repeat.set(1, 55);

  const roadMatV = new THREE.MeshStandardMaterial({ map: roadTexV, roughness: 0.85 });
  const roadMatH = new THREE.MeshStandardMaterial({ map: roadTexH, roughness: 0.85 });
  const intersectMat = new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.85 });

  const roadLength = 896;

  // North-South roads
  roadLines.forEach((x) => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, roadLength), roadMatV);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.03, 0);
    road.receiveShadow = true;
    scene.add(road);
  });

  // East-West roads
  roadLines.forEach((z) => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, roadLength), roadMatH);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = Math.PI / 2;
    road.position.set(0, 0.04, z);
    road.receiveShadow = true;
    scene.add(road);
  });

  // Clean intersections
  const interGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 0.5, ROAD_WIDTH + 0.5);
  roadLines.forEach((x) => {
    roadLines.forEach((z) => {
      const patch = new THREE.Mesh(interGeo, intersectMat);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(x, 0.05, z);
      patch.receiveShadow = true;
      scene.add(patch);
    });
  });

  // Helper to build wedge ramp geometry (low end at +l/2, high end at -l/2)
  function addRamp(x, z, width, height, length, angleY) {
    const shape = new THREE.Shape();
    shape.moveTo(-length / 2, 0);
    shape.lineTo(length / 2, 0);
    shape.lineTo(-length / 2, height);
    shape.closePath();

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: false,
    });
    // Center geometry so width spans X and length spans Z
    extrudeGeo.translate(0, 0, -width / 2);
    extrudeGeo.rotateY(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      map: createRampTexture(),
      roughness: 0.6,
      metalness: 0.2,
    });

    const mesh = new THREE.Mesh(extrudeGeo, mat);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = angleY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    ramps.push({ x, z, width, height, length, angleY });
  }

  // Place Stunt Ramps around the open world
  addRamp(0, -60, 12, 4.5, 22, 0);             // Main strip launch ramp
  addRamp(0, -170, 12, 5.0, 24, Math.PI);      // Opposite return ramp
  addRamp(275, -55, 16, 6.5, 28, 0);           // East stunt park mega ramp
  addRamp(275, -165, 16, 6.5, 28, Math.PI);    // Stunt park twin ramp
  addRamp(-275, 55, 14, 5.5, 24, Math.PI / 2); // West side jump
  addRamp(55, 275, 14, 5.0, 22, -Math.PI / 2); // South highway jump

  // Populate city blocks with Buildings, Parks, and Trees
  const palette = [
    { wall: "#334155", win: "#fef08a" },
    { wall: "#475569", win: "#bae6fd" },
    { wall: "#1e293b", win: "#fde68a" },
    { wall: "#3f3f46", win: "#93c5fd" },
    { wall: "#27272a", win: "#fed7aa" },
  ];

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x226633, roughness: 0.85 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 0.1,
  });

  function addTree(x, z, scale = 1) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45 * scale, 0.65 * scale, 4 * scale, 7),
      trunkMat
    );
    trunk.position.y = 2 * scale;
    trunk.castShadow = true;
    group.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(2.8 * scale, 7 * scale, 7),
      leafMat
    );
    crown.position.y = 6.5 * scale;
    crown.castShadow = true;
    group.add(crown);

    group.position.set(x, 0, z);
    scene.add(group);
  }

  function addStreetLamp(x, z) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 8.5, 6), poleMat);
    pole.position.y = 4.25;
    group.add(pole);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), bulbMat);
    bulb.position.y = 8.6;
    group.add(bulb);
    streetLampBulbs.push(bulb);

    group.position.set(x, 0, z);
    scene.add(group);
  }

  // Deterministic pseudo-random generator for clean city layout
  let seed = 1337;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  // Pre-build a shared pool of building materials
  const sharedBuildingMats = palette.map((p) => {
    const tex = createBuildingTexture(p.wall, p.win);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(0xfff3c4),
      emissiveIntensity: 0.05,
      roughness: 0.7,
    });
    buildingMaterials.push(mat);
    return mat;
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

  // Fill blocks between road grid lines
  for (let bx = -4; bx < 4; bx++) {
    for (let bz = -4; bz < 4; bz++) {
      const cx = (bx + 0.5) * GRID_SPACING;
      const cz = (bz + 0.5) * GRID_SPACING;

      // Leave Stunt Park block (x ~ 275, z ~ -110) and Central Plaza open
      const isStuntPark = cx > 210 && cx < 340 && cz > -230 && cz < 10;
      const isSpawnPlaza = Math.abs(cx) < 120 && Math.abs(cz) < 120 && rand() < 0.25;

      // Add corner street lamps
      addStreetLamp(cx - 43, cz - 43);
      addStreetLamp(cx + 43, cz + 43);

      if (isStuntPark || isSpawnPlaza) {
        // Trees along outer edge of park
        for (let t = 0; t < 6; t++) {
          const angle = (t / 6) * Math.PI * 2;
          addTree(cx + Math.cos(angle) * 38, cz + Math.sin(angle) * 38, 0.9 + rand() * 0.5);
        }
        continue;
      }

      const distFromCenter = Math.hypot(cx, cz);
      const isDowntown = distFromCenter < 240;
      const isSuburbs = distFromCenter >= 240;

      // Subdivide block into 2x2 lots
      const offsets = [
        [-21, -21],
        [21, -21],
        [-21, 21],
        [21, 21],
      ];

      offsets.forEach(([ox, oz]) => {
        const px = cx + ox;
        const pz = cz + oz;

        if (isSuburbs && rand() < 0.48) {
          // Green park lot with trees
          addTree(px + (rand() - 0.5) * 16, pz + (rand() - 0.5) * 16, 0.9 + rand() * 0.6);
          addTree(px + (rand() - 0.5) * 16, pz + (rand() - 0.5) * 16, 0.8 + rand() * 0.5);
          return;
        }

        const w = 18 + rand() * 14;
        const d = 18 + rand() * 14;
        const h = isDowntown ? 24 + rand() * 58 : 10 + rand() * 20;

        const mat = sharedBuildingMats[Math.floor(rand() * sharedBuildingMats.length)];
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          [mat, mat, roofMat, roofMat, mat, mat]
        );
        mesh.position.set(px, h / 2, pz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

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

  // Outer perimeter mountain hills & boundary wall visuals
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x3b4d3b, roughness: 0.95 });
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const radius = WORLD_HALF + 55 + (i % 3) * 20;
    const h = 45 + (i % 5) * 22;
    const m = new THREE.Mesh(new THREE.ConeGeometry(55, h, 6), mountainMat);
    m.position.set(Math.cos(a) * radius, h / 2 - 2, Math.sin(a) * radius);
    scene.add(m);
  }

  // =========================================================================
  // 5. PLAYER CAR 3D MODEL
  // =========================================================================
  const carGroup = new THREE.Group();
  const carTiltGroup = new THREE.Group(); // Handles pitch/roll without affecting heading
  carGroup.add(carTiltGroup);
  scene.add(carGroup);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    metalness: 0.65,
    roughness: 0.25,
  });
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.12,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
  });

  // Lower chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.5), bodyMat);
  chassis.position.y = 0.62;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  carTiltGroup.add(chassis);

  // Sporty cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.56, 2.2), cabinMat);
  cabin.position.set(0, 1.16, 0.15);
  cabin.castShadow = true;
  carTiltGroup.add(cabin);

  // Rear spoiler
  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.1, 0.42), trimMat);
  spoilerWing.position.set(0, 1.22, 2.02);
  spoilerWing.castShadow = true;
  carTiltGroup.add(spoilerWing);

  [-0.7, 0.7].forEach((sx) => {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.25), trimMat);
    strut.position.set(sx, 1.04, 2.02);
    carTiltGroup.add(strut);
  });

  // Headlights & Tail/Brake lights
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 0.4,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    emissive: 0xef4444,
    emissiveIntensity: 0.4,
  });

  [-0.72, 0.72].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.08), headlightMat);
    hl.position.set(lx, 0.68, -2.26);
    carTiltGroup.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.08), brakeLightMat);
    tl.position.set(lx, 0.7, 2.26);
    carTiltGroup.add(tl);
  });

  // Real Spotlight Headlights (toggled at sunset/night)
  const headSpot = new THREE.SpotLight(0xfffbeb, 0, 95, Math.PI / 5, 0.45, 1.2);
  headSpot.position.set(0, 0.9, -2.0);
  const headTarget = new THREE.Object3D();
  headTarget.position.set(0, 0.1, -26);
  carTiltGroup.add(headSpot);
  carTiltGroup.add(headTarget);
  headSpot.target = headTarget;

  // Nitro Exhaust Flames
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
  const flames = [-0.52, 0.52].map((fx) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 8), flameMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(fx, 0.42, 2.75);
    cone.visible = false;
    carTiltGroup.add(cone);
    return cone;
  });

  // 4 Wheels (front pair inside steering pivots)
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.2 });

  const wheelMeshes = [];
  const frontWheelPivots = [];

  const wheelPositions = [
    { x: -1.08, y: 0.42, z: -1.35, front: true },
    { x: 1.08, y: 0.42, z: -1.35, front: true },
    { x: -1.08, y: 0.42, z: 1.35, front: false },
    { x: 1.08, y: 0.42, z: 1.35, front: false },
  ];

  wheelPositions.forEach((wp) => {
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

  // Drift Smoke Particle Pool
  const smokePool = [];
  const smokeGeo = new THREE.SphereGeometry(0.38, 6, 6);
  const smokeMatBase = new THREE.MeshBasicMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.45,
  });

  for (let i = 0; i < 45; i++) {
    const m = new THREE.Mesh(smokeGeo, smokeMatBase.clone());
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
  // 6. WEB AUDIO API PROCEDURAL ENGINE & DRIFT AUDIO
  // =========================================================================
  let audioCtx = null;
  let engineOsc1 = null;
  let engineOsc2 = null;
  let engineGain = null;
  let screechGain = null;
  let audioEnabled = false;

  function initAudio() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioCtx = new AudioContextClass();

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;

    engineGain = audioCtx.createGain();
    engineGain.gain.value = 0.0;

    engineOsc1 = audioCtx.createOscillator();
    engineOsc1.type = "sawtooth";
    engineOsc1.frequency.value = 55;

    engineOsc2 = audioCtx.createOscillator();
    engineOsc2.type = "triangle";
    engineOsc2.frequency.value = 110;

    engineOsc1.connect(filter);
    engineOsc2.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(audioCtx.destination);

    engineOsc1.start();
    engineOsc2.start();

    // Tire screech noise channel
    const bufferSize = audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 1450;
    bandpass.Q.value = 5;

    screechGain = audioCtx.createGain();
    screechGain.gain.value = 0.0;

    noise.connect(bandpass);
    bandpass.connect(screechGain);
    screechGain.connect(audioCtx.destination);
    noise.start();
  }

  function toggleAudio() {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    audioEnabled = !audioEnabled;
    document.getElementById("sound-label").textContent = audioEnabled ? "ON" : "OFF";
    if (!audioEnabled && engineGain && screechGain) {
      engineGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
      screechGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
    }
  }

  // =========================================================================
  // 7. INPUT HANDLING & CONTROLS
  // =========================================================================
  const keys = {};

  window.addEventListener("keydown", (e) => {
    const code = e.code;
    keys[code] = true;

    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
      e.preventDefault();
    }
    if (code === "KeyC") cycleCamera();
    if (code === "KeyN") cycleTimeOfDay();
    if (code === "KeyM") toggleAudio();
    if (code === "KeyR") resetCar();
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  // =========================================================================
  // 8. VEHICLE STATE & PHYSICS ENGINE
  // =========================================================================
  const car = {
    x: 0,
    y: 0,
    z: 20,
    vx: 0,
    vy: 0,
    vz: 0,
    heading: 0,        // 0 faces -Z
    steerAngle: 0,
    nitro: 100,
    grounded: true,
    pitch: 0,
    roll: 0,
    airTime: 0,
    drifting: false,
  };

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

  // Query ground / ramp height under car
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

      // Transform world coordinates into ramp local coordinates
      const lx = dx * cosA - dz * sinA;
      const lz = dx * sinA + dz * cosA;

      if (Math.abs(lx) <= r.width / 2 + 0.8 && Math.abs(lz) <= r.length / 2 + 0.5) {
        // Low end is at +length/2, high end is at -length/2
        const t = THREE.MathUtils.clamp((r.length / 2 - lz) / r.length, 0, 1);
        const rampH = t * r.height;

        if (rampH - currentY > 1.1) {
          // Car hit tall back/side of the ramp instead of climbing from front
          hitWall = true;
        } else if (rampH > bestH) {
          bestH = rampH;
          // Project ramp slope along car's current heading
          const rampForwardX = -Math.sin(r.angleY);
          const rampForwardZ = -Math.cos(r.angleY);
          const carForwardX = -Math.sin(car.heading);
          const carForwardZ = -Math.cos(car.heading);
          const align = rampForwardX * carForwardX + rampForwardZ * carForwardZ;
          slopePitch = Math.atan2(r.height, r.length) * align;
        }
      }
    }

    return { height: bestH, slopePitch, hitWall };
  }

  // Resolve Circle vs AABB building collisions
  function resolveBuildingCollisions() {
    const radius = 2.05;

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
          car.vx -= 1.35 * vn * nx;
          car.vz -= 1.35 * vn * nz;
          car.vx *= 0.72;
          car.vz *= 0.72;
        }
      }
    }

    // Keep inside outer mountain boundary
    const limit = WORLD_HALF - 18;
    if (car.x > limit) { car.x = limit; car.vx *= -0.4; }
    if (car.x < -limit) { car.x = -limit; car.vx *= -0.4; }
    if (car.z > limit) { car.z = limit; car.vz *= -0.4; }
    if (car.z < -limit) { car.z = -limit; car.vz *= -0.4; }
  }

  let bannerTimer = 0;
  const eventBanner = document.getElementById("event-banner");
  function showBanner(text) {
    eventBanner.textContent = text;
    eventBanner.classList.add("visible");
    bannerTimer = 1.4;
  }

  function updatePhysics(dt) {
    const throttle = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const steerInput = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
    const handbrake = Boolean(keys.Space);
    const wantsNitro = Boolean(keys.ShiftLeft || keys.ShiftRight);

    // Local forward & right basis vectors
    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    const rx = Math.cos(car.heading);
    const rz = -Math.sin(car.heading);

    // Decompose world velocity into forward & sideways speed
    let forwardSpeed = car.vx * fx + car.vz * fz;
    let lateralSpeed = car.vx * rx + car.vz * rz;

    // Nitro boost
    const usingNitro = wantsNitro && car.nitro > 1 && throttle > 0;
    if (usingNitro) {
      car.nitro = Math.max(0, car.nitro - 28 * dt);
    } else {
      car.nitro = Math.min(100, car.nitro + 10 * dt);
    }

    flames.forEach((f) => {
      f.visible = usingNitro;
      if (usingNitro) {
        f.scale.y = 0.8 + Math.random() * 0.65;
      }
    });

    // Engine & braking forces (only when grounded)
    if (car.grounded) {
      const accel = usingNitro ? 58 : 34;
      const maxSpeed = usingNitro ? 86 : 62; // Units/s (~220-310 KM/H)

      if (throttle > 0) {
        forwardSpeed += accel * dt;
      } else if (throttle < 0) {
        if (forwardSpeed > 2) {
          forwardSpeed -= 52 * dt; // Strong braking
        } else {
          forwardSpeed -= 20 * dt; // Reverse
        }
      } else {
        // Natural rolling resistance
        forwardSpeed *= Math.exp(-1.1 * dt);
      }

      if (handbrake) {
        forwardSpeed *= Math.exp(-1.8 * dt);
      }

      forwardSpeed = THREE.MathUtils.clamp(forwardSpeed, -22, maxSpeed);

      // Steering dynamics
      const speedFactor = Math.min(1, Math.abs(forwardSpeed) / 7);
      const steerDir = forwardSpeed >= -0.5 ? 1 : -1;
      const turnRate = handbrake ? 2.85 : 2.15;
      // Reduce twitchiness at very high speed
      const highSpeedDamp = 1 - Math.min(0.45, Math.abs(forwardSpeed) / 140);

      car.heading += steerInput * turnRate * speedFactor * highSpeedDamp * steerDir * dt;

      // Lateral grip (low grip when handbraking enables smooth drifts)
      const grip = handbrake ? 1.6 : 7.8;
      lateralSpeed *= Math.exp(-grip * dt);
    } else {
      // Gentle air drag
      forwardSpeed *= Math.exp(-0.15 * dt);
      lateralSpeed *= Math.exp(-0.15 * dt);
    }

    // Reconstruct world velocity using updated heading
    const nfx = -Math.sin(car.heading);
    const nfz = -Math.cos(car.heading);
    const nrx = Math.cos(car.heading);
    const nrz = -Math.sin(car.heading);

    car.vx = nfx * forwardSpeed + nrx * lateralSpeed;
    car.vz = nfz * forwardSpeed + nrz * lateralSpeed;

    // Integrate horizontal position
    const prevX = car.x;
    const prevZ = car.z;
    const prevY = car.y;

    car.x += car.vx * dt;
    car.z += car.vz * dt;

    // Sample terrain & ramps
    const surf = sampleSurface(car.x, car.z, car.y);
    if (surf.hitWall) {
      car.x = prevX;
      car.z = prevZ;
      car.vx *= -0.35;
      car.vz *= -0.35;
    }

    // Vertical physics & jumping
    const gravity = 28;
    car.vy -= gravity * dt;
    car.y += car.vy * dt;

    if (car.y <= surf.height + 0.05) {
      if (!car.grounded && car.airTime > 0.55) {
        showBanner(`AIR TIME ${car.airTime.toFixed(1)}S!`);
      }
      car.y = surf.height;
      // Inherit upward launch velocity when driving up a ramp
      car.vy = Math.max(0, (car.y - prevY) / Math.max(dt, 0.008));
      car.grounded = true;
      car.airTime = 0;
    } else {
      car.grounded = false;
      car.airTime += dt;
    }

    resolveBuildingCollisions();

    // Drift detection & smoke
    car.drifting = car.grounded && Math.abs(lateralSpeed) > 5.5 && Math.abs(forwardSpeed) > 10;
    if (car.drifting) {
      if (Math.random() < 0.75) {
        const rearX = car.x - nfx * 1.4;
        const rearZ = car.z - nfz * 1.4;
        spawnSmoke(rearX + nrx * 0.9, car.y + 0.25, rearZ + nrz * 0.9);
        spawnSmoke(rearX - nrx * 0.9, car.y + 0.25, rearZ - nrz * 0.9);
      }
    }

    // Visual wheel spin, steering & suspension tilt
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

    // Brake light glow
    const braking = (throttle < 0 && forwardSpeed > 1) || handbrake;
    brakeLightMat.emissiveIntensity = braking ? 2.4 : 0.45;

    // Update smoke particles
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

    // Move shadow camera with the player for crisp shadows everywhere
    const preset = TIME_PRESETS[timeIndex];
    sunLight.position.set(
      car.x + preset.sunPos[0] * 0.5,
      preset.sunPos[1] * 0.6,
      car.z + preset.sunPos[2] * 0.5
    );
    sunLight.target.position.set(car.x, 0, car.z);

    // Update audio pitch
    if (audioEnabled && audioCtx) {
      const absSpeed = Math.abs(forwardSpeed);
      const baseFreq = 48 + absSpeed * 2.1 + (usingNitro ? 28 : 0);
      engineOsc1.frequency.setTargetAtTime(baseFreq, audioCtx.currentTime, 0.04);
      engineOsc2.frequency.setTargetAtTime(baseFreq * 1.98, audioCtx.currentTime, 0.04);
      engineGain.gain.setTargetAtTime(0.06 + Math.min(0.08, absSpeed * 0.0015), audioCtx.currentTime, 0.06);

      const screechTarget = car.drifting ? Math.min(0.12, Math.abs(lateralSpeed) * 0.008) : 0;
      screechGain.gain.setTargetAtTime(screechTarget, audioCtx.currentTime, 0.05);
    }

    return { forwardSpeed, usingNitro };
  }

  // =========================================================================
  // 9. CAMERA SYSTEM & DAY/NIGHT PRESETS
  // =========================================================================
  let cameraModeIdx = 0;
  let timeIndex = 0;
  const camPosCurrent = new THREE.Vector3(0, 6, 32);
  const camLookCurrent = new THREE.Vector3(0, 1.5, 20);

  function cycleCamera() {
    cameraModeIdx = (cameraModeIdx + 1) % CAMERA_MODES.length;
    document.getElementById("cam-label").textContent = CAMERA_MODES[cameraModeIdx];
  }

  function applyTimePreset(idx) {
    const p = TIME_PRESETS[idx];
    scene.background = new THREE.Color(p.sky);
    scene.fog = new THREE.FogExp2(p.fog, p.fogDensity);

    sunLight.color.setHex(p.sunColor);
    sunLight.intensity = p.sunIntensity;

    hemiLight.color.setHex(p.hemiSky);
    hemiLight.groundColor.setHex(p.hemiGround);
    hemiLight.intensity = p.hemiIntensity;

    buildingMaterials.forEach((m) => (m.emissiveIntensity = p.windowGlow));
    bulbMat.emissiveIntensity = p.headlights ? 2.0 : 0.1;
    headSpot.intensity = p.headlights ? 2.8 : 0;
    headlightMat.emissiveIntensity = p.headlights ? 2.5 : 0.35;

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

    // Dynamic FOV sensation of speed
    const targetFov = mode === "HOOD" ? 75 : 64 + Math.min(20, Math.abs(speed) * 0.22) + (usingNitro ? 6 : 0);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 6 * dt);
    camera.updateProjectionMatrix();

    if (mode === "CHASE") {
      const dist = 10.5 + Math.min(3.5, Math.abs(speed) * 0.04);
      const desiredPos = new THREE.Vector3(
        car.x - fx * dist,
        car.y + 4.4,
        car.z - fz * dist
      );
      const desiredLook = new THREE.Vector3(
        car.x + fx * 6,
        car.y + 1.4,
        car.z + fz * 6
      );

      camPosCurrent.lerp(desiredPos, 1 - Math.exp(-7.5 * dt));
      camLookCurrent.lerp(desiredLook, 1 - Math.exp(-10 * dt));
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    } else if (mode === "HOOD") {
      camera.position.set(car.x + fx * 0.5, car.y + 1.55, car.z + fz * 0.5);
      camera.lookAt(car.x + fx * 28, car.y + 1.2 + car.pitch * 12, car.z + fz * 28);
    } else {
      // High tactical/orbit view
      const desiredPos = new THREE.Vector3(car.x - fx * 18, car.y + 24, car.z - fz * 18);
      camPosCurrent.lerp(desiredPos, 1 - Math.exp(-5 * dt));
      camera.position.copy(camPosCurrent);
      camera.lookAt(car.x, car.y + 1, car.z);
    }
  }

  // =========================================================================
  // 10. HUD TELEMETRY & REAL-TIME MINIMAP
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
    const scale = 0.28; // World units -> pixels

    mapCtx.clearRect(0, 0, w, h);
    mapCtx.fillStyle = "#0f172a";
    mapCtx.fillRect(0, 0, w, h);

    mapCtx.save();
    mapCtx.translate(w / 2, h / 2);

    // Draw roads relative to player
    mapCtx.strokeStyle = "#334155";
    mapCtx.lineWidth = ROAD_WIDTH * scale;

    roadLines.forEach((line) => {
      // Vertical roads
      const rx = (line - car.x) * scale;
      mapCtx.beginPath();
      mapCtx.moveTo(rx, (-448 - car.z) * scale);
      mapCtx.lineTo(rx, (448 - car.z) * scale);
      mapCtx.stroke();

      // Horizontal roads
      const rz = (line - car.z) * scale;
      mapCtx.beginPath();
      mapCtx.moveTo((-448 - car.x) * scale, rz);
      mapCtx.lineTo((448 - car.x) * scale, rz);
      mapCtx.stroke();
    });

    // Draw buildings
    mapCtx.fillStyle = "#475569";
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const bx = (b.minX - car.x) * scale;
      const bz = (b.minZ - car.z) * scale;
      if (bx > w || bx < -w || bz > h || bz < -h) continue;
      mapCtx.fillRect(bx, bz, b.w * scale, b.d * scale);
    }

    // Draw stunt ramps in orange
    mapCtx.fillStyle = "#f97316";
    ramps.forEach((r) => {
      const rx = (r.x - car.x) * scale;
      const rz = (r.z - car.z) * scale;
      mapCtx.fillRect(rx - 4, rz - 4, 8, 8);
    });

    // Draw player directional arrow at center
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
    const kmh = Math.round(Math.abs(forwardSpeed) * 3.6);
    speedEl.textContent = kmh;

    // Automatic 6-speed gearbox readout
    let gear = "N";
    let gearRatio = 0;
    if (forwardSpeed < -0.5) {
      gear = "R";
      gearRatio = Math.min(1, kmh / 70);
    } else if (kmh > 1) {
      const thresholds = [45, 85, 130, 180, 235, 320];
      let g = 1;
      for (let i = 0; i < thresholds.length; i++) {
        if (kmh > thresholds[i]) g = Math.min(6, i + 2);
      }
      gear = String(g);
      const low = g === 1 ? 0 : thresholds[g - 2];
      const high = thresholds[g - 1];
      gearRatio = THREE.MathUtils.clamp((kmh - low) / (high - low), 0.15, 1);
    }

    gearEl.textContent = gear;
    const rpm = Math.round(850 + gearRatio * 7150);
    rpmText.textContent = rpm;
    rpmFill.style.width = `${Math.min(100, (rpm / 8000) * 100)}%`;

    nitroFill.style.width = `${car.nitro}%`;
    nitroText.textContent = `${Math.round(car.nitro)}%`;

    coordsEl.textContent = `X: ${Math.round(car.x)} | Z: ${Math.round(car.z)}`;

    // Dynamic district label
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
  // 11. BUTTON BINDINGS, RESIZE & MAIN LOOP
  // =========================================================================
  document.getElementById("btn-camera").addEventListener("click", cycleCamera);
  document.getElementById("btn-time").addEventListener("click", cycleTimeOfDay);
  document.getElementById("btn-sound").addEventListener("click", toggleAudio);
  document.getElementById("btn-reset").addEventListener("click", resetCar);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Initialize default lighting & loop
  applyTimePreset(0);
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    const { forwardSpeed, usingNitro } = updatePhysics(dt);
    updateCamera(dt, forwardSpeed, usingNitro);
    updateHUD(forwardSpeed);

    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) eventBanner.classList.remove("visible");
    }

    renderer.render(scene, camera);
  }

  animate();
})();