(() => {
  "use strict";

  const {
    CONFIG,
    WARP_POINTS,
    TIME_PRESETS,
    WEATHER_PRESETS,
    samplePuddleAt,
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

  // Planar reflection target shared by ground roads & ocean water
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

  // Live 360-degree CubeCamera for metallic clearcoat car reflections
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

  // Build the Multi-City World (Metro Bay, Palm Island, Pinecrest, Bridge, Tunnel, Viaduct)
  const world = buildWorld(scene, reflTarget, drawingBufferSize);

  // =========================================================================
  // 2. PLAYER SPORTS COUPE (WITH INDEPENDENT 4-WHEEL VISUAL SUSPENSION)
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
    envMapIntensity: 1.75,
  });

  const cabinMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1020,
    metalness: 0.94,
    roughness: 0.05,
    clearcoat: 1.0,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.95,
  });

  const trimMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.55, roughness: 0.38 });

  // Lower chassis, sculpted hood, front aero splitter & rear diffuser
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.58, 4.55), bodyMat);
  chassis.position.y = 0.62;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  carBodyGroup.add(chassis);

  const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.48), trimMat);
  frontSplitter.position.set(0, 0.34, -2.26);
  carBodyGroup.add(frontSplitter);

  const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.18, 0.28), trimMat);
  rearDiffuser.position.set(0, 0.38, 2.25);
  carBodyGroup.add(rearDiffuser);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.54, 2.15), cabinMat);
  cabin.position.set(0, 1.13, 0.18);
  cabin.castShadow = true;
  carBodyGroup.add(cabin);

  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.09, 0.44), trimMat);
  spoilerWing.position.set(0, 1.24, 2.04);
  spoilerWing.castShadow = true;
  carBodyGroup.add(spoilerWing);

  [-0.72, 0.72].forEach((sx) => {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.24), trimMat);
    strut.position.set(sx, 1.04, 2.04);
    carBodyGroup.add(strut);
  });

  // Headlights, Brake Lights, Volumetric Cones & Dynamic Point Lights
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

  const headSpot = new THREE.SpotLight(0xfff8e7, 3.0, 120, Math.PI / 4.6, 0.48, 1.15);
  headSpot.position.set(0, 0.95, -2.0);
  const headTarget = new THREE.Object3D();
  headTarget.position.set(0, 0.0, -30);
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

  // 4 Wheels mounted to carGroup so the sprung chassis pitches, rolls & heaves over them
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.36, 18);
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
  const wheelPivots = [];
  const frontWheelPivots = [];
  const WHEEL_SPEC = [
    { x: -1.08, y: 0.42, z: -1.38, front: true },
    { x: 1.08, y: 0.42, z: -1.38, front: true },
    { x: -1.08, y: 0.42, z: 1.38, front: false },
    { x: 1.08, y: 0.42, z: 1.38, front: false },
  ];

  WHEEL_SPEC.forEach((wp) => {
    const pivot = new THREE.Group();
    pivot.position.set(wp.x, wp.y, wp.z);

    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    const hub = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.14), rimMat);
    tire.add(hub);

    pivot.add(tire);
    carGroup.add(pivot);

    wheelPivots.push(pivot);
    wheelMeshes.push(tire);
    if (wp.front) frontWheelPivots.push(pivot);
  });

  // Persistent Tire Skidmarks Ring Buffer (height & slope aware!)
  const MAX_SKIDS = 260;
  const skidGroup = new THREE.Group();
  scene.add(skidGroup);
  const skidGeo = new THREE.PlaneGeometry(0.34, 1.1);
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
      // Dry tire smoke
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
  // 3. PROCEDURAL WEB AUDIO ENGINE (WITH TUNNEL RESONANCE & WET TIRE HISS)
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

      // V8 Engine with soft-clipping & tunnel echo send
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

      // Subtle Slapback Echo activated inside the Alpine Ridge Tunnel
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

      const harmGain = ctx.createGain();
      harmGain.gain.value = 0.25;

      this.oscSub.connect(shaper);
      this.oscMain.connect(shaper);
      this.oscHarm.connect(harmGain);
      harmGain.connect(shaper);

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
          this.rainGain, this.wetTireGain, this.nitroNoiseGain, this.turboGain, this.hornGain,
        ].forEach((g) => g.gain.setTargetAtTime(0, now, 0.04));
      }
    },

    update(rpm, absSpeed, slipAmt, throttle, drifting, usingNitro, hornPressed, rainAudio, wetUnderCar, inTunnel) {
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

      // Tunnel echo amplifies engine & horn reverberation inside the mountain bore
      this.tunnelWetGain.gain.setTargetAtTime(inTunnel ? 0.42 : 0.0, now, 0.15);

      const screechLevel = drifting ? Math.min(0.19, slipAmt * 0.14) * (1 - wetUnderCar * 0.55) : 0;
      this.screechFilter.frequency.setTargetAtTime(1400 + Math.min(600, absSpeed * 8), now, 0.05);
      this.screechGain.gain.setTargetAtTime(screechLevel, now, 0.04);

      const wetHiss = wetUnderCar > 0.18 && absSpeed > 4 ? Math.min(0.16, absSpeed * 0.0028 * wetUnderCar) : 0;
      this.wetTireGain.gain.setTargetAtTime(wetHiss, now, 0.06);

      this.windGain.gain.setTargetAtTime(absSpeed > 22 ? Math.min(0.15, (absSpeed - 22) * 0.0024) : 0, now, 0.08);
      // Rain patter muffles cleanly inside the Alpine Ridge Tunnel
      this.rainGain.gain.setTargetAtTime(inTunnel ? rainAudio * 0.12 : rainAudio, now, 0.25);

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
  // 4. GLOBAL STATE, DYNAMIC RAIN-TO-DRY MOISTURE & ENVIRONMENT CONTROLS
  // =========================================================================
  let rtEnabled = true;
  let trafficEnabled = true;
  let weatherIndex = 0; // CLEAR (roads start dry; switch to RAIN/STORM to wet them, CLEAR to watch them evaporate!)
  let timeIndex = 0;    // SUNSET
  let cameraModeIdx = 0;
  let warpIndex = 0;

  // Automatic Road Moisture State (0.0 = Dry -> 1.0 = Rain-Wet with puddles -> gradually evaporates back to 0.0)
  let roadMoisture = 0.0;
  let moistureTrend = "DRY"; // "DRY" | "WETTING" | "DRYING" | "SOAKED"

  const flashOverlay = document.getElementById("flash-overlay");
  const tunnelOverlay = document.getElementById("tunnel-overlay");
  const eventBanner = document.getElementById("event-banner");
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
      // Active rain or storm wets asphalt progressively
      roadMoisture = Math.min(w.targetMoisture, roadMoisture + w.wetRate * dt);
      moistureTrend = roadMoisture >= w.targetMoisture - 0.01 ? "WET" : "WETTING";
    } else if (roadMoisture > w.targetMoisture) {
      // Clear or fog weather evaporates road moisture based on sun warmth (faster at DAY, slower at NIGHT)
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
    bodyMat.envMapIntensity = rtEnabled ? 1.75 : 0.0;
    bodyMat.clearcoat = rtEnabled ? 1.0 : 0.0;
    bodyMat.roughness = rtEnabled ? 0.12 : 0.56;
    bodyMat.needsUpdate = true;

    cabinMat.envMap = rtEnabled ? cubeRenderTarget.texture : null;
    cabinMat.envMapIntensity = rtEnabled ? 1.95 : 0.0;
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

    document.getElementById("rt-label").textContent = rtEnabled ? "ON" : "OFF";
    document.getElementById("btn-rt").classList.toggle("active", rtEnabled);

    document.getElementById("traffic-label").textContent = trafficEnabled ? "ON" : "OFF";
    document.getElementById("btn-traffic").classList.toggle("active", trafficEnabled);
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

  // === END OF PART 1/2 — PASTE PART 2/2 DIRECTLY BELOW THIS LINE ===
  // =========================================================================
  // 5. UPGRADED VEHICLE PHYSICS (PACEJKA SLIP, ABS, TCS, SLOPE & SUSPENSION)
  // =========================================================================
  const GEAR_RATIOS = [3.52, 2.34, 1.66, 1.24, 0.95, 0.74];
  const GEAR_SPEED_THRESH = [50, 96, 146, 200, 258, 340];

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
    nitro: 100,
    grounded: true,
    inWater: false,
    inTunnel: false,
    // Suspension & weight transfer
    suspOffset: 0,
    suspVel: 0,
    pitch: 0,
    roll: 0,
    slopePitch: 0,
    accelLong: 0,
    accelLat: 0,
    prevForwardSpeed: 0,
    prevLateralSpeed: 0,
    // Drivetrain & Physics telemetry
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
    currentGrip: 1.0,
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
    car.suspOffset = 0;
    car.suspVel = 0;
    car.pitch = 0;
    car.roll = 0;
    car.slopePitch = 0;
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
    // Snap cleanly to the nearest fast-travel highway/city point
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

  // Exact Multi-Sphere vs Height-Aware AABB / OBB / Circle Collision Solver
  // Uses dual front/rear bumper spheres + 2 relaxation passes to eliminate corner snagging!
  function resolveCollisions() {
    const nearby = world.getNearbyColliders(car.x, car.z);
    const sphereOffsets = [-1.18, 1.18];
    const sphereRad = 1.12;
    let maxImpact = 0;

    for (let pass = 0; pass < 2; pass++) {
      const fx = -Math.sin(car.heading);
      const fz = -Math.cos(car.heading);

      for (let s = 0; s < sphereOffsets.length; s++) {
        const off = sphereOffsets[s];
        let sx = car.x + fx * off;
        let sz = car.z + fz * off;

        for (let i = 0; i < nearby.length; i++) {
          const c = nearby[i];
          // Height filter: boats/cars below bridges never hit bridge guardrails overhead!
          if (car.y + 1.8 < c.minY || car.y > c.maxY) continue;

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
                // Inside AABB fallback: push out via nearest face
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
            // Transform sphere center into OBB local frame
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
              // Rotate normal back into world space
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
              // Smooth rail/wall scraping without violent sticky bounce
              const bounce = Math.abs(vn) > 12 ? 1.24 : 1.06;
              car.vx -= bounce * vn * nx;
              car.vz -= bounce * vn * nz;
              // Tangent friction proportional to impact normal force
              const scrapeDamp = Math.max(0.76, 1.0 - Math.min(0.24, -vn * 0.012));
              car.vx *= scrapeDamp;
              car.vz *= scrapeDamp;
              car.yawRate *= 0.65;
            }
          }
        }
      }
    }

    // Collisions with AI Traffic & Boats
    const carRadius = 1.95;
    if (trafficEnabled) {
      for (let i = 0; i < world.trafficCars.length; i++) {
        const ai = world.trafficCars[i];
        if (Math.abs(car.y - ai.y) > 2.4) continue;
        const dx = car.x - ai.x;
        const dz = car.z - ai.z;
        const minDist = carRadius + ai.radius;
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
            car.vx -= 1.22 * vn * nx;
            car.vz -= 1.22 * vn * nz;
            car.vx *= 0.8;
            car.vz *= 0.8;
            ai.knockVx = -nx * Math.min(18, -vn * 0.65);
            ai.knockVz = -nz * Math.min(18, -vn * 0.65);
            ai.stunTimer = 0.75;
          }
        }
      }

      for (let i = 0; i < world.boats.length; i++) {
        const b = world.boats[i];
        if (car.y > 4.2) continue;
        const dx = car.x - b.x;
        const dz = car.z - b.z;
        const minDist = carRadius + b.radius;
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
            car.vx -= 1.28 * vn * nx;
            car.vz -= 1.28 * vn * nz;
          }
        }
      }
    }

    // Outer Ocean World Bounds
    if (car.x > WORLD_BOUNDS.maxX) { maxImpact = Math.max(maxImpact, Math.abs(car.vx)); car.x = WORLD_BOUNDS.maxX; car.vx *= -0.35; }
    if (car.x < WORLD_BOUNDS.minX) { maxImpact = Math.max(maxImpact, Math.abs(car.vx)); car.x = WORLD_BOUNDS.minX; car.vx *= -0.35; }
    if (car.z > WORLD_BOUNDS.maxZ) { maxImpact = Math.max(maxImpact, Math.abs(car.vz)); car.z = WORLD_BOUNDS.maxZ; car.vz *= -0.35; }
    if (car.z < WORLD_BOUNDS.minZ) { maxImpact = Math.max(maxImpact, Math.abs(car.vz)); car.z = WORLD_BOUNDS.minZ; car.vz *= -0.35; }

    if (maxImpact > 4.2 && impactCooldown <= 0) {
      audio.playImpact(maxImpact);
      car.suspVel -= Math.min(1.8, maxImpact * 0.055);
      impactCooldown = 0.22;
    }
  }

  // Pacejka Magic Formula Tire Lateral Force Curve
  function pacejkaLateral(slipAngle, grip, B, C, peakForce) {
    const E = 0.92;
    const x = B * slipAngle;
    const val = Math.sin(C * Math.atan(x - E * (x - Math.atan(x))));
    return -val * grip * peakForce;
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

    // Local forward & right unit vectors
    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    const rx = Math.cos(car.heading);
    const rz = -Math.sin(car.heading);

    let vLong = car.vx * fx + car.vz * fz;
    let vLat = car.vx * rx + car.vz * rz;
    const absSpeed = Math.hypot(vLong, vLat);

    // Sample road/bridge/tunnel/water surface beneath car
    const surfNow = world.sampleSurface(car.x, car.z, car.y, car.heading);
    car.inTunnel = surfNow.inTunnel;
    tunnelOverlay.classList.toggle("inside", car.inTunnel);

    // Compute realistic dynamic grip from automatic roadMoisture + localized puddle depth
    let surfaceGrip = 1.12;
    let rollingDrag = 0.24;
    car.wetUnderCar = 0;

    if (surfNow.overWater) {
      surfaceGrip = 0.44;
      rollingDrag = 1.9;
      car.wetUnderCar = 1.0;
      car.surfaceLabel = "WATER";
      car.surfaceClass = "water";
    } else if (surfNow.inTunnel) {
      // Sheltered dry concrete inside Alpine Ridge Tunnel
      surfaceGrip = 1.14;
      rollingDrag = 0.22;
      car.wetUnderCar = 0.0;
      car.surfaceLabel = "DRY TUNNEL";
      car.surfaceClass = "tunnel";
    } else if (surfNow.onRoad) {
      const puddleVal = samplePuddleAt(car.x, car.z, roadMoisture);
      const effWet = Math.max(roadMoisture * 0.62, puddleVal);
      car.wetUnderCar = effWet;

      // Subtle, realistic traction loss: Dry 1.12 -> Damp 0.96 -> Standing Puddle 0.74
      surfaceGrip = 1.12 - roadMoisture * 0.16 - puddleVal * 0.22;
      rollingDrag = 0.23 + effWet * 0.14;

      if (surfNow.surfaceType === "BRIDGE") {
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
      const grassWet = roadMoisture * 0.45;
      car.wetUnderCar = grassWet;
      surfaceGrip = 0.68 - grassWet * 0.12;
      rollingDrag = 0.82;
      car.surfaceLabel = "OFF-ROAD GRASS";
      car.surfaceClass = "offroad";
    }
    car.currentGrip = surfaceGrip;

    // Nitro boost
    const usingNitro = wantsNitro && car.nitro > 1 && throttle > 0;
    if (usingNitro) car.nitro = Math.max(0, car.nitro - 25 * dt);
    else car.nitro = Math.min(100, car.nitro + 10.5 * dt);

    flames.forEach((f) => {
      f.visible = usingNitro;
      if (usingNitro) f.scale.y = 0.8 + Math.random() * 0.7;
    });

    // Progressive speed-sensitive steering + gentle self-aligning countersteer assist
    const maxSteer = THREE.MathUtils.lerp(0.58, 0.21, Math.min(1, absSpeed / 70));
    const steerRate = steerInput !== 0 ? 7.8 : 11.5;
    car.steerAngle = THREE.MathUtils.lerp(car.steerAngle, steerInput * maxSteer, 1 - Math.exp(-steerRate * dt));

    // Aerodynamic Downforce increases tire grip smoothly at highway speeds!
    const aeroDownforce = Math.min(0.28, (absSpeed * absSpeed) * 0.000052);
    const effectiveGrip = surfaceGrip + aeroDownforce;

    // Dynamic Longitudinal Weight Transfer (front loads on braking, rear loads on launch)
    const weightShift = THREE.MathUtils.clamp(car.accelLong * 0.013, -0.24, 0.24);
    const frontLoad = 0.5 - weightShift;
    const rearLoad = 0.5 + weightShift;

    car.absActive = false;
    car.tcsActive = false;

    if (car.grounded) {
      const normRpm = THREE.MathUtils.clamp((car.rpm - 850) / 7150, 0, 1);
      const torqueCurve = 0.72 + 0.34 * Math.sin(normRpm * Math.PI * 0.86);
      const activeRatio = car.gearNum > 0 ? GEAR_RATIOS[car.gearNum - 1] : 3.4;

      let driveAccel = 0;
      if (throttle > 0) {
        const rawDrive = (17.5 + activeRatio * 8.4) * torqueCurve * (usingNitro ? 1.56 : 1.0);
        const tractionCap = 44 * effectiveGrip * (0.68 + rearLoad * 0.64) * (usingNitro ? 1.45 : 1.0);
        if (rawDrive > tractionCap && !handbrake && absSpeed > 4) {
          // Traction Control (TCS) gently feathers excessive wheelspin on wet/grass surfaces
          car.tcsActive = true;
          driveAccel = tractionCap * 0.96;
        } else {
          driveAccel = rawDrive;
        }
      } else if (throttle < 0) {
        if (vLong > 1.5) {
          // Anti-lock Braking System (ABS) pulses smoothly near peak tire grip on wet asphalt
          const brakeDemand = 52;
          const brakeCap = 46 * effectiveGrip * (0.72 + frontLoad * 0.56);
          if (brakeDemand > brakeCap && absSpeed > 10) {
            car.absActive = true;
            const pulse = 0.92 + 0.08 * Math.sin(elapsed * 55);
            driveAccel = -brakeCap * pulse;
          } else {
            driveAccel = -brakeDemand;
          }
        } else {
          driveAccel = -22 * effectiveGrip;
        }
      } else {
        driveAccel = -Math.sign(vLong) * Math.min(Math.abs(vLong) * 1.15, 3.0);
      }

      if (handbrake) {
        driveAccel -= Math.sign(vLong) * 15 * surfaceGrip;
      }

      // True Slope Gravity along bridge arches & highway viaduct ramps!
      const slopeGravity = -28 * Math.sin(surfNow.slopePitch);
      const aeroDrag = -vLong * Math.abs(vLong) * (usingNitro ? 0.0042 : 0.0064);
      const rollForce = -vLong * rollingDrag;

      vLong += (driveAccel + slopeGravity + aeroDrag + rollForce) * dt;
      const topCap = car.inWater ? 24 : usingNitro ? 96 : 74;
      vLong = THREE.MathUtils.clamp(vLong, -24, topCap);

      // Bicycle Slip-Angle Dynamics with Pacejka Magic Formula + Smooth Drift Stability
      const halfL = 1.38;
      const speedClamped = Math.max(Math.abs(vLong), 2.6);
      const dirSign = vLong >= -0.3 ? 1 : -1;

      if (absSpeed > 0.35) {
        const vLatF = vLat + car.yawRate * halfL;
        const vLatR = vLat - car.yawRate * halfL;

        // Subtle countersteer self-alignment when sliding so drifts feel planted and controllable
        const slipRatio = Math.atan2(vLat, speedClamped);
        const autoAlign = steerInput === 0 ? -slipRatio * 0.22 : 0;
        const effSteer = car.steerAngle * dirSign + autoAlign;

        const alphaF = Math.atan2(vLatF, speedClamped) - effSteer;
        const alphaR = Math.atan2(vLatR, speedClamped);

        const frontGrip = effectiveGrip * (0.85 + frontLoad * 0.45);
        const rearGrip = effectiveGrip * (0.85 + rearLoad * 0.45) * (handbrake ? 0.26 : 1.0);
        const wetOversteer = throttle > 0 && car.wetUnderCar > 0.38 && absSpeed > 15 ? 0.84 : 1.0;

        const FyF = pacejkaLateral(alphaF, frontGrip, 4.4, 1.42, 27.5);
        const FyR = pacejkaLateral(alphaR, rearGrip * wetOversteer, 4.2, 1.42, 29.0);

        const latAccel = FyF + FyR;
        const yawAccel = (FyF * halfL - FyR * halfL) * 0.54;

        const lowBlend = Math.min(1, absSpeed / 5.5);
        vLat += latAccel * dt * lowBlend;
        car.yawRate += yawAccel * dt * lowBlend;

        if (absSpeed < 5.5) {
          const kinYaw = (vLong / 2.76) * Math.tan(car.steerAngle);
          car.yawRate = THREE.MathUtils.lerp(car.yawRate, kinYaw, 11 * dt);
          vLat *= Math.exp(-11 * dt);
        } else {
          // Yaw damping prevents infinite spin-outs while allowing sustained power slides
          car.yawRate *= Math.exp(-(handbrake ? 2.4 : 3.8) * dt);
        }

        car.slipAmount = Math.abs(alphaR);
      } else {
        vLat *= Math.exp(-15 * dt);
        car.yawRate *= Math.exp(-15 * dt);
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

    // Track real accelerations for weight transfer & suspension lean
    car.accelLong = THREE.MathUtils.lerp(car.accelLong, (vLong - car.prevForwardSpeed) / Math.max(dt, 0.008), 8 * dt);
    car.accelLat = THREE.MathUtils.lerp(car.accelLat, (vLat - car.prevLateralSpeed) / Math.max(dt, 0.008) + vLong * car.yawRate, 8 * dt);
    car.prevForwardSpeed = vLong;
    car.prevLateralSpeed = vLat;

    // Integrate world velocity
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

    // Sample updated elevation (bridges, viaduct ramps, stunt ramps, ocean)
    const surf = world.sampleSurface(car.x, car.z, car.y, car.heading);
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

    // Vertical gravity & smooth deck tracking on sloped bridges/viaducts
    const gravity = 28;
    car.vy -= gravity * dt;
    car.y += car.vy * dt;

    const wasInWater = car.inWater;
    const slopeSnapMargin = car.grounded && surf.surfaceType === "BRIDGE" ? 0.55 : 0.08;

    if (car.y <= surf.height + slopeSnapMargin) {
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

    // Resolve multi-sphere AABB/OBB/Circle collisions AFTER movement
    resolveCollisions();

    // Spring-damper suspension + subtle off-road / water swell motion
    let targetHeave = 0;
    if (car.inWater) {
      targetHeave = Math.sin(elapsed * 4.2) * 0.065;
    } else if (car.grounded && !surf.onRoad && absSpeed > 3) {
      targetHeave = Math.sin(elapsed * absSpeed * 1.45) * 0.045;
    }
    car.suspVel += ((targetHeave - car.suspOffset) * 54 - car.suspVel * 9.8) * dt;
    car.suspOffset = THREE.MathUtils.clamp(car.suspOffset + car.suspVel * dt, -0.22, 0.22);

    // Automatic 6-Speed Gearbox
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

    // Drift detection, Skidmarks, Smoke & Wet Tire Rooster-Tail Spray
    const hardBrake = throttle < 0 && vLong > 10 && !car.absActive;
    car.drifting = car.grounded && !car.inWater && (car.slipAmount > 0.2 || (handbrake && absSpeed > 8));

    const rearX = car.x - nfx * 1.38;
    const rearZ = car.z - nfz * 1.38;

    if (car.inWater && absSpeed > 3.5) {
      spawnParticle(rearX + nrx * 1.0, 0.05, rearZ + nrz * 1.0, "splash");
      spawnParticle(rearX - nrx * 1.0, 0.05, rearZ - nrz * 1.0, "splash");
    } else if (car.grounded && !car.inWater) {
      if (car.wetUnderCar > 0.35 && absSpeed > 15 && Math.random() < 0.6) {
        spawnParticle(rearX + nrx * 0.95, car.y + 0.18, rearZ + nrz * 0.95, "spray");
        spawnParticle(rearX - nrx * 0.95, car.y + 0.18, rearZ - nrz * 0.95, "spray");
      }
      if (car.drifting || hardBrake) {
        if (car.wetUnderCar < 0.45 && Math.random() < 0.78) {
          spawnParticle(rearX + nrx * 0.92, car.y + 0.22, rearZ + nrz * 0.92, "smoke");
          spawnParticle(rearX - nrx * 0.92, car.y + 0.22, rearZ - nrz * 0.92, "smoke");
        }
        skidAccum += absSpeed * dt;
        if (skidAccum > 0.78 && surf.onRoad) {
          skidAccum = 0;
          dropSkidmark(rearX + nrx * 0.98, car.y, rearZ + nrz * 0.98, car.heading, car.slopePitch, car.wetUnderCar > 0.45);
          dropSkidmark(rearX - nrx * 0.98, car.y, rearZ - nrz * 0.98, car.heading, car.slopePitch, car.wetUnderCar > 0.45);
        }
      }
    }

    // Visual Chassis Orientation, Suspension Pitch/Roll & Independent Wheel Travel
    frontWheelPivots.forEach((p) => (p.rotation.y = car.steerAngle));
    wheelMeshes.forEach((w) => (w.rotation.x -= (vLong * dt) / 0.42));

    car.slopePitch = THREE.MathUtils.lerp(car.slopePitch, car.grounded ? surf.slopePitch : 0, 10 * dt);
    const dynamicPitch = car.grounded
      ? THREE.MathUtils.clamp(car.accelLong * 0.0024, -0.08, 0.065)
      : THREE.MathUtils.clamp(car.vy * 0.018, -0.35, 0.35);
    const targetRoll = THREE.MathUtils.clamp(-car.accelLat * 0.0042, -0.15, 0.15);

    car.pitch = THREE.MathUtils.lerp(car.pitch, dynamicPitch, 10 * dt);
    car.roll = THREE.MathUtils.lerp(car.roll, targetRoll, 10 * dt);

    carGroup.position.set(car.x, car.y, car.z);
    carGroup.rotation.set(car.slopePitch, car.heading, 0, "YXZ");
    carBodyGroup.position.y = car.suspOffset;
    carBodyGroup.rotation.x = car.pitch;
    carBodyGroup.rotation.z = car.roll;

    // Subtle independent wheel droop when airborne
    const wheelDroop = car.grounded ? 0 : -0.14;
    for (let i = 0; i < wheelPivots.length; i++) {
      wheelPivots[i].position.y = THREE.MathUtils.lerp(wheelPivots[i].position.y, 0.42 + wheelDroop, 12 * dt);
    }

    // Dynamic Car Lights & Road/Water Shader Uniforms
    const braking = (throttle < 0 && vLong > 1) || handbrake;
    const preset = TIME_PRESETS[timeIndex];
    const headlightsOn = preset.headlights || weather.forceHeadlights || car.inTunnel;

    headlightMat.emissiveIntensity = headlightsOn ? 2.8 : 0.4;
    headSpot.intensity = rtEnabled && headlightsOn ? 3.2 : headlightsOn ? 1.4 : 0;
    volumetricBeams.forEach((b) => (b.visible = rtEnabled && headlightsOn));

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

    // Update smoke/spray/splash particles
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

    // Track sky, sun & shadows smoothly around player across the entire multi-city world
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
      throttle,
      car.drifting,
      usingNitro,
      hornPressed,
      weather.rainAudio,
      car.wetUnderCar,
      car.inTunnel
    );

    return { vLong, usingNitro };
  }

  // =========================================================================
  // 6. TUNNEL-SAFE CAMERA & LIVE RT REFLECTION PASSES
  // =========================================================================
  const camPosCurrent = new THREE.Vector3(0, 5.5, 56);
  const camLookCurrent = new THREE.Vector3(0, 1.4, 38);

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
      const dist = (car.inTunnel ? 8.8 : 10.2) + Math.min(3.4, Math.abs(speed) * 0.04);
      const heightOff = car.inTunnel ? 3.2 : 4.05;
      const desiredPos = new THREE.Vector3(car.x - fx * dist, car.y + heightOff, car.z - fz * dist);
      const desiredLook = new THREE.Vector3(
        car.x + fx * 7.2,
        car.y + 1.35 + Math.sin(car.slopePitch) * 3.2,
        car.z + fz * 7.2
      );

      // Keep chase camera cleanly inside the Alpine Tunnel bore
      if (world.isPointInTunnel(desiredPos.x, desiredPos.z)) {
        desiredPos.x = THREE.MathUtils.clamp(desiredPos.x, -8.8, 8.8);
        desiredPos.y = Math.min(desiredPos.y, 8.4);
      }

      camPosCurrent.lerp(desiredPos, 1 - Math.exp(-7.8 * dt));
      camLookCurrent.lerp(desiredLook, 1 - Math.exp(-10.5 * dt));
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    } else if (mode === "HOOD") {
      camPosCurrent.set(car.x + fx * 0.5, car.y + 1.54 + car.suspOffset, car.z + fz * 0.5);
      camLookCurrent.set(
        car.x + fx * 28,
        car.y + 1.2 + (car.slopePitch + car.pitch) * 14,
        car.z + fz * 28
      );
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    } else {
      const orbitH = car.inTunnel ? 7.8 : 26;
      const orbitD = car.inTunnel ? 11 : 21;
      const desiredPos = new THREE.Vector3(car.x - fx * orbitD, car.y + orbitH, car.z - fz * orbitD);
      if (world.isPointInTunnel(desiredPos.x, desiredPos.z)) {
        desiredPos.x = THREE.MathUtils.clamp(desiredPos.x, -8.5, 8.5);
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

    // Keep cities, suspension bridge, traffic & boats visible so they reflect in ocean water & wet puddles!
    const prevRainVis = world.rainLines.visible;
    world.groundGroup.visible = false;
    world.waterGroup.visible = false;
    world.roadGroup.visible = false;
    world.roadShadowGroup.visible = false;
    skidGroup.visible = false;
    world.rainLines.visible = false;

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

    // Live 360-degree CubeCamera reflection on car body & glass
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
  // 7. HUD TELEMETRY, PHYSICS BADGES & MULTI-CITY MINIMAP
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

  function drawMinimap() {
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const scale = 0.145; // Shows neighboring cities, bridge, tunnel & viaduct cleanly

    mapCtx.clearRect(0, 0, w, h);
    mapCtx.fillStyle = "#082f49";
    mapCtx.fillRect(0, 0, w, h);

    mapCtx.save();
    mapCtx.translate(w / 2, h / 2);

    // 1. Draw the 3 Distinct City Islands + Marina Lagoon Cutout
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

    // 2. Draw Alpine Mountain Ridge Band
    mapCtx.fillStyle = "rgba(71, 85, 105, 0.55)";
    mapCtx.fillRect((-290 - car.x) * scale, (-870 - car.z) * scale, 580 * scale, 520 * scale);

    // 3. Draw City Roads, Suspension Bridge (red-gold), Tunnel (dashed), & Viaduct (cyan)
    mapCtx.lineCap = "round";
    for (let i = 0; i < world.roadSegments.length; i++) {
      const s = world.roadSegments[i];
      mapCtx.strokeStyle =
        s.kind === "bridge" ? "#f97316" : s.kind === "viaduct" ? "#38bdf8" : "#475569";
      mapCtx.lineWidth = Math.max(2.2, s.w * scale);
      mapCtx.beginPath();
      mapCtx.moveTo((s.x1 - car.x) * scale, (s.z1 - car.z) * scale);
      mapCtx.lineTo((s.x2 - car.x) * scale, (s.z2 - car.z) * scale);
      mapCtx.stroke();
    }

    // 4. Draw Buildings within view
    mapCtx.fillStyle = "#64748b";
    const viewRange = w / scale;
    for (let i = 0; i < world.minimapBuildings.length; i++) {
      const b = world.minimapBuildings[i];
      if (Math.abs(b.x - car.x) > viewRange || Math.abs(b.z - car.z) > viewRange) continue;
      mapCtx.fillRect((b.minX - car.x) * scale, (b.minZ - car.z) * scale, b.w * scale, b.d * scale);
    }

    // 5. Stunt Ramps
    mapCtx.fillStyle = "#fb923c";
    for (let i = 0; i < world.ramps.length; i++) {
      const r = world.ramps[i];
      mapCtx.fillRect((r.x - car.x) * scale - 3, (r.z - car.z) * scale - 3, 6, 6);
    }

    // 6. Moving AI Traffic & Boats
    if (trafficEnabled) {
      mapCtx.fillStyle = "#facc15";
      for (let i = 0; i < world.trafficCars.length; i++) {
        const ai = world.trafficCars[i];
        const tx = (ai.x - car.x) * scale;
        const tz = (ai.z - car.z) * scale;
        if (Math.abs(tx) > w || Math.abs(tz) > h) continue;
        mapCtx.fillRect(tx - 1.8, tz - 1.8, 3.6, 3.6);
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

    // 7. Player Directional Arrow
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

    // Live Auto Road Moisture Gauge (Wetting in Rain -> Evaporating in Clear)
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

    // Physics Indicator Badges (ABS, DRIFT, TCS)
    badgeAbs.classList.toggle("active-abs", car.absActive);
    badgeDrift.classList.toggle("active-drift", car.drifting);
    badgeTcs.classList.toggle("active-tcs", car.tcsActive);

    coordsEl.textContent = `X: ${Math.round(car.x)} | Z: ${Math.round(car.z)} | ALT: ${Math.max(0, Math.round(car.y))}m`;

    surfacePill.textContent = car.surfaceLabel;
    surfacePill.className = `surface-pill ${car.surfaceClass}`;
    gripReadout.textContent = `GRIP ${Math.round(Math.min(100, (car.currentGrip / 1.12) * 100))}%`;

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

    // 1. Update natural rain wetting & clear-weather road evaporation
    updateRoadMoisture(dt);

    // 2. Update AI inter-city traffic & ships/yachts
    world.updateTrafficAndBoats(dt, elapsed, car, weather.waveStrength, trafficEnabled);

    // 3. Update player physics, suspension & fixed hitboxes
    const { vLong, usingNitro } = updatePhysics(dt, elapsed);

    // 4. Update tunnel-safe camera & weather
    updateCamera(dt, vLong, usingNitro);
    const flash = world.updateWeather(dt, weather, camera.position, car, car.inTunnel, () => audio.playThunder());
    flashOverlay.style.opacity = car.inTunnel ? "0" : (flash * 0.65).toFixed(3);

    // 5. Render live RT planar & cubemap passes + final frame
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