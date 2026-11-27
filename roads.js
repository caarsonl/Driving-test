window.HorizonRoads = (() => {
  "use strict";

  function smooth01(t) {
    const c = THREE.MathUtils.clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
  }

  // Smooth upward-facing (+Y) road ribbon along 3D spline samples
  function buildSplineRibbon(samples, halfW, mat, tileLen = 20.0, closed = false) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const count = samples.length;

    for (let i = 0; i < count; i++) {
      const s = samples[i];
      const lx = s.x - s.rx * halfW;
      const lz = s.z - s.rz * halfW;
      const rx = s.x + s.rx * halfW;
      const rz = s.z + s.rz * halfW;

      positions.push(lx, s.y + 0.04, lz, rx, s.y + 0.04, rz);
      normals.push(s.nx, s.ny, s.nz, s.nx, s.ny, s.nz);
      uvs.push(0, s.dist / tileLen, 1, s.dist / tileLen);

      if (i < count - 1) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    if (closed && count > 2) {
      const last = (count - 1) * 2;
      indices.push(last, last + 1, 0, last + 1, 1, 0);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return new THREE.Mesh(geo, mat);
  }

  // Continuous sloped retaining-wall + top coping ribbon (zero sky gaps on slopes!)
  function buildContinuousWallMesh(samples, side, innerOff, outerOff, topYs, mat) {
    const positions = [];
    const indices = [];

    function pushQuad(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
      const base = positions.length / 3;
      positions.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    for (let i = 0; i < samples.length - 1; i++) {
      const tA = topYs[i];
      const tB = topYs[i + 1];
      if (tA === null || tB === null) continue;

      const a = samples[i];
      const b = samples[i + 1];

      const aIx = a.x + a.rx * side * innerOff;
      const aIz = a.z + a.rz * side * innerOff;
      const bIx = b.x + b.rx * side * innerOff;
      const bIz = b.z + b.rz * side * innerOff;

      const aOx = a.x + a.rx * side * outerOff;
      const aOz = a.z + a.rz * side * outerOff;
      const bOx = b.x + b.rx * side * outerOff;
      const bOz = b.z + b.rz * side * outerOff;

      // Bury wall bottom 2.4m below the road surface so sky never leaks through
      const aBot = a.y - 2.4;
      const bBot = b.y - 2.4;

      // 1) Inner vertical wall face
      pushQuad(aIx, aBot, aIz, bIx, bBot, bIz, bIx, tB, bIz, aIx, tA, aIz);
      // 2) Top concrete coping ledge (seals the grass trench edge)
      pushQuad(aIx, tA, aIz, bIx, tB, bIz, bOx, tB, bOz, aOx, tA, aOz);
      // 3) Outer vertical face
      pushQuad(aOx, tA, aOz, bOx, tB, bOz, bOx, Math.min(-0.8, bBot), bOz, aOx, Math.min(-0.8, aBot), aOz);
    }

    if (!positions.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
  }

  // Merge-gap zones where existing skyway/bridge barriers & poles open cleanly for diversions
  const MERGE_OPENINGS = [
    { minX: 1130, maxX: 1255, minZ: -1158, maxZ: -1115, minY: 8, maxY: 16, side: 1 },
    { minX: -255, maxX: -195, minZ: 45, maxZ: 76, minY: 8, maxY: 16, side: 1 },
    { minX: -88, maxX: -56, minZ: 225, maxZ: 300, minY: 18, maxY: 26, side: -1 },
    { minX: -88, maxX: -56, minZ: 485, maxZ: 560, minY: 18, maxY: 26, side: 1 },
    { minX: -88, maxX: -56, minZ: 720, maxZ: 795, minY: 18, maxY: 26, side: 1 },
    { minX: 860, maxX: 925, minZ: -16, maxZ: 16, minY: 1, maxY: 10, side: -1 },
  ];

  function isMergeOpening(x, z, y, side = 0) {
    for (let i = 0; i < MERGE_OPENINGS.length; i++) {
      const m = MERGE_OPENINGS[i];
      if (
        x >= m.minX && x <= m.maxX &&
        z >= m.minZ && z <= m.maxZ &&
        y >= m.minY && y <= m.maxY &&
        (side === 0 || m.side === side)
      ) {
        return true;
      }
    }
    return false;
  }

  // Exact trench cutouts matching the analytic ramp start/end points (+2m margin = zero grass bar!)
  const ISLAND_TRENCH_HOLES = {
    metro: [{ minX: 155.6, maxX: 174.4, minZ: -168, maxZ: 214 }],
    palm: [{ minX: 1520.2, maxX: 1539.8, minZ: -380, maxZ: -298 }],
    solara: [{ minX: 1520.2, maxX: 1539.8, minZ: -830, maxZ: -780 }],
  };

  function buildComplexNetwork(ctx) {
    const {
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
    } = ctx;

    // =======================================================================
    // 1. COMPLEX CORRIDOR DEFINITIONS (4 LEVELS, CURVES, U-TURNS, UNDERWAYS)
    // =======================================================================
    const CORRIDORS = [
      // 1) LEVEL 3/4: Metro Stack Spiral Flyover (+11.5m SKYWAY_EW -> +27m Arc -> +22m SKYWAY_NS)
      {
        id: "metro_spiral",
        zone: "METRO STACK SPIRAL FLYOVER",
        kind: "viaduct",
        mat: roadMatBridge,
        halfW: 7.4,
        segs: 42,
        barriers: true,
        openEnds: 0.14,
        neonIdx: 0,
        piers: true,
        pts: [
          [-232, 11.54, 60],
          [-182, 13.6, 76],
          [-140, 19.2, 126],
          [-120, 26.2, 184],
          [-94, 25.4, 232],
          [-72, 22.05, 265],
          [-72, 22.05, 290],
        ],
        gpsConnectStart: "sky_ew_e",
        gpsConnectEnd: "sky_ns_m",
      },

      // 2) LEVEL 4 (+33m): Trans-Bay Super-Overpass (Upper Skyway -> Soars Over Bay -> Palm Island)
      {
        id: "transbay_overpass",
        zone: "TRANS-BAY LEVEL-4 OVERPASS",
        kind: "bridge",
        mat: roadMatBridge,
        halfW: 8.6,
        segs: 64,
        barriers: true,
        openEnds: 0.08,
        neonIdx: 3,
        piers: true,
        pts: [
          [-72, 22.05, 515],
          [-48, 25.0, 568],
          [85, 31.5, 582],
          [350, 33.2, 518],
          [650, 31.0, 425],
          [895, 19.5, 336],
          [1028, 6.8, 282],
          [1065, 1.4, 266],
          [1080, 0.05, 260],
        ],
        gpsConnectStart: "sky_ns_m",
        gpsConnectEnd: "p_1080_s",
      },

      // 3) Apexia GP Express Diversion (Stays north of z=950 until clean merge at x=340)
      {
        id: "gp_diversion",
        zone: "APEXIA GP EXPRESS DIVERSION",
        kind: "viaduct",
        mat: roadMatBridge,
        halfW: 7.6,
        segs: 46,
        barriers: true,
        openEnds: 0.12,
        neonIdx: 1,
        piers: true,
        pts: [
          [-72, 22.05, 748],
          [-48, 20.0, 812],
          [35, 15.0, 868],
          [145, 9.2, 886],
          [245, 4.2, 898],
          [310, 0.8, 926],
          [340, 0.05, 950],
        ],
        gpsConnectStart: "sky_ns_m",
        gpsConnectEnd: "a_e2_950",
      },

      // 4) Golden Bay Bridge -> Palm Roundabout West Ring Diversion
      {
        id: "palm_diversion",
        zone: "PALM RESORT DIVERSION RAMP",
        kind: "bridge",
        mat: roadMatBridge,
        halfW: 6.8,
        segs: 28,
        barriers: true,
        openEnds: 0.16,
        neonIdx: 4,
        piers: true,
        pts: [
          [885, 4.68, 0],
          [942, 3.2, -26],
          [992, 1.3, -84],
          [1024, 0.18, -124],
          [1048, 0.05, -140],
        ],
        gpsConnectStart: "br_e",
        gpsConnectEnd: "p_1080_0",
      },

      // 5) LEVEL -1 (-6.5m): Metro Bay Central Underway (Exact analytic ramp = zero sag & zero grass bar!)
      {
        id: "metro_underway",
        zone: "METRO BAY CENTRAL UNDERWAY",
        kind: "underpass",
        mat: roadMatHighway,
        halfW: 8.6,
        segs: 96,
        barriers: false,
        underpassWalls: true,
        overpassCrossings: [
          { z: 0, halfW: 11.4, addDeck: true },
          { z: 60, halfW: 11.5, addDeck: false },
          { z: 120, halfW: 8.4, addDeck: true },
        ],
        analyticY(z) {
          if (z <= -166 || z >= 212) return 0.04;
          if (z < -74) return 0.04 - 6.54 * smooth01((z + 166) / 92);
          if (z <= 132) return -6.5;
          return -6.5 + 6.54 * smooth01((z - 132) / 80);
        },
        pts: [
          [165, 0.04, -240],
          [165, 0.04, -166],
          [165, -6.5, -74],
          [165, -6.5, 132],
          [165, 0.04, 212],
          [165, 0.04, 260],
        ],
        gpsConnectStart: "m_e_240n",
        gpsConnectEnd: "m_e_260",
      },

      // 6) LEVEL -1 (-7.5m): Palm–Solara Subsea Bay Tunnel (Straight x=1530 trench + analytic floor!)
      {
        id: "subsea_tunnel",
        zone: "PALM-SOLARA SUBSEA BAY TUNNEL",
        kind: "tunnel",
        mat: roadMatHighway,
        halfW: 9.2,
        segs: 100,
        barriers: false,
        underpassWalls: true,
        isTubeTunnel: true,
        tubeMinZ: -780,
        tubeMaxZ: -380,
        analyticY(z) {
          if (z >= -300 || z <= -828) return 0.04;
          if (z > -395) return 0.04 - 7.54 * smooth01((-300 - z) / 95);
          if (z >= -755) return -7.5;
          return -7.5 + 7.54 * smooth01((-755 - z) / 73);
        },
        pts: [
          [1540, 0.04, -280],
          [1530, 0.04, -298],
          [1530, -7.5, -395],
          [1530, -7.5, -580],
          [1530, -7.5, -755],
          [1530, 0.04, -830],
          [1520, 0.04, -844],
        ],
        gpsConnectStart: "p_1540_n",
        gpsConnectEnd: "s_m_s",
      },

      // 7) Pinecrest Alpine Touge Switchbacks (Winding S-Curves + Banked 180-deg Hairpin U-Turn)
      {
        id: "pinecrest_touge",
        zone: "PINECREST ALPINE TOUGE",
        kind: "city",
        mat: roadMatCity,
        halfW: 7.4,
        segs: 86,
        barriers: true,
        openEnds: 0.05,
        lowGuardrail: true,
        piers: false,
        pts: [
          [-300, 0.05, -1020],
          [-374, 0.8, -1064],
          [-346, 2.2, -1152],
          [-390, 3.8, -1244],
          [-342, 4.6, -1332],
          [-384, 4.4, -1398],
          [-286, 3.0, -1418],
          [-118, 1.6, -1390],
          [82, 3.2, -1416],
          [258, 1.8, -1392],
          [340, 0.05, -1340],
        ],
        gpsConnectStart: "pc_w_1020",
        gpsConnectEnd: "pc_e_1340",
      },

      // 8) Palm Island Traffic Roundabout (360-deg Closed Circular Junction at 1080, -140)
      {
        id: "palm_roundabout",
        zone: "PALM ISLAND ROUNDABOUT",
        kind: "city",
        mat: roadMatCity,
        halfW: 7.2,
        segs: 40,
        closed: true,
        barriers: false,
        pts: Array.from({ length: 12 }, (_, k) => {
          const a = (k / 12) * Math.PI * 2;
          return [1080 + Math.cos(a) * 32, 0.048, -140 + Math.sin(a) * 32];
        }),
        gpsConnectStart: "p_1080_0",
        gpsConnectEnd: "p_1080_n",
      },

      // 9) Palm Diagonal Resort Boulevard
      {
        id: "palm_diagonal",
        zone: "PALM MARINA BOULEVARD",
        kind: "city",
        mat: roadMatCity,
        halfW: 7.2,
        segs: 26,
        barriers: false,
        pts: [
          [1110, 0.046, -152],
          [1168, 0.046, -184],
          [1224, 0.046, -236],
          [1280, 0.046, -280],
        ],
        gpsConnectStart: "p_1080_n",
        gpsConnectEnd: "p_1280_n",
      },

      // 10) Palm Beachfront Corniche & Peninsula 180-deg U-Turn Loop
      {
        id: "palm_corniche",
        zone: "PALM BEACHFRONT CORNICHE",
        kind: "city",
        mat: roadMatCity,
        halfW: 7.0,
        segs: 72,
        barriers: false,
        pts: [
          [1080, 0.046, 260],
          [1146, 0.046, 316],
          [1315, 0.046, 330],
          [1530, 0.046, 328],
          [1618, 0.046, 294],
          [1630, 0.046, 198],
          [1620, 0.046, 86],
          [1586, 0.046, 18],
          [1540, 0.046, 0],
        ],
        gpsConnectStart: "p_1080_s",
        gpsConnectEnd: "p_1540_0",
      },

      // 11) Kuroshio Neon Waterfront S-Curve & North Elevated 180-deg U-Turn Overpass
      {
        id: "kuroshio_uturn",
        zone: "KUROSHIO NEON U-TURN LOOP",
        kind: "viaduct",
        mat: roadMatCity,
        halfW: 7.2,
        segs: 64,
        barriers: true,
        openEnds: 0.08,
        lowGuardrail: true,
        neonIdx: 2,
        piers: true,
        pts: [
          [-1080, 0.05, 520],
          [-1128, 0.05, 375],
          [-1114, 0.05, 195],
          [-1130, 1.6, 28],
          [-1120, 4.2, -84],
          [-1020, 4.6, -118],
          [-912, 3.0, -108],
          [-860, 0.05, -60],
        ],
        gpsConnectStart: "k_w_520",
        gpsConnectEnd: "k_m_n",
      },

      // 12) Solara Mesa Sweeping Cliffside Tech Ring
      {
        id: "solara_ring",
        zone: "SOLARA CLIFFSIDE RING",
        kind: "city",
        mat: roadMatCity,
        halfW: 7.2,
        segs: 52,
        barriers: true,
        openEnds: 0.06,
        lowGuardrail: true,
        pts: [
          [1520, 0.046, -1380],
          [1665, 0.046, -1425],
          [1814, 0.046, -1392],
          [1846, 0.046, -1235],
          [1836, 0.046, -1035],
          [1818, 0.046, -866],
          [1760, 0.046, -840],
        ],
        gpsConnectStart: "s_m_n",
        gpsConnectEnd: "s_e_s",
      },

      // 13) Metro Bay South Dedicated Highway U-Turn Loop
      {
        id: "metro_uturn",
        zone: "METRO BAY U-TURN BAY",
        kind: "city",
        mat: roadMatCity,
        halfW: 6.4,
        segs: 24,
        barriers: false,
        pts: [
          [0, 0.046, 282],
          [38, 0.046, 304],
          [48, 0.046, 332],
          [26, 0.046, 352],
          [0, 0.046, 344],
        ],
        gpsConnectStart: "m_0_260",
        gpsConnectEnd: "m_0_s",
      },
    ];

    // Landscaped center island for Palm Roundabout (1080, -140)
    const rbtCurb = new THREE.Mesh(new THREE.CylinderGeometry(23.5, 24.2, 0.45, 28), jerseyBarrierMat);
    rbtCurb.position.set(1080, 0.22, -140);
    rbtCurb.receiveShadow = true;
    scene.add(rbtCurb);
    const rbtTurf = new THREE.Mesh(
      new THREE.CylinderGeometry(22.6, 22.6, 0.5, 28),
      new THREE.MeshStandardMaterial({ color: 0x3b6e32, roughness: 0.9 })
    );
    rbtTurf.position.set(1080, 0.24, -140);
    scene.add(rbtTurf);
    addCircleCollider(1080, -140, 23.6, -1, 3.0, false);

    // =======================================================================
    // 2. INSTANCED STRUCTURAL BATCHES & SPATIAL SEGMENT HASH
    // =======================================================================
    const girderBatch = [];
    const barrierBatch = [];
    const railBatch = [];
    const pierBatch = [];
    const ceilingStripBatch = [];
    const wallStripBatch = [];
    const neonBatch = [];

    const allSegments = [];
    const segGrid = new Map();
    const SEG_CELL = 64;

    function indexSegment(seg) {
      allSegments.push(seg);
      const pad = seg.halfW + 3.0;
      const minCX = Math.floor((Math.min(seg.x1, seg.x2) - pad) / SEG_CELL);
      const maxCX = Math.floor((Math.max(seg.x1, seg.x2) + pad) / SEG_CELL);
      const minCZ = Math.floor((Math.min(seg.z1, seg.z2) - pad) / SEG_CELL);
      const maxCZ = Math.floor((Math.max(seg.z1, seg.z2) + pad) / SEG_CELL);
      for (let gx = minCX; gx <= maxCX; gx++) {
        for (let gz = minCZ; gz <= maxCZ; gz++) {
          const key = `${gx},${gz}`;
          if (!segGrid.has(key)) segGrid.set(key, []);
          segGrid.get(key).push(seg);
        }
      }
    }

    const tubeArchMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0x0f1f36,
      emissiveIntensity: 0.55,
      roughness: 0.72,
      metalness: 0.32,
      side: THREE.DoubleSide,
    });
    const underWallMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      emissive: 0x1e293b,
      emissiveIntensity: 0.32,
      roughness: 0.82,
      metalness: 0.12,
      side: THREE.DoubleSide,
    });
    const underLightMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0x38bdf8, emissiveIntensity: 3.0 });
    const wallLedMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 2.2 });

    CORRIDORS.forEach((cfg) => {
      const vecPts = cfg.pts.map(([x, y, z]) => new THREE.Vector3(x, y, z));
      const curve = new THREE.CatmullRomCurve3(vecPts, Boolean(cfg.closed), "centripetal", 0.5);
      const samples = [];
      let accum = 0;

      for (let i = 0; i <= cfg.segs; i++) {
        const u = cfg.closed ? (i % cfg.segs) / cfg.segs : i / cfg.segs;
        const p = curve.getPointAt(u);
        const t = curve.getTangentAt(u).normalize();

        // Override Y with exact analytic ramp curve when provided (eliminates spline sag & grass bar!)
        let yVal = p.y;
        const horizL = Math.hypot(t.x, t.z) || 1;
        const tx = t.x / horizL;
        const tz = t.z / horizL;
        let slope = t.y / horizL;

        if (cfg.analyticY) {
          yVal = cfg.analyticY(p.z);
          const epsZ = 0.5;
          const dyDz = (cfg.analyticY(p.z + epsZ) - cfg.analyticY(p.z - epsZ)) / (2 * epsZ);
          slope = dyDz * tz;
        }

        if (i > 0) {
          const prev = samples[i - 1];
          accum += Math.hypot(p.x - prev.x, yVal - prev.y, p.z - prev.z);
        }

        const rx = -tz;
        const rz = tx;
        const nLen = Math.hypot(slope, 1);

        samples.push({
          x: p.x,
          y: yVal,
          z: p.z,
          tx,
          tz,
          rx,
          rz,
          nx: (-slope * tx) / nLen,
          ny: 1 / nLen,
          nz: (-slope * tz) / nLen,
          dist: accum,
          u,
        });
      }

      // 1) Render smooth upward-facing tarmac ribbon + shadow receiver
      const ribbon = buildSplineRibbon(samples, cfg.halfW, cfg.mat, 20.0, false);
      roadGroup.add(ribbon);
      const shadowRibbon = buildSplineRibbon(samples, cfg.halfW, roadShadowMat, 20.0, false);
      shadowRibbon.position.y = 0.022;
      shadowRibbon.receiveShadow = true;
      roadShadowGroup.add(shadowRibbon);

      // Prepare per-sample retaining wall heights if sunken underpass / subsea tunnel
      const wallTops = cfg.underpassWalls ? new Array(samples.length).fill(null) : null;
      if (wallTops) {
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          if (s.y >= -0.02) {
            wallTops[i] = null;
            continue;
          }
          let underCrossing = false;
          let underElevatedRamp = false;
          if (cfg.overpassCrossings) {
            for (let k = 0; k < cfg.overpassCrossings.length; k++) {
              const ov = cfg.overpassCrossings[k];
              if (Math.abs(s.z - ov.z) <= ov.halfW + 0.4) {
                if (ov.addDeck) underCrossing = true;
                else underElevatedRamp = true;
                break;
              }
            }
          }
          const inSubseaTube = Boolean(cfg.isTubeTunnel && s.z >= cfg.tubeMinZ && s.z <= cfg.tubeMaxZ);
          if (inSubseaTube) {
            wallTops[i] = s.y + 1.9;
          } else if (underCrossing) {
            wallTops[i] = -0.58;
          } else if (underElevatedRamp) {
            wallTops[i] = 0.02;
          } else {
            const rampFade = smooth01((-s.y - 0.02) / 1.4);
            wallTops[i] = 0.04 + 0.54 * rampFade;
          }
        }
        // Build two continuous, gap-free sloped concrete retaining walls + coping ledges
        [-1, 1].forEach((side) => {
          const wallMesh = buildContinuousWallMesh(samples, side, cfg.halfW - 0.1, cfg.halfW + 1.25, wallTops, underWallMat);
          if (wallMesh) scene.add(wallMesh);
        });
      }

      // 2) Register segments for fast spatial surface sampling, colliders, grass masking & minimap
      const mapStep = cfg.segs > 50 ? 2 : 1;
      for (let i = 0; i < cfg.segs; i++) {
        const a = samples[i];
        const b = samples[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const horizLen = Math.hypot(dx, dz) || 0.001;
        const segLen3D = Math.hypot(dx, dy, dz);
        const mx = (a.x + b.x) * 0.5;
        const my = (a.y + b.y) * 0.5;
        const mz = (a.z + b.z) * 0.5;
        const yaw = Math.atan2(dx, dz);
        const pitch = -Math.atan2(dy, horizLen);
        const uMid = (i + 0.5) / cfg.segs;

        let hasOverpassAbove = false;
        if (cfg.overpassCrossings) {
          for (let k = 0; k < cfg.overpassCrossings.length; k++) {
            const ov = cfg.overpassCrossings[k];
            if (Math.abs(mz - ov.z) <= ov.halfW) {
              hasOverpassAbove = true;
              break;
            }
          }
        }

        indexSegment({
          x1: a.x, y1: a.y, z1: a.z,
          x2: b.x, y2: b.y, z2: b.z,
          dx, dy, dz,
          lenSqXZ: dx * dx + dz * dz || 1,
          horizLen,
          halfW: cfg.halfW,
          kind: cfg.kind,
          zone: cfg.zone,
          hasOverpassAbove,
          isTubeTunnel: Boolean(cfg.isTubeTunnel),
          tubeMinZ: cfg.tubeMinZ || 0,
          tubeMaxZ: cfg.tubeMaxZ || 0,
        });

        if (i % mapStep === 0) {
          const bMap = samples[Math.min(cfg.segs, i + mapStep)];
          roadSegments.push({ x1: a.x, z1: a.z, x2: bMap.x, z2: bMap.z, w: cfg.halfW * 2, kind: cfg.kind });
        }

        // Elevated underside deck + piers
        if (my > 1.35) {
          girderBatch.push({ x: mx, y: my - 0.85, z: mz, sx: cfg.halfW * 2 + 1.4, sy: 1.65, sz: segLen3D + 0.45, rx: pitch, ry: yaw, rz: 0 });
          if (cfg.neonIdx !== undefined && my > 4.0) {
            [-1, 1].forEach((side) => {
              neonBatch.push({
                x: mx + a.rx * side * (cfg.halfW + 0.78),
                y: my - 0.55,
                z: mz + a.rz * side * (cfg.halfW + 0.78),
                sx: 0.22,
                sy: 0.26,
                sz: segLen3D + 0.25,
                rx: pitch,
                ry: yaw,
                rz: 0,
              });
            });
          }
          if (cfg.piers && my > 5.2 && i % 5 === 2) {
            const onStreet = isOnFlatRoad && isOnFlatRoad(mx, mz);
            if (!onStreet) {
              pierBatch.push({ x: mx, y: (my - 3.0) * 0.5, z: mz, sx: 1.6, sy: my + 2.0, sz: 1.6, rx: 0, ry: 0, rz: 0 });
              addCircleCollider(mx, mz, 1.1, -2, my - 1.5, false);
            }
          }
        }

        // Elevated side concrete barriers & rails
        const openEnd = cfg.openEnds || 0;
        if (cfg.barriers && uMid > openEnd && uMid < 1.0 - openEnd) {
          [-1, 1].forEach((side) => {
            const bx = mx + a.rx * side * (cfg.halfW + 0.48);
            const bz = mz + a.rz * side * (cfg.halfW + 0.48);
            const bh = cfg.lowGuardrail ? 0.82 : 1.04;
            barrierBatch.push({ x: bx, y: my + bh * 0.5, z: bz, sx: 0.68, sy: bh, sz: segLen3D + 0.35, rx: pitch, ry: yaw, rz: 0 });
            railBatch.push({ x: bx, y: my + bh + 0.22, z: bz, sx: 0.2, sy: 0.2, sz: segLen3D + 0.35, rx: pitch, ry: yaw, rz: 0 });
            addOBB(bx, bz, 0.42, segLen3D * 0.5 + 0.15, yaw, my - 1.5, my + 3.2);
          });
        }

        // Sunken underpass wall colliders + recessed wall LEDs (NO floating open-air ceiling lights!)
        if (wallTops && wallTops[i] !== null && wallTops[i + 1] !== null) {
          const topAvg = (wallTops[i] + wallTops[i + 1]) * 0.5;
          const inSubseaTube = Boolean(cfg.isTubeTunnel && mz >= cfg.tubeMinZ && mz <= cfg.tubeMaxZ);
          const colMaxY = hasOverpassAbove ? -0.6 : inSubseaTube ? my + 4.5 : topAvg + 1.0;

          [-1, 1].forEach((side) => {
            const wx = mx + a.rx * side * (cfg.halfW + 0.48);
            const wz = mz + a.rz * side * (cfg.halfW + 0.48);
            addOBB(wx, wz, 0.58, segLen3D * 0.5 + 0.15, yaw, my - 1.5, colMaxY);

            // Recessed amber side-wall guide lights along sunken walls
            if (i % 4 === 1 && my < -1.4) {
              wallStripBatch.push({
                x: mx + a.rx * side * (cfg.halfW - 0.04),
                y: my + 0.95,
                z: mz + a.rz * side * (cfg.halfW - 0.04),
                sx: 0.12,
                sy: 0.22,
                sz: 1.8,
                rx: pitch,
                ry: yaw,
                rz: 0,
              });
            }
          });

          // Ceiling lights ONLY inside the subsea tunnel tube (never floating in open sky!)
          if (inSubseaTube && i % 4 === 1) {
            ceilingStripBatch.push({ x: mx, y: -1.15, z: mz, sx: 4.4, sy: 0.24, sz: 3.2, rx: 0, ry: yaw, rz: 0 });
          }
        }
      }

      // Overpass concrete deck slabs + surface safety guardrails + flush underside lights
      if (cfg.overpassCrossings) {
        cfg.overpassCrossings.forEach((ov) => {
          if (!ov.addDeck) return;
          const spanX = cfg.halfW * 2 + 4.6;
          const deck = new THREE.Mesh(new THREE.BoxGeometry(spanX, 0.56, ov.halfW * 2), underWallMat);
          deck.position.set(165, -0.34, ov.z);
          bridgeUndersideGroup.add(deck);

          // Flush LED light bars mounted directly to the overpass underside
          [-ov.halfW * 0.52, 0, ov.halfW * 0.52].forEach((zOff) => {
            ceilingStripBatch.push({ x: 165, y: -0.64, z: ov.z + zOff, sx: 8.2, sy: 0.16, sz: 1.1, rx: 0, ry: 0, rz: 0 });
          });

          // Surface safety guardrails on north & south sides of the crossing highway (prevents driving into trench!)
          [-1, 1].forEach((side) => {
            const gz = ov.z + side * (ov.halfW + 0.12);
            barrierBatch.push({ x: 165, y: 0.48, z: gz, sx: spanX, sy: 0.96, sz: 0.72, rx: 0, ry: 0, rz: 0 });
            railBatch.push({ x: 165, y: 1.18, z: gz, sx: spanX, sy: 0.18, sz: 0.22, rx: 0, ry: 0, rz: 0 });
            addOBB(165, gz, spanX * 0.5, 0.45, 0, -0.5, 2.6);
          });
        });
      }

      // Subsea Bay Illuminated Concrete-Arch Tunnel Shell (cleanly tucked below -0.26m ocean waves!)
      if (cfg.isTubeTunnel) {
        const len = cfg.tubeMaxZ - cfg.tubeMinZ;
        const midZ = (cfg.tubeMaxZ + cfg.tubeMinZ) * 0.5;
        const archGeo = new THREE.CylinderGeometry(cfg.halfW + 1.25, cfg.halfW + 1.25, len, 24, 1, true, -Math.PI / 2, Math.PI);
        archGeo.rotateX(-Math.PI / 2);
        const tube = new THREE.Mesh(archGeo, tubeArchMat);
        tube.position.set(1530, -7.5, midZ);
        tube.scale.set(1.0, 0.66, 1.0); // Top at y = -0.60m, cleanly under ocean!
        scene.add(tube);

        // Twin Shoreline Portal Frames (generous clearance for semi-trucks)
        [cfg.tubeMinZ, cfg.tubeMaxZ].forEach((pz) => {
          const cap = new THREE.Mesh(new THREE.BoxGeometry(cfg.halfW * 2 + 5.2, 2.2, 3.2), underWallMat);
          cap.position.set(1530, 1.5, pz);
          scene.add(cap);
        });
      }

      // 3) Wire every corridor into the 6-City A* GPS Navigation Graph
      if (addGpsNode && linkGps) {
        const step = Math.max(4, Math.floor(cfg.segs / 7));
        let prevKey = cfg.gpsConnectStart || null;
        for (let i = step; i < cfg.segs; i += step) {
          const s = samples[i];
          const k = `cr_${cfg.id}_${i}`;
          addGpsNode(k, s.x, s.z);
          if (prevKey) linkGps(prevKey, k);
          prevKey = k;
        }
        if (prevKey && cfg.gpsConnectEnd) linkGps(prevKey, cfg.gpsConnectEnd);
      }
    });

    // Flush all batched structural meshes into InstancedMeshes
    const dummy = new THREE.Object3D();
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const cylGeo = new THREE.CylinderGeometry(0.85, 1.0, 1, 8);

    function flushInst(geo, mat, list, targetParent, castShadow = false) {
      if (!list.length) return;
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
    }

    flushInst(boxGeo, bridgeDeckUndersideMat, girderBatch, bridgeUndersideGroup, false);
    flushInst(boxGeo, jerseyBarrierMat, barrierBatch, scene, false);
    flushInst(boxGeo, steelRailMat, railBatch, scene, false);
    flushInst(cylGeo, pierMat, pierBatch, scene, true);
    flushInst(boxGeo, underLightMat, ceilingStripBatch, scene, false);
    flushInst(boxGeo, wallLedMat, wallStripBatch, scene, false);
    flushInst(boxGeo, neonMaterials[3], neonBatch, scene, false);

    // =======================================================================
    // 3. FAST SPATIAL QUERIES (SURFACE, TUNNEL, GRASS MASK & BUILDING CLEARANCE)
    // =======================================================================
    function querySegmentsNear(x, z) {
      const gx = Math.floor(x / SEG_CELL);
      const gz = Math.floor(z / SEG_CELL);
      return segGrid.get(`${gx},${gz}`) || null;
    }

    function sampleSurface(x, z, currentY, heading) {
      const list = querySegmentsNear(x, z);
      if (!list) return null;

      const carFX = -Math.sin(heading);
      const carFZ = -Math.cos(heading);
      let best = null;
      let bestScore = Infinity;

      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        const t = THREE.MathUtils.clamp(((x - s.x1) * s.dx + (z - s.z1) * s.dz) / s.lenSqXZ, 0, 1);
        const px = s.x1 + s.dx * t;
        const pz = s.z1 + s.dz * t;
        const dSq = (x - px) * (x - px) + (z - pz) * (z - pz);
        const limit = s.halfW + 0.65;
        if (dSq > limit * limit) continue;

        const h = s.y1 + s.dy * t;
        if (currentY < h - 1.35) continue;

        const inSubseaSection = s.isTubeTunnel && z > s.tubeMinZ + 4 && z < s.tubeMaxZ - 4;
        if (h < -1.8 && currentY > -1.2 && (s.hasOverpassAbove || inSubseaSection)) continue;

        const vertDiff = Math.abs(currentY - h);
        const score = vertDiff + Math.sqrt(dSq) * 0.08;
        if (score < bestScore) {
          bestScore = score;
          const dirX = s.dx / s.horizLen;
          const dirZ = s.dz / s.horizLen;
          const slopeAlong = (s.dy / s.horizLen) * (dirX * carFX + dirZ * carFZ);
          const inTube = s.isTubeTunnel && z >= s.tubeMinZ && z <= s.tubeMaxZ;
          best = {
            height: h,
            slopePitch: Math.atan(slopeAlong),
            surfaceType: inTube ? "TUNNEL" : h > 1.2 ? "BRIDGE" : "ROAD",
            onRoad: true,
            overWater: false,
            inTunnel: inTube,
            hitWall: false,
            zone: s.zone,
          };
        }
      }
      return best;
    }

    function isPointOnRoad(x, z, pad = 1.4, maxHeight = 3.2) {
      const list = querySegmentsNear(x, z);
      if (!list) return false;
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        const t = THREE.MathUtils.clamp(((x - s.x1) * s.dx + (z - s.z1) * s.dz) / s.lenSqXZ, 0, 1);
        const h = s.y1 + s.dy * t;
        if (h > maxHeight) continue;
        const px = s.x1 + s.dx * t;
        const pz = s.z1 + s.dz * t;
        const lim = s.halfW + pad;
        if ((x - px) * (x - px) + (z - pz) * (z - pz) <= lim * lim) return true;
      }
      return false;
    }

    function isNearAnyCorridor(x, z, pad = 6.0) {
      const list = querySegmentsNear(x, z);
      if (!list) return false;
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        const t = THREE.MathUtils.clamp(((x - s.x1) * s.dx + (z - s.z1) * s.dz) / s.lenSqXZ, 0, 1);
        const px = s.x1 + s.dx * t;
        const pz = s.z1 + s.dz * t;
        const lim = s.halfW + pad;
        if ((x - px) * (x - px) + (z - pz) * (z - pz) <= lim * lim) return true;
      }
      return false;
    }

    function isInSubseaTunnel(x, z, y = 0) {
      return y < -2.0 && x >= 1515 && x <= 1545 && z >= -784 && z <= -374;
    }

    return {
      sampleSurface,
      isPointOnRoad,
      isNearAnyCorridor,
      isInSubseaTunnel,
    };
  }

  return {
    ISLAND_TRENCH_HOLES,
    isMergeOpening,
    buildComplexNetwork,
  };
})();