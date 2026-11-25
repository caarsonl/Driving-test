(() => {
  "use strict";

  const {
    CONFIG,
    TIME_PRESETS,
    WEATHER_PRESETS,
    FLOOR_MODES,
    samplePuddleAt,
    buildWorld,
  } = window.HorizonWorld;

  const { ISLAND_HALF, WORLD_LIMIT, ROAD_WIDTH, ROAD_LINES, HARBOR, PORT_ZONE, STUNT_ZONE } = CONFIG;
  const CAMERA_MODES = ["CHASE", "HOOD", "ORBIT"];

  // =========================================================================
  // 1. RENDERER, CAMERAS, LIGHTS & RT RENDER TARGETS
  // =========================================================================
  const container = document.getElementById("canvas-container");
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 2400);
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
  const cubeCamera = new THREE.CubeCamera(0.5, 650, cubeRenderTarget);
  scene.add(cubeCamera);

  const hemiLight = new THREE.HemisphereLight(0xfdba74, 0x1e293b, 0.64);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffa45b, 1.45);
  sunLight.position.set(-320, 92, -240);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 780;
  const shadowExtent = 170;
  sunLight.shadow.camera.left = -shadowExtent;
  sunLight.shadow.camera.right = shadowExtent;
  sunLight.shadow.camera.top = shadowExtent;
  sunLight.shadow.camera.bottom = -shadowExtent;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(42, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd199, fog: false })
  );
  scene.add(sunDisc);

  const world = buildWorld(scene, reflTarget, drawingBufferSize);

  // =========================================================================
  // 2. PLAYER SPORTS COUPE + SKIDMARKS + PARTICLES
  // =========================================================================
  const carGroup = new THREE.Group();
  const carBodyGroup = new THREE.Group();
  carGroup.add(carBodyGroup);
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

  const trimMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.55, roughness: 0.38 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.58, 4.55), bodyMat);
  chassis.position.y = 0.62;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  carBodyGroup.add(chassis);

  const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.1, 0.45), trimMat);
  frontSplitter.position.set(0, 0.34, -2.25);
  carBodyGroup.add(frontSplitter);

  const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.18, 0.25), trimMat);
  rearDiffuser.position.set(0, 0.38, 2.24);
  carBodyGroup.add(rearDiffuser);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.54, 2.15), cabinMat);
  cabin.position.set(0, 1.13, 0.18);
  cabin.castShadow = true;
  carBodyGroup.add(cabin);

  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.09, 0.44), trimMat);
  spoilerWing.position.set(0, 1.24, 2.04);
  spoilerWing.castShadow = true;
  carBodyGroup.add(spoilerWing);

  [-0.72, 0.72].forEach((sx) => {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.24), trimMat);
    strut.position.set(sx, 1.04, 2.04);
    carBodyGroup.add(strut);
  });

  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfffbeb, emissiveIntensity: 2.5 });
  const brakeLightMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xff1e1e, emissiveIntensity: 0.6 });

  const volumetricBeams = [];
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff6d6,
    transparent: true,
    opacity: 0.085,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  [-0.74, 0.74].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.08), headlightMat);
    hl.position.set(lx, 0.68, -2.28);
    carBodyGroup.add(hl);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 15, 16, 1, true), beamMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(lx, 0.66, -9.8);
    carBodyGroup.add(cone);
    volumetricBeams.push(cone);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.08), brakeLightMat);
    tl.position.set(lx, 0.7, 2.28);
    carBodyGroup.add(tl);
  });

  const headSpot = new THREE.SpotLight(0xfff8e7, 3.0, 110, Math.PI / 4.8, 0.48, 1.15);
  headSpot.position.set(0, 0.95, -2.0);
  const headTarget = new THREE.Object3D();
  headTarget.position.set(0, 0.0, -28);
  carBodyGroup.add(headSpot);
  carBodyGroup.add(headTarget);
  headSpot.target = headTarget;

  const rearGlowLight = new THREE.PointLight(0xff2222, 1.0, 14);
  rearGlowLight.position.set(0, 0.7, 2.8);
  carBodyGroup.add(rearGlowLight);

  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
  const flames = [-0.52, 0.52].map((fx) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.17, 1.3, 8), flameMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(fx, 0.42, 2.88);
    cone.visible = false;
    carBodyGroup.add(cone);
    return cone;
  });

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 18);
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
    { x: -1.08, y: 0.42, z: -1.36, front: true },
    { x: 1.08, y: 0.42, z: -1.36, front: true },
    { x: -1.08, y: 0.42, z: 1.36, front: false },
    { x: 1.08, y: 0.42, z: 1.36, front: false },
  ].forEach((wp) => {
    const pivot = new THREE.Group();
    pivot.position.set(wp.x, wp.y, wp.z);

    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    const hub = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.5, 0.14), rimMat);
    tire.add(hub);

    pivot.add(tire);
    carGroup.add(pivot);

    wheelMeshes.push(tire);
    if (wp.front) frontWheelPivots.push(pivot);
  });

  // Persistent Tire Skidmarks
  const MAX_SKIDS = 240;
  const skidGroup = new THREE.Group();
  scene.add(skidGroup);
  const skidGeo = new THREE.PlaneGeometry(0.34, 1.05);
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

  function dropSkidmark(x, y, z, heading, isWet) {
    const m = skidPool[skidIdx];
    skidIdx = (skidIdx + 1) % MAX_SKIDS;
    m.position.set(x, y + 0.08, z);
    m.rotation.y = heading;
    m.material.color.setHex(isWet ? 0x1e293b : 0x090b10);
    m.material.opacity = isWet ? 0.25 : 0.52;
    m.visible = true;
  }

  // Smoke & Water Spray Particles
  const particlePool = [];
  const particleGeo = new THREE.SphereGeometry(0.36, 6, 6);
  for (let i = 0; i < 80; i++) {
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
      p.mesh.material.opacity = 0.34;
      p.mesh.scale.setScalar(0.45);
      p.maxLife = 0.42;
      p.life = p.maxLife;
      p.vx = (Math.random() - 0.5) * 2.2;
      p.vy = 1.6 + Math.random() * 1.4;
      p.vz = (Math.random() - 0.5) * 2.2;
      p.gravity = 5.0;
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
  // 3. PROCEDURAL WEB AUDIO ENGINE
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
    wetTireGain: null,
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
        [
          this.engineGain, this.screechGain, this.windGain, this.rainGain,
          this.wetTireGain, this.nitroNoiseGain, this.turboGain, this.hornGain,
        ].forEach((g) => g.gain.setTargetAtTime(0, now, 0.04));
      }
    },

    update(rpm, absSpeed, slipAmt, throttle, drifting, usingNitro, hornPressed, rainAudio, wetAmount) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;

      const normRpm = THREE.MathUtils.clamp((rpm - 800) / 7200, 0, 1);
      const baseFreq = 34 + normRpm * 92 + (usingNitro ? 14 : 0);

      this.oscSub.frequency.setTargetAtTime(baseFreq, now, 0.035);
      this.oscMain.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.035);
      this.oscHarm.frequency.setTargetAtTime(baseFreq * 3.01, now, 0.035);

      const cutoff = 220 + normRpm * 1350 + (throttle > 0 ? 350 : 0) + (usingNitro ? 500 : 0);
      this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);
      this.engineGain.gain.setTargetAtTime(0.09 + normRpm * 0.11 + (throttle > 0 ? 0.045 : 0), now, 0.05);

      const screechLevel = drifting ? Math.min(0.19, slipAmt * 0.14) * (1 - wetAmount * 0.55) : 0;
      this.screechFilter.frequency.setTargetAtTime(1400 + Math.min(600, absSpeed * 8), now, 0.05);
      this.screechGain.gain.setTargetAtTime(screechLevel, now, 0.04);

      const wetHiss = wetAmount > 0.2 && absSpeed > 4 ? Math.min(0.16, absSpeed * 0.0028 * wetAmount) : 0;
      this.wetTireGain.gain.setTargetAtTime(wetHiss, now, 0.06);

      this.windGain.gain.setTargetAtTime(absSpeed > 22 ? Math.min(0.15, (absSpeed - 22) * 0.0024) : 0, now, 0.08);
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
  // 4. STATE, INPUTS & ENVIRONMENT CONTROLS
  // =========================================================================
  let rtEnabled = true;
  let trafficEnabled = true;
  let floorModeIndex = 0;
  let weatherIndex = 0;
  let timeIndex = 0;
  let cameraModeIdx = 0;

  let activeWetness = 0.95;
  let activeCoverage = 0.5;

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
    if (code === "KeyP") toggleTraffic();
    if (code === "KeyB") cycleFloorMode();
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

  let bannerTimer = 0;
  const eventBanner = document.getElementById("event-banner");
  function showBanner(text) {
    eventBanner.textContent = text;
    eventBanner.classList.add("visible");
    bannerTimer = 1.4;
  }

  function applyEnvironment() {
    const t = TIME_PRESETS[timeIndex];
    const w = WEATHER_PRESETS[weatherIndex];
    const f = FLOOR_MODES[floorModeIndex];

    if (f.wetness < 0) {
      activeWetness = w.autoFloor.wetness;
      activeCoverage = w.autoFloor.coverage;
    } else {
      activeWetness = f.wetness;
      activeCoverage = f.coverage;
    }

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
    world.setRoadUniform("uWetness", activeWetness);
    world.setRoadUniform("uPuddleCoverage", activeCoverage);
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
    world.roadShadowGroup.visible = rtEnabled;
    volumetricBeams.forEach((b) => (b.visible = rtEnabled && headlightsOn));
    headSpot.intensity = rtEnabled && headlightsOn ? 3.2 : headlightsOn ? 1.2 : 0;

    document.getElementById("time-label").textContent = t.name;
    document.getElementById("weather-label").textContent = w.name;
    document.getElementById("btn-weather").classList.toggle("active", w.name !== "CLEAR");

    document.getElementById("floor-label").textContent = f.name;
    document.getElementById("btn-floor").classList.toggle("active", f.name !== "DRY");

    document.getElementById("rt-label").textContent = rtEnabled ? "ON" : "OFF";
    document.getElementById("btn-rt").classList.toggle("active", rtEnabled);

    const tLabel = document.getElementById("traffic-label");
    const tBtn = document.getElementById("btn-traffic");
    if (tLabel) tLabel.textContent = trafficEnabled ? "ON" : "OFF";
    if (tBtn) tBtn.classList.toggle("active", trafficEnabled);
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

  function cycleFloorMode() {
    floorModeIndex = (floorModeIndex + 1) % FLOOR_MODES.length;
    applyEnvironment();
    showBanner(`FLOOR: ${FLOOR_MODES[floorModeIndex].name}`);
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

  // =========================================================================
  // 5. VEHICLE PHYSICS + BUILDING, TRAFFIC & BOAT COLLISIONS
  // =========================================================================
  const GEAR_RATIOS = [3.45, 2.28, 1.62, 1.22, 0.94, 0.74];
  const GEAR_SPEED_THRESH = [48, 92, 142, 196, 254, 335];

  const car = {
    x: 0,
    y: 0,
    z: 20,
    vx: 0,
    vy: 0,
    vz: 0,
    heading: 0,
    yawRate: 0,
    steerAngle: 0,
    nitro: 100,
    grounded: true,
    inWater: false,
    suspOffset: 0,
    suspVel: 0,
    pitch: 0,
    roll: 0,
    accelLong: 0,
    accelLat: 0,
    prevForwardSpeed: 0,
    prevLateralSpeed: 0,
    gear: "N",
    gearNum: 0,
    rpm: 850,
    airTime: 0,
    drifting: false,
    slipAmount: 0,
    surfaceLabel: "DRY ASPHALT",
    surfaceClass: "dry",
    currentGrip: 1.0,
    wetUnderCar: 0,
  };

  let impactCooldown = 0;
  let splashCooldown = 0;

  function resetCar() {
    car.x = 0;
    car.y = 0.2;
    car.z = 20;
    car.vx = 0;
    car.vy = 0;
    car.vz = 0;
    car.heading = 0;
    car.yawRate = 0;
    car.steerAngle = 0;
    car.suspOffset = 0;
    car.suspVel = 0;
    car.pitch = 0;
    car.roll = 0;
    car.nitro = 100;
    car.grounded = true;
    car.inWater = false;
    showBanner("CAR RESET");
  }

  function sampleSurface(x, z, currentY) {
    const overWater = world.isOverWater(x, z);
    const onRoad = !overWater && world.isOnRoad(x, z);
    let bestH = overWater ? -0.34 : 0.0;
    let slopePitch = 0;
    let hitWall = false;
    let onRamp = false;

    for (let i = 0; i < world.ramps.length; i++) {
      const r = world.ramps[i];
      const dx = x - r.x;
      const dz = z - r.z;
      const cosA = Math.cos(r.angleY);
      const sinA = Math.sin(r.angleY);

      const lx = dx * cosA - dz * sinA;
      const lz = dx * sinA + dz * cosA;

      if (Math.abs(lx) <= r.width / 2 + 0.8 && Math.abs(lz) <= r.length / 2 + 0.5) {
        const t = THREE.MathUtils.clamp((r.length / 2 - lz) / r.length, 0, 1);
        const rampH = t * r.height;

        if (rampH - currentY > 1.15) {
          hitWall = true;
        } else if (rampH > bestH) {
          bestH = rampH;
          onRamp = true;
          const rampFX = -Math.sin(r.angleY);
          const rampFZ = -Math.cos(r.angleY);
          const carFX = -Math.sin(car.heading);
          const carFZ = -Math.cos(car.heading);
          slopePitch = Math.atan2(r.height, r.length) * (rampFX * carFX + rampFZ * carFZ);
        }
      }
    }

    return { height: bestH, slopePitch, hitWall, overWater, onRoad: onRoad || onRamp };
  }

  function resolveCollisions() {
    const radius = 2.08;
    const nearby = world.getNearbyBuildings(car.x, car.z);
    let maxImpact = 0;

    // 1. Buildings
    for (let i = 0; i < nearby.length; i++) {
      const b = nearby[i];
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
          car.vx -= 1.32 * vn * nx;
          car.vz -= 1.32 * vn * nz;
          car.vx *= 0.72;
          car.vz *= 0.72;
          car.yawRate *= 0.5;
        }
      }
    }

    // 2. Moving AI Traffic Cars & Boats
    if (trafficEnabled) {
      for (let i = 0; i < world.trafficCars.length; i++) {
        const ai = world.trafficCars[i];
        if (Math.abs(car.y - ai.y) > 2.4) continue;
        const dx = car.x - ai.x;
        const dz = car.z - ai.z;
        const minDist = radius + ai.radius;
        const distSq = dx * dx + dz * dz;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.0001;
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = minDist - dist;

          car.x += nx * overlap * 0.65;
          car.z += nz * overlap * 0.65;
          ai.x -= nx * overlap * 0.35;
          ai.z -= nz * overlap * 0.35;

          const vn = car.vx * nx + car.vz * nz;
          if (vn < 0) {
            maxImpact = Math.max(maxImpact, -vn);
            car.vx -= 1.25 * vn * nx;
            car.vz -= 1.25 * vn * nz;
            car.vx *= 0.78;
            car.vz *= 0.78;
            // Knock AI vehicle briefly before it recovers
            ai.knockVx = -nx * Math.min(18, -vn * 0.65);
            ai.knockVz = -nz * Math.min(18, -vn * 0.65);
            ai.stunTimer = 0.75;
          }
        }
      }

      for (let i = 0; i < world.boats.length; i++) {
        const b = world.boats[i];
        if (car.y > 4.0) continue;
        const dx = car.x - b.x;
        const dz = car.z - b.z;
        const minDist = radius + b.radius;
        const distSq = dx * dx + dz * dz;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.0001;
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = minDist - dist;

          car.x += nx * overlap;
          car.z += nz * overlap;

          const vn = car.vx * nx + car.vz * nz;
          if (vn < 0) {
            maxImpact = Math.max(maxImpact, -vn);
            car.vx -= 1.3 * vn * nx;
            car.vz -= 1.3 * vn * nz;
          }
        }
      }
    }

    // 3. Outer Ocean Boundary
    if (car.x > WORLD_LIMIT) { maxImpact = Math.max(maxImpact, Math.abs(car.vx)); car.x = WORLD_LIMIT; car.vx *= -0.4; }
    if (car.x < -WORLD_LIMIT) { maxImpact = Math.max(maxImpact, Math.abs(car.vx)); car.x = -WORLD_LIMIT; car.vx *= -0.4; }
    if (car.z > WORLD_LIMIT) { maxImpact = Math.max(maxImpact, Math.abs(car.vz)); car.z = WORLD_LIMIT; car.vz *= -0.4; }
    if (car.z < -WORLD_LIMIT) { maxImpact = Math.max(maxImpact, Math.abs(car.vz)); car.z = -WORLD_LIMIT; car.vz *= -0.4; }

    if (maxImpact > 4.5 && impactCooldown <= 0) {
      audio.playImpact(maxImpact);
      car.suspVel -= Math.min(1.6, maxImpact * 0.05);
      impactCooldown = 0.25;
    }
  }

  function tireForce(slipAngle, grip, stiffness, peakLoad) {
    return -Math.sin(1.45 * Math.atan(stiffness * slipAngle)) * grip * peakLoad;
  }

  function updatePhysics(dt, elapsed) {
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

    let vLong = car.vx * fx + car.vz * fz;
    let vLat = car.vx * rx + car.vz * rz;
    const absSpeed = Math.hypot(vLong, vLat);

    const surfNow = sampleSurface(car.x, car.z, car.y);
    let surfaceGrip = 1.08;
    let rollingDrag = 0.26;
    car.wetUnderCar = 0;

    if (surfNow.overWater) {
      surfaceGrip = 0.45;
      rollingDrag = 1.85;
      car.wetUnderCar = 1.0;
      car.surfaceLabel = "WATER";
      car.surfaceClass = "water";
    } else if (surfNow.onRoad) {
      const puddleVal = samplePuddleAt(car.x, car.z, activeWetness, activeCoverage);
      car.wetUnderCar = puddleVal;
      surfaceGrip = THREE.MathUtils.lerp(1.08, 0.72, puddleVal);
      rollingDrag = THREE.MathUtils.lerp(0.24, 0.34, puddleVal);
      if (puddleVal > 0.38) {
        car.surfaceLabel = "WET PUDDLE";
        car.surfaceClass = "wet";
      } else {
        car.surfaceLabel = "DRY ASPHALT";
        car.surfaceClass = "dry";
      }
    } else {
      const grassWet = activeWetness * 0.4;
      car.wetUnderCar = grassWet;
      surfaceGrip = 0.64 - grassWet * 0.1;
      rollingDrag = 0.78;
      car.surfaceLabel = "OFF-ROAD GRASS";
      car.surfaceClass = "offroad";
    }
    car.currentGrip = surfaceGrip;

    const usingNitro = wantsNitro && car.nitro > 1 && throttle > 0;
    if (usingNitro) car.nitro = Math.max(0, car.nitro - 26 * dt);
    else car.nitro = Math.min(100, car.nitro + 10 * dt);

    flames.forEach((f) => {
      f.visible = usingNitro;
      if (usingNitro) f.scale.y = 0.8 + Math.random() * 0.7;
    });

    const maxSteer = THREE.MathUtils.lerp(0.56, 0.22, Math.min(1, absSpeed / 65));
    const steerRate = steerInput !== 0 ? 7.5 : 10.5;
    car.steerAngle = THREE.MathUtils.lerp(car.steerAngle, steerInput * maxSteer, 1 - Math.exp(-steerRate * dt));

    const weightShift = THREE.MathUtils.clamp(car.accelLong * 0.012, -0.22, 0.22);
    const frontLoad = 0.5 - weightShift;
    const rearLoad = 0.5 + weightShift;

    if (car.grounded) {
      const normRpm = THREE.MathUtils.clamp((car.rpm - 850) / 7150, 0, 1);
      const torqueCurve = 0.68 + 0.36 * Math.sin(normRpm * Math.PI * 0.85);
      const activeRatio = car.gearNum > 0 ? GEAR_RATIOS[car.gearNum - 1] : 3.2;

      let driveAccel = 0;
      if (throttle > 0) {
        const baseDrive = (16.5 + activeRatio * 8.2) * torqueCurve * (usingNitro ? 1.58 : 1.0);
        driveAccel = Math.min(baseDrive, 46 * surfaceGrip * (0.7 + rearLoad * 0.6) * (usingNitro ? 1.45 : 1.0));
      } else if (throttle < 0) {
        if (vLong > 1.5) driveAccel = -48 * Math.min(1.1, surfaceGrip);
        else driveAccel = -22 * surfaceGrip;
      } else {
        driveAccel = -Math.sign(vLong) * Math.min(Math.abs(vLong) * 1.2, 3.2);
      }

      if (handbrake) driveAccel -= Math.sign(vLong) * 14 * surfaceGrip;

      const aeroDrag = -vLong * Math.abs(vLong) * (usingNitro ? 0.0044 : 0.0068);
      const rollForce = -vLong * rollingDrag;

      vLong += (driveAccel + aeroDrag + rollForce) * dt;
      const topCap = car.inWater ? 24 : usingNitro ? 92 : 69;
      vLong = THREE.MathUtils.clamp(vLong, -24, topCap);

      const halfL = 1.36;
      const speedClamped = Math.max(Math.abs(vLong), 2.5);
      const dirSign = vLong >= -0.3 ? 1 : -1;

      if (absSpeed > 0.35) {
        const vLatF = vLat + car.yawRate * halfL;
        const vLatR = vLat - car.yawRate * halfL;

        const alphaF = Math.atan2(vLatF, speedClamped) - car.steerAngle * dirSign;
        const alphaR = Math.atan2(vLatR, speedClamped);

        const frontGrip = surfaceGrip * (0.85 + frontLoad * 0.45);
        const rearGrip = surfaceGrip * (0.85 + rearLoad * 0.45) * (handbrake ? 0.24 : 1.0);
        const powerOversteer = throttle > 0 && car.wetUnderCar > 0.35 && absSpeed > 14 ? 0.82 : 1.0;

        const FyF = tireForce(alphaF, frontGrip, 4.6, 26.0);
        const FyR = tireForce(alphaR, rearGrip * powerOversteer, 4.4, 27.5);

        const latAccel = FyF + FyR;
        const yawAccel = (FyF * halfL - FyR * halfL) * 0.52;

        const lowSpeedBlend = Math.min(1, absSpeed / 6.0);
        vLat += latAccel * dt * lowSpeedBlend;
        car.yawRate += yawAccel * dt * lowSpeedBlend;

        if (absSpeed < 6.0) {
          const targetYaw = (vLong / 2.72) * Math.tan(car.steerAngle);
          car.yawRate = THREE.MathUtils.lerp(car.yawRate, targetYaw, 10 * dt);
          vLat *= Math.exp(-10 * dt);
        } else {
          car.yawRate *= Math.exp(-3.4 * dt);
        }

        car.slipAmount = Math.abs(alphaR);
      } else {
        vLat *= Math.exp(-14 * dt);
        car.yawRate *= Math.exp(-14 * dt);
        car.slipAmount = 0;
      }

      car.heading += car.yawRate * dt;
    } else {
      vLong *= Math.exp(-0.14 * dt);
      vLat *= Math.exp(-0.14 * dt);
      car.yawRate *= Math.exp(-1.5 * dt);
      car.heading += car.yawRate * dt;
      car.slipAmount = 0;
    }

    car.accelLong = THREE.MathUtils.lerp(car.accelLong, (vLong - car.prevForwardSpeed) / Math.max(dt, 0.008), 8 * dt);
    car.accelLat = THREE.MathUtils.lerp(car.accelLat, (vLat - car.prevLateralSpeed) / Math.max(dt, 0.008) + vLong * car.yawRate, 8 * dt);
    car.prevForwardSpeed = vLong;
    car.prevLateralSpeed = vLat;

    const nfx = -Math.sin(car.heading);
    const nfz = -Math.cos(car.heading);
    const nrx = Math.cos(car.heading);
    const nrz = -Math.sin(car.heading);

    car.vx = nfx * vLong + nrx * vLat;
    car.vz = nfz * vLong + nrz * vLat;

    const prevX = car.x;
    const prevZ = car.z;
    const prevY = car.y;

    car.x += car.vx * dt;
    car.z += car.vz * dt;

    const surf = sampleSurface(car.x, car.z, car.y);
    if (surf.hitWall) {
      if (Math.abs(vLong) > 6 && impactCooldown <= 0) {
        audio.playImpact(Math.abs(vLong));
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
        const impactVy = Math.abs(car.vy);
        car.suspVel -= Math.min(3.5, impactVy * 0.22);
        if (surf.overWater) {
          audio.playWaterSplash(impactVy + Math.abs(vLong));
          showBanner("WATER SPLASH!");
        } else {
          if (impactVy > 7.5) audio.playImpact(impactVy * 1.1);
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

    if (car.inWater && !wasInWater && splashCooldown <= 0) {
      audio.playWaterSplash(Math.abs(vLong) + 8);
      splashCooldown = 0.6;
      for (let s = 0; s < 12; s++) {
        spawnParticle(car.x + (Math.random() - 0.5) * 2.4, 0.0, car.z + (Math.random() - 0.5) * 2.4, "splash");
      }
    }

    resolveCollisions();

    let targetHeave = 0;
    if (car.inWater) {
      targetHeave = Math.sin(elapsed * 4.2) * 0.06;
    } else if (car.grounded && !surf.onRoad && absSpeed > 3) {
      targetHeave = Math.sin(elapsed * absSpeed * 1.5) * 0.045;
    }
    const springK = 52;
    const damperC = 9.5;
    car.suspVel += ((targetHeave - car.suspOffset) * springK - car.suspVel * damperC) * dt;
    car.suspOffset = THREE.MathUtils.clamp(car.suspOffset + car.suspVel * dt, -0.22, 0.22);

    const kmh = Math.abs(vLong) * 3.6;
    let gearStr = "N";
    let newGearNum = 0;
    let gearRatio = 0;

    if (vLong < -0.5) {
      gearStr = "R";
      newGearNum = -1;
      gearRatio = Math.min(1, kmh / 72);
    } else if (kmh > 1.2) {
      newGearNum = 1;
      for (let i = 0; i < GEAR_SPEED_THRESH.length; i++) {
        if (kmh > GEAR_SPEED_THRESH[i]) newGearNum = Math.min(6, i + 2);
      }
      gearStr = String(newGearNum);
      const low = newGearNum === 1 ? 0 : GEAR_SPEED_THRESH[newGearNum - 2];
      const high = GEAR_SPEED_THRESH[newGearNum - 1];
      gearRatio = THREE.MathUtils.clamp((kmh - low) / (high - low), 0.18, 1);
    }

    if (newGearNum > car.gearNum && car.gearNum >= 1) {
      audio.playGearShiftPop();
      car.suspVel -= 0.14;
    }
    car.gearNum = newGearNum;
    car.gear = gearStr;

    const targetRpm = 850 + gearRatio * 7100 + (throttle > 0 && newGearNum === 0 ? 1500 : 0);
    car.rpm = THREE.MathUtils.lerp(car.rpm, targetRpm, 12 * dt);

    const hardBrake = throttle < 0 && vLong > 10;
    car.drifting = car.grounded && !car.inWater && (car.slipAmount > 0.22 || (handbrake && absSpeed > 8));

    const rearX = car.x - nfx * 1.36;
    const rearZ = car.z - nfz * 1.36;

    if (car.inWater && absSpeed > 3.5) {
      spawnParticle(rearX + nrx * 1.0, 0.05, rearZ + nrz * 1.0, "splash");
      spawnParticle(rearX - nrx * 1.0, 0.05, rearZ - nrz * 1.0, "splash");
    } else if (car.grounded && !car.inWater) {
      if (car.wetUnderCar > 0.4 && absSpeed > 15 && Math.random() < 0.65) {
        spawnParticle(rearX + nrx * 0.95, car.y + 0.18, rearZ + nrz * 0.95, "spray");
        spawnParticle(rearX - nrx * 0.95, car.y + 0.18, rearZ - nrz * 0.95, "spray");
      }
      if (car.drifting || hardBrake) {
        if (car.wetUnderCar < 0.5 && Math.random() < 0.78) {
          spawnParticle(rearX + nrx * 0.92, car.y + 0.22, rearZ + nrz * 0.92, "smoke");
          spawnParticle(rearX - nrx * 0.92, car.y + 0.22, rearZ - nrz * 0.92, "smoke");
        }
        skidAccum += absSpeed * dt;
        if (skidAccum > 0.75 && surf.onRoad) {
          skidAccum = 0;
          dropSkidmark(rearX + nrx * 0.98, car.y, rearZ + nrz * 0.98, car.heading, car.wetUnderCar > 0.45);
          dropSkidmark(rearX - nrx * 0.98, car.y, rearZ - nrz * 0.98, car.heading, car.wetUnderCar > 0.45);
        }
      }
    }

    frontWheelPivots.forEach((p) => (p.rotation.y = car.steerAngle));
    wheelMeshes.forEach((w) => (w.rotation.x -= (vLong * dt) / 0.42));

    const targetPitch = car.grounded
      ? surf.slopePitch + THREE.MathUtils.clamp(car.accelLong * 0.0024, -0.085, 0.07)
      : THREE.MathUtils.clamp(car.vy * 0.018, -0.35, 0.35);
    const targetRoll = THREE.MathUtils.clamp(-car.accelLat * 0.0042, -0.15, 0.15);

    car.pitch = THREE.MathUtils.lerp(car.pitch, targetPitch, 10 * dt);
    car.roll = THREE.MathUtils.lerp(car.roll, targetRoll, 10 * dt);

    carGroup.position.set(car.x, car.y, car.z);
    carGroup.rotation.y = car.heading;
    carBodyGroup.position.y = car.suspOffset;
    carBodyGroup.rotation.x = car.pitch;
    carBodyGroup.rotation.z = car.roll;

    const braking = (throttle < 0 && vLong > 1) || handbrake;
    brakeLightMat.emissiveIntensity = braking ? 2.6 : 0.55;
    rearGlowLight.color.setHex(usingNitro ? 0x38bdf8 : 0xff2222);
    rearGlowLight.intensity = rtEnabled ? (usingNitro ? 2.8 : braking ? 2.2 : 0.75) : 0;

    const fwdVec = new THREE.Vector3(nfx, 0, nfz);
    world.setRoadUniform("uCarPos", carGroup.position);
    world.setRoadUniform("uCarForward", fwdVec);
    world.setRoadUniform("uBrakeIntensity", braking ? 1.4 : 0.45);
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

    const preset = TIME_PRESETS[timeIndex];
    world.skyDome.position.set(car.x, 0, car.z);
    sunLight.position.set(
      car.x + preset.sunPos[0] * 0.45,
      preset.sunPos[1] * 0.55,
      car.z + preset.sunPos[2] * 0.45
    );
    sunLight.target.position.set(car.x, 0, car.z);
    sunDisc.position.set(
      car.x + preset.sunPos[0] * 3.0,
      preset.sunPos[1] * 3.0,
      car.z + preset.sunPos[2] * 3.0
    );

    audio.update(
      car.rpm,
      absSpeed,
      car.slipAmount,
      throttle,
      car.drifting,
      usingNitro,
      hornPressed,
      weather.rainAudio,
      car.wetUnderCar
    );

    return { vLong, usingNitro };
  }

  // =========================================================================
  // 6. CAMERA & RT REFLECTION RENDER PASSES (INCLUDES BOATS & TRAFFIC!)
  // =========================================================================
  const camPosCurrent = new THREE.Vector3(0, 5.5, 31);
  const camLookCurrent = new THREE.Vector3(0, 1.4, 14);

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
      const dist = 10.2 + Math.min(3.6, Math.abs(speed) * 0.042);
      const desiredPos = new THREE.Vector3(car.x - fx * dist, car.y + 4.05, car.z - fz * dist);
      const desiredLook = new THREE.Vector3(car.x + fx * 7.0, car.y + 1.35, car.z + fz * 7.0);

      camPosCurrent.lerp(desiredPos, 1 - Math.exp(-7.5 * dt));
      camLookCurrent.lerp(desiredLook, 1 - Math.exp(-10 * dt));
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    } else if (mode === "HOOD") {
      camPosCurrent.set(car.x + fx * 0.5, car.y + 1.52 + car.suspOffset, car.z + fz * 0.5);
      camLookCurrent.set(car.x + fx * 28, car.y + 1.2 + car.pitch * 12, car.z + fz * 28);
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    } else {
      const desiredPos = new THREE.Vector3(car.x - fx * 20, car.y + 26, car.z - fz * 20);
      camPosCurrent.lerp(desiredPos, 1 - Math.exp(-5 * dt));
      camLookCurrent.set(car.x, car.y + 1, car.z);
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

    // Note: world.trafficGroup and world.boatsGroup remain VISIBLE so they reflect in water & puddles!
    const prevRainVis = world.rainLines.visible;
    world.ground.visible = false;
    world.waterGroup.visible = false;
    world.roadGroup.visible = false;
    world.roadShadowGroup.visible = false;
    skidGroup.visible = false;
    world.rainLines.visible = false;

    renderer.setRenderTarget(reflTarget);
    renderer.clear();
    renderer.render(scene, mirrorCamera);
    renderer.setRenderTarget(null);

    world.ground.visible = true;
    world.waterGroup.visible = true;
    world.roadGroup.visible = true;
    world.roadShadowGroup.visible = rtEnabled;
    skidGroup.visible = true;
    world.rainLines.visible = prevRainVis;

    if (frameCounter % 2 === 0) {
      carGroup.visible = false;
      world.rainLines.visible = false;
      cubeCamera.position.set(car.x, car.y + 1.15, car.z);
      cubeCamera.update(renderer, scene);
      carGroup.visible = true;
      world.rainLines.visible = prevRainVis;
    }
  }

  // =========================================================================
  // 7. HUD TELEMETRY & LIVE TRAFFIC/BOAT MINIMAP
  // =========================================================================
  const speedEl = document.getElementById("speed-value");
  const gearEl = document.getElementById("gear-value");
  const rpmFill = document.getElementById("rpm-fill");
  const rpmText = document.getElementById("rpm-text");
  const nitroFill = document.getElementById("nitro-fill");
  const nitroText = document.getElementById("nitro-text");
  const coordsEl = document.getElementById("coords-display");
  const zoneEl = document.getElementById("status-zone");
  const surfacePill = document.getElementById("surface-pill");
  const gripReadout = document.getElementById("grip-readout");

  const minimapCanvas = document.getElementById("minimap");
  const mapCtx = minimapCanvas.getContext("2d");

  function drawMinimap() {
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const scale = 0.165;

    mapCtx.clearRect(0, 0, w, h);
    mapCtx.fillStyle = "#082f49";
    mapCtx.fillRect(0, 0, w, h);

    mapCtx.save();
    mapCtx.translate(w / 2, h / 2);

    // City Island
    mapCtx.fillStyle = "#0f172a";
    mapCtx.fillRect(
      (-ISLAND_HALF - car.x) * scale,
      (-ISLAND_HALF - car.z) * scale,
      ISLAND_HALF * 2 * scale,
      ISLAND_HALF * 2 * scale
    );

    // Grand Harbor
    mapCtx.fillStyle = "#0369a1";
    mapCtx.fillRect(
      (HARBOR.minX - car.x) * scale,
      (HARBOR.minZ - car.z) * scale,
      (HARBOR.maxX - HARBOR.minX) * scale,
      (HARBOR.maxZ - HARBOR.minZ) * scale
    );

    // Road Grid
    mapCtx.strokeStyle = "#334155";
    mapCtx.lineWidth = Math.max(2, ROAD_WIDTH * scale);
    ROAD_LINES.forEach((line) => {
      const rx = (line - car.x) * scale;
      if (rx >= -w && rx <= w) {
        mapCtx.beginPath();
        mapCtx.moveTo(rx, (-998 - car.z) * scale);
        mapCtx.lineTo(rx, (998 - car.z) * scale);
        mapCtx.stroke();
      }
      const rz = (line - car.z) * scale;
      if (rz >= -h && rz <= h) {
        mapCtx.beginPath();
        mapCtx.moveTo((-998 - car.x) * scale, rz);
        mapCtx.lineTo((998 - car.x) * scale, rz);
        mapCtx.stroke();
      }
    });

    // Buildings
    mapCtx.fillStyle = "#475569";
    const viewRange = w / scale;
    for (let i = 0; i < world.buildings.length; i++) {
      const b = world.buildings[i];
      if (Math.abs(b.x - car.x) > viewRange || Math.abs(b.z - car.z) > viewRange) continue;
      mapCtx.fillRect((b.minX - car.x) * scale, (b.minZ - car.z) * scale, b.w * scale, b.d * scale);
    }

    // Stunt Ramps
    mapCtx.fillStyle = "#f97316";
    world.ramps.forEach((r) => {
      mapCtx.fillRect((r.x - car.x) * scale - 3.5, (r.z - car.z) * scale - 3.5, 7, 7);
    });

    // Moving AI Traffic Cars & Harbor/Ocean Boats
    if (trafficEnabled) {
      mapCtx.fillStyle = "#facc15";
      for (let i = 0; i < world.trafficCars.length; i++) {
        const ai = world.trafficCars[i];
        const tx = (ai.x - car.x) * scale;
        const tz = (ai.z - car.z) * scale;
        if (Math.abs(tx) > w || Math.abs(tz) > h) continue;
        mapCtx.fillRect(tx - 2, tz - 2, 4, 4);
      }

      mapCtx.fillStyle = "#e0f2fe";
      for (let i = 0; i < world.boats.length; i++) {
        const b = world.boats[i];
        const bx = (b.x - car.x) * scale;
        const bz = (b.z - car.z) * scale;
        if (Math.abs(bx) > w || Math.abs(bz) > h) continue;
        mapCtx.beginPath();
        mapCtx.arc(bx, bz, b.mode === "patrol" ? 3.5 : 2.5, 0, Math.PI * 2);
        mapCtx.fill();
      }
    }

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

  function updateHUD(vLong) {
    speedEl.textContent = Math.round(Math.abs(vLong) * 3.6);
    gearEl.textContent = car.gear;

    const rpm = Math.round(car.rpm);
    rpmText.textContent = rpm;
    rpmFill.style.width = `${Math.min(100, (rpm / 8000) * 100)}%`;

    nitroFill.style.width = `${car.nitro}%`;
    nitroText.textContent = `${Math.round(car.nitro)}%`;

    coordsEl.textContent = `X: ${Math.round(car.x)} | Z: ${Math.round(car.z)}`;

    surfacePill.textContent = car.surfaceLabel;
    surfacePill.className = `surface-pill ${car.surfaceClass}`;
    gripReadout.textContent = `GRIP ${Math.round(Math.min(100, (car.currentGrip / 1.08) * 100))}%`;

    const dist = Math.hypot(car.x, car.z);
    if (Math.abs(car.x) > ISLAND_HALF - 5 || Math.abs(car.z) > ISLAND_HALF - 5) {
      zoneEl.textContent = "COASTAL OCEAN";
    } else if (car.x > HARBOR.minX - 10 && car.x < HARBOR.maxX + 10 && car.z > HARBOR.minZ - 10 && car.z < HARBOR.maxZ + 10) {
      zoneEl.textContent = "GRAND HARBOR";
    } else if (car.x > STUNT_ZONE.minX && car.x < STUNT_ZONE.maxX && car.z > STUNT_ZONE.minZ && car.z < STUNT_ZONE.maxZ) {
      zoneEl.textContent = "EAST STUNT ARENA";
    } else if (car.x > PORT_ZONE.minX && car.x < PORT_ZONE.maxX && car.z > PORT_ZONE.minZ && car.z < PORT_ZONE.maxZ) {
      zoneEl.textContent = "INDUSTRIAL CONTAINER PORT";
    } else if (dist < 410) {
      zoneEl.textContent = "DOWNTOWN FINANCIAL CORE";
    } else if (dist < 760) {
      zoneEl.textContent = "MIDTOWN DISTRICT";
    } else {
      zoneEl.textContent = "COASTAL PARKLANDS";
    }

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

  bindButton("btn-rt", toggleRayTracing);
  bindButton("btn-traffic", toggleTraffic);
  bindButton("btn-floor", cycleFloorMode);
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

    const weather = WEATHER_PRESETS[weatherIndex];
    world.setRoadUniform("uTime", elapsed);
    world.setWaterUniform("uTime", elapsed);

    world.updateTrafficAndBoats(dt, elapsed, car, weather.waveStrength, trafficEnabled);
    const { vLong, usingNitro } = updatePhysics(dt, elapsed);
    updateCamera(dt, vLong, usingNitro);
    world.updateWeather(dt, weather, camera.position, car, () => audio.playThunder());
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