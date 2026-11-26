(() => {
  "use strict";

  const {
    CONFIG,
    WARP_POINTS,
    TIME_PRESETS,
    WEATHER_PRESETS,
    samplePuddleAt,
    createSoftBeamMaterial,
    buildWorld,
  } = window.HorizonWorld;

  const { WORLD_BOUNDS, ISLANDS } = CONFIG;
  const CAMERA_MODES = ["CHASE", "HOOD", "ORBIT"];

  // =========================================================================
  // 1. RENDERER, CAMERAS, LIGHTS & RT REFLECTION TARGETS
  // =========================================================================
  const container = document.getElementById("canvas-container");
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 3200);
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

  const drawingBufferSize = new THREE.Vector2();
  renderer.getDrawingBufferSize(drawingBufferSize);

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

  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(0.5, 750, cubeRenderTarget);
  scene.add(cubeCamera);

  const hemiLight = new THREE.HemisphereLight(0xfdba74, 0x1e293b, 0.65);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffa45b, 1.45);
  sunLight.position.set(-360, 105, -280);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 850;
  const shadowExtent = 175;
  sunLight.shadow.camera.left = -shadowExtent;
  sunLight.shadow.camera.right = shadowExtent;
  sunLight.shadow.camera.top = shadowExtent;
  sunLight.shadow.camera.bottom = -shadowExtent;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(48, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd199, fog: false })
  );
  scene.add(sunDisc);

  const world = buildWorld(scene, reflTarget, drawingBufferSize);

  // =========================================================================
  // 2. 5 DRIVABLE GARAGE VEHICLES (SPECS, PHYSICS TUNING & 3D MODEL BUILDER)
  // =========================================================================
  const VEHICLE_SPECS = {
    gt: {
      id: "gt",
      name: "Apex GT Coupe",
      defaultColor: "#e11d48",
      stats: { speed: 82, accel: 80, grip: 86, drift: 72 },
      // Physics tuning
      topSpeed: 74,        // ~266 km/h (330+ w/ nitro)
      nitroTopSpeed: 96,
      drivePower: 1.0,
      gripMult: 1.02,
      rearGripBias: 1.0,
      offroadGrip: 0.68,
      wetGripPenalty: 1.0,
      aeroDownforce: 0.000055,
      suspStiffness: 56,
      suspDamping: 10.0,
      suspTravel: 0.22,
      rollMult: 1.0,
      enginePitch: 1.0,
      engineHarmonic: 0.24,
      // Dimensions
      wheelRadius: 0.42,
      wheelWidth: 0.36,
      wheelX: 1.08,
      wheelZ: 1.38,
      bodyLen: 4.55,
      bodyW: 2.14,
      hoodEyeY: 1.54,
      isPolice: false,
    },
    muscle: {
      id: "muscle",
      name: "Viper Drift Muscle",
      defaultColor: "#f97316",
      stats: { speed: 79, accel: 88, grip: 70, drift: 96 },
      topSpeed: 72,
      nitroTopSpeed: 93,
      drivePower: 1.14,
      gripMult: 0.92,
      rearGripBias: 0.78, // Tail-happy rear bias for effortless drifts
      offroadGrip: 0.65,
      wetGripPenalty: 1.12,
      aeroDownforce: 0.000038,
      suspStiffness: 46,
      suspDamping: 8.6,
      suspTravel: 0.25,
      rollMult: 1.25,
      enginePitch: 0.76,  // Deep classic V8 rumble
      engineHarmonic: 0.36,
      wheelRadius: 0.44,
      wheelWidth: 0.4,
      wheelX: 1.12,
      wheelZ: 1.44,
      bodyLen: 4.78,
      bodyW: 2.2,
      hoodEyeY: 1.58,
      isPolice: false,
    },
    supercar: {
      id: "supercar",
      name: "Hyperion Supercar",
      defaultColor: "#2563eb",
      stats: { speed: 99, accel: 97, grip: 96, drift: 68 },
      topSpeed: 90,        // ~324 km/h (390+ w/ nitro!)
      nitroTopSpeed: 112,
      drivePower: 1.28,
      gripMult: 1.16,
      rearGripBias: 1.04,
      offroadGrip: 0.54,
      wetGripPenalty: 1.05,
      aeroDownforce: 0.000088, // Massive highway cornering glue
      suspStiffness: 72,
      suspDamping: 12.0,
      suspTravel: 0.16,
      rollMult: 0.65,
      enginePitch: 1.38,  // High-revving V10 howl
      engineHarmonic: 0.2,
      wheelRadius: 0.4,
      wheelWidth: 0.4,
      wheelX: 1.16,
      wheelZ: 1.42,
      bodyLen: 4.68,
      bodyW: 2.3,
      hoodEyeY: 1.36,
      isPolice: false,
    },
    suv: {
      id: "suv",
      name: "Trailblazer SUV",
      defaultColor: "#10b981",
      stats: { speed: 68, accel: 74, grip: 82, drift: 94 },
      topSpeed: 64,
      nitroTopSpeed: 82,
      drivePower: 0.96,
      gripMult: 0.98,
      rearGripBias: 1.05,
      offroadGrip: 0.98,  // Nearly full asphalt grip on grass!
      wetGripPenalty: 0.62,
      aeroDownforce: 0.000028,
      suspStiffness: 36,
      suspDamping: 7.4,
      suspTravel: 0.34,   // Plush off-road suspension travel
      rollMult: 1.45,
      enginePitch: 0.84,
      engineHarmonic: 0.28,
      wheelRadius: 0.54,
      wheelWidth: 0.42,
      wheelX: 1.15,
      wheelZ: 1.48,
      bodyLen: 4.82,
      bodyW: 2.24,
      hoodEyeY: 2.02,
      isPolice: false,
    },
    police: {
      id: "police",
      name: "Interceptor Police",
      defaultColor: "#1e293b",
      stats: { speed: 88, accel: 86, grip: 88, drift: 78 },
      topSpeed: 80,
      nitroTopSpeed: 102,
      drivePower: 1.12,
      gripMult: 1.08,
      rearGripBias: 0.96,
      offroadGrip: 0.76,
      wetGripPenalty: 0.88,
      aeroDownforce: 0.000058,
      suspStiffness: 58,
      suspDamping: 10.4,
      suspTravel: 0.22,
      rollMult: 0.92,
      enginePitch: 0.94,
      engineHarmonic: 0.28,
      wheelRadius: 0.43,
      wheelWidth: 0.36,
      wheelX: 1.08,
      wheelZ: 1.44,
      bodyLen: 4.76,
      bodyW: 2.12,
      hoodEyeY: 1.62,
      isPolice: true,
    },
  };

  let activeCarId = "gt";
  let activeSpec = VEHICLE_SPECS.gt;
  let activePaintHex = "#e11d48";
  let sirenActive = false;

  const carGroup = new THREE.Group();
  const carBodyGroup = new THREE.Group();
  carGroup.add(carBodyGroup);
  scene.add(carGroup);

  // Shared PBR Materials for Player Vehicle (soft clearcoat prevents harsh specular pinhole dots)
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: activePaintHex,
    metalness: 0.82,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.7,
  });

  const secondaryWhiteMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    metalness: 0.35,
    roughness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.4,
  });

  const cabinMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1020,
    metalness: 0.92,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.9,
  });

  const trimMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.55, roughness: 0.42 });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.14,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.5,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f1218, roughness: 0.9 });
  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfffbeb, emissiveIntensity: 2.5 });
  const brakeLightMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xff1e1e, emissiveIntensity: 0.6 });
  const softBeamMat = createSoftBeamMaterial(0xfff5d6, 0.15);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });

  // Dynamic arrays rebuilt whenever the player swaps vehicles in the garage
  let wheelMeshes = [];
  let wheelPivots = [];
  let frontWheelPivots = [];
  let volumetricBeams = [];
  let flames = [];
  let headSpot = null;
  let rearGlowLight = null;
  let policeLightbar = null; // { redMat, blueMat, redLight, blueLight }

  function clearGroup(grp) {
    while (grp.children.length > 0) {
      grp.remove(grp.children[0]);
    }
  }

  function rebuildPlayerCarModel(carId) {
    activeCarId = carId;
    activeSpec = VEHICLE_SPECS[carId];

    // Clear previous body & wheel pivots (keep carBodyGroup inside carGroup)
    clearGroup(carBodyGroup);
    wheelPivots.forEach((p) => carGroup.remove(p));
    wheelPivots = [];
    wheelMeshes = [];
    frontWheelPivots = [];
    volumetricBeams = [];
    flames = [];
    policeLightbar = null;

    const sp = activeSpec;
    const halfL = sp.bodyLen * 0.5;
    const baseY = sp.wheelRadius;

    if (carId === "supercar") {
      // HYPERION SUPERCAR — ultra-low wide wedge, side intakes & twin-strut aero wing
      const lower = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW, 0.44, sp.bodyLen), bodyMat);
      lower.position.y = baseY + 0.16;
      lower.castShadow = true;
      carBodyGroup.add(lower);

      const nose = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW * 0.94, 0.24, 1.35), bodyMat);
      nose.position.set(0, baseY + 0.28, -halfL + 0.72);
      nose.rotation.x = 0.12;
      carBodyGroup.add(nose);

      const splitter = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW + 0.08, 0.08, 0.55), trimMat);
      splitter.position.set(0, baseY - 0.06, -halfL + 0.15);
      carBodyGroup.add(splitter);

      const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.44, 2.0), cabinMat);
      cockpit.position.set(0, baseY + 0.56, 0.12);
      cockpit.castShadow = true;
      carBodyGroup.add(cockpit);

      const engineCover = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.22, 1.45), trimMat);
      engineCover.position.set(0, baseY + 0.48, 1.45);
      carBodyGroup.add(engineCover);

      const wing = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW, 0.08, 0.48), trimMat);
      wing.position.set(0, baseY + 0.78, halfL - 0.26);
      wing.castShadow = true;
      carBodyGroup.add(wing);

      [-0.65, 0.65].forEach((sx) => {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.28), trimMat);
        strut.position.set(sx, baseY + 0.56, halfL - 0.26);
        carBodyGroup.add(strut);
      });
    } else if (carId === "muscle") {
      // VIPER DRIFT MUSCLE — wide aggressive hood, supercharger blower & ducktail spoiler
      const body = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW, 0.64, sp.bodyLen), bodyMat);
      body.position.y = baseY + 0.24;
      body.castShadow = true;
      carBodyGroup.add(body);

      // Chrome supercharger blower sticking out of the hood
      const blower = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.85), chromeMat);
      blower.position.set(0, baseY + 0.66, -1.08);
      carBodyGroup.add(blower);
      const intake = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.35), trimMat);
      intake.position.set(0, baseY + 0.86, -1.22);
      carBodyGroup.add(intake);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.54, 1.98), cabinMat);
      cabin.position.set(0, baseY + 0.78, 0.36);
      cabin.castShadow = true;
      carBodyGroup.add(cabin);

      const ducktail = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW - 0.06, 0.22, 0.32), trimMat);
      ducktail.position.set(0, baseY + 0.64, halfL - 0.18);
      ducktail.rotation.x = -0.35;
      carBodyGroup.add(ducktail);

      const chin = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW + 0.04, 0.14, 0.38), trimMat);
      chin.position.set(0, baseY - 0.04, -halfL + 0.08);
      carBodyGroup.add(chin);
    } else if (carId === "suv") {
      // TRAILBLAZER OFF-ROAD SUV — lifted chassis, tall greenhouse, bullbar, roof rack & spare wheel
      const lower = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW, 0.78, sp.bodyLen), bodyMat);
      lower.position.y = baseY + 0.36;
      lower.castShadow = true;
      carBodyGroup.add(lower);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.76, 3.05), cabinMat);
      cabin.position.set(0, baseY + 1.08, 0.35);
      cabin.castShadow = true;
      carBodyGroup.add(cabin);

      const roofCap = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.14, 3.08), bodyMat);
      roofCap.position.set(0, baseY + 1.48, 0.35);
      carBodyGroup.add(roofCap);

      // Roof rack rails + off-road LED bar
      [-0.86, 0.86].forEach((rx) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 2.7), trimMat);
        rail.position.set(rx, baseY + 1.62, 0.35);
        carBodyGroup.add(rail);
      });
      const ledBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.14), headlightMat);
      ledBar.position.set(0, baseY + 1.62, -1.05);
      carBodyGroup.add(ledBar);

      // Front steel bullbar & rear-mounted spare tire
      const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.24), trimMat);
      bullbar.position.set(0, baseY + 0.32, -halfL - 0.14);
      carBodyGroup.add(bullbar);

      const spareGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.28, 14);
      spareGeo.rotateX(Math.PI / 2);
      const spare = new THREE.Mesh(spareGeo, tireMat);
      spare.position.set(0, baseY + 0.65, halfL + 0.15);
      carBodyGroup.add(spare);
    } else if (carId === "police") {
      // INTERCEPTOR POLICE CRUISER — two-tone pursuit sedan, push bumper & flashing red/blue lightbar
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW, 0.62, sp.bodyLen), bodyMat);
      chassis.position.y = baseY + 0.24;
      chassis.castShadow = true;
      carBodyGroup.add(chassis);

      // Classic white pursuit doors & roof panel
      const whiteDoors = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW + 0.04, 0.56, 2.15), secondaryWhiteMat);
      whiteDoors.position.set(0, baseY + 0.24, 0.1);
      carBodyGroup.add(whiteDoors);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.56, 2.2), cabinMat);
      cabin.position.set(0, baseY + 0.78, 0.12);
      cabin.castShadow = true;
      carBodyGroup.add(cabin);

      const roofWhite = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.1, 2.05), secondaryWhiteMat);
      roofWhite.position.set(0, baseY + 1.07, 0.12);
      carBodyGroup.add(roofWhite);

      const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.46, 0.22), trimMat);
      pushBar.position.set(0, baseY + 0.26, -halfL - 0.12);
      carBodyGroup.add(pushBar);

      // Flashing Red / Blue Roof Lightbar
      const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.1, 0.34), trimMat);
      barBase.position.set(0, baseY + 1.15, 0.05);
      carBodyGroup.add(barBase);

      const redMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff1111, emissiveIntensity: 0.4 });
      const blueMat = new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x1155ff, emissiveIntensity: 0.4 });

      const redPod = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.32), redMat);
      redPod.position.set(-0.38, baseY + 1.24, 0.05);
      carBodyGroup.add(redPod);

      const bluePod = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.32), blueMat);
      bluePod.position.set(0.38, baseY + 1.24, 0.05);
      carBodyGroup.add(bluePod);

      const redLight = new THREE.PointLight(0xff1e1e, 0, 22, 2);
      redLight.position.set(-0.6, baseY + 1.7, 0.05);
      carBodyGroup.add(redLight);

      const blueLight = new THREE.PointLight(0x2563eb, 0, 22, 2);
      blueLight.position.set(0.6, baseY + 1.7, 0.05);
      carBodyGroup.add(blueLight);

      policeLightbar = { redMat, blueMat, redLight, blueLight };
    } else {
      // APEX GT COUPE — balanced modern grand tourer
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW, 0.58, sp.bodyLen), bodyMat);
      chassis.position.y = baseY + 0.2;
      chassis.castShadow = true;
      carBodyGroup.add(chassis);

      const splitter = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW + 0.06, 0.1, 0.46), trimMat);
      splitter.position.set(0, baseY - 0.08, -halfL + 0.02);
      carBodyGroup.add(splitter);

      const diffuser = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW - 0.08, 0.18, 0.28), trimMat);
      diffuser.position.set(0, baseY - 0.04, halfL - 0.02);
      carBodyGroup.add(diffuser);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.54, 2.15), cabinMat);
      cabin.position.set(0, baseY + 0.71, 0.18);
      cabin.castShadow = true;
      carBodyGroup.add(cabin);

      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.09, 0.44), trimMat);
      wing.position.set(0, baseY + 0.82, halfL - 0.22);
      wing.castShadow = true;
      carBodyGroup.add(wing);

      [-0.72, 0.72].forEach((sx) => {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.24), trimMat);
        strut.position.set(sx, baseY + 0.62, halfL - 0.22);
        carBodyGroup.add(strut);
      });
    }

    // Headlights, Taillights & FIXED Soft Downward-Angled Volumetric Beams (NO floating bubble circles!)
    const lightY = carId === "suv" ? baseY + 0.48 : baseY + 0.26;
    const beamGeo = new THREE.ConeGeometry(1.45, 11.5, 22, 1, true);
    beamGeo.rotateX(Math.PI / 2);

    [-sp.bodyW * 0.34, sp.bodyW * 0.34].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.15, 0.08), headlightMat);
      hl.position.set(lx, lightY, -halfL - 0.02);
      carBodyGroup.add(hl);

      const cone = new THREE.Mesh(beamGeo, softBeamMat);
      cone.position.set(lx, lightY - 0.24, -halfL - 5.75);
      cone.rotation.x = -0.055; // Angled smoothly toward the road surface
      carBodyGroup.add(cone);
      volumetricBeams.push(cone);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.08), brakeLightMat);
      tl.position.set(lx, lightY + 0.02, halfL + 0.02);
      carBodyGroup.add(tl);
    });

    // Real Forward Headlight Spotlight
    headSpot = new THREE.SpotLight(0xfff8e7, 3.0, 125, Math.PI / 4.5, 0.52, 1.15);
    headSpot.position.set(0, lightY + 0.28, -halfL + 0.1);
    const headTarget = new THREE.Object3D();
    headTarget.position.set(0, 0.0, -34);
    carBodyGroup.add(headSpot);
    carBodyGroup.add(headTarget);
    headSpot.target = headTarget;

    // FIXED Rear Brake / Nitro Road Glow Light: mounted low behind diffuser so NO bright dot burns on the trunk/roof!
    rearGlowLight = new THREE.PointLight(0xff2222, 0.7, 10, 2);
    rearGlowLight.position.set(0, 0.24, halfL + 1.05);
    carBodyGroup.add(rearGlowLight);

    // Dual Nitro Exhaust Flames
    [-0.52, 0.52].forEach((fx) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.3, 8), flameMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(fx, baseY - 0.02, halfL + 0.62);
      cone.visible = false;
      carBodyGroup.add(cone);
      flames.push(cone);
    });

    // Build 4 Custom-Sized Wheels matching this Vehicle's Wheelbase & Radius
    const wGeo = new THREE.CylinderGeometry(sp.wheelRadius, sp.wheelRadius, sp.wheelWidth, 18);
    wGeo.rotateZ(Math.PI / 2);

    [
      { x: -sp.wheelX, y: sp.wheelRadius, z: -sp.wheelZ, front: true },
      { x: sp.wheelX, y: sp.wheelRadius, z: -sp.wheelZ, front: true },
      { x: -sp.wheelX, y: sp.wheelRadius, z: sp.wheelZ, front: false },
      { x: sp.wheelX, y: sp.wheelRadius, z: sp.wheelZ, front: false },
    ].forEach((wp) => {
      const pivot = new THREE.Group();
      pivot.position.set(wp.x, wp.y, wp.z);

      const tire = new THREE.Mesh(wGeo, tireMat);
      tire.castShadow = true;
      const hub = new THREE.Mesh(
        new THREE.BoxGeometry(sp.wheelWidth + 0.02, sp.wheelRadius * 1.18, sp.wheelRadius * 0.34),
        chromeMat
      );
      tire.add(hub);

      pivot.add(tire);
      carGroup.add(pivot);

      wheelPivots.push(pivot);
      wheelMeshes.push(tire);
      if (wp.front) frontWheelPivots.push(pivot);
    });

    // Update HUD Car Name & Police Siren Button visibility
    const carLabel = document.getElementById("active-car-label");
    if (carLabel) carLabel.textContent = sp.name.toUpperCase();

    const sirenBtn = document.getElementById("btn-siren");
    if (sirenBtn) {
      sirenBtn.classList.toggle("hidden", !sp.isPolice);
      if (!sp.isPolice && sirenActive) {
        sirenActive = false;
        sirenBtn.classList.remove("siren-on");
        const sLbl = document.getElementById("siren-label");
        if (sLbl) sLbl.textContent = "OFF";
      }
    }
  }

  // Persistent Tire Skidmarks Ring Buffer
  const MAX_SKIDS = 260;
  const skidGroup = new THREE.Group();
  scene.add(skidGroup);
  const skidGeo = new THREE.PlaneGeometry(0.36, 1.1);
  skidGeo.rotateX(-Math.PI / 2);
  const skidPool = [];
  for (let i = 0; i < MAX_SKIDS; i++) {
    const m = new THREE.Mesh(
      skidGeo,
      new THREE.MeshBasicMaterial({ color: 0x0b0d12, transparent: true, opacity: 0.5, depthWrite: false })
    );
    m.visible = false;
    skidGroup.add(m);
    skidPool.push(m);
  }
  let skidIdx = 0;
  let skidAccum = 0;

  function dropSkidmark(x, y, z, heading, pitch, isWet) {
    const m = skidPool[skidIdx];
    skidIdx = (skidIdx + 1) % MAX_SKIDS;
    m.position.set(x, y + 0.08, z);
    m.rotation.set(pitch, heading, 0, "YXZ");
    m.material.color.setHex(isWet ? 0x1e293b : 0x090b10);
    m.material.opacity = isWet ? 0.22 : 0.52;
    m.visible = true;
  }

  // Smoke, Wet Spray & Water Splash Particle Pool
  const particlePool = [];
  const particleGeo = new THREE.SphereGeometry(0.36, 6, 6);
  for (let i = 0; i < 85; i++) {
    const m = new THREE.Mesh(
      particleGeo,
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.45 })
    );
    m.visible = false;
    scene.add(m);
    particlePool.push({ mesh: m, life: 0, maxLife: 0.6, vx: 0, vy: 0, vz: 0, gravity: 0 });
  }
  let particleIdx = 0;

  function spawnParticle(x, y, z, mode) {
    const p = particlePool[particleIdx];
    particleIdx = (particleIdx + 1) % particlePool.length;
    p.mesh.position.set(x, y, z);
    p.mesh.visible = true;

    if (mode === "splash") {
      p.mesh.material.color.setHex(0xdbeafe);
      p.mesh.material.opacity = 0.72;
      p.mesh.scale.setScalar(0.52);
      p.maxLife = 0.55;
      p.life = p.maxLife;
      p.vx = (Math.random() - 0.5) * 6.5;
      p.vy = 3.2 + Math.random() * 4.2;
      p.vz = (Math.random() - 0.5) * 6.5;
      p.gravity = 16.0;
    } else if (mode === "spray") {
      p.mesh.material.color.setHex(0xcbd5e1);
      p.mesh.material.opacity = 0.32;
      p.mesh.scale.setScalar(0.44);
      p.maxLife = 0.4;
      p.life = p.maxLife;
      p.vx = (Math.random() - 0.5) * 2.2;
      p.vy = 1.5 + Math.random() * 1.4;
      p.vz = (Math.random() - 0.5) * 2.2;
      p.gravity = 5.2;
    } else {
      p.mesh.material.color.setHex(0xe2e8f0);
      p.mesh.material.opacity = 0.44;
      p.mesh.scale.setScalar(0.6);
      p.maxLife = 0.68;
      p.life = p.maxLife;
      p.vx = (Math.random() - 0.5) * 1.4;
      p.vy = 1.25 + Math.random() * 1.1;
      p.vz = (Math.random() - 0.5) * 1.4;
      p.gravity = 0.0;
    }
  }

  // =========================================================================
  // 3. PROCEDURAL WEB AUDIO ENGINE (PER-CAR TONE, TUNNEL ECHO & POLICE SIREN)
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
    harmGain: null,
    engineFilter: null,
    engineGain: null,
    tunnelDelay: null,
    tunnelFeedback: null,
    tunnelWetGain: null,
    screechFilter: null,
    screechGain: null,
    windGain: null,
    rainGain: null,
    wetTireGain: null,
    nitroNoiseGain: null,
    turboOsc: null,
    turboGain: null,
    hornOsc1: null,
    hornOsc2: null,
    hornGain: null,
    sirenOsc: null,
    sirenGain: null,
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

      // Tunnel Slapback Echo
      this.tunnelDelay = ctx.createDelay(0.4);
      this.tunnelDelay.delayTime.value = 0.085;
      this.tunnelFeedback = ctx.createGain();
      this.tunnelFeedback.gain.value = 0.38;
      this.tunnelWetGain = ctx.createGain();
      this.tunnelWetGain.gain.value = 0.0;

      this.tunnelDelay.connect(this.tunnelFeedback);
      this.tunnelFeedback.connect(this.tunnelDelay);
      this.tunnelDelay.connect(this.tunnelWetGain);
      this.tunnelWetGain.connect(this.masterGain);

      this.oscSub = ctx.createOscillator();
      this.oscSub.type = "triangle";
      this.oscSub.frequency.value = 42;

      this.oscMain = ctx.createOscillator();
      this.oscMain.type = "sawtooth";
      this.oscMain.frequency.value = 84;

      this.oscHarm = ctx.createOscillator();
      this.oscHarm.type = "square";
      this.oscHarm.frequency.value = 126;

      this.harmGain = ctx.createGain();
      this.harmGain.gain.value = 0.25;

      this.oscSub.connect(shaper);
      this.oscMain.connect(shaper);
      this.oscHarm.connect(this.harmGain);
      this.harmGain.connect(shaper);

      shaper.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      this.engineGain.connect(this.tunnelDelay);

      this.oscSub.start();
      this.oscMain.start();
      this.oscHarm.start();

      const makeNoiseChannel = (type, freq, q) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const filt = ctx.createBiquadFilter();
        filt.type = type;
        filt.frequency.value = freq;
        if (q) filt.Q.value = q;
        const g = ctx.createGain();
        g.gain.value = 0;
        src.connect(filt);
        filt.connect(g);
        g.connect(this.masterGain);
        src.start();
        return { filt, gain: g };
      };

      const sc = makeNoiseChannel("bandpass", 1600, 6.5);
      this.screechFilter = sc.filt;
      this.screechGain = sc.gain;

      this.windGain = makeNoiseChannel("lowpass", 520).gain;
      this.rainGain = makeNoiseChannel("bandpass", 2400, 0.65).gain;
      this.wetTireGain = makeNoiseChannel("bandpass", 1850, 0.9).gain;
      this.nitroNoiseGain = makeNoiseChannel("bandpass", 900, 1.4).gain;

      this.turboOsc = ctx.createOscillator();
      this.turboOsc.type = "sine";
      this.turboOsc.frequency.value = 2400;
      this.turboGain = ctx.createGain();
      this.turboGain.gain.value = 0;
      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(this.masterGain);
      this.turboOsc.start();

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
      this.hornGain.connect(this.tunnelDelay);
      this.hornOsc1.start();
      this.hornOsc2.start();

      // Police Cruiser Wailing Siren Channel
      this.sirenOsc = ctx.createOscillator();
      this.sirenOsc.type = "sawtooth";
      this.sirenOsc.frequency.value = 720;
      const sirenFilter = ctx.createBiquadFilter();
      sirenFilter.type = "bandpass";
      sirenFilter.frequency.value = 1150;
      sirenFilter.Q.value = 1.6;
      this.sirenGain = ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(sirenFilter);
      sirenFilter.connect(this.sirenGain);
      this.sirenGain.connect(this.masterGain);
      this.sirenGain.connect(this.tunnelDelay);
      this.sirenOsc.start();
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
        [
          this.engineGain, this.tunnelWetGain, this.screechGain, this.windGain,
          this.rainGain, this.wetTireGain, this.nitroNoiseGain, this.turboGain,
          this.hornGain, this.sirenGain,
        ].forEach((g) => g.gain.setTargetAtTime(0, now, 0.04));
      }
    },

    update(rpm, absSpeed, slipAmt, throttle, drifting, usingNitro, hornPressed, rainAudio, wetUnderCar, inTunnel, elapsed) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;

      // Engine sound adapts dynamically to the selected garage vehicle!
      const normRpm = THREE.MathUtils.clamp((rpm - 800) / 7200, 0, 1);
      const baseFreq = (34 + normRpm * 92 + (usingNitro ? 14 : 0)) * activeSpec.enginePitch;

      this.oscSub.frequency.setTargetAtTime(baseFreq, now, 0.035);
      this.oscMain.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.035);
      this.oscHarm.frequency.setTargetAtTime(baseFreq * 3.01, now, 0.035);
      this.harmGain.gain.setTargetAtTime(activeSpec.engineHarmonic, now, 0.06);

      const cutoff = 220 + normRpm * 1350 * activeSpec.enginePitch + (throttle > 0 ? 350 : 0) + (usingNitro ? 500 : 0);
      this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);
      this.engineGain.gain.setTargetAtTime(0.09 + normRpm * 0.11 + (throttle > 0 ? 0.045 : 0), now, 0.05);

      this.tunnelWetGain.gain.setTargetAtTime(inTunnel ? 0.42 : 0.0, now, 0.15);

      const screechLevel = drifting ? Math.min(0.19, slipAmt * 0.14) * (1 - wetUnderCar * 0.55) : 0;
      this.screechFilter.frequency.setTargetAtTime(1400 + Math.min(600, absSpeed * 8), now, 0.05);
      this.screechGain.gain.setTargetAtTime(screechLevel, now, 0.04);

      const wetHiss = wetUnderCar > 0.18 && absSpeed > 4 ? Math.min(0.16, absSpeed * 0.0028 * wetUnderCar) : 0;
      this.wetTireGain.gain.setTargetAtTime(wetHiss, now, 0.06);

      this.windGain.gain.setTargetAtTime(absSpeed > 22 ? Math.min(0.15, (absSpeed - 22) * 0.0024) : 0, now, 0.08);
      this.rainGain.gain.setTargetAtTime(inTunnel ? rainAudio * 0.12 : rainAudio, now, 0.25);

      this.nitroNoiseGain.gain.setTargetAtTime(usingNitro ? 0.19 : 0, now, 0.06);
      this.turboOsc.frequency.setTargetAtTime(2200 + normRpm * 2400, now, 0.06);
      this.turboGain.gain.setTargetAtTime(usingNitro ? 0.045 : normRpm > 0.65 ? 0.012 : 0, now, 0.07);
      this.hornGain.gain.setTargetAtTime(hornPressed ? 0.13 : 0, now, 0.018);

      // Police Cruiser Wail Siren
      if (sirenActive && activeSpec.isPolice) {
        const wail = 660 + 480 * (0.5 + 0.5 * Math.sin(elapsed * 4.4));
        this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.03);
        this.sirenGain.gain.setTargetAtTime(0.11, now, 0.04);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, now, 0.04);
      }
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
  // 4. GLOBAL STATE, GARAGE CONTROLLER, AUTO MOISTURE & INPUT HANDLERS
  // =========================================================================
  let rtEnabled = true;
  let trafficEnabled = true;
  let weatherIndex = 0; // CLEAR
  let timeIndex = 0;    // SUNSET
  let cameraModeIdx = 0;
  let warpIndex = 0;
  let garageOpen = false;

  let roadMoisture = 0.0;
  let moistureTrend = "DRY";

  const flashOverlay = document.getElementById("flash-overlay");
  const tunnelOverlay = document.getElementById("tunnel-overlay");
  const eventBanner = document.getElementById("event-banner");
  const garageModal = document.getElementById("garage-modal");
  let bannerTimer = 0;

  function showBanner(text) {
    eventBanner.textContent = text;
    eventBanner.classList.add("visible");
    bannerTimer = 1.5;
  }

  function updateRoadMoisture(dt) {
    const w = WEATHER_PRESETS[weatherIndex];
    const t = TIME_PRESETS[timeIndex];

    if (w.wetRate > 0 && roadMoisture < w.targetMoisture) {
      roadMoisture = Math.min(w.targetMoisture, roadMoisture + w.wetRate * dt);
      moistureTrend = roadMoisture >= w.targetMoisture - 0.01 ? "WET" : "WETTING";
    } else if (roadMoisture > w.targetMoisture) {
      roadMoisture = Math.max(w.targetMoisture, roadMoisture - t.dryRate * dt);
      moistureTrend = roadMoisture <= 0.01 ? "DRY" : "DRYING";
    } else {
      moistureTrend = roadMoisture <= 0.02 ? "DRY" : roadMoisture >= 0.78 ? "WET" : "DAMP";
    }

    world.setRoadUniform("uRoadMoisture", roadMoisture);
  }

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

    world.skyUniforms.uTopColor.value.copy(skyTop);
    world.skyUniforms.uHorizonColor.value.copy(skyHorizon);
    world.skyUniforms.uBottomColor.value.copy(skyBottom);

    sunLight.color.setHex(t.sunColor);
    sunLight.intensity = t.sunIntensity * w.sunMult;
    sunDisc.material.color.setHex(t.sunColor);
    sunDisc.visible = w.name !== "STORM" && w.name !== "FOG";

    hemiLight.color.setHex(t.hemiSky);
    hemiLight.groundColor.setHex(t.hemiGround);
    hemiLight.intensity = t.hemiIntensity * (0.65 + 0.35 * w.skyDarken);

    world.buildingMaterials.forEach((m) => (m.emissiveIntensity = t.windowGlow));
    world.neonMaterials.forEach((m) => (m.emissiveIntensity = t.neonGlow));
    world.bulbMat.emissiveIntensity = headlightsOn ? 2.4 : 0.15;
    headlightMat.emissiveIntensity = headlightsOn ? 2.8 : 0.4;
    world.setTrafficLighting(headlightsOn, rtEnabled);

    const sunDir = new THREE.Vector3(...t.sunPos).normalize();
    const sunColor = new THREE.Color(t.sunColor).multiplyScalar(w.sunMult);
    const ambRoad = new THREE.Color(t.ambientRoad).multiplyScalar(0.75 + 0.25 * w.skyDarken);

    world.setRoadUniform("uSunDir", sunDir);
    world.setRoadUniform("uSunColor", sunColor);
    world.setRoadUniform("uAmbientColor", ambRoad);
    world.setRoadUniform("uFogColor", fogCol);
    world.setRoadUniform("uFogDensity", fogDensity);
    world.setRoadUniform("uHeadlightsOn", headlightsOn ? 1.0 : 0.0);
    world.setRoadUniform("uRainIntensity", w.rainIntensity);
    world.setRoadUniform("uRTEnabled", rtEnabled ? 1.0 : 0.0);

    world.setWaterUniform("uSunDir", sunDir);
    world.setWaterUniform("uSunColor", sunColor);
    world.setWaterUniform("uDeepColor", new THREE.Color(t.waterDeep).multiplyScalar(0.75 + 0.25 * w.skyDarken));
    world.setWaterUniform("uShallowColor", new THREE.Color(t.waterShallow).multiplyScalar(0.75 + 0.25 * w.skyDarken));
    world.setWaterUniform("uFogColor", fogCol);
    world.setWaterUniform("uFogDensity", fogDensity);
    world.setWaterUniform("uHeadlightsOn", headlightsOn ? 1.0 : 0.0);
    world.setWaterUniform("uWaveStrength", w.waveStrength);
    world.setWaterUniform("uRainIntensity", w.rainIntensity);
    world.setWaterUniform("uRTEnabled", rtEnabled ? 1.0 : 0.0);

    bodyMat.envMap = rtEnabled ? cubeRenderTarget.texture : null;
    bodyMat.envMapIntensity = rtEnabled ? 1.7 : 0.0;
    bodyMat.clearcoat = rtEnabled ? 1.0 : 0.0;
    bodyMat.roughness = rtEnabled ? 0.16 : 0.56;
    bodyMat.needsUpdate = true;

    secondaryWhiteMat.envMap = rtEnabled ? cubeRenderTarget.texture : null;
    secondaryWhiteMat.envMapIntensity = rtEnabled ? 1.4 : 0.0;
    secondaryWhiteMat.needsUpdate = true;

    cabinMat.envMap = rtEnabled ? cubeRenderTarget.texture : null;
    cabinMat.envMapIntensity = rtEnabled ? 1.9 : 0.0;
    cabinMat.roughness = rtEnabled ? 0.08 : 0.45;
    cabinMat.needsUpdate = true;

    chromeMat.envMap = rtEnabled ? cubeRenderTarget.texture : null;
    chromeMat.envMapIntensity = rtEnabled ? 1.5 : 0.0;
    chromeMat.needsUpdate = true;

    sunLight.castShadow = rtEnabled;
    world.roadShadowGroup.visible = rtEnabled;
    volumetricBeams.forEach((b) => (b.visible = rtEnabled && headlightsOn));
    if (headSpot) headSpot.intensity = rtEnabled && headlightsOn ? 3.2 : headlightsOn ? 1.2 : 0;

    document.getElementById("time-label").textContent = t.name;
    document.getElementById("weather-label").textContent = w.name;
    document.getElementById("btn-weather").classList.toggle("active", w.name !== "CLEAR");

    document.getElementById("rt-label").textContent = rtEnabled ? "ON" : "OFF";
    document.getElementById("btn-rt").classList.toggle("active", rtEnabled);

    document.getElementById("traffic-label").textContent = trafficEnabled ? "ON" : "OFF";
    document.getElementById("btn-traffic").classList.toggle("active", trafficEnabled);
  }

  // Garage Selection & Live Paint Preview
  function selectGarageCar(carId, autoApplyPaint = true) {
    const sp = VEHICLE_SPECS[carId];
    if (!sp) return;

    document.querySelectorAll(".car-option").forEach((el) => {
      el.classList.toggle("selected", el.dataset.car === carId);
    });

    document.getElementById("spec-car-name").textContent = sp.name;
    document.getElementById("spec-speed").style.width = `${sp.stats.speed}%`;
    document.getElementById("spec-accel").style.width = `${sp.stats.accel}%`;
    document.getElementById("spec-grip").style.width = `${sp.stats.grip}%`;
    document.getElementById("spec-drift").style.width = `${sp.stats.drift}%`;

    if (autoApplyPaint) {
      selectPaintColor(sp.defaultColor);
    }

    rebuildPlayerCarModel(carId);
    applyEnvironment();
  }

  function selectPaintColor(hex) {
    activePaintHex = hex;
    bodyMat.color.set(hex);

    document.querySelectorAll(".swatch").forEach((sw) => {
      const match = sw.dataset.color.toLowerCase() === hex.toLowerCase();
      sw.classList.toggle("selected", match);
      if (match) {
        document.getElementById("paint-name").textContent = sw.dataset.name;
      }
    });
  }

  function toggleGarage(forceState = null) {
    garageOpen = forceState !== null ? forceState : !garageOpen;
    garageModal.classList.toggle("hidden", !garageOpen);
    if (!garageOpen) {
      showBanner(`VEHICLE: ${activeSpec.name.toUpperCase()}`);
    }
  }

  function toggleSiren() {
    if (!activeSpec.isPolice) return;
    sirenActive = !sirenActive;
    const btn = document.getElementById("btn-siren");
    const lbl = document.getElementById("siren-label");
    if (btn) btn.classList.toggle("siren-on", sirenActive);
    if (lbl) lbl.textContent = sirenActive ? "ON" : "OFF";
    showBanner(sirenActive ? "PURSUIT SIREN: ON" : "PURSUIT SIREN: OFF");
  }

  function toggleRayTracing() {
    rtEnabled = !rtEnabled;
    applyEnvironment();
    showBanner(rtEnabled ? "RT REFLECTIONS: ON" : "RT REFLECTIONS: OFF");
  }

  function toggleTraffic() {
    trafficEnabled = !trafficEnabled;
    applyEnvironment();
    showBanner(trafficEnabled ? "TRAFFIC & BOATS: ON" : "TRAFFIC & BOATS: OFF");
  }

  function cycleWeather() {
    weatherIndex = (weatherIndex + 1) % WEATHER_PRESETS.length;
    applyEnvironment();
    const name = WEATHER_PRESETS[weatherIndex].name;
    if (name === "CLEAR" && roadMoisture > 0.15) {
      showBanner("WEATHER: CLEAR — ROADS DRYING");
    } else if (name === "RAIN" || name === "STORM") {
      showBanner(`WEATHER: ${name} — ROADS WETTING`);
    } else {
      showBanner(`WEATHER: ${name}`);
    }
  }

  function cycleTimeOfDay() {
    timeIndex = (timeIndex + 1) % TIME_PRESETS.length;
    applyEnvironment();
  }

  function cycleCamera() {
    cameraModeIdx = (cameraModeIdx + 1) % CAMERA_MODES.length;
    document.getElementById("cam-label").textContent = CAMERA_MODES[cameraModeIdx];
  }

  // Wire Garage Modal Click Events
  document.querySelectorAll(".car-option").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.currentTarget.blur();
      selectGarageCar(btn.dataset.car, true);
    });
  });

  document.querySelectorAll(".swatch").forEach((sw) => {
    sw.addEventListener("click", (e) => {
      e.currentTarget.blur();
      selectPaintColor(sw.dataset.color);
    });
  });

  document.getElementById("garage-backdrop").addEventListener("click", () => toggleGarage(false));
  document.getElementById("btn-garage-close").addEventListener("click", () => toggleGarage(false));
  document.getElementById("btn-garage-drive").addEventListener("click", () => toggleGarage(false));

  // Keyboard & Pointer Input Listeners
  const keys = {};
  window.addEventListener("keydown", (e) => {
    const code = e.code;
    keys[code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
      e.preventDefault();
    }
    if (code !== "KeyM") audio.unlockAuto();
    if (e.repeat) return;

    if (code === "KeyG") {
      toggleGarage();
      return;
    }
    if (code === "Escape" && garageOpen) {
      toggleGarage(false);
      return;
    }
    if (garageOpen) return;

    if (code === "KeyL") toggleSiren();
    if (code === "KeyT") toggleRayTracing();
    if (code === "KeyP") toggleTraffic();
    if (code === "KeyV") cycleWeather();
    if (code === "KeyC") cycleCamera();
    if (code === "KeyN") cycleTimeOfDay();
    if (code === "KeyX") cycleWarp();
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

  // Build Initial Default Vehicle (Apex GT Coupe)
  rebuildPlayerCarModel("gt");

  // === END OF PART 1/2 — PASTE PART 2/2 DIRECTLY BELOW THIS LINE ===
  // =========================================================================
  // 5. CONSOLE & MOBILE CONTROLS INTEGRATION + 240Hz VEHICLE PHYSICS
  // =========================================================================
  const controls = window.HorizonControls;

  // Optimize reflection target scale slightly on mobile GPUs for smooth 60 FPS
  if (controls && controls.isTouchDevice) {
    reflTarget.setSize(
      Math.max(256, Math.floor(window.innerWidth * 0.45)),
      Math.max(256, Math.floor(window.innerHeight * 0.45))
    );
  }

  function stepGarageCar(delta) {
    const ids = Object.keys(VEHICLE_SPECS);
    const cur = ids.indexOf(activeCarId);
    const next = (cur + delta + ids.length) % ids.length;
    selectGarageCar(ids[next], true);
  }

  function stepGaragePaint(delta) {
    const swatches = Array.from(document.querySelectorAll(".swatch"));
    if (!swatches.length) return;
    let cur = swatches.findIndex((s) => s.classList.contains("selected"));
    if (cur < 0) cur = 0;
    const next = (cur + delta + swatches.length) % swatches.length;
    selectPaintColor(swatches[next].dataset.color);
  }

  if (controls) {
    controls.init({
      unlockAudio: () => audio.unlockAuto(),
      onBanner: (msg) => showBanner(msg),
      isGarageOpen: () => garageOpen,
      toggleGarage: (force) => toggleGarage(force),
      stepGarageCar,
      stepGaragePaint,
      cycleCamera,
      cycleWeather,
      cycleTimeOfDay,
      cycleWarp,
      toggleRayTracing,
      toggleTraffic,
      toggleSiren,
      resetCar,
    });
  }

  const GRAVITY_PHYS = 9.81;
  const GEAR_RATIOS = [3.55, 2.38, 1.68, 1.25, 0.96, 0.76];
  const BASE_GEAR_THRESH = [52, 98, 148, 202, 260, 345];

  const HANDLING_PROFILES = {
    gt: {
      mass: 1480,
      Iz: 2350,
      cgHeight: 0.46,
      tireMu: 1.9,
      brakeMu: 1.62,
      rearMuMult: 1.08,
      offroadMu: 1.05,
      wetMuDrop: 0.3,
      maxDriveForce: 16200,
      nitroForce: 7200,
      maxBrakeForce: 25500,
      brakeBiasFront: 0.64,
      awdFrontSplit: 0.15,
      aeroDownforce: 1.25,
      aeroDrag: 0.4,
      pacejkaB: 13.5,
      pacejkaC: 1.15,
      tcsAllowSlip: 0.1,
    },
    muscle: {
      mass: 1680,
      Iz: 2750,
      cgHeight: 0.52,
      tireMu: 1.78,
      brakeMu: 1.5,
      rearMuMult: 1.0,
      offroadMu: 0.98,
      wetMuDrop: 0.34,
      maxDriveForce: 19400,
      nitroForce: 7800,
      maxBrakeForce: 26800,
      brakeBiasFront: 0.66,
      awdFrontSplit: 0.0,
      aeroDownforce: 0.72,
      aeroDrag: 0.45,
      pacejkaB: 12.0,
      pacejkaC: 1.18,
      tcsAllowSlip: 0.42,
    },
    supercar: {
      mass: 1360,
      Iz: 2100,
      cgHeight: 0.38,
      tireMu: 2.28,
      brakeMu: 1.92,
      rearMuMult: 1.09,
      offroadMu: 0.9,
      wetMuDrop: 0.34,
      maxDriveForce: 21200,
      nitroForce: 8600,
      maxBrakeForce: 29000,
      brakeBiasFront: 0.62,
      awdFrontSplit: 0.35,
      aeroDownforce: 2.65,
      aeroDrag: 0.36,
      pacejkaB: 15.2,
      pacejkaC: 1.15,
      tcsAllowSlip: 0.08,
    },
    suv: {
      mass: 2220,
      Iz: 4050,
      cgHeight: 0.7,
      tireMu: 1.66,
      brakeMu: 1.44,
      rearMuMult: 1.1,
      offroadMu: 1.55,
      wetMuDrop: 0.2,
      maxDriveForce: 20400,
      nitroForce: 7400,
      maxBrakeForce: 33000,
      brakeBiasFront: 0.65,
      awdFrontSplit: 0.5,
      aeroDownforce: 0.4,
      aeroDrag: 0.64,
      pacejkaB: 11.4,
      pacejkaC: 1.12,
      tcsAllowSlip: 0.08,
    },
    police: {
      mass: 1700,
      Iz: 2680,
      cgHeight: 0.5,
      tireMu: 2.0,
      brakeMu: 1.72,
      rearMuMult: 1.08,
      offroadMu: 1.2,
      wetMuDrop: 0.26,
      maxDriveForce: 19800,
      nitroForce: 8200,
      maxBrakeForce: 31000,
      brakeBiasFront: 0.63,
      awdFrontSplit: 0.4,
      aeroDownforce: 1.15,
      aeroDrag: 0.42,
      pacejkaB: 13.8,
      pacejkaC: 1.15,
      tcsAllowSlip: 0.1,
    },
  };

  const camPosCurrent = new THREE.Vector3(0, 5.5, 56);
  const camLookCurrent = new THREE.Vector3(0, 1.4, 38);

  const car = {
    x: WARP_POINTS[0].x,
    y: WARP_POINTS[0].y,
    z: WARP_POINTS[0].z,
    vx: 0,
    vy: 0,
    vz: 0,
    heading: WARP_POINTS[0].heading,
    yawRate: 0,
    steerAngle: 0,
    throttlePedal: 0,
    brakePedal: 0,
    reverseHoldTimer: 0,
    nitro: 100,
    grounded: true,
    inWater: false,
    inTunnel: false,
    suspOffset: 0,
    suspVel: 0,
    pitch: 0,
    roll: 0,
    slopePitch: 0,
    accelLong: 0,
    accelLat: 0,
    gear: "N",
    gearNum: 0,
    rpm: 850,
    airTime: 0,
    drifting: false,
    absActive: false,
    tcsActive: false,
    slipAmount: 0,
    surfaceLabel: "DRY ASPHALT",
    surfaceClass: "dry",
    currentGrip: 1.9,
    wetUnderCar: 0,
  };

  let impactCooldown = 0;
  let splashCooldown = 0;

  function warpTo(idx) {
    const wp = WARP_POINTS[idx];
    car.x = wp.x;
    car.y = wp.y;
    car.z = wp.z;
    car.vx = 0;
    car.vy = 0;
    car.vz = 0;
    car.heading = wp.heading;
    car.yawRate = 0;
    car.steerAngle = 0;
    car.throttlePedal = 0;
    car.brakePedal = 0;
    car.reverseHoldTimer = 0;
    car.suspOffset = 0;
    car.suspVel = 0;
    car.pitch = 0;
    car.roll = 0;
    car.slopePitch = 0;
    car.accelLong = 0;
    car.accelLat = 0;
    car.nitro = 100;
    car.grounded = true;
    car.inWater = false;

    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    camPosCurrent.set(car.x - fx * 11, car.y + 4.4, car.z - fz * 11);
    camLookCurrent.set(car.x + fx * 6, car.y + 1.4, car.z + fz * 6);

    const wLabel = document.getElementById("warp-label");
    if (wLabel) wLabel.textContent = wp.name;
    showBanner(`TRAVEL: ${wp.name}`);
  }

  function cycleWarp() {
    warpIndex = (warpIndex + 1) % WARP_POINTS.length;
    warpTo(warpIndex);
  }

  function resetCar() {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < WARP_POINTS.length; i++) {
      const d = Math.hypot(car.x - WARP_POINTS[i].x, car.z - WARP_POINTS[i].z);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    warpIndex = bestIdx;
    warpTo(bestIdx);
    showBanner(`RESET: ${WARP_POINTS[bestIdx].name}`);
  }

  // Exact Sphere-vs-Oriented-Box test for vehicles & boats (eliminates phantom side hits!)
  // Entity local right = (cosH, -sinH), local forward = (-sinH, -cosH)
  function testSphereVsVehicleOBB(sx, sz, sphereRad, cx, cz, halfW, halfL, heading) {
    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);
    const dx = sx - cx;
    const dz = sz - cz;

    const lx = dx * cosH - dz * sinH;   // Right axis
    const lz = -dx * sinH - dz * cosH;  // Forward axis

    const clx = Math.max(-halfW, Math.min(lx, halfW));
    const clz = Math.max(-halfL, Math.min(lz, halfL));
    const dlx = lx - clx;
    const dlz = lz - clz;
    const dSq = dlx * dlx + dlz * dlz;

    if (dSq >= sphereRad * sphereRad) return null;

    let nlx = 0;
    let nlz = 0;
    let overlap = 0;

    if (dSq > 0.000001) {
      const d = Math.sqrt(dSq);
      nlx = dlx / d;
      nlz = dlz / d;
      overlap = sphereRad - d;
    } else {
      const penX = halfW - Math.abs(lx);
      const penZ = halfL - Math.abs(lz);
      if (penX < penZ) {
        nlx = lx >= 0 ? 1 : -1;
        overlap = penX + sphereRad;
      } else {
        nlz = lz >= 0 ? 1 : -1;
        overlap = penZ + sphereRad;
      }
    }

    // Rotate contact normal back to world space: nlx * R + nlz * F
    const nx = nlx * cosH - nlz * sinH;
    const nz = -nlx * sinH - nlz * cosH;
    return { nx, nz, overlap };
  }

  // Exact Multi-Sphere vs Buildings, Guardrails, AI Vehicles & Boats
  function resolveCollisions() {
    const nearby = world.getNearbyColliders(car.x, car.z);
    // Tight visual-match spheres along the player's body centerline
    const sphereRad = activeSpec.bodyW * 0.47;
    const bumperOff = Math.max(0.85, activeSpec.bodyLen * 0.5 - sphereRad);
    const sphereOffsets = [-bumperOff, 0, bumperOff];
    let maxImpact = 0;

    // 1) Static World Colliders (Buildings, Tunnel Walls, Bridge & Curved Viaduct Rails)
    for (let pass = 0; pass < 2; pass++) {
      const fx = -Math.sin(car.heading);
      const fz = -Math.cos(car.heading);

      for (let s = 0; s < sphereOffsets.length; s++) {
        const off = sphereOffsets[s];
        let sx = car.x + fx * off;
        let sz = car.z + fz * off;

        for (let i = 0; i < nearby.length; i++) {
          const c = nearby[i];
          if (car.y + 1.9 < c.minY || car.y > c.maxY) continue;

          let hit = false;
          let nx = 0;
          let nz = 0;
          let overlap = 0;

          if (c.type === "aabb") {
            const cx = Math.max(c.minX, Math.min(sx, c.maxX));
            const cz = Math.max(c.minZ, Math.min(sz, c.maxZ));
            const dx = sx - cx;
            const dz = sz - cz;
            const dSq = dx * dx + dz * dz;

            if (dSq < sphereRad * sphereRad) {
              hit = true;
              if (dSq > 0.000001) {
                const d = Math.sqrt(dSq);
                nx = dx / d;
                nz = dz / d;
                overlap = sphereRad - d;
              } else {
                const dl = sx - c.minX;
                const dr = c.maxX - sx;
                const dt = sz - c.minZ;
                const db = c.maxZ - sz;
                const m = Math.min(dl, dr, dt, db);
                if (m === dl) { nx = -1; nz = 0; overlap = dl + sphereRad; }
                else if (m === dr) { nx = 1; nz = 0; overlap = dr + sphereRad; }
                else if (m === dt) { nx = 0; nz = -1; overlap = dt + sphereRad; }
                else { nx = 0; nz = 1; overlap = db + sphereRad; }
              }
            }
          } else if (c.type === "obb") {
            const dx = sx - c.cx;
            const dz = sz - c.cz;
            const lx = dx * c.cosA - dz * c.sinA;
            const lz = dx * c.sinA + dz * c.cosA;

            const clx = Math.max(-c.hx, Math.min(lx, c.hx));
            const clz = Math.max(-c.hz, Math.min(lz, c.hz));
            const dlx = lx - clx;
            const dlz = lz - clz;
            const dSq = dlx * dlx + dlz * dlz;

            if (dSq < sphereRad * sphereRad) {
              hit = true;
              let nlx = 0;
              let nlz = 0;
              if (dSq > 0.000001) {
                const d = Math.sqrt(dSq);
                nlx = dlx / d;
                nlz = dlz / d;
                overlap = sphereRad - d;
              } else {
                const penX = c.hx - Math.abs(lx);
                const penZ = c.hz - Math.abs(lz);
                if (penX < penZ) {
                  nlx = lx >= 0 ? 1 : -1;
                  overlap = penX + sphereRad;
                } else {
                  nlz = lz >= 0 ? 1 : -1;
                  overlap = penZ + sphereRad;
                }
              }
              nx = nlx * c.cosA + nlz * c.sinA;
              nz = -nlx * c.sinA + nlz * c.cosA;
            }
          } else if (c.type === "circle") {
            const dx = sx - c.x;
            const dz = sz - c.z;
            const minD = sphereRad + c.r;
            const dSq = dx * dx + dz * dz;
            if (dSq < minD * minD) {
              hit = true;
              const d = Math.sqrt(dSq) || 0.0001;
              nx = dx / d;
              nz = dz / d;
              overlap = minD - d;
            }
          }

          if (hit) {
            car.x += nx * overlap;
            car.z += nz * overlap;
            sx += nx * overlap;
            sz += nz * overlap;

            const vn = car.vx * nx + car.vz * nz;
            if (vn < 0) {
              maxImpact = Math.max(maxImpact, -vn);
              const bounce = Math.abs(vn) > 12 ? 1.2 : 1.05;
              car.vx -= bounce * vn * nx;
              car.vz -= bounce * vn * nz;
              const scrapeDamp = Math.max(0.78, 1.0 - Math.min(0.22, -vn * 0.01));
              car.vx *= scrapeDamp;
              car.vz *= scrapeDamp;
              car.yawRate *= 0.65;
            }
          }
        }
      }
    }

    // 2) Exact OBB Collisions with AI Traffic Cars & Harbor/Ocean Boats (ZERO phantom lane hits!)
    if (trafficEnabled) {
      const fx = -Math.sin(car.heading);
      const fz = -Math.cos(car.heading);
      const playerBroadR = bumperOff + sphereRad;

      for (let i = 0; i < world.trafficCars.length; i++) {
        const ai = world.trafficCars[i];
        if (Math.abs(car.y - ai.y) > 2.5) continue;

        const broad = playerBroadR + ai.radius + 0.5;
        const bdx = car.x - ai.x;
        const bdz = car.z - ai.z;
        if (bdx * bdx + bdz * bdz > broad * broad) continue;

        let deepest = null;
        for (let s = 0; s < sphereOffsets.length; s++) {
          const sx = car.x + fx * sphereOffsets[s];
          const sz = car.z + fz * sphereOffsets[s];
          const res = testSphereVsVehicleOBB(sx, sz, sphereRad, ai.x, ai.z, ai.halfW, ai.halfL, ai.heading);
          if (res && (!deepest || res.overlap > deepest.overlap)) {
            deepest = res;
          }
        }

        if (deepest) {
          const { nx, nz, overlap } = deepest;
          car.x += nx * overlap * 0.7;
          car.z += nz * overlap * 0.7;
          ai.x -= nx * overlap * 0.3;
          ai.z -= nz * overlap * 0.3;

          const aiVx = -Math.sin(ai.heading) * ai.speed;
          const aiVz = -Math.cos(ai.heading) * ai.speed;
          const relVn = (car.vx - aiVx) * nx + (car.vz - aiVz) * nz;

          if (relVn < 0) {
            maxImpact = Math.max(maxImpact, -relVn);
            car.vx -= 1.18 * relVn * nx;
            car.vz -= 1.18 * relVn * nz;
            car.vx *= 0.85;
            car.vz *= 0.85;

            ai.knockVx = -nx * Math.min(16, -relVn * 0.6);
            ai.knockVz = -nz * Math.min(16, -relVn * 0.6);
            ai.stunTimer = 0.75;
          }
        }
      }

      for (let i = 0; i < world.boats.length; i++) {
        const b = world.boats[i];
        if (car.y > 4.2) continue;

        const broad = playerBroadR + b.radius + 0.5;
        const bdx = car.x - b.x;
        const bdz = car.z - b.z;
        if (bdx * bdx + bdz * bdz > broad * broad) continue;

        let deepest = null;
        for (let s = 0; s < sphereOffsets.length; s++) {
          const sx = car.x + fx * sphereOffsets[s];
          const sz = car.z + fz * sphereOffsets[s];
          const res = testSphereVsVehicleOBB(sx, sz, sphereRad, b.x, b.z, b.halfW, b.halfL, b.heading);
          if (res && (!deepest || res.overlap > deepest.overlap)) {
            deepest = res;
          }
        }

        if (deepest) {
          const { nx, nz, overlap } = deepest;
          car.x += nx * overlap;
          car.z += nz * overlap;

          const vn = car.vx * nx + car.vz * nz;
          if (vn < 0) {
            maxImpact = Math.max(maxImpact, -vn);
            car.vx -= 1.25 * vn * nx;
            car.vz -= 1.25 * vn * nz;
          }
        }
      }
    }

    // 3) Outer Ocean World Bounds
    if (car.x > WORLD_BOUNDS.maxX) { maxImpact = Math.max(maxImpact, Math.abs(car.vx)); car.x = WORLD_BOUNDS.maxX; car.vx *= -0.35; }
    if (car.x < WORLD_BOUNDS.minX) { maxImpact = Math.max(maxImpact, Math.abs(car.vx)); car.x = WORLD_BOUNDS.minX; car.vx *= -0.35; }
    if (car.z > WORLD_BOUNDS.maxZ) { maxImpact = Math.max(maxImpact, Math.abs(car.vz)); car.z = WORLD_BOUNDS.maxZ; car.vz *= -0.35; }
    if (car.z < WORLD_BOUNDS.minZ) { maxImpact = Math.max(maxImpact, Math.abs(car.vz)); car.z = WORLD_BOUNDS.minZ; car.vz *= -0.35; }

    if (maxImpact > 4.2 && impactCooldown <= 0) {
      audio.playImpact(maxImpact);
      if (controls) {
        const rStr = Math.min(1, maxImpact / 28);
        controls.rumble(rStr, rStr * 0.85, 160);
      }
      car.suspVel -= Math.min(1.8, maxImpact * 0.055);
      impactCooldown = 0.22;
    }
  }

  function pacejkaNorm(slipAngle, B, C) {
    const E = 0.2;
    const x = B * slipAngle;
    return -Math.sin(C * Math.atan(x - E * (x - Math.atan(x))));
  }

  function updatePhysics(dt, elapsed) {
    impactCooldown = Math.max(0, impactCooldown - dt);
    splashCooldown = Math.max(0, splashCooldown - dt);

    const weather = WEATHER_PRESETS[weatherIndex];
    const sp = activeSpec;
    const hp = HANDLING_PROFILES[sp.id] || HANDLING_PROFILES.gt;

    // Combine Keyboard + Console Gamepad + Mobile Multi-Touch Inputs
    const ext = controls
      ? controls.getInput()
      : { accel: 0, brake: 0, steer: 0, isAnalogSteer: false, handbrake: false, nitro: false, horn: false };

    const kbAccel = keys.KeyW || keys.ArrowUp ? 1 : 0;
    const kbBrake = keys.KeyS || keys.ArrowDown ? 1 : 0;
    const kbSteer = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);

    const rawAccel = garageOpen ? 0 : Math.max(kbAccel, ext.accel);
    const rawBrake = garageOpen ? 0 : Math.max(kbBrake, ext.brake);
    const rawSteerInput = garageOpen ? 0 : kbSteer !== 0 ? kbSteer : ext.steer;
    const isAnalogSteer = kbSteer === 0 && ext.isAnalogSteer;

    const handbrake = !garageOpen && (Boolean(keys.Space) || ext.handbrake);
    const wantsNitro = !garageOpen && (Boolean(keys.ShiftLeft || keys.ShiftRight) || ext.nitro);
    const hornPressed = !garageOpen && (Boolean(keys.KeyH) || ext.horn);

    const initFx = -Math.sin(car.heading);
    const initFz = -Math.cos(car.heading);
    const initVLong = car.vx * initFx + car.vz * initFz;

    let wantThrottle = 0;
    let wantBrake = 0;
    let wantReverse = 0;

    if (rawAccel > 0.03 && rawBrake <= 0.08) {
      if (initVLong < -0.6) {
        wantBrake = rawAccel;
        car.reverseHoldTimer = 0;
      } else {
        wantThrottle = rawAccel;
        car.reverseHoldTimer = 0;
      }
    } else if (rawBrake > 0.03 && rawAccel <= 0.08) {
      if (initVLong > 0.45) {
        wantBrake = rawBrake;
        car.reverseHoldTimer = 0;
      } else if (initVLong < -0.25) {
        wantReverse = rawBrake;
      } else {
        wantBrake = rawBrake;
        car.reverseHoldTimer += dt;
        if (car.reverseHoldTimer >= 0.16) {
          wantBrake = 0;
          wantReverse = rawBrake;
        }
      }
    } else if (rawAccel > 0.03 && rawBrake > 0.03) {
      wantBrake = rawBrake;
      wantThrottle = rawAccel * 0.25;
      car.reverseHoldTimer = 0;
    } else {
      car.reverseHoldTimer = 0;
    }

    const thrRate = ext.accel > 0.03 ? 22.0 : wantThrottle > car.throttlePedal ? 10.5 : 16.0;
    const brkRate = ext.brake > 0.03 ? 22.0 : wantBrake > car.brakePedal ? 11.0 : 18.0;
    car.throttlePedal = THREE.MathUtils.lerp(car.throttlePedal, wantThrottle, 1 - Math.exp(-thrRate * dt));
    car.brakePedal = THREE.MathUtils.lerp(car.brakePedal, wantBrake, 1 - Math.exp(-brkRate * dt));

    const usingNitro = wantsNitro && car.nitro > 1 && car.throttlePedal > 0.15;
    if (usingNitro) car.nitro = Math.max(0, car.nitro - 24 * dt);
    else car.nitro = Math.min(100, car.nitro + 10.5 * dt);

    flames.forEach((f) => {
      f.visible = usingNitro;
      if (usingNitro) f.scale.y = 0.8 + Math.random() * 0.7;
    });

    // Surface & Dynamic Road Moisture Grip
    const surfStart = world.sampleSurface(car.x, car.z, car.y, car.heading);
    car.inTunnel = surfStart.inTunnel;
    tunnelOverlay.classList.toggle("inside", car.inTunnel);

    let surfaceMu = hp.tireMu;
    let rollingCoeff = 0.015;
    car.wetUnderCar = 0;

    if (surfStart.overWater) {
      surfaceMu = 0.6;
      rollingCoeff = 0.22;
      car.wetUnderCar = 1.0;
      car.surfaceLabel = "WATER";
      car.surfaceClass = "water";
    } else if (surfStart.inTunnel) {
      surfaceMu = hp.tireMu * 1.03;
      rollingCoeff = 0.014;
      car.wetUnderCar = 0.0;
      car.surfaceLabel = "DRY TUNNEL";
      car.surfaceClass = "tunnel";
    } else if (surfStart.onRoad) {
      const puddleVal = samplePuddleAt(car.x, car.z, roadMoisture);
      const effWet = Math.max(roadMoisture * 0.58, puddleVal);
      car.wetUnderCar = effWet;

      const wetFactor = 1.0 - (roadMoisture * 0.12 + puddleVal * 0.22) * (hp.wetMuDrop / 0.3);
      surfaceMu = hp.tireMu * Math.max(0.65, wetFactor);
      rollingCoeff = 0.015 + effWet * 0.016;

      if (surfStart.surfaceType === "BRIDGE") {
        car.surfaceLabel = roadMoisture > 0.45 ? "WET BRIDGE DECK" : "BRIDGE DECK";
        car.surfaceClass = roadMoisture > 0.45 ? "wet" : "bridge";
      } else if (puddleVal > 0.36) {
        car.surfaceLabel = "WET PUDDLE";
        car.surfaceClass = "wet";
      } else if (roadMoisture > 0.18) {
        car.surfaceLabel = "DAMP ASPHALT";
        car.surfaceClass = "damp";
      } else {
        car.surfaceLabel = "DRY ASPHALT";
        car.surfaceClass = "dry";
      }
    } else {
      const grassWet = roadMoisture * 0.4;
      car.wetUnderCar = grassWet;
      surfaceMu = Math.max(0.8, hp.offroadMu * (1.0 - grassWet * 0.15));
      rollingCoeff = sp.id === "suv" ? 0.042 : 0.075;
      car.surfaceLabel = "OFF-ROAD GRASS";
      car.surfaceClass = "offroad";
    }
    car.currentGrip = surfaceMu;

    // SLIP-AWARE STEERING ANGLE
    const halfA = sp.wheelZ;
    const halfB = sp.wheelZ;
    const wheelbase = halfA + halfB;
    const initSpeed = Math.hypot(car.vx, car.vz);

    const maxLatAccel = hp.tireMu * GRAVITY_PHYS + (hp.aeroDownforce * initSpeed * initSpeed * hp.tireMu) / hp.mass;
    const geoSteer = Math.atan((wheelbase * maxLatAccel) / Math.max(12, initSpeed * initSpeed));
    const speedBlend = THREE.MathUtils.clamp((initSpeed - 3.0) / 14.0, 0.0, 1.0);
    const slipAllowance = 0.125 * speedBlend;

    const driftBonus = handbrake ? 0.2 : sp.id === "muscle" && car.throttlePedal > 0.5 && initSpeed > 12 ? 0.06 : 0.0;
    const maxSteer = THREE.MathUtils.clamp(geoSteer + slipAllowance + driftBonus, 0.12, 0.62);

    const steerInRate = isAnalogSteer ? 16.5 : THREE.MathUtils.lerp(11.5, 6.8, Math.min(1, initSpeed / 70));
    const steerReturnRate = 15.5;

    let targetSteer = rawSteerInput * maxSteer;
    if (Math.abs(rawSteerInput) < 0.02 && car.grounded && initSpeed > 10 && car.drifting) {
      const initRx = Math.cos(car.heading);
      const initRz = -Math.sin(car.heading);
      const vLatNow = car.vx * initRx + car.vz * initRz;
      const bodySlip = Math.atan2(vLatNow, Math.max(Math.abs(initVLong), 5.0));
      targetSteer = THREE.MathUtils.clamp(-bodySlip * 0.52, -0.45, 0.45);
    }

    const activeSteerRate = Math.abs(rawSteerInput) >= 0.02 ? steerInRate : steerReturnRate;
    car.steerAngle = THREE.MathUtils.lerp(car.steerAngle, targetSteer, 1 - Math.exp(-activeSteerRate * dt));

    // =====================================================================
    // 4x FIXED SUBSTEPS (~240 Hz WORLD-SPACE TIRE & KINEMATIC LOW-SPEED SOLVER)
    // =====================================================================
    const SUBSTEPS = 4;
    const subDt = dt / SUBSTEPS;
    const brakeMuRatio = hp.brakeMu / hp.tireMu;

    car.absActive = false;
    car.tcsActive = false;
    let lastVLong = initVLong;
    let lastVLatR = 0;
    let lastRearSlip = 0;
    let latestSurf = surfStart;
    let accumLongAcc = 0;
    let accumLatAcc = 0;

    for (let step = 0; step < SUBSTEPS; step++) {
      const fx = -Math.sin(car.heading);
      const fz = -Math.cos(car.heading);
      const rx = Math.cos(car.heading);
      const rz = -Math.sin(car.heading);

      const vLong = car.vx * fx + car.vz * fz;
      const vLat = car.vx * rx + car.vz * rz;
      const speed = Math.hypot(vLong, vLat);
      lastVLong = vLong;

      let totalFLong = 0;
      let totalFLat = 0;
      let yawTorque = 0;

      if (car.grounded) {
        const staticWeight = hp.mass * GRAVITY_PHYS;
        const downforce = hp.aeroDownforce * speed * speed;
        const weightTransfer = THREE.MathUtils.clamp(
          (hp.mass * car.accelLong * hp.cgHeight) / wheelbase,
          -staticWeight * 0.22,
          staticWeight * 0.22
        );

        const loadFront = Math.max(staticWeight * 0.26, staticWeight * 0.5 - weightTransfer + downforce * 0.45);
        const loadRear = Math.max(staticWeight * 0.26, staticWeight * 0.5 + weightTransfer + downforce * 0.55);

        const maxLatGripF = surfaceMu * loadFront;
        const maxLatGripR = surfaceMu * hp.rearMuMult * loadRear;
        const maxLongGripF = surfaceMu * brakeMuRatio * loadFront;
        const maxLongGripR = surfaceMu * brakeMuRatio * hp.rearMuMult * loadRear;

        // 1) Engine Drive Force
        const normRpm = THREE.MathUtils.clamp((car.rpm - 850) / 7150, 0, 1);
        const torqueShape = 0.74 + 0.32 * Math.sin(normRpm * Math.PI * 0.85);
        const gearIdx = Math.max(0, Math.min(5, (car.gearNum > 0 ? car.gearNum : 1) - 1));
        const gearScale = 0.54 + (GEAR_RATIOS[gearIdx] / GEAR_RATIOS[0]) * 0.58;

        let driveForce = 0;
        const topCap = car.inWater ? 24 : usingNitro ? sp.nitroTopSpeed : sp.topSpeed;

        if (car.throttlePedal > 0.01 && vLong < topCap) {
          const speedLimiter = smoothstepLimit(vLong, topCap - 5, topCap);
          driveForce =
            (hp.maxDriveForce * gearScale * torqueShape * car.throttlePedal + (usingNitro ? hp.nitroForce : 0)) *
            speedLimiter;
        } else if (wantReverse > 0.02 && vLong > -22) {
          driveForce = -hp.maxDriveForce * 0.54 * wantReverse;
        } else if (Math.abs(vLong) > 0.4) {
          driveForce = -Math.sign(vLong) * (420 + Math.abs(vLong) * 26);
        }

        // 2) Progressive Foot Brakes (65/35 Bias + ABS) & Rear Handbrake
        let brakeForceF = 0;
        let brakeForceR = 0;
        if (car.brakePedal > 0.01) {
          const totalBrakeCmd = hp.maxBrakeForce * car.brakePedal;
          brakeForceF = totalBrakeCmd * hp.brakeBiasFront;
          brakeForceR = totalBrakeCmd * (1.0 - hp.brakeBiasFront);

          const absCapF = maxLongGripF * 0.94;
          const absCapR = maxLongGripR * 0.9;
          if ((brakeForceF > absCapF || brakeForceR > absCapR) && speed > 4.5) {
            car.absActive = true;
            const pulse = 0.95 + 0.05 * Math.sin(elapsed * 52);
            brakeForceF = Math.min(brakeForceF, absCapF * pulse);
            brakeForceR = Math.min(brakeForceR, absCapR * pulse);
          }
        }

        let fLongFrontTire = 0;
        let fLongRearTire = 0;

        if (Math.abs(vLong) > 0.25) {
          const dir = Math.sign(vLong);
          fLongFrontTire = driveForce * hp.awdFrontSplit - dir * brakeForceF;
          fLongRearTire = driveForce * (1.0 - hp.awdFrontSplit) - dir * brakeForceR;
        } else if (car.brakePedal > 0.15 && wantReverse <= 0.02 && car.throttlePedal < 0.05) {
          car.vx *= Math.exp(-26 * subDt);
          car.vz *= Math.exp(-26 * subDt);
          car.yawRate *= Math.exp(-26 * subDt);
          fLongFrontTire = 0;
          fLongRearTire = 0;
        } else {
          fLongFrontTire = driveForce * hp.awdFrontSplit;
          fLongRearTire = driveForce * (1.0 - hp.awdFrontSplit);
        }

        if (handbrake && Math.abs(vLong) > 0.3) {
          fLongRearTire -= Math.sign(vLong) * maxLongGripR * 0.72;
        }

        if (car.throttlePedal > 0.2 && !handbrake) {
          const rearTcsCap = maxLongGripR * (0.94 + hp.tcsAllowSlip);
          if (fLongRearTire > rearTcsCap) {
            if (hp.tcsAllowSlip < 0.25) {
              car.tcsActive = true;
              fLongRearTire = maxLongGripR * 0.94;
            } else {
              fLongRearTire = maxLongGripR * 1.0;
            }
          }
          if (fLongFrontTire > maxLongGripF * 0.94) {
            car.tcsActive = true;
            fLongFrontTire = maxLongGripF * 0.94;
          }
        }

        fLongFrontTire = THREE.MathUtils.clamp(fLongFrontTire, -maxLongGripF, maxLongGripF);
        fLongRearTire = THREE.MathUtils.clamp(fLongRearTire, -maxLongGripR, maxLongGripR);

        // 3) Tire Slip Angles & Elliptical Friction Circle
        const vLatF = vLat - car.yawRate * halfA;
        const vLatR = vLat + car.yawRate * halfB;
        lastVLatR = vLatR;

        const cosD = Math.cos(car.steerAngle);
        const sinD = Math.sin(car.steerAngle);

        const vtLongF = vLong * cosD - vLatF * sinD;
        const vtLatF = vLong * sinD + vLatF * cosD;

        const regDenomF = Math.max(Math.abs(vtLongF), 2.2);
        const regDenomR = Math.max(Math.abs(vLong), 2.2);
        const lowSpeedAtten = Math.min(1.0, speed / 2.0);

        const alphaF = Math.atan2(vtLatF, regDenomF);
        const alphaR = Math.atan2(vLatR, regDenomR);
        lastRearSlip = Math.abs(alphaR);

        const longRatioF = Math.min(1.0, Math.abs(fLongFrontTire) / Math.max(1, maxLongGripF));
        const longRatioR = Math.min(1.0, Math.abs(fLongRearTire) / Math.max(1, maxLongGripR));

        const latRetainF = Math.sqrt(Math.max(0.58, 1.0 - 0.36 * longRatioF * longRatioF));
        const rearCoupling = sp.id === "muscle" && car.throttlePedal > 0.4 ? 0.62 : 0.34;
        let latRetainR = Math.sqrt(Math.max(0.48, 1.0 - rearCoupling * longRatioR * longRatioR));

        if (handbrake) latRetainR *= 0.24;

        const availLatF = maxLatGripF * latRetainF;
        const availLatR = maxLatGripR * latRetainR;

        const fLatFrontTire = pacejkaNorm(alphaF, hp.pacejkaB, hp.pacejkaC) * availLatF * lowSpeedAtten;
        const fLatRearCar = pacejkaNorm(alphaR, hp.pacejkaB * 1.12, hp.pacejkaC) * availLatR * lowSpeedAtten;

        const fLongFrontCar = fLongFrontTire * cosD + fLatFrontTire * sinD * 0.28;
        const fLatFrontCar = -fLongFrontTire * sinD + fLatFrontTire * cosD;

        // 4) Aero Drag, Rolling Resistance & Bridge Slope Gravity
        const fAero = -hp.aeroDrag * vLong * Math.abs(vLong);
        const fRoll = -rollingCoeff * staticWeight * Math.tanh(vLong * 1.4);
        const fSlope = -hp.mass * GRAVITY_PHYS * Math.sin(latestSurf.slopePitch);
        const fWaterLatDrag = car.inWater ? -vLat * hp.mass * 2.2 : 0;

        totalFLong = fLongFrontCar + fLongRearTire + fAero + fRoll + fSlope;
        totalFLat = fLatFrontCar + fLatRearCar + fWaterLatDrag;

        const yawDamp = -car.yawRate * hp.Iz * (handbrake ? 0.15 : 0.32);
        yawTorque = -halfA * fLatFrontCar + halfB * fLatRearCar + yawDamp;
      } else {
        totalFLong = -hp.aeroDrag * 0.45 * vLong * Math.abs(vLong);
        totalFLat = -hp.aeroDrag * 0.45 * vLat * Math.abs(vLat);
        yawTorque = -car.yawRate * hp.Iz * 1.4;
      }

      // 5) Integrate Directly in World Space
      const aLong = totalFLong / hp.mass;
      const aLat = totalFLat / hp.mass;
      accumLongAcc += aLong;
      accumLatAcc += aLat;

      car.vx += (aLong * fx + aLat * rx) * subDt;
      car.vz += (aLong * fz + aLat * rz) * subDt;
      car.yawRate += (yawTorque / hp.Iz) * subDt;
      car.yawRate = THREE.MathUtils.clamp(car.yawRate, -3.8, 3.8);
      car.heading += car.yawRate * subDt;

      // 6) Zero-Slip Low-Speed Rolling Constraint (< 9.0 m/s when off handbrake)
      if (car.grounded && !car.inWater && !handbrake && speed < 9.0 && speed > 0.08) {
        const nfx2 = -Math.sin(car.heading);
        const nfz2 = -Math.cos(car.heading);
        const nrx2 = Math.cos(car.heading);
        const nrz2 = -Math.sin(car.heading);

        const curVLong = car.vx * nfx2 + car.vz * nfz2;
        const curVLat = car.vx * nrx2 + car.vz * nrz2;

        const kinYaw = (curVLong / wheelbase) * Math.tan(car.steerAngle);
        const kinVLat = -kinYaw * halfB;
        const lowBlend = Math.pow(1.0 - speed / 9.0, 1.35);
        const relax = 1.0 - Math.exp(-22.0 * lowBlend * subDt);

        car.yawRate = THREE.MathUtils.lerp(car.yawRate, kinYaw, relax);
        const fixedVLat = THREE.MathUtils.lerp(curVLat, kinVLat, relax);
        car.vx = nfx2 * curVLong + nrx2 * fixedVLat;
        car.vz = nfz2 * curVLong + nrz2 * fixedVLat;
        lastVLatR = fixedVLat + car.yawRate * halfB;
        lastRearSlip = Math.abs(Math.atan2(lastVLatR, Math.max(Math.abs(curVLong), 2.5)));
      }

      const prevX = car.x;
      const prevZ = car.z;
      const prevY = car.y;

      car.x += car.vx * subDt;
      car.z += car.vz * subDt;

      latestSurf = world.sampleSurface(car.x, car.z, car.y, car.heading);
      if (latestSurf.hitWall) {
        if (Math.abs(vLong) > 6 && impactCooldown <= 0) {
          audio.playImpact(Math.abs(vLong));
          if (controls) controls.rumble(0.65, 0.55, 140);
          impactCooldown = 0.25;
        }
        car.x = prevX;
        car.z = prevZ;
        car.vx *= -0.35;
        car.vz *= -0.35;
      }

      const vertGravity = 26;
      car.vy -= vertGravity * subDt;
      car.y += car.vy * subDt;

      const wasInWater = car.inWater;
      const snapMargin = car.grounded && latestSurf.surfaceType === "BRIDGE" ? 0.55 : 0.08;

      if (car.y <= latestSurf.height + snapMargin) {
        if (!car.grounded) {
          const impactVy = Math.abs(car.vy);
          car.suspVel -= Math.min(3.8, impactVy * 0.22);
          if (controls && impactVy > 4.5) {
            const landStr = Math.min(0.95, impactVy / 18);
            controls.rumble(landStr, landStr * 0.6, 150);
          }
          if (latestSurf.overWater) {
            audio.playWaterSplash(impactVy + Math.abs(vLong));
            showBanner("WATER SPLASH!");
          } else {
            if (impactVy > 7.5) audio.playImpact(impactVy * 1.1);
            if (car.airTime > 0.55) showBanner(`AIR TIME ${car.airTime.toFixed(1)}S!`);
          }
        }
        car.y = latestSurf.height;
        car.vy = Math.max(0, (car.y - prevY) / Math.max(subDt, 0.002));
        car.grounded = true;
        car.inWater = latestSurf.overWater;
        car.airTime = 0;
      } else {
        car.grounded = false;
        car.inWater = false;
        car.airTime += subDt;
      }

      if (car.inWater && !wasInWater && splashCooldown <= 0) {
        audio.playWaterSplash(Math.abs(vLong) + 8);
        if (controls) controls.rumble(0.5, 0.7, 160);
        splashCooldown = 0.6;
        for (let s = 0; s < 12; s++) {
          spawnParticle(car.x + (Math.random() - 0.5) * 2.4, 0.0, car.z + (Math.random() - 0.5) * 2.4, "splash");
        }
      }

      resolveCollisions();
    }

    car.accelLong = THREE.MathUtils.lerp(car.accelLong, accumLongAcc / SUBSTEPS, 1 - Math.exp(-12 * dt));
    car.accelLat = THREE.MathUtils.lerp(car.accelLat, accumLatAcc / SUBSTEPS, 1 - Math.exp(-12 * dt));
    car.slipAmount = lastRearSlip;

    const absSpeed = Math.hypot(car.vx, car.vz);
    const nfx = -Math.sin(car.heading);
    const nfz = -Math.cos(car.heading);
    const nrx = Math.cos(car.heading);
    const nrz = -Math.sin(car.heading);

    // Subtle console controller rumble on drifts, off-road grass & nitro boost
    if (controls && ext.gamepadConnected && car.grounded) {
      if (car.drifting) {
        controls.rumble(0.18, 0.35, 90);
      } else if (usingNitro) {
        controls.rumble(0.14, 0.28, 90);
      } else if (!latestSurf.onRoad && absSpeed > 8) {
        controls.rumble(0.12, 0.22, 90);
      }
    }

    // Spring-Damper Suspension
    let targetHeave = 0;
    if (car.inWater) {
      targetHeave = Math.sin(elapsed * 4.2) * 0.065;
    } else if (car.grounded && !latestSurf.onRoad && absSpeed > 3) {
      targetHeave = Math.sin(elapsed * absSpeed * 1.45) * (sp.id === "suv" ? 0.07 : 0.045);
    }
    car.suspVel += ((targetHeave - car.suspOffset) * sp.suspStiffness - car.suspVel * sp.suspDamping) * dt;
    car.suspOffset = THREE.MathUtils.clamp(car.suspOffset + car.suspVel * dt, -sp.suspTravel, sp.suspTravel);

    // Automatic 6-Speed Gearbox
    const speedScale = sp.topSpeed / 74;
    const kmh = Math.abs(lastVLong) * 3.6;
    let gearStr = "N";
    let newGearNum = 0;
    let gearRatio = 0;

    if (lastVLong < -0.45 || wantReverse > 0.02) {
      gearStr = "R";
      newGearNum = -1;
      gearRatio = Math.min(1, kmh / 72);
    } else if (kmh > 1.2 || car.throttlePedal > 0.1) {
      newGearNum = 1;
      for (let i = 0; i < BASE_GEAR_THRESH.length; i++) {
        if (kmh > BASE_GEAR_THRESH[i] * speedScale) newGearNum = Math.min(6, i + 2);
      }
      gearStr = String(newGearNum);
      const low = newGearNum === 1 ? 0 : BASE_GEAR_THRESH[newGearNum - 2] * speedScale;
      const high = BASE_GEAR_THRESH[newGearNum - 1] * speedScale;
      gearRatio = THREE.MathUtils.clamp((kmh - low) / (high - low), 0.14, 1);
    }

    if (newGearNum > car.gearNum && car.gearNum >= 1) {
      audio.playGearShiftPop();
      car.suspVel -= 0.12;
    }
    car.gearNum = newGearNum;
    car.gear = gearStr;

    const targetRpm = 850 + gearRatio * 7100 + (car.throttlePedal > 0.1 && newGearNum <= 1 ? 750 * car.throttlePedal : 0);
    car.rpm = THREE.MathUtils.lerp(car.rpm, targetRpm, 12 * dt);

    car.drifting =
      car.grounded &&
      !car.inWater &&
      absSpeed > 9.0 &&
      ((Math.abs(lastVLatR) > 2.6 && car.slipAmount > 0.22) || (handbrake && absSpeed > 9.5));

    const rearX = car.x - nfx * sp.wheelZ;
    const rearZ = car.z - nfz * sp.wheelZ;

    if (car.inWater && absSpeed > 3.5) {
      spawnParticle(rearX + nrx * sp.wheelX, 0.05, rearZ + nrz * sp.wheelX, "splash");
      spawnParticle(rearX - nrx * sp.wheelX, 0.05, rearZ - nrz * sp.wheelX, "splash");
    } else if (car.grounded && !car.inWater) {
      if (car.wetUnderCar > 0.35 && absSpeed > 14 && Math.random() < 0.6) {
        spawnParticle(rearX + nrx * (sp.wheelX - 0.1), car.y + 0.18, rearZ + nrz * (sp.wheelX - 0.1), "spray");
        spawnParticle(rearX - nrx * (sp.wheelX - 0.1), car.y + 0.18, rearZ - nrz * (sp.wheelX - 0.1), "spray");
      }
      if (car.drifting || (car.absActive && absSpeed > 14)) {
        if (car.wetUnderCar < 0.45 && car.drifting && Math.random() < 0.78) {
          spawnParticle(rearX + nrx * (sp.wheelX - 0.1), car.y + 0.22, rearZ + nrz * (sp.wheelX - 0.1), "smoke");
          spawnParticle(rearX - nrx * (sp.wheelX - 0.1), car.y + 0.22, rearZ - nrz * (sp.wheelX - 0.1), "smoke");
        }
        skidAccum += absSpeed * dt;
        if (skidAccum > 0.75 && latestSurf.onRoad) {
          skidAccum = 0;
          dropSkidmark(rearX + nrx * (sp.wheelX - 0.08), car.y, rearZ + nrz * (sp.wheelX - 0.08), car.heading, car.slopePitch, car.wetUnderCar > 0.45);
          dropSkidmark(rearX - nrx * (sp.wheelX - 0.08), car.y, rearZ - nrz * (sp.wheelX - 0.08), car.heading, car.slopePitch, car.wetUnderCar > 0.45);
        }
      }
    }

    // Visual Wheel Rotation, Outward Body Roll & Brake Nose Dive
    frontWheelPivots.forEach((p) => (p.rotation.y = car.steerAngle));
    for (let i = 0; i < wheelMeshes.length; i++) {
      const isRear = i >= 2;
      const wheelSpin = isRear && handbrake ? 0 : (lastVLong * dt) / sp.wheelRadius;
      wheelMeshes[i].rotation.x -= wheelSpin;
    }

    car.slopePitch = THREE.MathUtils.lerp(car.slopePitch, car.grounded ? latestSurf.slopePitch : 0, 10 * dt);
    const dynamicPitch = car.grounded
      ? THREE.MathUtils.clamp(car.accelLong * 0.0046 * sp.rollMult, -0.095, 0.075)
      : THREE.MathUtils.clamp(car.vy * 0.018, -0.35, 0.35);
    const targetRoll = THREE.MathUtils.clamp(car.accelLat * 0.0048 * sp.rollMult, -0.16, 0.16);

    car.pitch = THREE.MathUtils.lerp(car.pitch, dynamicPitch, 10 * dt);
    car.roll = THREE.MathUtils.lerp(car.roll, targetRoll, 10 * dt);

    carGroup.position.set(car.x, car.y, car.z);
    carGroup.rotation.set(car.slopePitch, car.heading, 0, "YXZ");
    carBodyGroup.position.y = car.suspOffset;
    carBodyGroup.rotation.x = car.pitch;
    carBodyGroup.rotation.z = car.roll;

    const wheelDroop = car.grounded ? 0 : -sp.suspTravel * 0.65;
    for (let i = 0; i < wheelPivots.length; i++) {
      wheelPivots[i].position.y = THREE.MathUtils.lerp(wheelPivots[i].position.y, sp.wheelRadius + wheelDroop, 12 * dt);
    }

    // Dynamic Car Lights, Police Lightbar & Touch Siren Sync
    const brakingVisual = car.brakePedal > 0.08 || handbrake;
    const preset = TIME_PRESETS[timeIndex];
    const headlightsOn = preset.headlights || weather.forceHeadlights || car.inTunnel;

    headlightMat.emissiveIntensity = headlightsOn ? 2.8 : 0.4;
    if (headSpot) headSpot.intensity = rtEnabled && headlightsOn ? 3.2 : headlightsOn ? 1.4 : 0;
    volumetricBeams.forEach((b) => (b.visible = rtEnabled && headlightsOn));

    brakeLightMat.emissiveIntensity = brakingVisual ? 2.8 : 0.55;
    if (rearGlowLight) {
      rearGlowLight.color.setHex(usingNitro ? 0x38bdf8 : 0xff2222);
      rearGlowLight.intensity = rtEnabled ? (usingNitro ? 1.8 : brakingVisual ? 1.35 : 0.42) : 0;
    }

    if (controls) controls.syncPoliceSirenUI(sp.isPolice, sirenActive);

    if (policeLightbar) {
      if (sirenActive) {
        const phase = (elapsed * 6.5) % 2.0;
        const redOn = phase < 0.35 || (phase > 0.5 && phase < 0.85);
        const blueOn = (phase > 1.0 && phase < 1.35) || (phase > 1.5 && phase < 1.85);
        policeLightbar.redMat.emissiveIntensity = redOn ? 4.5 : 0.25;
        policeLightbar.blueMat.emissiveIntensity = blueOn ? 4.5 : 0.25;
        policeLightbar.redLight.intensity = redOn ? 3.6 : 0.0;
        policeLightbar.blueLight.intensity = blueOn ? 3.6 : 0.0;
      } else {
        policeLightbar.redMat.emissiveIntensity = 0.35;
        policeLightbar.blueMat.emissiveIntensity = 0.35;
        policeLightbar.redLight.intensity = 0;
        policeLightbar.blueLight.intensity = 0;
      }
    }

    const fwdVec = new THREE.Vector3(nfx, 0, nfz);
    world.setRoadUniform("uCarPos", carGroup.position);
    world.setRoadUniform("uCarForward", fwdVec);
    world.setRoadUniform("uBrakeIntensity", brakingVisual ? 1.45 : 0.45);
    world.setRoadUniform("uNitroActive", usingNitro ? 1.0 : 0.0);

    world.setWaterUniform("uCarPos", carGroup.position);
    world.setWaterUniform("uCarForward", fwdVec);
    world.setWaterUniform("uNitroActive", usingNitro ? 1.0 : 0.0);

    for (let i = 0; i < particlePool.length; i++) {
      const p = particlePool[i];
      if (p.life > 0) {
        p.life -= dt;
        p.vy -= p.gravity * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        const ratio = Math.max(0, p.life / p.maxLife);
        p.mesh.scale.setScalar(0.5 + (1 - ratio) * (p.gravity > 0 ? 1.15 : 1.9));
        p.mesh.material.opacity = ratio * (p.gravity > 0 ? 0.62 : 0.42);
        if (p.life <= 0) p.mesh.visible = false;
      }
    }

    world.skyDome.position.set(car.x, 0, car.z);
    sunLight.position.set(
      car.x + preset.sunPos[0] * 0.45,
      car.y + preset.sunPos[1] * 0.55,
      car.z + preset.sunPos[2] * 0.45
    );
    sunLight.target.position.set(car.x, car.y, car.z);
    sunDisc.position.set(
      car.x + preset.sunPos[0] * 3.5,
      preset.sunPos[1] * 3.5,
      car.z + preset.sunPos[2] * 3.5
    );

    audio.update(
      car.rpm,
      absSpeed,
      car.slipAmount,
      car.throttlePedal,
      car.drifting,
      usingNitro,
      hornPressed,
      weather.rainAudio,
      car.wetUnderCar,
      car.inTunnel,
      elapsed
    );

    return { vLong: lastVLong, usingNitro };
  }

  function smoothstepLimit(v, softStart, hardCap) {
    if (v <= softStart) return 1.0;
    if (v >= hardCap) return 0.0;
    const t = (v - softStart) / (hardCap - softStart);
    return 1.0 - t * t * (3 - 2 * t);
  }

  // =========================================================================
  // 6. TUNNEL-SAFE CAMERA & LIVE RT REFLECTION PASSES
  // =========================================================================
  function updateCamera(dt, speed, usingNitro, elapsed) {
    if (garageOpen) {
      const ang = car.heading + elapsed * 0.45;
      const desiredPos = new THREE.Vector3(car.x + Math.sin(ang) * 7.8, car.y + 2.6, car.z + Math.cos(ang) * 7.8);
      const desiredLook = new THREE.Vector3(car.x, car.y + 1.0, car.z);
      camPosCurrent.lerp(desiredPos, 1 - Math.exp(-5 * dt));
      camLookCurrent.lerp(desiredLook, 1 - Math.exp(-6 * dt));
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
      return;
    }

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
      const velSpeed = Math.hypot(car.vx, car.vz);
      let camDirX = fx;
      let camDirZ = fz;
      if (velSpeed > 10 && speed > 5 && car.drifting) {
        const vxN = car.vx / velSpeed;
        const vzN = car.vz / velSpeed;
        camDirX = THREE.MathUtils.lerp(fx, vxN, 0.28);
        camDirZ = THREE.MathUtils.lerp(fz, vzN, 0.28);
        const len = Math.hypot(camDirX, camDirZ) || 1;
        camDirX /= len;
        camDirZ /= len;
      }

      const dist = (car.inTunnel ? 8.8 : 10.2) + Math.min(3.4, Math.abs(speed) * 0.04);
      const heightOff = car.inTunnel ? 3.2 : activeSpec.id === "suv" ? 4.45 : 4.05;
      const desiredPos = new THREE.Vector3(car.x - camDirX * dist, car.y + heightOff, car.z - camDirZ * dist);
      const desiredLook = new THREE.Vector3(
        car.x + camDirX * 7.2,
        car.y + 1.35 + Math.sin(car.slopePitch) * 3.2,
        car.z + camDirZ * 7.2
      );

      if (world.isPointInTunnel(desiredPos.x, desiredPos.z)) {
        desiredPos.x = THREE.MathUtils.clamp(desiredPos.x, -9.8, 9.8);
        desiredPos.y = Math.min(desiredPos.y, 8.8);
      }

      camPosCurrent.lerp(desiredPos, 1 - Math.exp(-8.5 * dt));
      camLookCurrent.lerp(desiredLook, 1 - Math.exp(-11.5 * dt));
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    } else if (mode === "HOOD") {
      camPosCurrent.set(car.x + fx * 0.5, car.y + activeSpec.hoodEyeY + car.suspOffset, car.z + fz * 0.5);
      camLookCurrent.set(
        car.x + fx * 28,
        car.y + activeSpec.hoodEyeY - 0.3 + (car.slopePitch + car.pitch) * 14,
        car.z + fz * 28
      );
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    } else {
      const orbitH = car.inTunnel ? 8.4 : 26;
      const orbitD = car.inTunnel ? 11 : 21;
      const desiredPos = new THREE.Vector3(car.x - fx * orbitD, car.y + orbitH, car.z - fz * orbitD);
      if (world.isPointInTunnel(desiredPos.x, desiredPos.z)) {
        desiredPos.x = THREE.MathUtils.clamp(desiredPos.x, -9.5, 9.5);
      }
      camPosCurrent.lerp(desiredPos, 1 - Math.exp(-5 * dt));
      camLookCurrent.set(car.x, car.y + 1.1, car.z);
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    }
  }

  let frameCounter = 0;

  function renderRTPasses() {
    if (!rtEnabled) return;

    mirrorCamera.fov = camera.fov;
    mirrorCamera.aspect = camera.aspect;
    mirrorCamera.near = camera.near;
    mirrorCamera.far = camera.far;
    mirrorCamera.updateProjectionMatrix();

    mirrorCamera.position.set(camera.position.x, -camera.position.y, camera.position.z);
    mirrorCamera.up.set(0, 1, 0);
    mirrorCamera.lookAt(camLookCurrent.x, -camLookCurrent.y, camLookCurrent.z);

    const prevRainVis = world.rainLines.visible;
    const prevSplashVis = world.rainSplashGroup.visible;

    world.groundGroup.visible = false;
    world.waterGroup.visible = false;
    world.roadGroup.visible = false;
    world.roadShadowGroup.visible = false;
    skidGroup.visible = false;
    world.rainLines.visible = false;
    world.rainSplashGroup.visible = false;

    renderer.setRenderTarget(reflTarget);
    renderer.clear();
    renderer.render(scene, mirrorCamera);
    renderer.setRenderTarget(null);

    world.groundGroup.visible = true;
    world.waterGroup.visible = true;
    world.roadGroup.visible = true;
    world.roadShadowGroup.visible = rtEnabled;
    skidGroup.visible = true;
    world.rainLines.visible = prevRainVis;
    world.rainSplashGroup.visible = prevSplashVis;

    const cubeInterval = controls && controls.isTouchDevice ? 4 : 2;
    if (frameCounter % cubeInterval === 0) {
      carGroup.visible = false;
      world.rainLines.visible = false;
      world.rainSplashGroup.visible = false;
      cubeCamera.position.set(car.x, car.y + 1.15, car.z);
      cubeCamera.update(renderer, scene);
      carGroup.visible = true;
      world.rainLines.visible = prevRainVis;
      world.rainSplashGroup.visible = prevSplashVis;
    }
  }

  // =========================================================================
  // 7. HUD TELEMETRY, PHYSICS BADGES & MULTI-CITY MINIMAP WITH TRAFFIC LIGHTS
  // =========================================================================
  const speedEl = document.getElementById("speed-value");
  const gearEl = document.getElementById("gear-value");
  const rpmFill = document.getElementById("rpm-fill");
  const rpmText = document.getElementById("rpm-text");
  const nitroFill = document.getElementById("nitro-fill");
  const nitroText = document.getElementById("nitro-text");
  const wetnessFill = document.getElementById("wetness-fill");
  const wetnessText = document.getElementById("wetness-text");
  const wetnessTrendEl = document.getElementById("wetness-trend");
  const coordsEl = document.getElementById("coords-display");
  const zoneEl = document.getElementById("status-zone");
  const surfacePill = document.getElementById("surface-pill");
  const gripReadout = document.getElementById("grip-readout");
  const badgeAbs = document.getElementById("badge-abs");
  const badgeDrift = document.getElementById("badge-drift");
  const badgeTcs = document.getElementById("badge-tcs");

  const minimapCanvas = document.getElementById("minimap");
  const mapCtx = minimapCanvas.getContext("2d");

  function signalColorHex(state) {
    return state === "GREEN" ? "#22c55e" : state === "YELLOW" ? "#facc15" : "#ef4444";
  }

  function drawMinimap() {
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const scale = 0.145;

    mapCtx.clearRect(0, 0, w, h);
    mapCtx.fillStyle = "#082f49";
    mapCtx.fillRect(0, 0, w, h);

    mapCtx.save();
    mapCtx.translate(w / 2, h / 2);

    // 1) 3 Distinct City Islands + Lagoon Cutout
    for (let i = 0; i < ISLANDS.length; i++) {
      const isl = ISLANDS[i];
      mapCtx.fillStyle = isl.id === "palm" ? "#1e3a2f" : isl.id === "pinecrest" ? "#152a24" : "#0f172a";
      mapCtx.fillRect(
        (isl.minX - car.x) * scale,
        (isl.minZ - car.z) * scale,
        (isl.maxX - isl.minX) * scale,
        (isl.maxZ - isl.minZ) * scale
      );
      if (isl.hole) {
        mapCtx.fillStyle = "#0369a1";
        mapCtx.fillRect(
          (isl.hole.minX - car.x) * scale,
          (isl.hole.minZ - car.z) * scale,
          (isl.hole.maxX - isl.hole.minX) * scale,
          (isl.hole.maxZ - isl.hole.minZ) * scale
        );
      }
    }

    // 2) Alpine Mountain Ridge
    mapCtx.fillStyle = "rgba(71, 85, 105, 0.55)";
    mapCtx.fillRect((-290 - car.x) * scale, (-870 - car.z) * scale, 580 * scale, 520 * scale);

    // 3) Roads, 4-Lane Highways, Suspension Bridge & Coastal Viaduct
    mapCtx.lineCap = "round";
    for (let i = 0; i < world.roadSegments.length; i++) {
      const s = world.roadSegments[i];
      mapCtx.strokeStyle =
        s.kind === "bridge"
          ? "#f97316"
          : s.kind === "viaduct"
          ? "#38bdf8"
          : s.kind === "highway"
          ? "#64748b"
          : "#334155";
      mapCtx.lineWidth = Math.max(2.2, s.w * scale);
      mapCtx.beginPath();
      mapCtx.moveTo((s.x1 - car.x) * scale, (s.z1 - car.z) * scale);
      mapCtx.lineTo((s.x2 - car.x) * scale, (s.z2 - car.z) * scale);
      mapCtx.stroke();
    }

    // 4) Buildings within view
    mapCtx.fillStyle = "#475569";
    const viewRange = w / scale;
    for (let i = 0; i < world.minimapBuildings.length; i++) {
      const b = world.minimapBuildings[i];
      if (Math.abs(b.x - car.x) > viewRange || Math.abs(b.z - car.z) > viewRange) continue;
      mapCtx.fillRect((b.minX - car.x) * scale, (b.minZ - car.z) * scale, b.w * scale, b.d * scale);
    }

    // 5) Live Traffic Light Signal Indicators (N-S & E-W bars)
    if (world.trafficLights) {
      for (let i = 0; i < world.trafficLights.length; i++) {
        const tl = world.trafficLights[i];
        const lx = (tl.x - car.x) * scale;
        const lz = (tl.z - car.z) * scale;
        if (Math.abs(lx) > w || Math.abs(lz) > h) continue;

        mapCtx.fillStyle = signalColorHex(tl.nsState);
        mapCtx.fillRect(lx - 1.2, lz - 4.2, 2.4, 8.4);

        mapCtx.fillStyle = signalColorHex(tl.ewState);
        mapCtx.fillRect(lx - 4.2, lz - 1.2, 8.4, 2.4);
      }
    }

    // 6) Stunt Ramps
    mapCtx.fillStyle = "#fb923c";
    for (let i = 0; i < world.ramps.length; i++) {
      const r = world.ramps[i];
      mapCtx.fillRect((r.x - car.x) * scale - 3, (r.z - car.z) * scale - 3, 6, 6);
    }

    // 7) Moving AI Traffic & Boats
    if (trafficEnabled) {
      mapCtx.fillStyle = "#facc15";
      for (let i = 0; i < world.trafficCars.length; i++) {
        const ai = world.trafficCars[i];
        const tx = (ai.x - car.x) * scale;
        const tz = (ai.z - car.z) * scale;
        if (Math.abs(tx) > w || Math.abs(tz) > h) continue;
        mapCtx.fillRect(tx - 1.7, tz - 1.7, 3.4, 3.4);
      }

      mapCtx.fillStyle = "#e0f2fe";
      for (let i = 0; i < world.boats.length; i++) {
        const b = world.boats[i];
        const bx = (b.x - car.x) * scale;
        const bz = (b.z - car.z) * scale;
        if (Math.abs(bx) > w || Math.abs(bz) > h) continue;
        mapCtx.beginPath();
        mapCtx.arc(bx, bz, b.kind === "ship" ? 3.5 : 2.3, 0, Math.PI * 2);
        mapCtx.fill();
      }
    }

    // 8) Player Arrow
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

  function updateHUD(vLong) {
    speedEl.textContent = Math.round(Math.abs(vLong) * 3.6);
    gearEl.textContent = car.gear;

    const rpm = Math.round(car.rpm);
    rpmText.textContent = rpm;
    rpmFill.style.width = `${Math.min(100, (rpm / 8000) * 100)}%`;

    nitroFill.style.width = `${car.nitro}%`;
    nitroText.textContent = `${Math.round(car.nitro)}%`;

    const wetPct = Math.round(roadMoisture * 100);
    wetnessFill.style.width = `${wetPct}%`;
    wetnessText.textContent = `${wetPct}%`;
    wetnessTrendEl.textContent = moistureTrend;
    wetnessTrendEl.className =
      moistureTrend === "WETTING" || moistureTrend === "WET"
        ? "trend-tag wetting"
        : moistureTrend === "DRYING"
        ? "trend-tag drying"
        : "trend-tag";

    badgeAbs.classList.toggle("active-abs", car.absActive);
    badgeDrift.classList.toggle("active-drift", car.drifting);
    badgeTcs.classList.toggle("active-tcs", car.tcsActive);

    coordsEl.textContent = `X: ${Math.round(car.x)} | Z: ${Math.round(car.z)} | ALT: ${Math.max(0, Math.round(car.y))}m`;

    surfacePill.textContent = car.surfaceLabel;
    surfacePill.className = `surface-pill ${car.surfaceClass}`;
    gripReadout.textContent = `GRIP ${Math.round(Math.min(130, (car.currentGrip / 1.9) * 100))}%`;

    zoneEl.textContent = world.getZoneName(car.x, car.z);

    drawMinimap();
  }

  // =========================================================================
  // 8. BUTTONS, RESIZE & MAIN LOOP
  // =========================================================================
  function bindButton(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", (e) => {
      e.currentTarget.blur();
      handler();
    });
  }

  bindButton("btn-garage", () => toggleGarage());
  bindButton("btn-siren", toggleSiren);
  bindButton("btn-rt", toggleRayTracing);
  bindButton("btn-traffic", toggleTraffic);
  bindButton("btn-weather", cycleWeather);
  bindButton("btn-time", cycleTimeOfDay);
  bindButton("btn-camera", cycleCamera);
  bindButton("btn-warp", cycleWarp);
  bindButton("btn-sound", () => audio.toggle());
  bindButton("btn-reset", resetCar);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    const activeReflScale = controls && controls.isTouchDevice ? 0.45 : reflScale;
    reflTarget.setSize(
      Math.max(256, Math.floor(window.innerWidth * activeReflScale)),
      Math.max(256, Math.floor(window.innerHeight * activeReflScale))
    );
    renderer.getDrawingBufferSize(drawingBufferSize);
    world.setRoadUniform("uResolution", drawingBufferSize);
    world.setWaterUniform("uResolution", drawingBufferSize);
  });

  applyEnvironment();
  const clock = new THREE.Clock();
  let elapsed = 0;

  function animate() {
    requestAnimationFrame(animate);
    frameCounter++;
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    if (controls) controls.poll(dt);

    const weather = WEATHER_PRESETS[weatherIndex];
    world.setRoadUniform("uTime", elapsed);
    world.setWaterUniform("uTime", elapsed);

    updateRoadMoisture(dt);
    world.updateTrafficAndBoats(dt, elapsed, car, weather.waveStrength, roadMoisture, trafficEnabled);
    const { vLong, usingNitro } = updatePhysics(dt, elapsed);
    updateCamera(dt, vLong, usingNitro, elapsed);

    const flash = world.updateWeather(dt, weather, camera.position, car, car.inTunnel, () => audio.playThunder());
    flashOverlay.style.opacity = car.inTunnel ? "0" : (flash * 0.65).toFixed(3);

    renderRTPasses();
    updateHUD(vLong);

    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) eventBanner.classList.remove("visible");
    }

    renderer.render(scene, camera);
  }

  animate();
})();