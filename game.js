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
  // 1. RENDERER, HIGH-RES RT TARGETS & FXAA + BLOOM POST-PROCESSOR
  // =========================================================================
  const container = document.getElementById("canvas-container");
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 4600);
  const mirrorCamera = camera.clone();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  container.appendChild(renderer.domElement);

  const drawingBufferSize = new THREE.Vector2();
  renderer.getDrawingBufferSize(drawingBufferSize);

  const reflScale = 0.85;
  const reflTarget = new THREE.WebGLRenderTarget(
    Math.max(384, Math.floor(window.innerWidth * reflScale)),
    Math.max(384, Math.floor(window.innerHeight * reflScale)),
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    }
  );

  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(0.5, 900, cubeRenderTarget);
  scene.add(cubeCamera);

  // --- Self-Contained FXAA Anti-Aliasing + Dual-Pass Bloom & Filmic Grading ---
  const postProcess = (() => {
    const rtOpts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    };
    const bw = Math.max(128, Math.floor(drawingBufferSize.x * 0.25));
    const bh = Math.max(128, Math.floor(drawingBufferSize.y * 0.25));

    const sceneTarget = new THREE.WebGLRenderTarget(drawingBufferSize.x, drawingBufferSize.y, rtOpts);
    const bloomTargetA = new THREE.WebGLRenderTarget(bw, bh, rtOpts);
    const bloomTargetB = new THREE.WebGLRenderTarget(bw, bh, rtOpts);

    const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const quadScene = new THREE.Scene();

    const baseVert = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;

    const brightBlurHMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: sceneTarget.texture },
        uTexel: { value: new THREE.Vector2(1 / bw, 1 / bh) },
        uThreshold: { value: 0.72 },
      },
      depthTest: false,
      depthWrite: false,
      vertexShader: baseVert,
      fragmentShader: `
        uniform sampler2D tScene;
        uniform vec2 uTexel;
        uniform float uThreshold;
        varying vec2 vUv;

        vec3 extractBright(vec2 uv) {
          vec3 c = texture2D(tScene, clamp(uv, vec2(0.002), vec2(0.998))).rgb;
          float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
          float peak = max(c.r, max(c.g, c.b));
          float w = smoothstep(uThreshold, uThreshold + 0.24, max(lum, peak * 0.92));
          return c * w;
        }

        void main() {
          vec3 sum = extractBright(vUv) * 0.227027;
          vec2 dx = vec2(uTexel.x * 1.65, 0.0);
          sum += (extractBright(vUv + dx * 1.0) + extractBright(vUv - dx * 1.0)) * 0.1945946;
          sum += (extractBright(vUv + dx * 2.0) + extractBright(vUv - dx * 2.0)) * 0.1216216;
          sum += (extractBright(vUv + dx * 3.0) + extractBright(vUv - dx * 3.0)) * 0.054054;
          sum += (extractBright(vUv + dx * 4.0) + extractBright(vUv - dx * 4.0)) * 0.016216;
          gl_FragColor = vec4(sum, 1.0);
        }
      `,
    });

    const blurVMat = new THREE.ShaderMaterial({
      uniforms: {
        tBloom: { value: bloomTargetA.texture },
        uTexel: { value: new THREE.Vector2(1 / bw, 1 / bh) },
      },
      depthTest: false,
      depthWrite: false,
      vertexShader: baseVert,
      fragmentShader: `
        uniform sampler2D tBloom;
        uniform vec2 uTexel;
        varying vec2 vUv;
        void main() {
          vec2 dy = vec2(0.0, uTexel.y * 1.65);
          vec3 sum = texture2D(tBloom, vUv).rgb * 0.227027;
          sum += (texture2D(tBloom, clamp(vUv + dy * 1.0, vec2(0.002), vec2(0.998))).rgb +
                  texture2D(tBloom, clamp(vUv - dy * 1.0, vec2(0.002), vec2(0.998))).rgb) * 0.1945946;
          sum += (texture2D(tBloom, clamp(vUv + dy * 2.0, vec2(0.002), vec2(0.998))).rgb +
                  texture2D(tBloom, clamp(vUv - dy * 2.0, vec2(0.002), vec2(0.998))).rgb) * 0.1216216;
          sum += (texture2D(tBloom, clamp(vUv + dy * 3.0, vec2(0.002), vec2(0.998))).rgb +
                  texture2D(tBloom, clamp(vUv - dy * 3.0, vec2(0.002), vec2(0.998))).rgb) * 0.054054;
          sum += (texture2D(tBloom, clamp(vUv + dy * 4.0, vec2(0.002), vec2(0.998))).rgb +
                  texture2D(tBloom, clamp(vUv - dy * 4.0, vec2(0.002), vec2(0.998))).rgb) * 0.016216;
          gl_FragColor = vec4(sum, 1.0);
        }
      `,
    });

    const compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: sceneTarget.texture },
        tBloom: { value: bloomTargetB.texture },
        uInvRes: { value: new THREE.Vector2(1 / drawingBufferSize.x, 1 / drawingBufferSize.y) },
        uBloomStrength: { value: 0.62 },
        uChroma: { value: 0.0 },
        uVignette: { value: 0.22 },
      },
      depthTest: false,
      depthWrite: false,
      vertexShader: baseVert,
      fragmentShader: `
        uniform sampler2D tScene;
        uniform sampler2D tBloom;
        uniform vec2 uInvRes;
        uniform float uBloomStrength;
        uniform float uChroma;
        uniform float uVignette;
        varying vec2 vUv;

        vec3 sampleFXAA(vec2 uv) {
          vec3 lumaW = vec3(0.299, 0.587, 0.114);
          vec3 rgbNW = texture2D(tScene, uv + vec2(-1.0, -1.0) * uInvRes).rgb;
          vec3 rgbNE = texture2D(tScene, uv + vec2( 1.0, -1.0) * uInvRes).rgb;
          vec3 rgbSW = texture2D(tScene, uv + vec2(-1.0,  1.0) * uInvRes).rgb;
          vec3 rgbSE = texture2D(tScene, uv + vec2( 1.0,  1.0) * uInvRes).rgb;
          vec3 rgbM  = texture2D(tScene, uv).rgb;

          float lumaNW = dot(rgbNW, lumaW);
          float lumaNE = dot(rgbNE, lumaW);
          float lumaSW = dot(rgbSW, lumaW);
          float lumaSE = dot(rgbSE, lumaW);
          float lumaM  = dot(rgbM,  lumaW);

          float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
          float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

          if (lumaMax - lumaMin < max(0.035, lumaMax * 0.1)) {
            return rgbM;
          }

          vec2 dir;
          dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
          dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

          float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * 0.03125, 0.0078125);
          float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
          dir = clamp(dir * rcpDirMin, vec2(-8.0), vec2(8.0)) * uInvRes;

          vec3 rgbA = 0.5 * (
            texture2D(tScene, clamp(uv + dir * (1.0 / 3.0 - 0.5), vec2(0.001), vec2(0.999))).rgb +
            texture2D(tScene, clamp(uv + dir * (2.0 / 3.0 - 0.5), vec2(0.001), vec2(0.999))).rgb
          );
          vec3 rgbB = rgbA * 0.5 + 0.25 * (
            texture2D(tScene, clamp(uv + dir * -0.5, vec2(0.001), vec2(0.999))).rgb +
            texture2D(tScene, clamp(uv + dir *  0.5, vec2(0.001), vec2(0.999))).rgb
          );

          float lumaB = dot(rgbB, lumaW);
          return (lumaB < lumaMin || lumaB > lumaMax) ? rgbA : rgbB;
        }

        void main() {
          vec3 col = sampleFXAA(vUv);

          vec2 fromCenter = vUv - 0.5;
          float dist = length(fromCenter);
          if (uChroma > 0.0005) {
            vec2 caOffset = fromCenter * uChroma * dist;
            vec3 rawM = texture2D(tScene, vUv).rgb;
            float rShift = texture2D(tScene, clamp(vUv + caOffset, vec2(0.001), vec2(0.999))).r;
            float bShift = texture2D(tScene, clamp(vUv - caOffset, vec2(0.001), vec2(0.999))).b;
            col.r += (rShift - rawM.r) * 0.85;
            col.b += (bShift - rawM.b) * 0.85;
          }

          vec3 bloom = texture2D(tBloom, vUv).rgb;
          col += bloom * uBloomStrength;

          float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(luma), col, 1.08);
          col = pow(max(col, vec3(0.0)), vec3(1.02));

          float vig = 1.0 - smoothstep(0.34, 0.94, dist);
          col *= mix(1.0 - uVignette, 1.0, vig);

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `,
    });

    const quadMesh = new THREE.Mesh(quadGeo, compositeMat);
    quadScene.add(quadMesh);

    return {
      resize(w, h) {
        sceneTarget.setSize(w, h);
        const nbw = Math.max(128, Math.floor(w * 0.25));
        const nbh = Math.max(128, Math.floor(h * 0.25));
        bloomTargetA.setSize(nbw, nbh);
        bloomTargetB.setSize(nbw, nbh);
        brightBlurHMat.uniforms.uTexel.value.set(1 / nbw, 1 / nbh);
        blurVMat.uniforms.uTexel.value.set(1 / nbw, 1 / nbh);
        compositeMat.uniforms.uInvRes.value.set(1 / w, 1 / h);
      },
      render(mainScene, mainCam, { bloomStrength = 0.6, chroma = 0.0, vignette = 0.22, enabled = true }) {
        if (!enabled) {
          renderer.setRenderTarget(null);
          renderer.render(mainScene, mainCam);
          return;
        }
        renderer.setRenderTarget(sceneTarget);
        renderer.clear();
        renderer.render(mainScene, mainCam);

        quadMesh.material = brightBlurHMat;
        renderer.setRenderTarget(bloomTargetA);
        renderer.render(quadScene, orthoCam);

        quadMesh.material = blurVMat;
        renderer.setRenderTarget(bloomTargetB);
        renderer.render(quadScene, orthoCam);

        compositeMat.uniforms.uBloomStrength.value = bloomStrength;
        compositeMat.uniforms.uChroma.value = chroma;
        compositeMat.uniforms.uVignette.value = vignette;
        quadMesh.material = compositeMat;
        renderer.setRenderTarget(null);
        renderer.render(quadScene, orthoCam);
      },
    };
  })();

  const hemiLight = new THREE.HemisphereLight(0xfdba74, 0x1e293b, 0.7);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffa85c, 1.55);
  sunLight.position.set(-360, 102, -280);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 850;
  sunLight.shadow.bias = -0.0005;
  const shadowExtent = 175;
  sunLight.shadow.camera.left = -shadowExtent;
  sunLight.shadow.camera.right = shadowExtent;
  sunLight.shadow.camera.top = shadowExtent;
  sunLight.shadow.camera.bottom = -shadowExtent;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(48, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd7a8, fog: false })
  );
  scene.add(sunDisc);

  const world = buildWorld(scene, reflTarget, drawingBufferSize);

  // =========================================================================
  // 2. 13 ORIGINAL COPYRIGHT-FREE VEHICLES (DISTINCT AERO, AUDIO & MODELS)
  // =========================================================================
  const VEHICLE_SPECS = {
    gt: {
      id: "gt",
      name: "Veridian GT",
      defaultColor: "#e11d48",
      aeroNote: "Active DRS + Airbrake · Balanced Aero (CdA 0.68)",
      stats: { speed: 82, accel: 80, grip: 84, aero: 74, drift: 72 },
      topSpeed: 76,
      nitroTopSpeed: 96,
      suspStiffness: 56,
      suspDamping: 10.0,
      suspTravel: 0.22,
      rollMult: 1.0,
      soundType: "v8",
      enginePitch: 1.0,
      engineHarmonic: 0.24,
      wheelRadius: 0.42,
      wheelWidth: 0.36,
      wheelX: 1.08,
      wheelZ: 1.38,
      bodyLen: 4.55,
      bodyW: 2.14,
      hoodEyeY: 1.54,
      hasActiveAero: true,
      isPolice: false,
      isSixWheel: false,
    },
    muscle: {
      id: "muscle",
      name: "Brawler V8",
      defaultColor: "#f97316",
      aeroNote: "Low-Downforce Ducktail · High-Drag Muscle (CdA 0.92)",
      stats: { speed: 78, accel: 88, grip: 68, aero: 42, drift: 97 },
      topSpeed: 73,
      nitroTopSpeed: 92,
      suspStiffness: 46,
      suspDamping: 8.5,
      suspTravel: 0.25,
      rollMult: 1.28,
      soundType: "v8",
      enginePitch: 0.74,
      engineHarmonic: 0.38,
      wheelRadius: 0.44,
      wheelWidth: 0.42,
      wheelX: 1.12,
      wheelZ: 1.44,
      bodyLen: 4.78,
      bodyW: 2.2,
      hoodEyeY: 1.58,
      hasActiveAero: false,
      isPolice: false,
      isSixWheel: false,
    },
    supercar: {
      id: "supercar",
      name: "Zenith Aero-X",
      defaultColor: "#2563eb",
      aeroNote: "Active DRS + Airbrake · High Splitter Downforce (CdA 0.62)",
      stats: { speed: 97, accel: 95, grip: 94, aero: 92, drift: 68 },
      topSpeed: 92,
      nitroTopSpeed: 112,
      suspStiffness: 72,
      suspDamping: 12.2,
      suspTravel: 0.16,
      rollMult: 0.62,
      soundType: "v10",
      enginePitch: 1.38,
      engineHarmonic: 0.2,
      wheelRadius: 0.4,
      wheelWidth: 0.42,
      wheelX: 1.16,
      wheelZ: 1.42,
      bodyLen: 4.68,
      bodyW: 2.3,
      hoodEyeY: 1.36,
      hasActiveAero: true,
      isPolice: false,
      isSixWheel: false,
    },
    formula: {
      id: "formula",
      name: "AeroFormula R1",
      defaultColor: "#f59e0b",
      aeroNote: "Ground-Effect + Twin Wings + DRS · Extreme Downforce (CdA 0.86)",
      stats: { speed: 99, accel: 99, grip: 100, aero: 100, drift: 52 },
      topSpeed: 98,
      nitroTopSpeed: 118,
      suspStiffness: 92,
      suspDamping: 14.5,
      suspTravel: 0.11,
      rollMult: 0.34,
      soundType: "gp",
      enginePitch: 1.72,
      engineHarmonic: 0.18,
      wheelRadius: 0.38,
      wheelWidth: 0.46,
      wheelX: 1.14,
      wheelZ: 1.66,
      bodyLen: 5.15,
      bodyW: 2.18,
      hoodEyeY: 1.16,
      hasActiveAero: true,
      isPolice: false,
      isSixWheel: false,
    },
    lmp: {
      id: "lmp",
      name: "Helios Proto-X",
      defaultColor: "#f8fafc",
      aeroNote: "Endurance Prototype · Dorsal Fin, Venturi Tunnels & DRS (CdA 0.56)",
      stats: { speed: 98, accel: 97, grip: 98, aero: 97, drift: 58 },
      topSpeed: 95,
      nitroTopSpeed: 115,
      suspStiffness: 84,
      suspDamping: 13.8,
      suspTravel: 0.13,
      rollMult: 0.42,
      soundType: "v10",
      enginePitch: 1.52,
      engineHarmonic: 0.22,
      wheelRadius: 0.39,
      wheelWidth: 0.44,
      wheelX: 1.12,
      wheelZ: 1.56,
      bodyLen: 4.92,
      bodyW: 2.22,
      hoodEyeY: 1.24,
      hasActiveAero: true,
      isPolice: false,
      isSixWheel: false,
    },
    gt3: {
      id: "gt3",
      name: "Cinder GT-R3",
      defaultColor: "#10b981",
      aeroNote: "GT Track Package · Dive-Plane Canards & Swan-Neck Wing (CdA 0.72)",
      stats: { speed: 91, accel: 90, grip: 96, aero: 90, drift: 70 },
      topSpeed: 85,
      nitroTopSpeed: 104,
      suspStiffness: 74,
      suspDamping: 12.6,
      suspTravel: 0.15,
      rollMult: 0.58,
      soundType: "v10",
      enginePitch: 1.28,
      engineHarmonic: 0.26,
      wheelRadius: 0.41,
      wheelWidth: 0.4,
      wheelX: 1.14,
      wheelZ: 1.4,
      bodyLen: 4.62,
      bodyW: 2.24,
      hoodEyeY: 1.44,
      hasActiveAero: true,
      isPolice: false,
      isSixWheel: false,
    },
    drift: {
      id: "drift",
      name: "Kitsune S-Drift",
      defaultColor: "#7c3aed",
      aeroNote: "Widebody Pro-Drift · Extended Steering Lock & Twin-Turbo (CdA 0.78)",
      stats: { speed: 84, accel: 89, grip: 76, aero: 66, drift: 100 },
      topSpeed: 79,
      nitroTopSpeed: 98,
      suspStiffness: 52,
      suspDamping: 9.2,
      suspTravel: 0.2,
      rollMult: 0.94,
      soundType: "turbo",
      enginePitch: 1.22,
      engineHarmonic: 0.32,
      wheelRadius: 0.41,
      wheelWidth: 0.4,
      wheelX: 1.12,
      wheelZ: 1.38,
      bodyLen: 4.5,
      bodyW: 2.18,
      hoodEyeY: 1.46,
      hasActiveAero: false,
      isPolice: false,
      isSixWheel: false,
    },
    rally: {
      id: "rally",
      name: "Boreal Rally R4",
      defaultColor: "#f8fafc",
      aeroNote: "High-Angle Rally Wing · Medium Drag & Rain/Grass Grip (CdA 0.88)",
      stats: { speed: 78, accel: 90, grip: 90, aero: 76, drift: 95 },
      topSpeed: 73,
      nitroTopSpeed: 91,
      suspStiffness: 44,
      suspDamping: 8.2,
      suspTravel: 0.32,
      rollMult: 1.15,
      soundType: "turbo",
      enginePitch: 1.16,
      engineHarmonic: 0.3,
      wheelRadius: 0.42,
      wheelWidth: 0.36,
      wheelX: 1.05,
      wheelZ: 1.32,
      bodyLen: 4.18,
      bodyW: 2.04,
      hoodEyeY: 1.64,
      hasActiveAero: false,
      isPolice: false,
      isSixWheel: false,
    },
    ev: {
      id: "ev",
      name: "ArcDrive EV",
      defaultColor: "#7c3aed",
      aeroNote: "Ultra-Low Drag Teardrop + Active Lip · Slippery Aero (CdA 0.44)",
      stats: { speed: 94, accel: 98, grip: 90, aero: 86, drift: 66 },
      topSpeed: 88,
      nitroTopSpeed: 108,
      suspStiffness: 64,
      suspDamping: 11.2,
      suspTravel: 0.18,
      rollMult: 0.72,
      soundType: "ev",
      enginePitch: 1.0,
      engineHarmonic: 0.1,
      wheelRadius: 0.42,
      wheelWidth: 0.38,
      wheelX: 1.1,
      wheelZ: 1.46,
      bodyLen: 4.74,
      bodyW: 2.16,
      hoodEyeY: 1.48,
      hasActiveAero: true,
      isPolice: false,
      isSixWheel: false,
    },
    buggy: {
      id: "buggy",
      name: "SandRunner X",
      defaultColor: "#f59e0b",
      aeroNote: "Open Tubular Exocar · Featherweight Desert Jump Chassis (CdA 1.08)",
      stats: { speed: 74, accel: 92, grip: 86, aero: 44, drift: 96 },
      topSpeed: 69,
      nitroTopSpeed: 88,
      suspStiffness: 34,
      suspDamping: 6.8,
      suspTravel: 0.42,
      rollMult: 1.25,
      soundType: "turbo",
      enginePitch: 1.08,
      engineHarmonic: 0.34,
      wheelRadius: 0.52,
      wheelWidth: 0.44,
      wheelX: 1.18,
      wheelZ: 1.42,
      bodyLen: 4.1,
      bodyW: 2.26,
      hoodEyeY: 1.72,
      hasActiveAero: false,
      isPolice: false,
      isSixWheel: false,
    },
    suv: {
      id: "suv",
      name: "Ridgeback 4x4",
      defaultColor: "#10b981",
      aeroNote: "Boxy High-Drag Profile · Crosswind Sensitive (CdA 1.38)",
      stats: { speed: 66, accel: 72, grip: 82, aero: 28, drift: 92 },
      topSpeed: 62,
      nitroTopSpeed: 79,
      suspStiffness: 36,
      suspDamping: 7.4,
      suspTravel: 0.35,
      rollMult: 1.45,
      soundType: "v8",
      enginePitch: 0.82,
      engineHarmonic: 0.28,
      wheelRadius: 0.54,
      wheelWidth: 0.42,
      wheelX: 1.15,
      wheelZ: 1.48,
      bodyLen: 4.82,
      bodyW: 2.24,
      hoodEyeY: 2.02,
      hasActiveAero: false,
      isPolice: false,
      isSixWheel: false,
    },
    police: {
      id: "police",
      name: "Aegis Patrol",
      defaultColor: "#1e293b",
      aeroNote: "Pursuit AWD Sedan · Lightbar Drag Penalty (CdA 0.84)",
      stats: { speed: 88, accel: 86, grip: 88, aero: 62, drift: 78 },
      topSpeed: 81,
      nitroTopSpeed: 102,
      suspStiffness: 58,
      suspDamping: 10.4,
      suspTravel: 0.22,
      rollMult: 0.92,
      soundType: "v8",
      enginePitch: 0.95,
      engineHarmonic: 0.28,
      wheelRadius: 0.43,
      wheelWidth: 0.36,
      wheelX: 1.08,
      wheelZ: 1.44,
      bodyLen: 4.76,
      bodyW: 2.12,
      hoodEyeY: 1.62,
      hasActiveAero: false,
      isPolice: true,
      isSixWheel: false,
    },
    truck: {
      id: "truck",
      name: "Mammoth 6x4",
      defaultColor: "#e11d48",
      aeroNote: "Heavy 6-Wheel Semi Cab · Massive Wind Wall (CdA 3.10)",
      stats: { speed: 54, accel: 58, grip: 68, aero: 14, drift: 50 },
      topSpeed: 50,
      nitroTopSpeed: 64,
      suspStiffness: 32,
      suspDamping: 6.8,
      suspTravel: 0.3,
      rollMult: 1.55,
      soundType: "diesel",
      enginePitch: 0.52,
      engineHarmonic: 0.45,
      wheelRadius: 0.58,
      wheelWidth: 0.44,
      wheelX: 1.24,
      wheelZ: 2.05,
      bodyLen: 6.5,
      bodyW: 2.48,
      hoodEyeY: 2.75,
      hasActiveAero: false,
      isPolice: false,
      isSixWheel: true,
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

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: activePaintHex,
    metalness: 0.86,
    roughness: 0.13,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 2.0,
  });

  const secondaryWhiteMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    metalness: 0.38,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.65,
  });

  const cabinMat = new THREE.MeshPhysicalMaterial({
    color: 0x080d1a,
    metalness: 0.94,
    roughness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 2.2,
  });

  const trimMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.55, roughness: 0.4 });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.96,
    roughness: 0.1,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 1.85,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f1218, roughness: 0.9 });
  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfffbeb, emissiveIntensity: 3.4 });
  const evCyanGlowMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 3.4 });
  const brakeLightMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xff1e1e, emissiveIntensity: 0.7 });
  const softBeamMat = createSoftBeamMaterial(0xfff5d6, 0.16);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.95 });

  let wheelMeshes = [];
  let wheelPivots = [];
  let wheelIsRear = [];
  let frontWheelPivots = [];
  let volumetricBeams = [];
  let flames = [];
  let headSpot = null;
  let rearGlowLight = null;
  let policeLightbar = null;
  let activeWingPivot = null;

  const SHARED_CAR_MATS = new Set([
    bodyMat,
    secondaryWhiteMat,
    cabinMat,
    trimMat,
    chromeMat,
    tireMat,
    headlightMat,
    evCyanGlowMat,
    brakeLightMat,
    softBeamMat,
    flameMat,
  ]);

  function clearGroup(grp) {
    grp.traverse((obj) => {
      if (obj.geometry && typeof obj.geometry.dispose === "function") {
        obj.geometry.dispose();
      }
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m && !SHARED_CAR_MATS.has(m) && typeof m.dispose === "function") {
            m.dispose();
          }
        });
      }
    });
    while (grp.children.length > 0) grp.remove(grp.children[0]);
  }

  function rebuildPlayerCarModel(carId) {
    activeCarId = carId;
    activeSpec = VEHICLE_SPECS[carId];

    clearGroup(carBodyGroup);
    wheelPivots.forEach((p) => {
      clearGroup(p);
      carGroup.remove(p);
    });

    const sp = activeSpec;
    world.setRoadUniform("uCarHalfW", sp.bodyW * 0.5);
    world.setRoadUniform("uCarHalfL", sp.bodyLen * 0.5);

    const built = window.HorizonCars.buildPlayerVehicle(
      carId,
      sp,
      {
        bodyMat,
        secondaryWhiteMat,
        cabinMat,
        trimMat,
        chromeMat,
        tireMat,
        headlightMat,
        evCyanGlowMat,
        brakeLightMat,
        softBeamMat,
        flameMat,
      },
      carGroup,
      carBodyGroup
    );

    wheelPivots = built.wheelPivots;
    wheelMeshes = built.wheelMeshes;
    wheelIsRear = built.wheelIsRear;
    frontWheelPivots = built.frontWheelPivots;
    volumetricBeams = built.volumetricBeams;
    flames = built.flames;
    headSpot = built.headSpot;
    rearGlowLight = built.rearGlowLight;
    policeLightbar = built.policeLightbar;
    activeWingPivot = built.activeWingPivot;

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

  // Live 14-Slot Car-to-Puddle Wake & Wet Tire Track Shader Trail Ring Buffer
  const MAX_WATER_TRAILS = 14;
  const trailPosArr = Array.from({ length: MAX_WATER_TRAILS }, () => new THREE.Vector4(0, 0, 0, -999));
  const trailMetaArr = Array.from({ length: MAX_WATER_TRAILS }, () => new THREE.Vector4(1.0, 1.4, 0, 0));
  let trailCursor = 0;
  let trailDistAccum = 0;
  let lastTrailStampTime = -999;

  function stampWaterTrail(x, z, heading, trackHalfW, stampHalfL, wakeStrength, wetTrackStrength, timeSec) {
    trailPosArr[trailCursor].set(x, z, heading, timeSec);
    trailMetaArr[trailCursor].set(trackHalfW, stampHalfL, wakeStrength, wetTrackStrength);
    trailCursor = (trailCursor + 1) % MAX_WATER_TRAILS;
    lastTrailStampTime = timeSec;
    world.setRoadUniform("uHasTrails", 1.0);
    world.setRoadUniform("uTrailPos", trailPosArr);
    world.setRoadUniform("uTrailMeta", trailMetaArr);
  }

  function clearWaterTrails() {
    for (let i = 0; i < MAX_WATER_TRAILS; i++) {
      trailPosArr[i].set(0, 0, 0, -999);
      trailMetaArr[i].set(1.0, 1.4, 0, 0);
    }
    trailDistAccum = 0;
    lastTrailStampTime = -999;
    world.setRoadUniform("uHasTrails", 0.0);
    world.setRoadUniform("uTrailPos", trailPosArr);
    world.setRoadUniform("uTrailMeta", trailMetaArr);
  }

  // Soft Feathered Mist, Tire Smoke & Fine Puddle Spray Sprites
  const mistTexture = (() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0.0, "rgba(255, 255, 255, 0.85)");
    g.addColorStop(0.35, "rgba(240, 248, 255, 0.42)");
    g.addColorStop(0.7, "rgba(220, 236, 255, 0.10)");
    g.addColorStop(1.0, "rgba(220, 236, 255, 0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const particlePool = [];
  for (let i = 0; i < 120; i++) {
    const mat = new THREE.SpriteMaterial({
      map: mistTexture,
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const sp = new THREE.Sprite(mat);
    sp.visible = false;
    scene.add(sp);
    particlePool.push({ mesh: sp, life: 0, maxLife: 0.5, vx: 0, vy: 0, vz: 0, gravity: 0, grow: 1.6, baseAlpha: 0.35 });
  }
  let particleIdx = 0;

  function getMistTint(baseHex) {
    const isNight = TIME_PRESETS[timeIndex] && TIME_PRESETS[timeIndex].name === "NIGHT";
    return isNight ? 0x64748b : baseHex;
  }

  function spawnParticle(x, y, z, mode) {
    const p = particlePool[particleIdx];
    particleIdx = (particleIdx + 1) % particlePool.length;
    p.mesh.position.set(x, y, z);
    p.mesh.visible = true;

    if (mode === "splash") {
      p.mesh.material.color.setHex(getMistTint(0xdbeafe));
      p.baseAlpha = 0.42;
      p.mesh.scale.setScalar(0.95);
      p.maxLife = 0.46;
      p.life = p.maxLife;
      p.vx = (Math.random() - 0.5) * 5.2;
      p.vy = 2.6 + Math.random() * 3.4;
      p.vz = (Math.random() - 0.5) * 5.2;
      p.gravity = 15.0;
      p.grow = 1.1;
    } else if (mode === "spray") {
      p.mesh.material.color.setHex(getMistTint(0xcbd5e1));
      p.baseAlpha = 0.22;
      p.mesh.scale.setScalar(0.85);
      p.maxLife = 0.36;
      p.life = p.maxLife;
      p.vx = (Math.random() - 0.5) * 1.6;
      p.vy = 0.9 + Math.random() * 0.9;
      p.vz = (Math.random() - 0.5) * 1.6;
      p.gravity = 4.2;
      p.grow = 1.45;
    } else {
      p.mesh.material.color.setHex(getMistTint(0xe2e8f0));
      p.baseAlpha = 0.34;
      p.mesh.scale.setScalar(1.0);
      p.maxLife = 0.62;
      p.life = p.maxLife;
      p.vx = (Math.random() - 0.5) * 1.2;
      p.vy = 1.0 + Math.random() * 0.9;
      p.vz = (Math.random() - 0.5) * 1.2;
      p.gravity = 0.0;
      p.grow = 1.9;
    }
  }

  function spawnPuddleFan(x, y, z, outX, outZ, carVx, carVz, speed) {
    const p = particlePool[particleIdx];
    particleIdx = (particleIdx + 1) % particlePool.length;
    p.mesh.position.set(x, y + 0.14, z);
    p.mesh.visible = true;
    p.mesh.material.color.setHex(getMistTint(0xdbeafe));
    p.baseAlpha = 0.28;
    p.mesh.scale.setScalar(0.65);
    p.maxLife = 0.30 + Math.random() * 0.18;
    p.life = p.maxLife;
    const fanPush = 1.6 + Math.min(4.8, speed * 0.14) * (0.7 + Math.random() * 0.5);
    p.vx = carVx * 0.32 + outX * fanPush + (Math.random() - 0.5) * 1.0;
    p.vy = 1.1 + Math.min(2.6, speed * 0.08) * (0.7 + Math.random() * 0.4);
    p.vz = carVz * 0.32 + outZ * fanPush + (Math.random() - 0.5) * 1.0;
    p.gravity = 11.5;
    p.grow = 1.35;
  }

  let pendingWaterImpact = 0;

  // --- 3D Bouncing Metallic Collision Sparks + Flickering Contact Flash Light ---
  const MAX_SPARKS = 110;
  const sparkGroup = new THREE.Group();
  scene.add(sparkGroup);
  const sparkPositions = new Float32Array(MAX_SPARKS * 6);
  const sparkColors = new Float32Array(MAX_SPARKS * 6);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
  sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkColors, 3));
  const sparkLines = new THREE.LineSegments(
    sparkGeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sparkLines.frustumCulled = false;
  sparkGroup.add(sparkLines);

  const sparkPool = [];
  for (let i = 0; i < MAX_SPARKS; i++) {
    sparkPool.push({ x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.4 });
  }
  let sparkCursor = 0;

  const sparkLight = new THREE.PointLight(0xff9a2e, 0, 18, 2);
  sparkLight.position.set(0, -100, 0);
  scene.add(sparkLight);
  let sparkFlashIntensity = 0;
  const sparkFlashPos = new THREE.Vector3(0, -100, 0);

  function spawnCollisionSparks(x, y, z, nx, nz, inheritVx, inheritVz, count, power) {
    for (let i = 0; i < count; i++) {
      const s = sparkPool[sparkCursor];
      sparkCursor = (sparkCursor + 1) % MAX_SPARKS;
      const spread = 3.5 + power * 0.42;
      s.x = x + (Math.random() - 0.5) * 0.35;
      s.y = y + 0.35 + Math.random() * 0.55;
      s.z = z + (Math.random() - 0.5) * 0.35;
      s.vx = inheritVx * 0.45 + nx * (2.5 + Math.random() * spread) + (Math.random() - 0.5) * spread * 1.1;
      s.vy = 2.2 + Math.random() * (3.5 + power * 0.25);
      s.vz = inheritVz * 0.45 + nz * (2.5 + Math.random() * spread) + (Math.random() - 0.5) * spread * 1.1;
      s.maxLife = 0.22 + Math.random() * 0.36;
      s.life = s.maxLife;
    }
    sparkFlashPos.set(x, y + 0.7, z);
    sparkFlashIntensity = Math.min(2.6, Math.max(sparkFlashIntensity, 0.7 + power * 0.09));
  }

  function updateSparks(dt) {
    let anyActive = false;
    for (let i = 0; i < MAX_SPARKS; i++) {
      const s = sparkPool[i];
      const idx = i * 6;
      if (s.life > 0) {
        anyActive = true;
        s.life -= dt;
        s.vy -= 21.0 * dt;
        s.vx *= Math.exp(-1.4 * dt);
        s.vz *= Math.exp(-1.4 * dt);
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;

        const floorY = Math.max(0.06, sparkFlashPos.y - 0.65);
        if (s.y < floorY && s.vy < 0) {
          s.y = floorY;
          s.vy = -s.vy * 0.46;
          s.vx *= 0.8;
          s.vz *= 0.8;
        }

        const t = Math.max(0, s.life / s.maxLife);
        const streak = 0.042;
        sparkPositions[idx] = s.x;
        sparkPositions[idx + 1] = s.y;
        sparkPositions[idx + 2] = s.z;
        sparkPositions[idx + 3] = s.x - s.vx * streak;
        sparkPositions[idx + 4] = s.y - s.vy * streak;
        sparkPositions[idx + 5] = s.z - s.vz * streak;

        sparkColors[idx] = 1.0 * t;
        sparkColors[idx + 1] = (0.78 + 0.22 * t) * t;
        sparkColors[idx + 2] = 0.42 * t * t;
        sparkColors[idx + 3] = 1.0 * t * 0.7;
        sparkColors[idx + 4] = 0.32 * t * 0.7;
        sparkColors[idx + 5] = 0.04;
      } else {
        sparkPositions[idx] = sparkPositions[idx + 1] = sparkPositions[idx + 2] = -999;
        sparkPositions[idx + 3] = sparkPositions[idx + 4] = sparkPositions[idx + 5] = -999;
      }
    }
    sparkLines.visible = anyActive;
    if (anyActive) {
      sparkGeo.attributes.position.needsUpdate = true;
      sparkGeo.attributes.color.needsUpdate = true;
    }

    if (sparkFlashIntensity > 0.01) {
      sparkFlashIntensity *= Math.exp(-14.0 * dt);
      const flicker = 0.8 + Math.random() * 0.4;
      sparkLight.position.copy(sparkFlashPos);
      sparkLight.intensity = sparkFlashIntensity * 2.2 * flicker;
      world.setRoadUniform("uSparkPos", sparkFlashPos);
      world.setRoadUniform("uSparkIntensity", sparkFlashIntensity * flicker);
    } else {
      sparkFlashIntensity = 0;
      sparkLight.intensity = 0;
      world.setRoadUniform("uSparkIntensity", 0.0);
    }
  }

  // =========================================================================
  // 3. PROCEDURAL WEB AUDIO ENGINE (13-CAR ENGINES, PUDDLE WHOOSH, LAP CHIME)
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
    evOsc1: null,
    evOsc2: null,
    evGain: null,
    tunnelDelay: null,
    tunnelFeedback: null,
    tunnelWetGain: null,
    screechFilter: null,
    screechGain: null,
    scrapeFilter: null,
    scrapeGain: null,
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

      this.evOsc1 = ctx.createOscillator();
      this.evOsc1.type = "sine";
      this.evOsc1.frequency.value = 260;

      this.evOsc2 = ctx.createOscillator();
      this.evOsc2.type = "triangle";
      this.evOsc2.frequency.value = 520;

      const evFilter = ctx.createBiquadFilter();
      evFilter.type = "bandpass";
      evFilter.frequency.value = 1100;
      evFilter.Q.value = 1.2;

      this.evGain = ctx.createGain();
      this.evGain.gain.value = 0;

      this.evOsc1.connect(evFilter);
      this.evOsc2.connect(evFilter);
      evFilter.connect(this.evGain);
      this.evGain.connect(this.masterGain);
      this.evGain.connect(this.tunnelDelay);
      this.evOsc1.start();
      this.evOsc2.start();

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

      const scr = makeNoiseChannel("bandpass", 2400, 4.2);
      this.scrapeFilter = scr.filt;
      this.scrapeGain = scr.gain;

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
          this.engineGain, this.evGain, this.tunnelWetGain, this.screechGain, this.scrapeGain,
          this.windGain, this.rainGain, this.wetTireGain, this.nitroNoiseGain, this.turboGain,
          this.hornGain, this.sirenGain,
        ].forEach((g) => g.gain.setTargetAtTime(0, now, 0.04));
      }
    },

    update(rpm, absSpeed, slipAmt, throttle, drifting, usingNitro, hornPressed, rainAudio, wetUnderCar, inTunnel, elapsed, scrapeLevel = 0) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const normRpm = THREE.MathUtils.clamp((rpm - 800) / 7200, 0, 1);

      if (activeSpec.soundType === "ev") {
        this.engineGain.gain.setTargetAtTime(0, now, 0.05);
        const evBase = 160 + absSpeed * 18 + (usingNitro ? 240 : 0);
        this.evOsc1.frequency.setTargetAtTime(evBase, now, 0.04);
        this.evOsc2.frequency.setTargetAtTime(evBase * 2.02, now, 0.04);
        const evVol = absSpeed > 0.8 || throttle > 0.1 ? 0.06 + Math.min(0.11, absSpeed * 0.0014) + throttle * 0.04 : 0.015;
        this.evGain.gain.setTargetAtTime(evVol, now, 0.06);
      } else {
        this.evGain.gain.setTargetAtTime(0, now, 0.05);
        const baseFreq = (34 + normRpm * 92 + (usingNitro ? 14 : 0)) * activeSpec.enginePitch;
        this.oscSub.frequency.setTargetAtTime(baseFreq, now, 0.035);
        this.oscMain.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.035);
        this.oscHarm.frequency.setTargetAtTime(baseFreq * (activeSpec.soundType === "gp" ? 3.5 : 3.01), now, 0.035);
        this.harmGain.gain.setTargetAtTime(activeSpec.engineHarmonic, now, 0.06);

        const cutoff = 220 + normRpm * 1350 * activeSpec.enginePitch + (throttle > 0 ? 350 : 0) + (usingNitro ? 500 : 0);
        this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);
        this.engineGain.gain.setTargetAtTime(0.09 + normRpm * 0.11 + (throttle > 0 ? 0.045 : 0), now, 0.05);
      }

      const hornMult = activeSpec.isSixWheel ? 0.44 : 1.0;
      this.hornOsc1.frequency.setTargetAtTime(392 * hornMult, now, 0.02);
      this.hornOsc2.frequency.setTargetAtTime(493.88 * hornMult, now, 0.02);

      this.tunnelWetGain.gain.setTargetAtTime(inTunnel ? 0.42 : 0.0, now, 0.15);

      const screechLevel = drifting ? Math.min(0.19, slipAmt * 0.14) * (1 - wetUnderCar * 0.55) : 0;
      this.screechFilter.frequency.setTargetAtTime(1400 + Math.min(600, absSpeed * 8), now, 0.05);
      this.screechGain.gain.setTargetAtTime(screechLevel, now, 0.04);

      this.scrapeFilter.frequency.setTargetAtTime(1900 + Math.min(1800, absSpeed * 38), now, 0.04);
      this.scrapeGain.gain.setTargetAtTime(Math.min(0.24, scrapeLevel * 0.24), now, 0.035);

      const wetHiss = wetUnderCar > 0.12 && absSpeed > 4 ? Math.min(0.18, absSpeed * 0.0032 * wetUnderCar) : 0;
      this.wetTireGain.gain.setTargetAtTime(wetHiss, now, 0.06);

      this.windGain.gain.setTargetAtTime(absSpeed > 22 ? Math.min(0.17, (absSpeed - 22) * 0.0026) : 0, now, 0.08);
      this.rainGain.gain.setTargetAtTime(inTunnel ? rainAudio * 0.12 : rainAudio, now, 0.25);

      this.nitroNoiseGain.gain.setTargetAtTime(usingNitro ? 0.19 : 0, now, 0.06);
      const isTurboCar = activeSpec.soundType === "turbo" || activeSpec.soundType === "gp";
      this.turboOsc.frequency.setTargetAtTime(2200 + normRpm * 2600, now, 0.06);
      this.turboGain.gain.setTargetAtTime(
        usingNitro ? 0.045 : isTurboCar && normRpm > 0.35 ? 0.026 * normRpm : normRpm > 0.65 ? 0.012 : 0,
        now,
        0.07
      );
      this.hornGain.gain.setTargetAtTime(hornPressed ? 0.14 : 0, now, 0.018);

      if (sirenActive && activeSpec.isPolice) {
        const wail = 660 + 480 * (0.5 + 0.5 * Math.sin(elapsed * 4.4));
        this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.03);
        this.sirenGain.gain.setTargetAtTime(0.11, now, 0.04);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, now, 0.04);
      }
    },

    playChime(freq1 = 880, freq2 = 1320) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      [freq1, freq2].forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + idx * 0.09);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, now + idx * 0.09);
        g.gain.linearRampToValueAtTime(0.14, now + idx * 0.09 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.28);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    },

    playGearShiftPop() {
      if (!this.enabled || !this.ctx || !this.noiseBuffer || activeSpec.soundType === "ev") return;
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(activeSpec.soundType === "turbo" ? 680 : 320, now);
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

    playPuddleWhoosh(speed) {
      if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
      const now = this.ctx.currentTime;
      const vol = THREE.MathUtils.clamp(speed / 45, 0.06, 0.28);
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(1450 + Math.min(900, speed * 24), now);
      bp.frequency.exponentialRampToValueAtTime(480, now + 0.28);
      bp.Q.value = 0.85;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.01, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.035);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.32);
    },

    playImpact(strength) {
      if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
      const now = this.ctx.currentTime;
      const vol = THREE.MathUtils.clamp(strength / 30, 0.09, 0.48);

      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(125 + Math.min(40, strength), now);
      osc.frequency.exponentialRampToValueAtTime(26, now + 0.24);
      const gOsc = this.ctx.createGain();
      gOsc.gain.setValueAtTime(vol, now);
      gOsc.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(gOsc);
      gOsc.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.27);

      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(1800, now);
      lp.frequency.exponentialRampToValueAtTime(320, now + 0.22);
      const gNoise = this.ctx.createGain();
      gNoise.gain.setValueAtTime(vol * 0.78, now);
      gNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
      src.connect(lp);
      lp.connect(gNoise);
      gNoise.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.24);

      if (strength > 9) {
        const ring = this.ctx.createOscillator();
        ring.type = "triangle";
        ring.frequency.setValueAtTime(520 + Math.random() * 240, now);
        ring.frequency.exponentialRampToValueAtTime(190, now + 0.18);
        const gRing = this.ctx.createGain();
        gRing.gain.setValueAtTime(vol * 0.28, now);
        gRing.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        ring.connect(gRing);
        gRing.connect(this.masterGain);
        ring.start(now);
        ring.stop(now + 0.2);
      }
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
  // 4. GLOBAL STATE, SMOOTH GRADUAL WEATHER, TWO-STAGE PUDDLES & MODALS
  // =========================================================================
  let rtEnabled = true;
  let trafficEnabled = true;
  let weatherIndex = 0; // CLEAR
  let timeIndex = 0;    // SUNSET
  let cameraModeIdx = 0;
  let warpIndex = 0;
  let garageOpen = false;
  let mapOpen = false;
  let toggleMap = () => {};
  let onCarSwapped = () => {};

  let roadMoisture = 0.0;
  let puddleLevel = 0.0;
  let moistureTrend = "DRY";

  const liveWeather = {
    name: WEATHER_PRESETS[0].name,
    rainCount: 0,
    splashCount: 0,
    rainSpeed: 42,
    rainTiltX: 0,
    rainIntensity: 0,
    cloudCover: WEATHER_PRESETS[0].cloudCover,
    waveStrength: WEATHER_PRESETS[0].waveStrength,
    fogMult: WEATHER_PRESETS[0].fogMult,
    skyDarken: WEATHER_PRESETS[0].skyDarken,
    sunMult: WEATHER_PRESETS[0].sunMult,
    rainAudio: 0,
    forceHeadlights: false,
    lightning: false,
  };
  let liveRainCountF = 0;
  let liveSplashCountF = 0;

  const flashOverlay = document.getElementById("flash-overlay");
  const tunnelOverlay = document.getElementById("tunnel-overlay");
  const eventBanner = document.getElementById("event-banner");
  const garageModal = document.getElementById("garage-modal");
  let bannerTimer = 0;

  function showBanner(text) {
    eventBanner.textContent = text;
    eventBanner.classList.add("visible");
    bannerTimer = 1.65;
  }

  function updateLiveWeather(dt) {
    const target = WEATHER_PRESETS[weatherIndex];
    const tSky = 1 - Math.exp(-0.55 * dt);
    const tRain = 1 - Math.exp(-0.42 * dt);
    const tWave = 1 - Math.exp(-0.35 * dt);

    liveWeather.name = target.name;
    liveWeather.cloudCover = THREE.MathUtils.lerp(liveWeather.cloudCover, target.cloudCover, tSky);
    liveWeather.skyDarken = THREE.MathUtils.lerp(liveWeather.skyDarken, target.skyDarken, tSky);
    liveWeather.sunMult = THREE.MathUtils.lerp(liveWeather.sunMult, target.sunMult, tSky);
    liveWeather.fogMult = THREE.MathUtils.lerp(liveWeather.fogMult, target.fogMult, tSky);
    liveWeather.waveStrength = THREE.MathUtils.lerp(liveWeather.waveStrength, target.waveStrength, tWave);

    const cloudsReady = target.rainCount > 0 ? THREE.MathUtils.smoothstep(liveWeather.cloudCover, 0.42, 0.72) : 1.0;
    const goalRain = target.rainCount * cloudsReady;
    const goalSplash = target.splashCount * cloudsReady;

    liveRainCountF = THREE.MathUtils.lerp(liveRainCountF, goalRain, tRain);
    liveSplashCountF = THREE.MathUtils.lerp(liveSplashCountF, goalSplash, tRain);
    liveWeather.rainCount = liveRainCountF < 8 ? 0 : Math.round(liveRainCountF);
    liveWeather.splashCount = liveSplashCountF < 2 ? 0 : Math.round(liveSplashCountF);
    liveWeather.rainIntensity = THREE.MathUtils.lerp(liveWeather.rainIntensity, target.rainIntensity * cloudsReady, tRain);
    liveWeather.rainAudio = THREE.MathUtils.lerp(liveWeather.rainAudio, target.rainAudio * cloudsReady, tRain);
    liveWeather.rainSpeed = THREE.MathUtils.lerp(liveWeather.rainSpeed, target.rainSpeed || 42, tSky);
    liveWeather.rainTiltX = THREE.MathUtils.lerp(liveWeather.rainTiltX, target.rainTiltX, tSky);
    liveWeather.forceHeadlights = liveWeather.skyDarken < 0.85 || liveWeather.fogMult > 1.4;
    liveWeather.lightning = target.lightning && liveWeather.rainIntensity > 0.62;
  }

  function updateRoadMoisture(dt) {
    const w = WEATHER_PRESETS[weatherIndex];
    const t = TIME_PRESETS[timeIndex];

    const rainFactor = w.rainIntensity > 0 ? THREE.MathUtils.clamp(liveWeather.rainIntensity / w.rainIntensity, 0, 1) : 1;

    if (w.wetRate > 0 && roadMoisture < w.targetMoisture) {
      roadMoisture = Math.min(w.targetMoisture, roadMoisture + w.wetRate * 0.65 * rainFactor * dt);
    } else if (roadMoisture > w.targetMoisture) {
      roadMoisture = Math.max(w.targetMoisture, roadMoisture - t.dryRate * dt);
    }

    const pFill = w.puddleFillRate || 0;
    const pTarget = w.targetPuddle || 0;
    const pDry = t.puddleDryRate || 0.012;

    if (pFill > 0 && puddleLevel < pTarget) {
      if (roadMoisture > 0.34 && rainFactor > 0.35) {
        const fillScale = THREE.MathUtils.smoothstep(roadMoisture, 0.34, 0.7);
        puddleLevel = Math.min(pTarget, puddleLevel + pFill * 0.68 * fillScale * rainFactor * dt);
      }
    } else if (puddleLevel > pTarget) {
      const dryAccel = roadMoisture < 0.15 ? 1.15 : 0.45;
      puddleLevel = Math.max(pTarget, puddleLevel - pDry * dryAccel * dt);
    }

    if (w.wetRate > 0 && (roadMoisture < w.targetMoisture - 0.01 || puddleLevel < pTarget - 0.01)) {
      moistureTrend = puddleLevel > 0.12 ? "POOLING" : "WETTING";
    } else if (roadMoisture > w.targetMoisture + 0.01) {
      moistureTrend = "DRYING";
    } else if (puddleLevel > 0.04 && roadMoisture <= 0.16) {
      moistureTrend = "PUDDLES";
    } else if (roadMoisture >= 0.78) {
      moistureTrend = "WET";
    } else if (roadMoisture > 0.02 || puddleLevel > 0.02) {
      moistureTrend = "DAMP";
    } else {
      moistureTrend = "DRY";
    }

    world.setRoadUniform("uRoadMoisture", roadMoisture);
    world.setRoadUniform("uPuddleLevel", puddleLevel);
  }

  const _envSkyTop = new THREE.Color();
  const _envSkyHor = new THREE.Color();
  const _envSkyBot = new THREE.Color();
  const _envFogCol = new THREE.Color();
  const _envSunCol = new THREE.Color();
  const _envAmbRoad = new THREE.Color();
  const _envWaterDeep = new THREE.Color();
  const _envWaterShallow = new THREE.Color();
  const _envSunDir = new THREE.Vector3();

  function syncDynamicEnvironment() {
    const t = TIME_PRESETS[timeIndex];
    const w = liveWeather;

    _envSkyTop.setHex(t.skyTop).multiplyScalar(w.skyDarken);
    _envSkyHor.setHex(t.skyHorizon).multiplyScalar(w.skyDarken);
    _envSkyBot.setHex(t.skyBottom).multiplyScalar(w.skyDarken);
    _envFogCol.setHex(t.fog).multiplyScalar(w.skyDarken);
    const fogDensity = t.fogDensity * w.fogMult;
    const headlightsOn = t.headlights || w.forceHeadlights;
    _envSunDir.set(t.sunPos[0], t.sunPos[1], t.sunPos[2]).normalize();
    _envSunCol.setHex(t.sunColor).multiplyScalar(w.sunMult);

    if (!scene.background) scene.background = _envFogCol.clone();
    else scene.background.copy(_envFogCol);

    if (!scene.fog) scene.fog = new THREE.FogExp2(_envFogCol.getHex(), fogDensity);
    else {
      scene.fog.color.copy(_envFogCol);
      scene.fog.density = fogDensity;
    }

    world.skyUniforms.uTopColor.value.copy(_envSkyTop);
    world.skyUniforms.uHorizonColor.value.copy(_envSkyHor);
    world.skyUniforms.uBottomColor.value.copy(_envSkyBot);
    world.skyUniforms.uSunDir.value.copy(_envSunDir);
    world.skyUniforms.uSunColor.value.copy(_envSunCol);
    world.skyUniforms.uNightMix.value = t.nightMix || 0.0;
    world.skyUniforms.uCloudCover.value = w.cloudCover;

    sunLight.color.setHex(t.sunColor);
    sunLight.intensity = t.sunIntensity * w.sunMult;
    sunDisc.material.color.setHex(t.sunColor);
    sunDisc.visible = w.cloudCover < 0.85 && w.fogMult < 2.2;

    hemiLight.color.setHex(t.hemiSky);
    hemiLight.groundColor.setHex(t.hemiGround);
    hemiLight.intensity = t.hemiIntensity * (0.65 + 0.35 * w.skyDarken);

    world.bulbMat.emissiveIntensity = headlightsOn ? 2.8 : 0.15;
    headlightMat.emissiveIntensity = headlightsOn ? 3.4 : 0.45;
    world.setTrafficLighting(headlightsOn, rtEnabled);

    _envAmbRoad.setHex(t.ambientRoad).multiplyScalar(0.75 + 0.25 * w.skyDarken);
    world.setRoadUniform("uSunDir", _envSunDir);
    world.setRoadUniform("uSunColor", _envSunCol);
    world.setRoadUniform("uAmbientColor", _envAmbRoad);
    world.setRoadUniform("uFogColor", _envFogCol);
    world.setRoadUniform("uFogDensity", fogDensity);
    world.setRoadUniform("uHeadlightsOn", headlightsOn ? 1.0 : 0.0);
    world.setRoadUniform("uRainIntensity", w.rainIntensity);
    world.setRoadUniform("uRTEnabled", rtEnabled ? 1.0 : 0.0);

    _envWaterDeep.setHex(t.waterDeep).multiplyScalar(0.75 + 0.25 * w.skyDarken);
    _envWaterShallow.setHex(t.waterShallow).multiplyScalar(0.75 + 0.25 * w.skyDarken);
    world.setWaterUniform("uSunDir", _envSunDir);
    world.setWaterUniform("uSunColor", _envSunCol);
    world.setWaterUniform("uDeepColor", _envWaterDeep);
    world.setWaterUniform("uShallowColor", _envWaterShallow);
    world.setWaterUniform("uFogColor", _envFogCol);
    world.setWaterUniform("uFogDensity", fogDensity);
    world.setWaterUniform("uHeadlightsOn", headlightsOn ? 1.0 : 0.0);
    world.setWaterUniform("uWaveStrength", w.waveStrength);
    world.setWaterUniform("uRainIntensity", w.rainIntensity);
    world.setWaterUniform("uRTEnabled", rtEnabled ? 1.0 : 0.0);
  }

  function applyEnvironment() {
    const t = TIME_PRESETS[timeIndex];
    const targetW = WEATHER_PRESETS[weatherIndex];

    renderer.toneMappingExposure = t.exposure;
    world.buildingMaterials.forEach((m) => (m.emissiveIntensity = t.windowGlow));
    world.neonMaterials.forEach((m) => (m.emissiveIntensity = t.neonGlow));

    bodyMat.envMap = rtEnabled ? cubeRenderTarget.texture : null;
    bodyMat.envMapIntensity = rtEnabled ? 2.0 : 0.0;
    bodyMat.clearcoat = rtEnabled ? 1.0 : 0.0;
    bodyMat.roughness = rtEnabled ? 0.13 : 0.56;
    bodyMat.needsUpdate = true;

    secondaryWhiteMat.envMap = rtEnabled ? cubeRenderTarget.texture : null;
    secondaryWhiteMat.envMapIntensity = rtEnabled ? 1.65 : 0.0;
    secondaryWhiteMat.needsUpdate = true;

    cabinMat.envMap = rtEnabled ? cubeRenderTarget.texture : null;
    cabinMat.envMapIntensity = rtEnabled ? 2.2 : 0.0;
    cabinMat.roughness = rtEnabled ? 0.05 : 0.45;
    cabinMat.needsUpdate = true;

    chromeMat.envMap = rtEnabled ? cubeRenderTarget.texture : null;
    chromeMat.envMapIntensity = rtEnabled ? 1.85 : 0.0;
    chromeMat.needsUpdate = true;

    sunLight.castShadow = rtEnabled;
    world.roadShadowGroup.visible = rtEnabled;
    syncDynamicEnvironment();

    const headlightsOn = t.headlights || liveWeather.forceHeadlights;
    volumetricBeams.forEach((b) => (b.visible = rtEnabled && headlightsOn));
    if (headSpot) headSpot.intensity = rtEnabled && headlightsOn ? 3.4 : headlightsOn ? 1.4 : 0;

    document.getElementById("time-label").textContent = t.name;
    document.getElementById("weather-label").textContent = targetW.name;
    document.getElementById("btn-weather").classList.toggle("active", targetW.name !== "CLEAR");

    document.getElementById("rt-label").textContent = rtEnabled ? "ON" : "OFF";
    document.getElementById("btn-rt").classList.toggle("active", rtEnabled);

    document.getElementById("traffic-label").textContent = trafficEnabled ? "ON" : "OFF";
    document.getElementById("btn-traffic").classList.toggle("active", trafficEnabled);
  }

  function selectGarageCar(carId, autoApplyPaint = true) {
    const sp = VEHICLE_SPECS[carId];
    if (!sp) return;

    document.querySelectorAll(".car-option").forEach((el) => {
      el.classList.toggle("selected", el.dataset.car === carId);
    });

    document.getElementById("spec-car-name").textContent = sp.name;
    const aeroNoteEl = document.getElementById("spec-aero-note");
    if (aeroNoteEl) aeroNoteEl.textContent = sp.aeroNote;

    document.getElementById("spec-speed").style.width = `${sp.stats.speed}%`;
    document.getElementById("spec-accel").style.width = `${sp.stats.accel}%`;
    document.getElementById("spec-grip").style.width = `${sp.stats.grip}%`;
    const aeroBar = document.getElementById("spec-aero");
    if (aeroBar) aeroBar.style.width = `${sp.stats.aero}%`;
    document.getElementById("spec-drift").style.width = `${sp.stats.drift}%`;

    if (autoApplyPaint) selectPaintColor(sp.defaultColor);

    rebuildPlayerCarModel(carId);
    applyEnvironment();
    onCarSwapped(carId);
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
    if (garageOpen && mapOpen) toggleMap(false);
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
    showBanner(sirenActive ? "PATROL SIREN: ON" : "PATROL SIREN: OFF");
  }

  function toggleRayTracing() {
    rtEnabled = !rtEnabled;
    applyEnvironment();
    showBanner(rtEnabled ? "RT, FXAA & BLOOM: ON" : "RT, FXAA & BLOOM: OFF");
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
    if (name === "CLEAR" && (roadMoisture > 0.15 || puddleLevel > 0.15)) {
      showBanner("WEATHER: CLEAR — ROADS DRYING, PUDDLES LINGERING");
    } else if (name === "RAIN" || name === "STORM") {
      showBanner(`WEATHER: ${name} — CLOUDS GATHERING`);
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

  const keys = {};
  window.addEventListener("keydown", (e) => {
    const code = e.code;
    keys[code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
      e.preventDefault();
    }
    if (code !== "KeyM") audio.unlockAuto();
    if (e.repeat) return;

    if (code === "KeyF") {
      toggleMap();
      return;
    }
    if (code === "KeyG") {
      toggleGarage();
      return;
    }
    if (code === "Escape") {
      if (mapOpen) { toggleMap(false); return; }
      if (garageOpen) { toggleGarage(false); return; }
    }
    if (garageOpen || mapOpen) return;

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

  rebuildPlayerCarModel("gt");

  // === END OF PART 1/2 — PASTE PART 2/2 DIRECTLY BELOW THIS LINE ===
  // =========================================================================
  // 5. CONSOLE & MOBILE CONTROLS + 240Hz AERODYNAMICS & RIGID-BODY PHYSICS
  // =========================================================================
  const controls = window.HorizonControls;

  if (controls && controls.isTouchDevice) {
    reflTarget.setSize(
      Math.max(256, Math.floor(window.innerWidth * 0.5)),
      Math.max(256, Math.floor(window.innerHeight * 0.5))
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
      isMapOpen: () => mapOpen,
      toggleGarage: (force) => toggleGarage(force),
      toggleMap: (force) => toggleMap(force),
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
  const AIR_DENSITY = 1.225;
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
      maxDriveForce: 16400,
      nitroForce: 7200,
      maxBrakeForce: 25500,
      brakeBiasFront: 0.64,
      awdFrontSplit: 0.15,
      cdA: 0.68,
      clFrontA: 0.34,
      clRearA: 0.54,
      sideArea: 2.6,
      drsDragCut: 0.18,
      drsRearDfCut: 0.22,
      airbrakeDragAdd: 0.58,
      airbrakeRearDfAdd: 0.48,
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
      maxDriveForce: 19600,
      nitroForce: 7800,
      maxBrakeForce: 26800,
      brakeBiasFront: 0.66,
      awdFrontSplit: 0.0,
      cdA: 0.92,
      clFrontA: 0.12,
      clRearA: 0.22,
      sideArea: 3.1,
      drsDragCut: 0,
      drsRearDfCut: 0,
      airbrakeDragAdd: 0,
      airbrakeRearDfAdd: 0,
      pacejkaB: 12.0,
      pacejkaC: 1.18,
      tcsAllowSlip: 0.42,
    },
    supercar: {
      mass: 1360,
      Iz: 2100,
      cgHeight: 0.38,
      tireMu: 2.26,
      brakeMu: 1.92,
      rearMuMult: 1.09,
      offroadMu: 0.9,
      wetMuDrop: 0.34,
      maxDriveForce: 21400,
      nitroForce: 8600,
      maxBrakeForce: 29500,
      brakeBiasFront: 0.62,
      awdFrontSplit: 0.35,
      cdA: 0.62,
      clFrontA: 0.78,
      clRearA: 1.18,
      sideArea: 2.2,
      drsDragCut: 0.24,
      drsRearDfCut: 0.28,
      airbrakeDragAdd: 0.85,
      airbrakeRearDfAdd: 0.72,
      pacejkaB: 15.2,
      pacejkaC: 1.15,
      tcsAllowSlip: 0.08,
    },
    formula: {
      mass: 840,
      Iz: 1280,
      cgHeight: 0.28,
      tireMu: 2.58,
      brakeMu: 2.35,
      rearMuMult: 1.1,
      offroadMu: 0.72,
      wetMuDrop: 0.4,
      maxDriveForce: 17600,
      nitroForce: 7200,
      maxBrakeForce: 27000,
      brakeBiasFront: 0.59,
      awdFrontSplit: 0.0,
      cdA: 0.86,
      clFrontA: 2.2,
      clRearA: 2.95,
      sideArea: 1.6,
      drsDragCut: 0.34,
      drsRearDfCut: 0.36,
      airbrakeDragAdd: 0.65,
      airbrakeRearDfAdd: 0.55,
      pacejkaB: 16.5,
      pacejkaC: 1.14,
      tcsAllowSlip: 0.06,
    },
    lmp: {
      mass: 930,
      Iz: 1460,
      cgHeight: 0.31,
      tireMu: 2.48,
      brakeMu: 2.24,
      rearMuMult: 1.1,
      offroadMu: 0.78,
      wetMuDrop: 0.36,
      maxDriveForce: 19200,
      nitroForce: 8000,
      maxBrakeForce: 28500,
      brakeBiasFront: 0.6,
      awdFrontSplit: 0.32,
      cdA: 0.56,
      clFrontA: 1.85,
      clRearA: 2.55,
      sideArea: 2.0,
      drsDragCut: 0.26,
      drsRearDfCut: 0.3,
      airbrakeDragAdd: 0.72,
      airbrakeRearDfAdd: 0.6,
      pacejkaB: 15.8,
      pacejkaC: 1.14,
      tcsAllowSlip: 0.06,
    },
    gt3: {
      mass: 1280,
      Iz: 1980,
      cgHeight: 0.39,
      tireMu: 2.32,
      brakeMu: 1.98,
      rearMuMult: 1.09,
      offroadMu: 0.86,
      wetMuDrop: 0.32,
      maxDriveForce: 18600,
      nitroForce: 7600,
      maxBrakeForce: 28200,
      brakeBiasFront: 0.61,
      awdFrontSplit: 0.0,
      cdA: 0.72,
      clFrontA: 1.05,
      clRearA: 1.55,
      sideArea: 2.4,
      drsDragCut: 0.2,
      drsRearDfCut: 0.24,
      airbrakeDragAdd: 0.68,
      airbrakeRearDfAdd: 0.56,
      pacejkaB: 15.0,
      pacejkaC: 1.15,
      tcsAllowSlip: 0.08,
    },
    drift: {
      mass: 1340,
      Iz: 2120,
      cgHeight: 0.44,
      tireMu: 1.82,
      brakeMu: 1.58,
      rearMuMult: 0.96,
      offroadMu: 1.02,
      wetMuDrop: 0.3,
      maxDriveForce: 19200,
      nitroForce: 8200,
      maxBrakeForce: 24800,
      brakeBiasFront: 0.68,
      awdFrontSplit: 0.0,
      cdA: 0.78,
      clFrontA: 0.28,
      clRearA: 0.44,
      sideArea: 2.7,
      drsDragCut: 0,
      drsRearDfCut: 0,
      airbrakeDragAdd: 0,
      airbrakeRearDfAdd: 0,
      pacejkaB: 12.8,
      pacejkaC: 1.16,
      tcsAllowSlip: 0.55,
    },
    rally: {
      mass: 1280,
      Iz: 1950,
      cgHeight: 0.52,
      tireMu: 1.88,
      brakeMu: 1.66,
      rearMuMult: 1.04,
      offroadMu: 1.76,
      wetMuDrop: 0.18,
      maxDriveForce: 17800,
      nitroForce: 6800,
      maxBrakeForce: 25000,
      brakeBiasFront: 0.6,
      awdFrontSplit: 0.45,
      cdA: 0.88,
      clFrontA: 0.4,
      clRearA: 0.68,
      sideArea: 3.1,
      drsDragCut: 0,
      drsRearDfCut: 0,
      airbrakeDragAdd: 0,
      airbrakeRearDfAdd: 0,
      pacejkaB: 13.0,
      pacejkaC: 1.16,
      tcsAllowSlip: 0.18,
    },
    ev: {
      mass: 1860,
      Iz: 2850,
      cgHeight: 0.35,
      tireMu: 2.04,
      brakeMu: 1.74,
      rearMuMult: 1.09,
      offroadMu: 0.96,
      wetMuDrop: 0.28,
      maxDriveForce: 25800,
      nitroForce: 8400,
      maxBrakeForce: 33000,
      brakeBiasFront: 0.62,
      awdFrontSplit: 0.48,
      cdA: 0.44,
      clFrontA: 0.44,
      clRearA: 0.64,
      sideArea: 2.5,
      drsDragCut: 0.16,
      drsRearDfCut: 0.22,
      airbrakeDragAdd: 0.62,
      airbrakeRearDfAdd: 0.5,
      pacejkaB: 14.0,
      pacejkaC: 1.14,
      tcsAllowSlip: 0.06,
    },
    buggy: {
      mass: 920,
      Iz: 1450,
      cgHeight: 0.56,
      tireMu: 1.76,
      brakeMu: 1.54,
      rearMuMult: 1.06,
      offroadMu: 1.88,
      wetMuDrop: 0.18,
      maxDriveForce: 14800,
      nitroForce: 6200,
      maxBrakeForce: 20500,
      brakeBiasFront: 0.58,
      awdFrontSplit: 0.4,
      cdA: 1.08,
      clFrontA: 0.14,
      clRearA: 0.22,
      sideArea: 2.4,
      drsDragCut: 0,
      drsRearDfCut: 0,
      airbrakeDragAdd: 0,
      airbrakeRearDfAdd: 0,
      pacejkaB: 12.2,
      pacejkaC: 1.14,
      tcsAllowSlip: 0.22,
    },
    suv: {
      mass: 2220,
      Iz: 4050,
      cgHeight: 0.7,
      tireMu: 1.66,
      brakeMu: 1.44,
      rearMuMult: 1.1,
      offroadMu: 1.58,
      wetMuDrop: 0.2,
      maxDriveForce: 20600,
      nitroForce: 7400,
      maxBrakeForce: 33000,
      brakeBiasFront: 0.65,
      awdFrontSplit: 0.5,
      cdA: 1.38,
      clFrontA: 0.08,
      clRearA: 0.14,
      sideArea: 6.4,
      drsDragCut: 0,
      drsRearDfCut: 0,
      airbrakeDragAdd: 0,
      airbrakeRearDfAdd: 0,
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
      maxDriveForce: 20200,
      nitroForce: 8200,
      maxBrakeForce: 31000,
      brakeBiasFront: 0.63,
      awdFrontSplit: 0.4,
      cdA: 0.84,
      clFrontA: 0.24,
      clRearA: 0.36,
      sideArea: 3.2,
      drsDragCut: 0,
      drsRearDfCut: 0,
      airbrakeDragAdd: 0,
      airbrakeRearDfAdd: 0,
      pacejkaB: 13.8,
      pacejkaC: 1.15,
      tcsAllowSlip: 0.1,
    },
    truck: {
      mass: 6200,
      Iz: 22500,
      cgHeight: 1.12,
      tireMu: 1.42,
      brakeMu: 1.18,
      rearMuMult: 1.16,
      offroadMu: 1.12,
      wetMuDrop: 0.26,
      maxDriveForce: 39500,
      nitroForce: 16000,
      maxBrakeForce: 68000,
      brakeBiasFront: 0.45,
      awdFrontSplit: 0.0,
      cdA: 3.1,
      clFrontA: 0.15,
      clRearA: 0.25,
      sideArea: 15.5,
      drsDragCut: 0,
      drsRearDfCut: 0,
      airbrakeDragAdd: 0,
      airbrakeRearDfAdd: 0,
      pacejkaB: 9.2,
      pacejkaC: 1.1,
      tcsAllowSlip: 0.08,
    },
  };

  const camPosCurrent = new THREE.Vector3(0, 5.5, 56);
  const camLookCurrent = new THREE.Vector3(0, 1.4, 38);
  const _fwdVec = new THREE.Vector3();

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
    hitPitch: 0,
    hitPitchVel: 0,
    hitRoll: 0,
    hitRollVel: 0,
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
    aeroMode: "OFF",
    drafting: false,
    downforceKg: 0,
    wingAngle: -0.14,
    slipAmount: 0,
    surfaceLabel: "DRY ASPHALT",
    surfaceClass: "dry",
    currentGrip: 1.9,
    wetUnderCar: 0,
    tireWetness: 0,
  };

  let impactCooldown = 0;
  let splashCooldown = 0;
  let puddleWhooshCooldown = 0;
  let cameraTrauma = 0;
  let scrapeIntensity = 0;

  function teleportCar(x, y, z, heading, bannerMsg) {
    car.x = x;
    car.y = y;
    car.z = z;
    car.vx = 0;
    car.vy = 0;
    car.vz = 0;
    car.heading = heading;
    car.yawRate = 0;
    car.steerAngle = 0;
    car.throttlePedal = 0;
    car.brakePedal = 0;
    car.reverseHoldTimer = 0;
    car.suspOffset = 0;
    car.suspVel = 0;
    car.pitch = 0;
    car.roll = 0;
    car.hitPitch = 0;
    car.hitPitchVel = 0;
    car.hitRoll = 0;
    car.hitRollVel = 0;
    car.slopePitch = 0;
    car.accelLong = 0;
    car.accelLat = 0;
    car.nitro = 100;
    car.grounded = true;
    car.inWater = false;
    car.tireWetness = 0;
    cameraTrauma = 0;
    scrapeIntensity = 0;
    clearWaterTrails();
    if (world.resetWaterSim) world.resetWaterSim(renderer, x, z);
    pendingWaterImpact = 0;

    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    camPosCurrent.set(car.x - fx * 11, car.y + 4.4, car.z - fz * 11);
    camLookCurrent.set(car.x + fx * 6, car.y + 1.4, car.z + fz * 6);

    if (bannerMsg) showBanner(bannerMsg);
  }

  function warpTo(idx) {
    const wp = WARP_POINTS[idx];
    const wLabel = document.getElementById("warp-label");
    if (wLabel) wLabel.textContent = wp.name;
    teleportCar(wp.x, wp.y, wp.z, wp.heading, `TRAVEL: ${wp.name}`);
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

  function testSphereVsVehicleOBB(sx, sz, sphereRad, cx, cz, halfW, halfL, heading) {
    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);
    const dx = sx - cx;
    const dz = sz - cz;

    const lx = dx * cosH - dz * sinH;
    const lz = -dx * sinH - dz * cosH;

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

    const nx = nlx * cosH - nlz * sinH;
    const nz = -nlx * sinH - nlz * cosH;
    const contactX = cx + clx * cosH - clz * sinH;
    const contactZ = cz - clx * sinH - clz * cosH;
    return { nx, nz, overlap, contactX, contactZ };
  }

  function applyPlayerImpactRecoil(jx, jz, mass, strength) {
    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    const rx = Math.cos(car.heading);
    const rz = -Math.sin(car.heading);

    const dvLong = (jx * fx + jz * fz) / mass;
    const dvLat = (jx * rx + jz * rz) / mass;

    car.hitPitchVel = THREE.MathUtils.clamp(car.hitPitchVel + dvLong * 0.16, -2.6, 2.6);
    car.hitRollVel = THREE.MathUtils.clamp(car.hitRollVel + dvLat * 0.22, -3.2, 3.2);
    car.suspVel -= Math.min(2.4, strength * 0.085);
  }

  function resolveCollisions() {
    const hp = HANDLING_PROFILES[activeSpec.id] || HANDLING_PROFILES.gt;
    const m1 = hp.mass;
    const invM1 = 1 / m1;
    const invI1 = 1 / hp.Iz;

    const nearby = world.getNearbyColliders(car.x, car.z);
    const sphereRad = activeSpec.bodyW * 0.47;
    const bumperOff = Math.max(0.85, activeSpec.bodyLen * 0.5 - sphereRad);
    const sphereOffsets = activeSpec.isSixWheel
      ? [-bumperOff, -bumperOff * 0.34, bumperOff * 0.34, bumperOff]
      : [-bumperOff, 0, bumperOff];

    let maxImpact = 0;
    let frameScrape = 0;

    for (let pass = 0; pass < 2; pass++) {
      const fx = -Math.sin(car.heading);
      const fz = -Math.cos(car.heading);

      for (let s = 0; s < sphereOffsets.length; s++) {
        const off = sphereOffsets[s];
        let sx = car.x + fx * off;
        let sz = car.z + fz * off;

        for (let i = 0; i < nearby.length; i++) {
          const c = nearby[i];
          if (car.y + 2.2 < c.minY || car.y > c.maxY) continue;

          let hit = false;
          let nx = 0;
          let nz = 0;
          let overlap = 0;
          let cxW = sx;
          let czW = sz;

          if (c.type === "aabb") {
            const cx = Math.max(c.minX, Math.min(sx, c.maxX));
            const cz = Math.max(c.minZ, Math.min(sz, c.maxZ));
            const dx = sx - cx;
            const dz = sz - cz;
            const dSq = dx * dx + dz * dz;

            if (dSq < sphereRad * sphereRad) {
              hit = true;
              cxW = cx;
              czW = cz;
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
              cxW = c.cx + clx * c.cosA + clz * c.sinA;
              czW = c.cz - clx * c.sinA + clz * c.cosA;
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
              cxW = c.x + nx * c.r;
              czW = c.z + nz * c.r;
            }
          }

          if (hit) {
            car.x += nx * overlap;
            car.z += nz * overlap;
            sx += nx * overlap;
            sz += nz * overlap;

            const r1x = cxW - car.x;
            const r1z = czW - car.z;

            const vpx = car.vx + car.yawRate * r1z;
            const vpz = car.vz - car.yawRate * r1x;
            const vn = vpx * nx + vpz * nz;

            const tx = -nz;
            const tz = nx;
            const vt = vpx * tx + vpz * tz;
            const absVt = Math.abs(vt);

            if (absVt > 3.5) {
              frameScrape = Math.max(frameScrape, Math.min(1.0, absVt / 26));
              if (Math.random() < 0.35 * Math.min(1, absVt / 14)) {
                spawnCollisionSparks(cxW, car.y, czW, nx, nz, car.vx, car.vz, 3, Math.min(14, absVt * 0.6));
              }
            }

            if (vn < 0) {
              const impactSpd = -vn;
              maxImpact = Math.max(maxImpact, impactSpd);

              const e = impactSpd > 14 ? 0.28 : impactSpd > 5 ? 0.18 : 0.08;
              const rCrossN = r1z * nx - r1x * nz;
              const denom = invM1 + rCrossN * rCrossN * invI1 * 0.55;
              const jMag = (-(1 + e) * vn) / denom;

              const muWall = 0.24;
              const jtMax = jMag * muWall;
              const jtMag = THREE.MathUtils.clamp((-vt / Math.max(0.0001, invM1)) * 0.35, -jtMax, jtMax);

              const jx = jMag * nx + jtMag * tx;
              const jz = jMag * nz + jtMag * tz;

              car.vx += jx * invM1;
              car.vz += jz * invM1;
              const tauY = r1z * jx - r1x * jz;
              car.yawRate = THREE.MathUtils.clamp(car.yawRate + tauY * invI1 * 0.42, -3.8, 3.8);

              applyPlayerImpactRecoil(jx, jz, m1, impactSpd);

              if (impactSpd > 4.2) {
                const sparkCount = Math.min(24, Math.floor(6 + impactSpd * 0.85));
                spawnCollisionSparks(cxW, car.y, czW, nx, nz, car.vx, car.vz, sparkCount, impactSpd);
              }
            }
          }
        }
      }
    }

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
          if (res && (!deepest || res.overlap > deepest.overlap)) deepest = res;
        }

        if (deepest) {
          const { nx, nz, overlap, contactX, contactZ } = deepest;
          const m2 = ai.mass || 1600;
          const invM2 = 1 / m2;
          const invI2 = 1 / (m2 * (ai.halfW * ai.halfW + ai.halfL * ai.halfL) * 0.35);

          const sepRatio1 = invM1 / (invM1 + invM2);
          const sepRatio2 = invM2 / (invM1 + invM2);
          car.x += nx * overlap * sepRatio1;
          car.z += nz * overlap * sepRatio1;
          ai.x -= nx * overlap * sepRatio2;
          ai.z -= nz * overlap * sepRatio2;

          const aiVx = ai.stunTimer > 0 ? ai.knockVx : -Math.sin(ai.heading) * ai.speed;
          const aiVz = ai.stunTimer > 0 ? ai.knockVz : -Math.cos(ai.heading) * ai.speed;

          const r1x = contactX - car.x;
          const r1z = contactZ - car.z;
          const r2x = contactX - ai.x;
          const r2z = contactZ - ai.z;

          const v1x = car.vx + car.yawRate * r1z;
          const v1z = car.vz - car.yawRate * r1x;
          const v2x = aiVx + (ai.knockYaw || 0) * r2z;
          const v2z = aiVz - (ai.knockYaw || 0) * r2x;

          const rvx = v1x - v2x;
          const rvz = v1z - v2z;
          const relVn = rvx * nx + rvz * nz;

          const tx = -nz;
          const tz = nx;
          const relVt = rvx * tx + rvz * tz;
          if (Math.abs(relVt) > 3.5) {
            frameScrape = Math.max(frameScrape, Math.min(1.0, Math.abs(relVt) / 24));
            if (Math.random() < 0.45) {
              spawnCollisionSparks(contactX, car.y, contactZ, nx, nz, (car.vx + aiVx) * 0.5, (car.vz + aiVz) * 0.5, 4, Math.abs(relVt) * 0.55);
            }
          }

          if (relVn < 0) {
            const impactSpd = -relVn;
            maxImpact = Math.max(maxImpact, impactSpd);

            const e = impactSpd > 12 ? 0.32 : 0.2;
            const r1CrossN = r1z * nx - r1x * nz;
            const r2CrossN = r2z * nx - r2x * nz;
            const denom = invM1 + invM2 + r1CrossN * r1CrossN * invI1 * 0.5 + r2CrossN * r2CrossN * invI2 * 0.65;
            const jMag = (-(1 + e) * relVn) / denom;

            const jtMax = jMag * 0.3;
            const jtMag = THREE.MathUtils.clamp((-relVt / (invM1 + invM2)) * 0.28, -jtMax, jtMax);

            const jx = jMag * nx + jtMag * tx;
            const jz = jMag * nz + jtMag * tz;

            car.vx += jx * invM1;
            car.vz += jz * invM1;
            const tau1 = r1z * jx - r1x * jz;
            car.yawRate = THREE.MathUtils.clamp(car.yawRate + tau1 * invI1 * 0.48, -3.8, 3.8);
            applyPlayerImpactRecoil(jx, jz, m1, impactSpd * sepRatio1 * 1.4);

            const newAiVx = aiVx - jx * invM2;
            const newAiVz = aiVz - jz * invM2;
            const tau2 = -(r2z * jx - r2x * jz);

            ai.knockVx = THREE.MathUtils.clamp(newAiVx, -28, 28);
            ai.knockVz = THREE.MathUtils.clamp(newAiVz, -28, 28);
            ai.knockYaw = THREE.MathUtils.clamp((ai.knockYaw || 0) + tau2 * invI2 * 0.85, -4.5, 4.5);

            const aFx = -Math.sin(ai.heading);
            const aFz = -Math.cos(ai.heading);
            const aRx = Math.cos(ai.heading);
            const aRz = -Math.sin(ai.heading);
            ai.hitPitch = THREE.MathUtils.clamp((-jx * aFx - jz * aFz) * invM2 * 0.018, -0.18, 0.18);
            ai.hitRoll = THREE.MathUtils.clamp((-jx * aRx - jz * aRz) * invM2 * 0.025, -0.24, 0.24);
            ai.stunTimer = Math.max(ai.stunTimer, THREE.MathUtils.clamp(0.55 + impactSpd * 0.055 * sepRatio2 * 1.6, 0.55, 2.2));

            if (impactSpd > 3.2) {
              const sparkCount = Math.min(28, Math.floor(8 + impactSpd * 0.95));
              spawnCollisionSparks(contactX, car.y, contactZ, nx, nz, (car.vx + newAiVx) * 0.5, (car.vz + newAiVz) * 0.5, sparkCount, impactSpd);
            }
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
          if (res && (!deepest || res.overlap > deepest.overlap)) deepest = res;
        }

        if (deepest) {
          const { nx, nz, overlap, contactX, contactZ } = deepest;
          car.x += nx * overlap;
          car.z += nz * overlap;

          const r1x = contactX - car.x;
          const r1z = contactZ - car.z;
          const vn = (car.vx + car.yawRate * r1z) * nx + (car.vz - car.yawRate * r1x) * nz;
          if (vn < 0) {
            const impactSpd = -vn;
            maxImpact = Math.max(maxImpact, impactSpd);
            const rCrossN = r1z * nx - r1x * nz;
            const jMag = (-1.28 * vn) / (invM1 + rCrossN * rCrossN * invI1 * 0.45);
            const jx = jMag * nx;
            const jz = jMag * nz;
            car.vx += jx * invM1;
            car.vz += jz * invM1;
            car.yawRate = THREE.MathUtils.clamp(car.yawRate + (r1z * jx - r1x * jz) * invI1 * 0.4, -3.5, 3.5);
            applyPlayerImpactRecoil(jx, jz, m1, impactSpd);
            spawnCollisionSparks(contactX, car.y, contactZ, nx, nz, car.vx, car.vz, 12, impactSpd);
          }
        }
      }
    }

    if (car.x > WORLD_BOUNDS.maxX) { maxImpact = Math.max(maxImpact, Math.abs(car.vx)); car.x = WORLD_BOUNDS.maxX; car.vx *= -0.35; }
    if (car.x < WORLD_BOUNDS.minX) { maxImpact = Math.max(maxImpact, Math.abs(car.vx)); car.x = WORLD_BOUNDS.minX; car.vx *= -0.35; }
    if (car.z > WORLD_BOUNDS.maxZ) { maxImpact = Math.max(maxImpact, Math.abs(car.vz)); car.z = WORLD_BOUNDS.maxZ; car.vz *= -0.35; }
    if (car.z < WORLD_BOUNDS.minZ) { maxImpact = Math.max(maxImpact, Math.abs(car.vz)); car.z = WORLD_BOUNDS.minZ; car.vz *= -0.35; }

    scrapeIntensity = Math.max(scrapeIntensity, frameScrape);

    if (maxImpact > 3.6 && impactCooldown <= 0) {
      audio.playImpact(maxImpact);
      cameraTrauma = Math.min(1.0, cameraTrauma + THREE.MathUtils.clamp((maxImpact - 2.5) / 22, 0.14, 0.92));
      if (controls) {
        const rStr = Math.min(1, maxImpact / 24);
        controls.rumble(rStr, rStr * 0.85, Math.min(260, 110 + maxImpact * 6));
      }
      impactCooldown = 0.2;
    }
  }

  function pacejkaNorm(slipAngle, B, C) {
    const E = 0.2;
    const x = B * slipAngle;
    return -Math.sin(C * Math.atan(x - E * (x - Math.atan(x))));
  }

  function computeDraftStrength(vLong) {
    if (!trafficEnabled || vLong < 18.0) return 0.0;
    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    const rx = Math.cos(car.heading);
    const rz = -Math.sin(car.heading);

    let bestDraft = 0.0;
    for (let i = 0; i < world.trafficCars.length; i++) {
      const ai = world.trafficCars[i];
      if (Math.abs(car.y - ai.y) > 3.2) continue;

      const dx = ai.x - car.x;
      const dz = ai.z - car.z;
      if (Math.abs(dx) > 40 || Math.abs(dz) > 40) continue;

      const fwd = dx * fx + dz * fz;
      if (fwd < 5.5 || fwd > 38.0) continue;

      const lat = Math.abs(dx * rx + dz * rz);
      if (lat > 2.65) continue;

      const afx = -Math.sin(ai.heading);
      const afz = -Math.cos(ai.heading);
      if (fx * afx + fz * afz < 0.82) continue;

      const sizeBonus = ai.halfL > 3.0 ? 1.22 : 1.0;
      const distFactor = 1.0 - (fwd - 5.5) / 32.5;
      const latFactor = 1.0 - lat / 2.65;
      bestDraft = Math.max(bestDraft, Math.min(0.36, distFactor * latFactor * 0.34 * sizeBonus));
    }
    return bestDraft;
  }

  function updatePhysics(dt, elapsed) {
    impactCooldown = Math.max(0, impactCooldown - dt);
    splashCooldown = Math.max(0, splashCooldown - dt);
    puddleWhooshCooldown = Math.max(0, puddleWhooshCooldown - dt);
    scrapeIntensity *= Math.exp(-16 * dt);
    cameraTrauma = Math.max(0, cameraTrauma - 1.75 * dt);

    const weather = liveWeather;
    const sp = activeSpec;
    const hp = HANDLING_PROFILES[sp.id] || HANDLING_PROFILES.gt;
    const modalPaused = garageOpen || mapOpen;

    const ext = controls
      ? controls.getInput()
      : { accel: 0, brake: 0, steer: 0, isAnalogSteer: false, handbrake: false, nitro: false, horn: false };

    const kbAccel = keys.KeyW || keys.ArrowUp ? 1 : 0;
    const kbBrake = keys.KeyS || keys.ArrowDown ? 1 : 0;
    const kbSteer = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);

    const rawAccel = modalPaused ? 0 : Math.max(kbAccel, ext.accel);
    const rawBrake = modalPaused ? 0 : Math.max(kbBrake, ext.brake);
    const rawSteerInput = modalPaused ? 0 : kbSteer !== 0 ? kbSteer : ext.steer;
    const isAnalogSteer = kbSteer === 0 && ext.isAnalogSteer;

    const handbrake = !modalPaused && (Boolean(keys.Space) || ext.handbrake);
    const wantsNitro = !modalPaused && (Boolean(keys.ShiftLeft || keys.ShiftRight) || ext.nitro);
    const hornPressed = !modalPaused && (Boolean(keys.KeyH) || ext.horn);

    const initFx = -Math.sin(car.heading);
    const initFz = -Math.cos(car.heading);
    const initRx = Math.cos(car.heading);
    const initRz = -Math.sin(car.heading);
    const initVLong = car.vx * initFx + car.vz * initFz;
    const initSpeed = Math.hypot(car.vx, car.vz);

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

    const surfStart = world.sampleSurface(car.x, car.z, car.y, car.heading);
    car.inTunnel = surfStart.inTunnel;
    tunnelOverlay.classList.toggle("inside", car.inTunnel);

    let surfaceMu = hp.tireMu;
    let rollingCoeff = 0.015;
    let leftPuddle = 0;
    let rightPuddle = 0;
    let puddleAvg = 0;
    car.wetUnderCar = 0;

    if (surfStart.overWater) {
      surfaceMu = 0.6;
      rollingCoeff = 0.22;
      car.wetUnderCar = 1.0;
      car.tireWetness = 1.0;
      car.surfaceLabel = "WATER";
      car.surfaceClass = "water";
    } else if (surfStart.inTunnel) {
      surfaceMu = hp.tireMu * 1.03;
      rollingCoeff = 0.014;
      car.wetUnderCar = 0.0;
      car.tireWetness = Math.max(0, car.tireWetness - initSpeed * dt * 0.028 - dt * 0.08);
      car.surfaceLabel = "DRY TUNNEL";
      car.surfaceClass = "tunnel";
    } else if (surfStart.onRoad) {
      const drainScale = surfStart.surfaceType === "BRIDGE" ? 0.58 : 1.0;
      leftPuddle = samplePuddleAt(car.x - initRx * sp.wheelX, car.z - initRz * sp.wheelX, puddleLevel) * drainScale;
      rightPuddle = samplePuddleAt(car.x + initRx * sp.wheelX, car.z + initRz * sp.wheelX, puddleLevel) * drainScale;
      const centerPuddle = samplePuddleAt(car.x, car.z, puddleLevel) * drainScale;
      puddleAvg = Math.max(centerPuddle, (leftPuddle + rightPuddle) * 0.5);
      const puddlePeak = Math.max(leftPuddle, rightPuddle, centerPuddle);

      const effWet = Math.max(roadMoisture * 0.58, puddlePeak);
      car.wetUnderCar = effWet;

      if (puddlePeak > 0.16 && car.grounded) {
        car.tireWetness = Math.min(1.0, Math.max(car.tireWetness, 0.55 + puddlePeak * 0.45));
      } else if (roadMoisture > 0.35 && car.grounded) {
        car.tireWetness = Math.max(car.tireWetness, roadMoisture * 0.65);
      } else {
        car.tireWetness = Math.max(roadMoisture * 0.4, car.tireWetness - initSpeed * dt * 0.022 - dt * 0.06);
      }

      const circuitGripBonus = surfStart.surfaceType === "CIRCUIT" ? 1.05 : 1.0;
      const wetFactor = 1.0 - (roadMoisture * 0.12 + puddleAvg * 0.24 + car.tireWetness * 0.04) * (hp.wetMuDrop / 0.3);
      surfaceMu = hp.tireMu * circuitGripBonus * Math.max(0.6, wetFactor);
      rollingCoeff = 0.015 + effWet * 0.018;

      if (surfStart.surfaceType === "CIRCUIT") {
        car.surfaceLabel = puddlePeak > 0.28 ? "WET GP TARMAC" : roadMoisture > 0.2 ? "DAMP GP TARMAC" : "GP RACING TARMAC";
        car.surfaceClass = puddlePeak > 0.28 ? "wet" : "circuit";
      } else if (surfStart.surfaceType === "BRIDGE") {
        car.surfaceLabel = puddlePeak > 0.32 ? "BRIDGE PUDDLE" : roadMoisture > 0.4 ? "WET BRIDGE DECK" : "BRIDGE DECK";
        car.surfaceClass = puddlePeak > 0.32 || roadMoisture > 0.4 ? "wet" : "bridge";
      } else if (puddlePeak > 0.28) {
        car.surfaceLabel = "WET PUDDLE";
        car.surfaceClass = "wet";
      } else if (roadMoisture > 0.16) {
        car.surfaceLabel = "DAMP ASPHALT";
        car.surfaceClass = "damp";
      } else if (car.tireWetness > 0.36) {
        car.surfaceLabel = "WET TIRES";
        car.surfaceClass = "damp";
      } else {
        car.surfaceLabel = "DRY ASPHALT";
        car.surfaceClass = "dry";
      }
    } else {
      const grassWet = Math.max(roadMoisture, puddleLevel * 0.5) * 0.4;
      car.wetUnderCar = grassWet;
      car.tireWetness = Math.max(grassWet, car.tireWetness - initSpeed * dt * 0.03 - dt * 0.08);
      surfaceMu = Math.max(0.7, hp.offroadMu * (1.0 - grassWet * 0.15));
      rollingCoeff = sp.id === "suv" || sp.id === "rally" || sp.id === "buggy" ? 0.034 : 0.075;
      car.surfaceLabel = "OFF-ROAD GRASS";
      car.surfaceClass = "offroad";
    }
    car.currentGrip = surfaceMu;

    // Active Aerodynamics (DRS / Airbrake), Slipstream Drafting & Crosswinds
    const draftStrength = computeDraftStrength(initVLong);
    car.drafting = draftStrength > 0.06;

    let aeroMode = "OFF";
    let effCdA = hp.cdA * (1.0 - draftStrength);
    let effClFrontA = hp.clFrontA * (1.0 - draftStrength * 0.26);
    let effClRearA = hp.clRearA;
    let targetWingAngle = -0.14;

    if (sp.hasActiveAero) {
      if (car.brakePedal > 0.32 && initVLong > 22.0) {
        aeroMode = "AIRBRK";
        effCdA += hp.airbrakeDragAdd;
        effClRearA += hp.airbrakeRearDfAdd;
        targetWingAngle = -0.68;
      } else if (
        initVLong > 36.0 &&
        car.throttlePedal > 0.6 &&
        Math.abs(car.steerAngle) < 0.095 &&
        !car.drifting &&
        !handbrake
      ) {
        aeroMode = "DRS";
        effCdA *= 1.0 - hp.drsDragCut;
        effClRearA *= 1.0 - hp.drsRearDfCut;
        targetWingAngle = 0.04;
      }
    }
    car.aeroMode = aeroMode;

    car.wingAngle = THREE.MathUtils.lerp(car.wingAngle, targetWingAngle, 1 - Math.exp(-12 * dt));
    if (activeWingPivot) activeWingPivot.rotation.x = car.wingAngle;

    let windWorldX = 0;
    let windWorldZ = 0;
    if (!car.inTunnel && weather.rainIntensity > 0.2) {
      const exposure = surfStart.surfaceType === "BRIDGE" ? 1.65 : 0.85;
      const gust = 0.72 + 0.28 * Math.sin(elapsed * 0.75) * Math.cos(elapsed * 0.41);
      const baseWind = (weather.name === "STORM" ? 15.5 : 6.2) * exposure * gust;
      windWorldX = baseWind;
      windWorldZ = baseWind * 0.3;
    }

    const halfA = sp.wheelZ;
    const halfB = sp.wheelZ;
    const wheelbase = halfA + halfB;

    const estDownforce = 0.5 * AIR_DENSITY * initSpeed * initSpeed * (effClFrontA + effClRearA);
    const maxLatAccel = hp.tireMu * (GRAVITY_PHYS + estDownforce / hp.mass);
    const geoSteer = Math.atan((wheelbase * maxLatAccel) / Math.max(12, initSpeed * initSpeed));
    const speedBlend = THREE.MathUtils.clamp((initSpeed - 3.0) / 14.0, 0.0, 1.0);
    const slipAllowance = 0.125 * speedBlend;

    const driftBonus = handbrake
      ? sp.id === "drift"
        ? 0.28
        : 0.2
      : sp.id === "drift"
      ? 0.12
      : sp.id === "muscle" && car.throttlePedal > 0.5 && initSpeed > 12
      ? 0.06
      : 0.0;
    const maxSteer = THREE.MathUtils.clamp(geoSteer + slipAllowance + driftBonus, 0.12, 0.68);

    const steerInRate = isAnalogSteer ? 16.5 : THREE.MathUtils.lerp(11.5, 6.8, Math.min(1, initSpeed / 70));
    const steerReturnRate = 15.5;

    let targetSteer = rawSteerInput * maxSteer;
    if (Math.abs(rawSteerInput) < 0.02 && car.grounded && initSpeed > 10 && car.drifting) {
      const vLatNow = car.vx * initRx + car.vz * initRz;
      const bodySlip = Math.atan2(vLatNow, Math.max(Math.abs(initVLong), 5.0));
      targetSteer = THREE.MathUtils.clamp(-bodySlip * 0.52, -0.48, 0.48);
    }

    const activeSteerRate = Math.abs(rawSteerInput) >= 0.02 ? steerInRate : steerReturnRate;
    car.steerAngle = THREE.MathUtils.lerp(car.steerAngle, targetSteer, 1 - Math.exp(-activeSteerRate * dt));

    // =====================================================================
    // 4x FIXED SUBSTEPS (~240 Hz WORLD-SPACE AERO, TIRE & HYDROPLANE SOLVER)
    // =====================================================================
    const SUBSTEPS = 4;
    const subDt = dt / SUBSTEPS;
    const brakeMuRatio = hp.brakeMu / hp.tireMu;

    car.absActive = false;
    car.tcsActive = false;
    let lastVLong = initVLong;
    let lastVLatR = 0;
    let lastRearSlip = 0;
    let lastTotalDownforceN = 0;
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

      const relAirLong = vLong - (windWorldX * fx + windWorldZ * fz);
      const relAirLat = vLat - (windWorldX * rx + windWorldZ * rz);
      const qLong = 0.5 * AIR_DENSITY * relAirLong * relAirLong;

      const dfFront = vLong > 0 ? qLong * effClFrontA : 0;
      const dfRear = vLong > 0 ? qLong * effClRearA : 0;
      lastTotalDownforceN = dfFront + dfRear;

      const fAeroDrag = -0.5 * AIR_DENSITY * effCdA * relAirLong * Math.abs(relAirLong);
      const fCrosswindLat = -0.5 * AIR_DENSITY * (hp.sideArea * 0.32) * (windWorldX === 0 ? 0 : relAirLat * Math.abs(relAirLat) - vLat * Math.abs(vLat));

      let totalFLong = 0;
      let totalFLat = 0;
      let yawTorque = 0;

      if (car.grounded) {
        const staticWeight = hp.mass * GRAVITY_PHYS;
        const weightTransfer = THREE.MathUtils.clamp(
          (hp.mass * car.accelLong * hp.cgHeight) / wheelbase,
          -staticWeight * 0.24,
          staticWeight * 0.24
        );

        const loadFront = Math.max(staticWeight * 0.24, staticWeight * 0.5 - weightTransfer + dfFront);
        const loadRear = Math.max(staticWeight * 0.24, staticWeight * 0.5 + weightTransfer + dfRear);

        const maxLatGripF = surfaceMu * loadFront;
        const maxLatGripR = surfaceMu * hp.rearMuMult * loadRear;
        const maxLongGripF = surfaceMu * brakeMuRatio * loadFront;
        const maxLongGripR = surfaceMu * brakeMuRatio * hp.rearMuMult * loadRear;

        const normRpm = THREE.MathUtils.clamp((car.rpm - 850) / 7150, 0, 1);
        const torqueShape =
          sp.soundType === "ev"
            ? 1.0 - 0.12 * Math.min(1, speed / sp.topSpeed)
            : 0.74 + 0.32 * Math.sin(normRpm * Math.PI * 0.85);
        const gearIdx = Math.max(0, Math.min(5, (car.gearNum > 0 ? car.gearNum : 1) - 1));
        const gearScale = sp.soundType === "ev" ? 0.96 : 0.54 + (GEAR_RATIOS[gearIdx] / GEAR_RATIOS[0]) * 0.58;

        let driveForce = 0;
        const aeroTopBonus = (aeroMode === "DRS" ? 3.8 : 0) + (car.drafting ? 3.5 : 0);
        const topCap = car.inWater ? 24 : (usingNitro ? sp.nitroTopSpeed : sp.topSpeed) + aeroTopBonus;

        if (car.throttlePedal > 0.01 && vLong < topCap) {
          const speedLimiter = smoothstepLimit(vLong, topCap - 5, topCap);
          driveForce =
            (hp.maxDriveForce * gearScale * torqueShape * car.throttlePedal + (usingNitro ? hp.nitroForce : 0)) *
            speedLimiter;
        } else if (wantReverse > 0.02 && vLong > -22) {
          driveForce = -hp.maxDriveForce * 0.52 * wantReverse;
        } else if (Math.abs(vLong) > 0.4) {
          const coastDrag = sp.soundType === "ev" ? 950 : 420;
          driveForce = -Math.sign(vLong) * (coastDrag + Math.abs(vLong) * 26);
        }

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
        const rearCoupling = (sp.id === "muscle" || sp.id === "drift") && car.throttlePedal > 0.4 ? 0.65 : 0.34;
        let latRetainR = Math.sqrt(Math.max(0.46, 1.0 - rearCoupling * longRatioR * longRatioR));

        if (handbrake) latRetainR *= 0.24;

        const availLatF = maxLatGripF * latRetainF;
        const availLatR = maxLatGripR * latRetainR;

        const fLatFrontTire = pacejkaNorm(alphaF, hp.pacejkaB, hp.pacejkaC) * availLatF * lowSpeedAtten;
        const fLatRearCar = pacejkaNorm(alphaR, hp.pacejkaB * 1.12, hp.pacejkaC) * availLatR * lowSpeedAtten;

        const fLongFrontCar = fLongFrontTire * cosD + fLatFrontTire * sinD * 0.28;
        const fLatFrontCar = -fLongFrontTire * sinD + fLatFrontTire * cosD;

        const fRoll = -rollingCoeff * (staticWeight + dfFront + dfRear) * Math.tanh(vLong * 1.4);
        const fSlope = -hp.mass * GRAVITY_PHYS * Math.sin(latestSurf.slopePitch);
        const fWaterLatDrag = car.inWater ? -vLat * hp.mass * 2.2 : 0;

        const fPuddleDrag = puddleAvg > 0.14 ? -puddleAvg * vLong * Math.abs(vLong) * 0.48 * (hp.mass / 1480) : 0;
        const puddleYawTug =
          Math.abs(rightPuddle - leftPuddle) > 0.12 && vLong > 10
            ? -(rightPuddle - leftPuddle) * vLong * vLong * 0.45 * sp.wheelX
            : 0;

        totalFLong = fLongFrontCar + fLongRearTire + fAeroDrag + fRoll + fSlope + fPuddleDrag;
        totalFLat = fLatFrontCar + fLatRearCar + fCrosswindLat + fWaterLatDrag;

        const yawDamp = -car.yawRate * hp.Iz * (handbrake ? 0.15 : 0.32);
        yawTorque = -halfA * fLatFrontCar + halfB * fLatRearCar + yawDamp + puddleYawTug;
      } else {
        totalFLong = fAeroDrag * 0.7;
        totalFLat = fCrosswindLat * 0.7;
        yawTorque = -car.yawRate * hp.Iz * 1.4;
      }

      const aLong = totalFLong / hp.mass;
      const aLat = totalFLat / hp.mass;
      accumLongAcc += aLong;
      accumLatAcc += aLat;

      car.vx += (aLong * fx + aLat * rx) * subDt;
      car.vz += (aLong * fz + aLat * rz) * subDt;
      car.yawRate += (yawTorque / hp.Iz) * subDt;
      car.yawRate = THREE.MathUtils.clamp(car.yawRate, -3.8, 3.8);
      car.heading += car.yawRate * subDt;

      if (car.grounded && !car.inWater && !handbrake && speed < 9.0 && speed > 0.08 && Math.abs(car.yawRate) < 1.8) {
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
        const hitSpd = Math.hypot(car.vx, car.vz);
        if (hitSpd > 4.5 && impactCooldown <= 0) {
          audio.playImpact(hitSpd);
          cameraTrauma = Math.min(1.0, cameraTrauma + Math.min(0.65, hitSpd / 26));
          spawnCollisionSparks(car.x, car.y, car.z, -fx, -fz, 0, 0, 12, hitSpd);
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
      const snapMargin = car.grounded && car.vy <= 1.2 && latestSurf.onRoad ? 0.55 : 0.08;

      if (car.y <= latestSurf.height + snapMargin) {
        if (!car.grounded) {
          const impactVy = Math.abs(car.vy);
          car.suspVel -= Math.min(3.8, impactVy * 0.22);
          if (impactVy > 6.0) {
            cameraTrauma = Math.min(1.0, cameraTrauma + Math.min(0.55, (impactVy - 5) / 22));
            if (latestSurf.onRoad && impactVy > 9.0) {
              spawnCollisionSparks(car.x, car.y, car.z, 0, 0, car.vx, car.vz, 14, impactVy);
            }
          }
          if (controls && impactVy > 4.5) {
            const landStr = Math.min(0.95, impactVy / 18);
            controls.rumble(landStr, landStr * 0.6, 150);
          }
          if (latestSurf.overWater) {
            audio.playWaterSplash(impactVy + Math.abs(vLong));
            pendingWaterImpact = Math.max(pendingWaterImpact, Math.min(1.4, 0.45 + impactVy * 0.09));
            showBanner("WATER SPLASH!");
          } else {
            if (puddleAvg > 0.15 && impactVy > 3.0) {
              pendingWaterImpact = Math.max(pendingWaterImpact, Math.min(1.2, 0.35 + impactVy * 0.08));
              audio.playPuddleWhoosh(impactVy * 3.0);
            }
            if (impactVy > 7.5) audio.playImpact(impactVy * 1.1);
            if (car.airTime > 0.55) showBanner(`AIR TIME ${car.airTime.toFixed(1)}S!`);
          }
        }
        // Slope-derived vertical velocity prevents curb/edge seams from launching the car upward
        const stepUp = latestSurf.height - prevY;
        car.y = latestSurf.height;
        const geoSlopeVy = vLong * Math.tan(THREE.MathUtils.clamp(latestSurf.slopePitch, -0.55, 0.55));
        car.vy = stepUp > 0.35 ? 0 : THREE.MathUtils.clamp(geoSlopeVy, -12, 18);
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
        pendingWaterImpact = Math.max(pendingWaterImpact, Math.min(1.3, 0.5 + Math.abs(vLong) * 0.03));
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
    car.downforceKg = Math.round(lastTotalDownforceN / GRAVITY_PHYS);

    car.hitPitchVel += (-car.hitPitch * 78 - car.hitPitchVel * 11.5) * dt;
    car.hitPitch = THREE.MathUtils.clamp(car.hitPitch + car.hitPitchVel * dt, -0.18, 0.18);
    car.hitRollVel += (-car.hitRoll * 72 - car.hitRollVel * 10.5) * dt;
    car.hitRoll = THREE.MathUtils.clamp(car.hitRoll + car.hitRollVel * dt, -0.22, 0.22);

    const absSpeed = Math.hypot(car.vx, car.vz);
    const nfx = -Math.sin(car.heading);
    const nfz = -Math.cos(car.heading);
    const nrx = Math.cos(car.heading);
    const nrz = -Math.sin(car.heading);

    // Live Car-to-Puddle Transformation
    const puddleHitPeak = Math.max(leftPuddle, rightPuddle, puddleAvg);
    if (car.grounded && latestSurf.onRoad && !car.inWater) {
      trailDistAccum += absSpeed * dt;
      if (trailDistAccum >= 2.05) {
        trailDistAccum = 0;
        const wakeStr = puddleHitPeak > 0.12 && absSpeed > 2.2
          ? Math.min(1.0, puddleHitPeak * (0.42 + absSpeed / 28))
          : 0.0;
        const wetTrackStr = car.tireWetness > 0.12 && roadMoisture < 0.72
          ? Math.min(1.0, car.tireWetness * (1.0 - roadMoisture * 0.65))
          : 0.0;

        if (wakeStr > 0.01 || wetTrackStr > 0.01) {
          stampWaterTrail(car.x, car.z, car.heading, sp.wheelX * 0.94, 1.38, wakeStr, wetTrackStr, elapsed);
        }
      }

      if (puddleHitPeak > 0.18 && absSpeed > 7.5) {
        if (puddleWhooshCooldown <= 0) {
          audio.playPuddleWhoosh(absSpeed);
          puddleWhooshCooldown = 0.34;
        }
        const fanChance = Math.min(0.95, 0.3 + absSpeed * 0.022);
        if (leftPuddle > 0.16 && Math.random() < fanChance) {
          spawnPuddleFan(car.x - nrx * sp.wheelX, car.y, car.z - nrz * sp.wheelX, -nrx, -nrz, car.vx, car.vz, absSpeed);
        }
        if (rightPuddle > 0.16 && Math.random() < fanChance) {
          spawnPuddleFan(car.x + nrx * sp.wheelX, car.y, car.z + nrz * sp.wheelX, nrx, nrz, car.vx, car.vz, absSpeed);
        }
      }
    }

    if (world.stepWaterSim) {
      world.stepWaterSim(renderer, dt, elapsed, car, sp, weather.rainIntensity, pendingWaterImpact);
    }
    pendingWaterImpact = 0;

    if (controls && ext.gamepadConnected && car.grounded) {
      if (scrapeIntensity > 0.15) controls.rumble(0.25, 0.55 * scrapeIntensity, 80);
      else if (puddleHitPeak > 0.25 && absSpeed > 12) controls.rumble(0.14, 0.34, 75);
      else if (car.drifting) controls.rumble(0.18, 0.35, 90);
      else if (usingNitro) controls.rumble(0.14, 0.28, 90);
      else if (!latestSurf.onRoad && absSpeed > 8) controls.rumble(0.12, 0.22, 90);
    }

    const aeroSquat = -Math.min(sp.suspTravel * 0.45, (lastTotalDownforceN / (hp.mass * GRAVITY_PHYS)) * 0.08);
    let targetHeave = car.grounded ? aeroSquat : 0;
    if (car.inWater) {
      targetHeave = Math.sin(elapsed * 4.2) * 0.065;
    } else if (car.grounded && !latestSurf.onRoad && absSpeed > 3) {
      targetHeave += Math.sin(elapsed * absSpeed * 1.45) * (sp.id === "suv" || sp.id === "rally" || sp.id === "buggy" ? 0.07 : 0.045);
    }
    car.suspVel += ((targetHeave - car.suspOffset) * sp.suspStiffness - car.suspVel * sp.suspDamping) * dt;
    car.suspOffset = THREE.MathUtils.clamp(car.suspOffset + car.suspVel * dt, -sp.suspTravel, sp.suspTravel);

    const speedScale = sp.topSpeed / 74;
    const kmh = Math.abs(lastVLong) * 3.6;
    let gearStr = "N";
    let newGearNum = 0;
    let gearRatio = 0;

    if (lastVLong < -0.45 || wantReverse > 0.02) {
      gearStr = "R";
      newGearNum = -1;
      gearRatio = Math.min(1, kmh / 72);
    } else if (sp.soundType === "ev") {
      if (kmh > 0.8 || car.throttlePedal > 0.08) {
        gearStr = "D";
        newGearNum = 1;
        gearRatio = THREE.MathUtils.clamp(kmh / (sp.topSpeed * 3.6), 0.05, 1.0);
      }
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

    const targetRpm =
      sp.soundType === "ev"
        ? 900 + gearRatio * 14100
        : 850 + gearRatio * 7100 + (car.throttlePedal > 0.1 && newGearNum <= 1 ? 750 * car.throttlePedal : 0);
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
      if ((car.wetUnderCar > 0.3 || car.tireWetness > 0.45) && absSpeed > 14 && Math.random() < 0.62) {
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

    frontWheelPivots.forEach((p) => (p.rotation.y = car.steerAngle));
    for (let i = 0; i < wheelMeshes.length; i++) {
      const wheelSpin = wheelIsRear[i] && handbrake ? 0 : (lastVLong * dt) / sp.wheelRadius;
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
    carBodyGroup.rotation.x = car.pitch + car.hitPitch;
    carBodyGroup.rotation.z = car.roll + car.hitRoll;

    const wheelDroop = car.grounded ? 0 : -sp.suspTravel * 0.65;
    for (let i = 0; i < wheelPivots.length; i++) {
      wheelPivots[i].position.y = THREE.MathUtils.lerp(wheelPivots[i].position.y, sp.wheelRadius + wheelDroop, 12 * dt);
    }

    const brakingVisual = car.brakePedal > 0.08 || handbrake;
    const preset = TIME_PRESETS[timeIndex];
    const headlightsOn = preset.headlights || weather.forceHeadlights || car.inTunnel || car.y < -1.5;

    headlightMat.emissiveIntensity = headlightsOn ? 3.4 : 0.45;
    if (headSpot) headSpot.intensity = rtEnabled && headlightsOn ? 3.4 : headlightsOn ? 1.4 : 0;
    volumetricBeams.forEach((b) => (b.visible = rtEnabled && headlightsOn));

    brakeLightMat.emissiveIntensity = brakingVisual ? 3.8 : 0.7;
    if (rearGlowLight) {
      rearGlowLight.color.setHex(usingNitro ? 0x38bdf8 : 0xff2222);
      rearGlowLight.intensity = rtEnabled ? (usingNitro ? 1.9 : brakingVisual ? 1.45 : 0.45) : 0;
    }

    if (controls) controls.syncPoliceSirenUI(sp.isPolice, sirenActive);

    if (policeLightbar) {
      if (sirenActive) {
        const phase = (elapsed * 6.5) % 2.0;
        const redOn = phase < 0.35 || (phase > 0.5 && phase < 0.85);
        const blueOn = (phase > 1.0 && phase < 1.35) || (phase > 1.5 && phase < 1.85);
        policeLightbar.redMat.emissiveIntensity = redOn ? 5.2 : 0.25;
        policeLightbar.blueMat.emissiveIntensity = blueOn ? 5.2 : 0.25;
        policeLightbar.redLight.intensity = redOn ? 3.8 : 0.0;
        policeLightbar.blueLight.intensity = blueOn ? 3.8 : 0.0;
      } else {
        policeLightbar.redMat.emissiveIntensity = 0.35;
        policeLightbar.blueMat.emissiveIntensity = 0.35;
        policeLightbar.redLight.intensity = 0;
        policeLightbar.blueLight.intensity = 0;
      }
    }

    _fwdVec.set(nfx, 0, nfz);
    world.setRoadUniform("uCarPos", carGroup.position);
    world.setRoadUniform("uCarForward", _fwdVec);
    world.setRoadUniform("uBrakeIntensity", brakingVisual ? 1.5 : 0.48);
    world.setRoadUniform("uNitroActive", usingNitro ? 1.0 : 0.0);

    world.setWaterUniform("uCarPos", carGroup.position);
    world.setWaterUniform("uCarForward", _fwdVec);
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
        p.mesh.scale.setScalar(0.75 + (1 - ratio) * (p.grow || 1.4));
        p.mesh.material.opacity = ratio * (p.baseAlpha || 0.3);
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
      Math.max(car.wetUnderCar, car.tireWetness * 0.55),
      car.inTunnel,
      elapsed,
      scrapeIntensity
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
  // 6. INTERACTIVE CLICK-TO-NAVIGATE 6-CITY GPS MAP + 3D ROAD CHEVRONS
  // =========================================================================
  const mapModal = document.getElementById("map-modal");
  const fullMapCanvas = document.getElementById("full-map-canvas");
  const fullMapCtx = fullMapCanvas.getContext("2d");
  const mapStatusText = document.getElementById("map-status-text");
  const btnMapWarp = document.getElementById("btn-map-warp");

  const gpsBar = document.getElementById("gps-bar");
  const gpsArrowEl = document.getElementById("gps-arrow");
  const gpsInstrEl = document.getElementById("gps-instruction");
  const gpsDestNameEl = document.getElementById("gps-dest-name");
  const gpsDistEl = document.getElementById("gps-distance");

  let gpsDest = null;
  let gpsPath = [];
  let gpsRerouteTimer = 0;

  const MAX_GPS_CHEVRONS = 24;
  const gpsChevronGroup = new THREE.Group();
  scene.add(gpsChevronGroup);

  const chevShape = new THREE.Shape();
  chevShape.moveTo(0, 1.5);
  chevShape.lineTo(1.75, -0.55);
  chevShape.lineTo(1.05, -1.25);
  chevShape.lineTo(0, -0.1);
  chevShape.lineTo(-1.05, -1.25);
  chevShape.lineTo(-1.75, -0.55);
  chevShape.closePath();

  const chevGeo = new THREE.ShapeGeometry(chevShape);
  chevGeo.rotateX(-Math.PI / 2);
  const chevMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const gpsChevrons = [];
  for (let i = 0; i < MAX_GPS_CHEVRONS; i++) {
    const m = new THREE.Mesh(chevGeo, chevMat);
    m.visible = false;
    gpsChevronGroup.add(m);
    gpsChevrons.push(m);
  }

  const destBeaconGroup = new THREE.Group();
  destBeaconGroup.visible = false;
  const destBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 3.8, 220, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  destBeam.position.y = 110;
  destBeaconGroup.add(destBeam);

  const destRing = new THREE.Mesh(
    new THREE.RingGeometry(3.4, 5.2, 28),
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  destRing.rotation.x = -Math.PI / 2;
  destRing.position.y = 0.25;
  destBeaconGroup.add(destRing);
  scene.add(destBeaconGroup);

  function setGPSDestination(wx, wz, customName = null) {
    const clampedX = THREE.MathUtils.clamp(wx, WORLD_BOUNDS.minX + 40, WORLD_BOUNDS.maxX - 40);
    const clampedZ = THREE.MathUtils.clamp(wz, WORLD_BOUNDS.minZ + 40, WORLD_BOUNDS.maxZ - 40);
    const zoneLabel = customName || `${world.getZoneName(clampedX, clampedZ)} (${Math.round(clampedX)}, ${Math.round(clampedZ)})`;

    gpsDest = { x: clampedX, z: clampedZ, name: zoneLabel };
    gpsPath = world.computeGPSRoute(car.x, car.z, clampedX, clampedZ);
    gpsRerouteTimer = 1.4;

    if (gpsDestNameEl) gpsDestNameEl.textContent = zoneLabel;
    if (gpsBar) gpsBar.classList.remove("hidden");
    if (mapStatusText) mapStatusText.textContent = `GPS ROUTE SET: ${zoneLabel}`;
    if (btnMapWarp) btnMapWarp.classList.remove("hidden");

    audio.playChime(784, 1174);
    showBanner(`GPS SET: ${zoneLabel}`);
    if (mapOpen) drawFullMap();
  }

  function clearGPSDestination(silent = false) {
    gpsDest = null;
    gpsPath = [];
    gpsChevrons.forEach((c) => (c.visible = false));
    destBeaconGroup.visible = false;
    if (gpsBar) gpsBar.classList.add("hidden");
    if (btnMapWarp) btnMapWarp.classList.add("hidden");
    if (mapStatusText) mapStatusText.textContent = "Tap or click anywhere on the map to set a GPS destination.";
    if (!silent) showBanner("GPS ROUTE CLEARED");
    if (mapOpen) drawFullMap();
  }

  const MAP_VIEW = { minX: -1240, maxX: 1960, minZ: -1540, maxZ: 1580 };

  function worldToFullMap(wx, wz) {
    const cw = fullMapCanvas.width;
    const ch = fullMapCanvas.height;
    const spanX = MAP_VIEW.maxX - MAP_VIEW.minX;
    const spanZ = MAP_VIEW.maxZ - MAP_VIEW.minZ;
    const scale = Math.min((cw - 48) / spanX, (ch - 36) / spanZ);
    const offX = (cw - spanX * scale) * 0.5;
    const offY = (ch - spanZ * scale) * 0.5;
    return {
      cx: offX + (wx - MAP_VIEW.minX) * scale,
      cy: offY + (wz - MAP_VIEW.minZ) * scale,
      scale,
    };
  }

  function fullMapToWorld(cx, cy) {
    const cw = fullMapCanvas.width;
    const ch = fullMapCanvas.height;
    const spanX = MAP_VIEW.maxX - MAP_VIEW.minX;
    const spanZ = MAP_VIEW.maxZ - MAP_VIEW.minZ;
    const scale = Math.min((cw - 48) / spanX, (ch - 36) / spanZ);
    const offX = (cw - spanX * scale) * 0.5;
    const offY = (ch - spanZ * scale) * 0.5;
    return {
      wx: MAP_VIEW.minX + (cx - offX) / scale,
      wz: MAP_VIEW.minZ + (cy - offY) / scale,
    };
  }

  function drawFullMap() {
    const cw = fullMapCanvas.width;
    const ch = fullMapCanvas.height;
    const { scale } = worldToFullMap(0, 0);

    fullMapCtx.clearRect(0, 0, cw, ch);
    fullMapCtx.fillStyle = "#06263d";
    fullMapCtx.fillRect(0, 0, cw, ch);

    fullMapCtx.strokeStyle = "rgba(56, 189, 248, 0.08)";
    fullMapCtx.lineWidth = 1;
    for (let gx = -1200; gx <= 2000; gx += 400) {
      const p = worldToFullMap(gx, 0);
      fullMapCtx.beginPath();
      fullMapCtx.moveTo(p.cx, 0);
      fullMapCtx.lineTo(p.cx, ch);
      fullMapCtx.stroke();
    }
    for (let gz = -1400; gz <= 1400; gz += 400) {
      const p = worldToFullMap(0, gz);
      fullMapCtx.beginPath();
      fullMapCtx.moveTo(0, p.cy);
      fullMapCtx.lineTo(cw, p.cy);
      fullMapCtx.stroke();
    }

    // 1) 6 City Islands + Palm Lagoon Cutout
    for (let i = 0; i < ISLANDS.length; i++) {
      const isl = ISLANDS[i];
      const p1 = worldToFullMap(isl.minX, isl.minZ);
      const p2 = worldToFullMap(isl.maxX, isl.maxZ);
      fullMapCtx.fillStyle =
        isl.id === "palm" ? "#1e3a2f"
          : isl.id === "pinecrest" ? "#152a24"
          : isl.id === "kuroshio" ? "#1a1430"
          : isl.id === "solara" ? "#262a20"
          : isl.id === "apexia" ? "#111c33"
          : "#0f172a";
      fullMapCtx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      fullMapCtx.lineWidth = 1.5;
      fullMapCtx.fillRect(p1.cx, p1.cy, p2.cx - p1.cx, p2.cy - p1.cy);
      fullMapCtx.strokeRect(p1.cx, p1.cy, p2.cx - p1.cx, p2.cy - p1.cy);

      if (isl.hole) {
        const h1 = worldToFullMap(isl.hole.minX, isl.hole.minZ);
        const h2 = worldToFullMap(isl.hole.maxX, isl.hole.maxZ);
        fullMapCtx.fillStyle = "#0369a1";
        fullMapCtx.fillRect(h1.cx, h1.cy, h2.cx - h1.cx, h2.cy - h1.cy);
      }
    }

    // 2) Alpine Mountain Ridge
    const m1 = worldToFullMap(-290, -870);
    const m2 = worldToFullMap(290, -350);
    fullMapCtx.fillStyle = "rgba(71, 85, 105, 0.5)";
    fullMapCtx.fillRect(m1.cx, m1.cy, m2.cx - m1.cx, m2.cy - m1.cy);

    // 3) All Roads, Highways, Bridges, Skyways, Tunnels, Underways & Grade 1 Circuit
    fullMapCtx.lineCap = "round";
    for (let i = 0; i < world.roadSegments.length; i++) {
      const s = world.roadSegments[i];
      const a = worldToFullMap(s.x1, s.z1);
      const b = worldToFullMap(s.x2, s.z2);
      fullMapCtx.strokeStyle =
        s.kind === "circuit"
          ? "#ef4444"
          : s.kind === "bridge"
          ? "#f97316"
          : s.kind === "viaduct"
          ? "#38bdf8"
          : s.kind === "tunnel" || s.kind === "underpass"
          ? "#a855f7"
          : s.kind === "highway"
          ? "#94a3b8"
          : "#475569";
      fullMapCtx.lineWidth = Math.max(2.2, s.w * scale * 1.15);
      fullMapCtx.beginPath();
      fullMapCtx.moveTo(a.cx, a.cy);
      fullMapCtx.lineTo(b.cx, b.cy);
      fullMapCtx.stroke();
    }

    // 4) Buildings
    fullMapCtx.fillStyle = "rgba(148, 163, 184, 0.42)";
    for (let i = 0; i < world.minimapBuildings.length; i++) {
      const b = world.minimapBuildings[i];
      const p1 = worldToFullMap(b.minX, b.minZ);
      fullMapCtx.fillRect(p1.cx, p1.cy, Math.max(1.5, b.w * scale), Math.max(1.5, b.d * scale));
    }

    // 5) 6-City & Landmark Labels
    fullMapCtx.font = "bold 11px Segoe UI, sans-serif";
    fullMapCtx.textAlign = "center";
    fullMapCtx.fillStyle = "rgba(226, 232, 240, 0.88)";
    [
      { x: 0, z: -1180, text: "PINECREST ALPINE" },
      { x: -40, z: 30, text: "METRO BAY CITY" },
      { x: 1280, z: -140, text: "PALM ISLAND MARINA" },
      { x: -40, z: 1060, text: "APEXIA METROPOLIS" },
      { x: -860, z: 320, text: "KUROSHIO NEON" },
      { x: 1560, z: -1120, text: "SOLARA MESA" },
    ].forEach((lbl) => {
      const p = worldToFullMap(lbl.x, lbl.z);
      fullMapCtx.fillText(lbl.text, p.cx, p.cy);
    });

    const gpLbl = worldToFullMap(980, 1080);
    fullMapCtx.fillStyle = "#fca5a5";
    fullMapCtx.fillText("🏁 APEXIA GRAND PRIX CIRCUIT", gpLbl.cx, gpLbl.cy);

    // 6) Active GPS Navigation Route Line + Destination Pin
    if (gpsDest && gpsPath.length > 0) {
      fullMapCtx.save();
      fullMapCtx.strokeStyle = "#10b981";
      fullMapCtx.lineWidth = 4.5;
      fullMapCtx.lineJoin = "round";
      fullMapCtx.beginPath();
      const startP = worldToFullMap(car.x, car.z);
      fullMapCtx.moveTo(startP.cx, startP.cy);
      for (let i = 0; i < gpsPath.length; i++) {
        const pt = worldToFullMap(gpsPath[i].x, gpsPath[i].z);
        fullMapCtx.lineTo(pt.cx, pt.cy);
      }
      fullMapCtx.stroke();
      fullMapCtx.restore();

      const dp = worldToFullMap(gpsDest.x, gpsDest.z);
      fullMapCtx.fillStyle = "rgba(16, 185, 129, 0.28)";
      fullMapCtx.beginPath();
      fullMapCtx.arc(dp.cx, dp.cy, 13, 0, Math.PI * 2);
      fullMapCtx.fill();

      fullMapCtx.fillStyle = "#10b981";
      fullMapCtx.strokeStyle = "#ffffff";
      fullMapCtx.lineWidth = 2;
      fullMapCtx.beginPath();
      fullMapCtx.arc(dp.cx, dp.cy, 6.5, 0, Math.PI * 2);
      fullMapCtx.fill();
      fullMapCtx.stroke();
    }

    // 7) Player Arrow
    const pp = worldToFullMap(car.x, car.z);
    fullMapCtx.save();
    fullMapCtx.translate(pp.cx, pp.cy);
    fullMapCtx.rotate(-car.heading);
    fullMapCtx.fillStyle = "#38bdf8";
    fullMapCtx.strokeStyle = "#ffffff";
    fullMapCtx.lineWidth = 1.5;
    fullMapCtx.beginPath();
    fullMapCtx.moveTo(0, -9);
    fullMapCtx.lineTo(6.5, 7);
    fullMapCtx.lineTo(0, 3.5);
    fullMapCtx.lineTo(-6.5, 7);
    fullMapCtx.closePath();
    fullMapCtx.fill();
    fullMapCtx.stroke();
    fullMapCtx.restore();
  }

  toggleMap = (forceState = null) => {
    mapOpen = forceState !== null ? forceState : !mapOpen;
    if (mapOpen && garageOpen) toggleGarage(false);
    mapModal.classList.toggle("hidden", !mapOpen);
    if (mapOpen) drawFullMap();
  };

  fullMapCanvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const rect = fullMapCanvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * fullMapCanvas.width;
    const cy = ((e.clientY - rect.top) / Math.max(1, rect.height)) * fullMapCanvas.height;
    const { wx, wz } = fullMapToWorld(cx, cy);
    setGPSDestination(wx, wz);
  });

  document.querySelectorAll(".map-chip").forEach((chip) => {
    chip.addEventListener("click", (e) => {
      e.currentTarget.blur();
      const wx = parseFloat(chip.dataset.x);
      const wz = parseFloat(chip.dataset.z);
      setGPSDestination(wx, wz, chip.dataset.name);
    });
  });

  document.getElementById("map-backdrop").addEventListener("click", () => toggleMap(false));
  document.getElementById("btn-map-close").addEventListener("click", () => toggleMap(false));
  document.getElementById("btn-map-drive").addEventListener("click", () => toggleMap(false));
  document.getElementById("btn-map-clear").addEventListener("click", () => clearGPSDestination());
  document.getElementById("btn-gps-clear").addEventListener("click", () => clearGPSDestination());
  document.getElementById("minimap-panel").addEventListener("click", () => toggleMap(true));
  if (btnMapWarp) {
    btnMapWarp.addEventListener("click", () => {
      if (!gpsDest) return;
      const isSubseaPin =
        gpsDest.x >= 1515 && gpsDest.x <= 1545 &&
        gpsDest.z >= -830 && gpsDest.z <= -298;
      const isUnderwayPin =
        gpsDest.x >= 155 && gpsDest.x <= 175 &&
        gpsDest.z >= -168 && gpsDest.z <= 214 &&
        Math.abs(gpsDest.z) > 14 &&
        Math.abs(gpsDest.z - 60) > 14 &&
        Math.abs(gpsDest.z - 120) > 12;

      const probeY = isSubseaPin ? -3.0 : isUnderwayPin ? -2.0 : 38;
      const surf = world.sampleSurface(gpsDest.x, gpsDest.z, probeY, car.heading);
      const spawnY = surf.onRoad ? surf.height + 0.2 : Math.max(0.2, surf.height + 0.2);
      teleportCar(gpsDest.x, spawnY, gpsDest.z, car.heading, `ARRIVED: ${gpsDest.name}`);
      clearGPSDestination(true);
      toggleMap(false);
    });
  }

  function updateGPS(dt, elapsed) {
    if (!gpsDest) return;

    const distToDest = Math.hypot(gpsDest.x - car.x, gpsDest.z - car.z);
    if (distToDest < 18.0) {
      audio.playChime(987, 1318);
      showBanner(`ARRIVED: ${gpsDest.name}`);
      clearGPSDestination(true);
      return;
    }

    while (gpsPath.length > 1 && Math.hypot(gpsPath[0].x - car.x, gpsPath[0].z - car.z) < 24.0) {
      gpsPath.shift();
    }

    gpsRerouteTimer -= dt;
    if (gpsRerouteTimer <= 0) {
      gpsRerouteTimer = 1.6;
      gpsPath = world.computeGPSRoute(car.x, car.z, gpsDest.x, gpsDest.z);
    }

    let totalRouteDist = 0;
    let prevX = car.x;
    let prevZ = car.z;
    for (let i = 0; i < gpsPath.length; i++) {
      totalRouteDist += Math.hypot(gpsPath[i].x - prevX, gpsPath[i].z - prevZ);
      prevX = gpsPath[i].x;
      prevZ = gpsPath[i].z;
    }

    const nextWp = gpsPath[0] || gpsDest;
    const distToTurn = Math.hypot(nextWp.x - car.x, nextWp.z - car.z);
    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    const rx = Math.cos(car.heading);
    const rz = -Math.sin(car.heading);

    const toWpX = (nextWp.x - car.x) / Math.max(0.01, distToTurn);
    const toWpZ = (nextWp.z - car.z) / Math.max(0.01, distToTurn);
    const dotFwd = fx * toWpX + fz * toWpZ;
    const dotRight = rx * toWpX + rz * toWpZ;

    let turnDotRight = dotRight;
    let turnDotFwd = dotFwd;
    if (gpsPath.length >= 2 && distToTurn < 55) {
      const segDx = gpsPath[1].x - nextWp.x;
      const segDz = gpsPath[1].z - nextWp.z;
      const segL = Math.hypot(segDx, segDz) || 1;
      turnDotFwd = fx * (segDx / segL) + fz * (segDz / segL);
      turnDotRight = rx * (segDx / segL) + rz * (segDz / segL);
    }

    let arrowChar = "↑";
    let instrText = "CONTINUE STRAIGHT";
    if (distToDest < 55) {
      arrowChar = "🏁";
      instrText = "DESTINATION AHEAD";
    } else if (turnDotFwd < -0.35) {
      arrowChar = "↩";
      instrText = "MAKE A U-TURN";
    } else if (turnDotRight > 0.42) {
      arrowChar = "↱";
      instrText = distToTurn < 45 ? "TURN RIGHT NOW" : `TURN RIGHT IN ${Math.round(distToTurn)}M`;
    } else if (turnDotRight < -0.42) {
      arrowChar = "↰";
      instrText = distToTurn < 45 ? "TURN LEFT NOW" : `TURN LEFT IN ${Math.round(distToTurn)}M`;
    } else if (turnDotRight > 0.16) {
      arrowChar = "↗";
      instrText = "KEEP RIGHT";
    } else if (turnDotRight < -0.16) {
      arrowChar = "↖";
      instrText = "KEEP LEFT";
    }

    if (gpsArrowEl) gpsArrowEl.textContent = arrowChar;
    if (gpsInstrEl) gpsInstrEl.textContent = instrText;
    if (gpsDistEl) {
      gpsDistEl.textContent = totalRouteDist >= 1000 ? `${(totalRouteDist / 1000).toFixed(2)} km` : `${Math.round(totalRouteDist)} m`;
    }

    const spacing = 14.0;
    const flowOffset = (elapsed * 18.0) % spacing;
    let chevIdx = 0;
    let segStartX = car.x;
    let segStartZ = car.z;
    let segAccum = 0;

    for (let i = 0; i < gpsPath.length && chevIdx < MAX_GPS_CHEVRONS; i++) {
      const endX = gpsPath[i].x;
      const endZ = gpsPath[i].z;
      const segLen = Math.hypot(endX - segStartX, endZ - segStartZ);
      if (segLen > 1.0) {
        const yaw = Math.atan2(-(endX - segStartX), -(endZ - segStartZ));
        let d = Math.max(8.0, flowOffset) - (segAccum % spacing);
        if (d < 0) d += spacing;
        while (d < segLen && chevIdx < MAX_GPS_CHEVRONS) {
          const t = d / segLen;
          const cx = segStartX + (endX - segStartX) * t;
          const cz = segStartZ + (endZ - segStartZ) * t;
          const surf = world.sampleSurface(cx, cz, car.y + 8, yaw);
          const m = gpsChevrons[chevIdx++];
          m.visible = true;
          m.position.set(cx, surf.height + 0.34, cz);
          m.rotation.set(surf.slopePitch, yaw, 0, "YXZ");
          d += spacing;
        }
        segAccum += segLen;
      }
      segStartX = endX;
      segStartZ = endZ;
    }

    for (let i = chevIdx; i < MAX_GPS_CHEVRONS; i++) {
      gpsChevrons[i].visible = false;
    }

    const destSurf = world.sampleSurface(gpsDest.x, gpsDest.z, 38, 0);
    destBeaconGroup.visible = true;
    destBeaconGroup.position.set(gpsDest.x, Math.max(0, destSurf.height), gpsDest.z);
    const pulse = 0.88 + 0.24 * Math.sin(elapsed * 5.0);
    destRing.scale.set(pulse, pulse, 1);
  }

  // =========================================================================
  // 7. GRADE 1 GRAND PRIX CIRCUIT LIVE LAP & 3-SECTOR TIMING ENGINE
  // =========================================================================
  const circuitHud = document.getElementById("circuit-hud");
  const lapNumEl = document.getElementById("lap-num");
  const lapCurrentEl = document.getElementById("lap-current");
  const lapBestEl = document.getElementById("lap-best");
  const lapLastEl = document.getElementById("lap-last");
  const secEls = [
    document.getElementById("sec-1"),
    document.getElementById("sec-2"),
    document.getElementById("sec-3"),
  ];

  const circuitState = {
    active: false,
    lapNumber: 0,
    lapTime: 0,
    sectorStartTime: 0,
    sectorIdx: 0,
    prevRelDist: null,
    lastLap: null,
    bestLapsByCar: {},
    bestSectorsByCar: {},
  };

  function formatLapTime(sec) {
    if (sec === null || sec === undefined || !isFinite(sec)) return "--:--.--";
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    const whole = Math.floor(rem);
    const hundredths = Math.floor((rem - whole) * 100);
    return `${mins}:${String(whole).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
  }

  function formatSecTime(sec) {
    return `${sec.toFixed(1)}s`;
  }

  function resetSectorPills() {
    secEls.forEach((el, idx) => {
      if (!el) return;
      el.textContent = `S${idx + 1} --.-`;
      el.className = "sec-pill";
    });
  }

  onCarSwapped = (carId) => {
    const best = circuitState.bestLapsByCar[carId] || null;
    if (lapBestEl) lapBestEl.textContent = formatLapTime(best);
    circuitState.lapNumber = 0;
    circuitState.lapTime = 0;
    circuitState.sectorStartTime = 0;
    circuitState.sectorIdx = 0;
    circuitState.prevRelDist = null;
    if (lapNumEl) lapNumEl.textContent = "OUT LAP";
    resetSectorPills();
  };

  function updateCircuitTiming(dt) {
    const cd = world.circuitData;
    if (!cd) return;

    const prog = cd.getTrackProgress(car.x, car.z);
    if (!prog.onTrack) {
      if (circuitState.active) {
        circuitState.active = false;
        circuitState.prevRelDist = null;
        if (circuitHud) circuitHud.classList.add("hidden");
      }
      return;
    }

    if (!circuitState.active) {
      circuitState.active = true;
      circuitState.lapNumber = 0;
      circuitState.lapTime = 0;
      circuitState.sectorStartTime = 0;
      circuitState.sectorIdx = 0;
      circuitState.prevRelDist = null;
      if (circuitHud) circuitHud.classList.remove("hidden");
      if (lapNumEl) lapNumEl.textContent = "OUT LAP";
      if (lapBestEl) lapBestEl.textContent = formatLapTime(circuitState.bestLapsByCar[activeCarId]);
      if (lapLastEl) lapLastEl.textContent = formatLapTime(circuitState.lastLap);
      resetSectorPills();
      showBanner("APEXIA GRAND PRIX CIRCUIT · GRADE 1");
    }

    const totalLen = cd.totalLength;
    const relDist = (prog.dist - cd.startDist + totalLen) % totalLen;
    const relS1 = (cd.s1Dist - cd.startDist + totalLen) % totalLen;
    const relS2 = (cd.s2Dist - cd.startDist + totalLen) % totalLen;

    if (circuitState.lapNumber > 0) {
      circuitState.lapTime += dt;
    }

    if (circuitState.prevRelDist !== null) {
      const prev = circuitState.prevRelDist;

      if (prev > totalLen * 0.8 && relDist < totalLen * 0.2) {
        if (circuitState.lapNumber >= 1 && circuitState.lapTime > 12.0) {
          const s3Time = circuitState.lapTime - circuitState.sectorStartTime;
          const bestSecs = circuitState.bestSectorsByCar[activeCarId] || [Infinity, Infinity, Infinity];
          const isBestS3 = s3Time < bestSecs[2];
          if (isBestS3) bestSecs[2] = s3Time;
          circuitState.bestSectorsByCar[activeCarId] = bestSecs;
          if (secEls[2]) {
            secEls[2].textContent = `S3 ${formatSecTime(s3Time)}`;
            secEls[2].className = `sec-pill ${isBestS3 ? "sec-purple" : "sec-green"}`;
          }

          const completed = circuitState.lapTime;
          circuitState.lastLap = completed;
          if (lapLastEl) lapLastEl.textContent = formatLapTime(completed);

          const prevBest = circuitState.bestLapsByCar[activeCarId];
          if (!prevBest || completed < prevBest) {
            circuitState.bestLapsByCar[activeCarId] = completed;
            if (lapBestEl) lapBestEl.textContent = formatLapTime(completed);
            audio.playChime(987, 1480);
            showBanner(`NEW BEST LAP: ${formatLapTime(completed)}!`);
          } else {
            audio.playChime(784, 1046);
            showBanner(`LAP ${circuitState.lapNumber}: ${formatLapTime(completed)}`);
          }
        } else {
          audio.playChime(660, 990);
          showBanner("LAP 1 STARTED — GO!");
        }

        circuitState.lapNumber += 1;
        circuitState.lapTime = 0;
        circuitState.sectorStartTime = 0;
        circuitState.sectorIdx = 0;
        if (lapNumEl) lapNumEl.textContent = `LAP ${circuitState.lapNumber}`;
        setTimeout(() => {
          if (circuitState.lapTime < 2.2) resetSectorPills();
        }, 1800);
      }

      if (circuitState.lapNumber >= 1 && circuitState.sectorIdx === 0 && prev < relS1 && relDist >= relS1) {
        const s1Time = circuitState.lapTime - circuitState.sectorStartTime;
        circuitState.sectorStartTime = circuitState.lapTime;
        circuitState.sectorIdx = 1;

        const bestSecs = circuitState.bestSectorsByCar[activeCarId] || [Infinity, Infinity, Infinity];
        const isBest = s1Time < bestSecs[0];
        if (isBest) bestSecs[0] = s1Time;
        circuitState.bestSectorsByCar[activeCarId] = bestSecs;

        if (secEls[0]) {
          secEls[0].textContent = `S1 ${formatSecTime(s1Time)}`;
          secEls[0].className = `sec-pill ${isBest ? "sec-purple" : "sec-green"}`;
        }
      }

      if (circuitState.lapNumber >= 1 && circuitState.sectorIdx === 1 && prev < relS2 && relDist >= relS2) {
        const s2Time = circuitState.lapTime - circuitState.sectorStartTime;
        circuitState.sectorStartTime = circuitState.lapTime;
        circuitState.sectorIdx = 2;

        const bestSecs = circuitState.bestSectorsByCar[activeCarId] || [Infinity, Infinity, Infinity];
        const isBest = s2Time < bestSecs[1];
        if (isBest) bestSecs[1] = s2Time;
        circuitState.bestSectorsByCar[activeCarId] = bestSecs;

        if (secEls[1]) {
          secEls[1].textContent = `S2 ${formatSecTime(s2Time)}`;
          secEls[1].className = `sec-pill ${isBest ? "sec-purple" : "sec-green"}`;
        }
      }
    }

    circuitState.prevRelDist = relDist;
    if (lapCurrentEl) {
      lapCurrentEl.textContent = circuitState.lapNumber === 0 ? "0:00.00" : formatLapTime(circuitState.lapTime);
    }
  }

  // =========================================================================
  // 8. TRAUMA-SHAKE TUNNEL-SAFE CAMERA & LIVE 512px RT REFLECTION PASSES
  // =========================================================================
  function clampTunnelCam(desiredPos) {
    if (world.isPointInTunnel(desiredPos.x, desiredPos.z, car.y)) {
      if (Math.abs(desiredPos.x) < 25) {
        desiredPos.x = THREE.MathUtils.clamp(desiredPos.x, -9.8, 9.8);
        desiredPos.y = Math.min(desiredPos.y, 8.8);
      } else {
        desiredPos.y = Math.min(desiredPos.y, Math.min(-1.55, car.y + 3.4));
      }
    } else if (car.y < -1.2) {
      const underMetroDeck =
        Math.abs(desiredPos.x - 165) < 16 &&
        (Math.abs(desiredPos.z) < 24 || Math.abs(desiredPos.z - 120) < 22);
      if (underMetroDeck) {
        desiredPos.y = Math.min(desiredPos.y, Math.min(-1.5, car.y + 3.0));
      } else {
        desiredPos.y = Math.min(desiredPos.y, car.y + 3.4);
      }
    }
  }

  function updateCamera(dt, speed, usingNitro, elapsed) {
    if (garageOpen) {
      const orbitR = activeSpec.isSixWheel ? 10.6 : 7.8;
      const orbitH = activeSpec.isSixWheel ? 3.8 : 2.6;
      const ang = car.heading + elapsed * 0.45;
      const desiredPos = new THREE.Vector3(car.x + Math.sin(ang) * orbitR, car.y + orbitH, car.z + Math.cos(ang) * orbitR);
      const desiredLook = new THREE.Vector3(car.x, car.y + (activeSpec.isSixWheel ? 1.6 : 1.0), car.z);
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
        : 64 + Math.min(22, Math.abs(speed) * 0.21) + (usingNitro ? 6 : 0) + (car.aeroMode === "DRS" ? 3 : 0);
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

      const baseDist = activeSpec.isSixWheel ? 13.6 : activeSpec.id === "formula" || activeSpec.id === "lmp" ? 9.4 : 10.2;
      const dist = (car.inTunnel ? baseDist * 0.86 : baseDist) + Math.min(3.5, Math.abs(speed) * 0.04);
      const heightOff = car.inTunnel
        ? activeSpec.isSixWheel ? 4.4 : 3.2
        : activeSpec.isSixWheel
        ? 5.5
        : activeSpec.id === "suv"
        ? 4.45
        : activeSpec.id === "formula" || activeSpec.id === "lmp"
        ? 3.35
        : 4.05;

      const desiredPos = new THREE.Vector3(car.x - camDirX * dist, car.y + heightOff, car.z - camDirZ * dist);
      const desiredLook = new THREE.Vector3(
        car.x + camDirX * 7.2,
        car.y + (activeSpec.isSixWheel ? 2.1 : 1.35) + Math.sin(car.slopePitch) * 3.2,
        car.z + camDirZ * 7.2
      );

      clampTunnelCam(desiredPos);

      camPosCurrent.lerp(desiredPos, 1 - Math.exp(-8.5 * dt));
      clampTunnelCam(camPosCurrent);
      camLookCurrent.lerp(desiredLook, 1 - Math.exp(-11.5 * dt));
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    } else if (mode === "HOOD") {
      camPosCurrent.set(car.x + fx * 0.5, car.y + activeSpec.hoodEyeY + car.suspOffset, car.z + fz * 0.5);
      camLookCurrent.set(
        car.x + fx * 28,
        car.y + activeSpec.hoodEyeY - 0.3 + (car.slopePitch + car.pitch + car.hitPitch) * 14,
        car.z + fz * 28
      );
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    } else {
      const orbitH = car.inTunnel ? 6.5 : activeSpec.isSixWheel ? 29 : 26;
      const orbitD = car.inTunnel ? 11 : activeSpec.isSixWheel ? 25 : 21;
      const desiredPos = new THREE.Vector3(car.x - fx * orbitD, car.y + orbitH, car.z - fz * orbitD);
      clampTunnelCam(desiredPos);
      camPosCurrent.lerp(desiredPos, 1 - Math.exp(-5 * dt));
      camLookCurrent.set(car.x, car.y + 1.1, car.z);
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    }

    const shake = cameraTrauma * cameraTrauma;
    const speedVib = Math.abs(speed) > 62 ? ((Math.abs(speed) - 62) / 50) * 0.035 : 0;
    const totalAmp = shake * 0.55 + scrapeIntensity * 0.08 + speedVib;
    if (totalAmp > 0.002) {
      camera.position.x += Math.sin(elapsed * 47.0) * totalAmp;
      camera.position.y += Math.cos(elapsed * 53.0) * totalAmp * 0.72;
      camera.position.z += Math.sin(elapsed * 41.0 + 1.4) * totalAmp * 0.55;
      camera.rotation.z += Math.sin(elapsed * 39.0) * shake * 0.045;
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
    world.bridgeUndersideGroup.visible = false;
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
    world.bridgeUndersideGroup.visible = true;
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
  // 9. HUD TELEMETRY & 6-CITY MINIMAP (WITH GP CIRCUIT, TUNNELS & GPS ROUTE)
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
  const badgeAero = document.getElementById("badge-aero");
  const badgeDraft = document.getElementById("badge-draft");
  const aeroDfText = document.getElementById("aero-df-text");

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

    for (let i = 0; i < ISLANDS.length; i++) {
      const isl = ISLANDS[i];
      mapCtx.fillStyle =
        isl.id === "palm" ? "#1e3a2f"
          : isl.id === "pinecrest" ? "#152a24"
          : isl.id === "kuroshio" ? "#1a1430"
          : isl.id === "solara" ? "#262a20"
          : isl.id === "apexia" ? "#111c33"
          : "#0f172a";
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

    mapCtx.fillStyle = "rgba(71, 85, 105, 0.55)";
    mapCtx.fillRect((-290 - car.x) * scale, (-870 - car.z) * scale, 580 * scale, 520 * scale);

    mapCtx.lineCap = "round";
    for (let i = 0; i < world.roadSegments.length; i++) {
      const s = world.roadSegments[i];
      mapCtx.strokeStyle =
        s.kind === "circuit"
          ? "#ef4444"
          : s.kind === "bridge"
          ? "#f97316"
          : s.kind === "viaduct"
          ? "#38bdf8"
          : s.kind === "tunnel" || s.kind === "underpass"
          ? "#a855f7"
          : s.kind === "highway"
          ? "#64748b"
          : "#334155";
      mapCtx.lineWidth = Math.max(2.2, s.w * scale);
      mapCtx.beginPath();
      mapCtx.moveTo((s.x1 - car.x) * scale, (s.z1 - car.z) * scale);
      mapCtx.lineTo((s.x2 - car.x) * scale, (s.z2 - car.z) * scale);
      mapCtx.stroke();
    }

    mapCtx.fillStyle = "#475569";
    const viewRange = w / scale;
    for (let i = 0; i < world.minimapBuildings.length; i++) {
      const b = world.minimapBuildings[i];
      if (Math.abs(b.x - car.x) > viewRange || Math.abs(b.z - car.z) > viewRange) continue;
      mapCtx.fillRect((b.minX - car.x) * scale, (b.minZ - car.z) * scale, b.w * scale, b.d * scale);
    }

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

    mapCtx.fillStyle = "#fb923c";
    for (let i = 0; i < world.ramps.length; i++) {
      const r = world.ramps[i];
      mapCtx.fillRect((r.x - car.x) * scale - 3, (r.z - car.z) * scale - 3, 6, 6);
    }

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

    if (gpsDest && gpsPath.length > 0) {
      mapCtx.strokeStyle = "#10b981";
      mapCtx.lineWidth = 3.2;
      mapCtx.beginPath();
      mapCtx.moveTo(0, 0);
      for (let i = 0; i < gpsPath.length; i++) {
        mapCtx.lineTo((gpsPath[i].x - car.x) * scale, (gpsPath[i].z - car.z) * scale);
      }
      mapCtx.stroke();

      const dx = (gpsDest.x - car.x) * scale;
      const dz = (gpsDest.z - car.z) * scale;
      mapCtx.fillStyle = "#10b981";
      mapCtx.beginPath();
      mapCtx.arc(dx, dz, 4.5, 0, Math.PI * 2);
      mapCtx.fill();
    }

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
    const rpmMax = activeSpec.soundType === "ev" ? 15000 : 8000;
    rpmText.textContent = rpm;
    rpmFill.style.width = `${Math.min(100, (rpm / rpmMax) * 100)}%`;

    nitroFill.style.width = `${car.nitro}%`;
    nitroText.textContent = `${Math.round(car.nitro)}%`;

    const displayWet = moistureTrend === "PUDDLES" ? puddleLevel : Math.max(roadMoisture, puddleLevel * 0.6);
    const wetPct = Math.round(displayWet * 100);
    wetnessFill.style.width = `${wetPct}%`;
    wetnessText.textContent = `${wetPct}%`;
    wetnessTrendEl.textContent = moistureTrend;
    wetnessTrendEl.className =
      moistureTrend === "WETTING" || moistureTrend === "POOLING" || moistureTrend === "WET" || moistureTrend === "PUDDLES"
        ? "trend-tag wetting"
        : moistureTrend === "DRYING"
        ? "trend-tag drying"
        : "trend-tag";

    badgeAbs.classList.toggle("active-abs", car.absActive);
    badgeDrift.classList.toggle("active-drift", car.drifting);
    badgeTcs.classList.toggle("active-tcs", car.tcsActive);

    if (badgeAero) {
      badgeAero.textContent = car.aeroMode === "AIRBRK" ? "AIRBRK" : "DRS";
      badgeAero.classList.toggle("active-drs", car.aeroMode === "DRS");
      badgeAero.classList.toggle("active-airbrk", car.aeroMode === "AIRBRK");
    }
    if (badgeDraft) badgeDraft.classList.toggle("active-draft", car.drafting);
    if (aeroDfText) aeroDfText.textContent = `${car.downforceKg} kg`;

    coordsEl.textContent = `X: ${Math.round(car.x)} | Z: ${Math.round(car.z)} | ALT: ${Math.round(car.y)}m`;

    surfacePill.textContent = car.surfaceLabel;
    surfacePill.className = `surface-pill ${car.surfaceClass}`;
    gripReadout.textContent = `GRIP ${Math.round(Math.min(140, (car.currentGrip / 1.9) * 100))}%`;

    zoneEl.textContent = world.getZoneName(car.x, car.z, car.y);

    if (frameCounter % 3 === 0) drawMinimap();
    if (mapOpen && frameCounter % 3 === 0) drawFullMap();
  }

  // =========================================================================
  // 10. BUTTONS, RESIZE & FXAA + BLOOM POST-PROCESSED MAIN LOOP
  // =========================================================================
  function bindButton(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", (e) => {
      e.currentTarget.blur();
      handler();
    });
  }

  bindButton("btn-map", () => toggleMap());
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

    const activeReflScale = controls && controls.isTouchDevice ? 0.5 : reflScale;
    reflTarget.setSize(
      Math.max(256, Math.floor(window.innerWidth * activeReflScale)),
      Math.max(256, Math.floor(window.innerHeight * activeReflScale))
    );
    renderer.getDrawingBufferSize(drawingBufferSize);
    postProcess.resize(drawingBufferSize.x, drawingBufferSize.y);
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

    updateLiveWeather(dt);
    syncDynamicEnvironment();

    const weather = liveWeather;
    const timePreset = TIME_PRESETS[timeIndex];

    world.skyUniforms.uTime.value = elapsed;
    world.setRoadUniform("uTime", elapsed);
    world.setWaterUniform("uTime", elapsed);

    updateRoadMoisture(dt);
    const effectiveRoadWet = Math.max(roadMoisture, puddleLevel * 0.65);
    world.updateTrafficAndBoats(dt, elapsed, car, weather.waveStrength, effectiveRoadWet, trafficEnabled);
    const { vLong, usingNitro } = updatePhysics(dt, elapsed);
    updateGPS(dt, elapsed);
    updateCircuitTiming(dt);
    updateSparks(dt);
    updateCamera(dt, vLong, usingNitro, elapsed);

    const flash = world.updateWeather(dt, weather, camera.position, car, car.inTunnel, () => audio.playThunder());
    flashOverlay.style.opacity = car.inTunnel ? "0" : (flash * 0.65).toFixed(3);

    renderRTPasses();
    updateHUD(vLong);

    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) eventBanner.classList.remove("visible");
    }

    world.setRoadUniform("uHasTrails", elapsed - lastTrailStampTime < 9.0 ? 1.0 : 0.0);

    const bloomStrength = timePreset.name === "NIGHT" ? 0.78 : timePreset.name === "SUNSET" ? 0.56 : 0.28;
    const speedChroma = usingNitro ? 0.0055 : Math.abs(vLong) > 68 ? ((Math.abs(vLong) - 68) / 50) * 0.0025 : 0;
    const crashChroma = cameraTrauma * cameraTrauma * 0.014;

    if (rtEnabled && frameCounter % 2 === 0) {
      renderer.shadowMap.needsUpdate = true;
    }

    postProcess.render(scene, camera, {
      bloomStrength,
      chroma: speedChroma + crashChroma,
      vignette: car.inTunnel ? 0.36 : timePreset.name === "NIGHT" ? 0.28 : 0.2,
      enabled: rtEnabled,
    });
  }

  animate();
})();