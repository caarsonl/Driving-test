window.HorizonRoads = (() => {
  "use strict";

  // Helper: generates a smooth upward-facing (+Y) ribbon along 3D spline samples
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

  // Merge-gap zones where existing skyway/bridge barriers & poles open cleanly for diversions
  const MERGE_OPENINGS = [
    // Solara Y-Split (Coastal Viaduct / Solara Skyway merge)
    { minX: 1130, maxX: 1255, minZ: -1158, maxZ: -1115, minY: 8, maxY: 16, side: 1 },
    // Metro Stack Spiral Flyover peeling off SKYWAY_EW (z = 60, south side)
    { minX: -255, maxX: -195, minZ: 45, maxZ: 76, minY: 8, maxY: 16, side: 1 },
    // Metro Stack Spiral Flyover merging into SKYWAY_NS (x = -72, west side)
    { minX: -88, maxX: -56, minZ: 225, maxZ: 300, minY: 18, maxY: 26, side: -1 },
    // Level 4 Trans-Bay Super-Overpass peeling off SKYWAY_NS (x = -72, east side)
    { minX: -88, maxX: -56, minZ: 485, maxZ: 560, minY: 18, maxY: 26, side: 1 },
    // Apexia GP Express Diversion peeling off SKYWAY_NS (x = -72, east side)
    { minX: -88, maxX: -56, minZ: 720, maxZ: 795, minY: 18, maxY: 26, side: 1 },
    // Golden Bay Bridge -> Palm Roundabout Diversion (z = 0, north side)
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

  // Trench cutouts in flat island shapes so sunken underpasses & subsea tunnel ramps never clip grass
  const ISLAND_TRENCH_HOLES = {
    metro: [{ minX: 155, maxX: 175, minZ: -162, maxZ: 194 }],
    palm: [{ minX: 1518, maxX: 1544, minZ: -380, maxZ: -305 }],
    solara: [{ minX: 1508, maxX: 1534, minZ: -815, maxZ: -780 }],
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
    } = ctx;

    // =======================================================================
    // 1. COMPLEX CORRIDOR DEFINITIONS (4 LEVELS, CURVES, U-TURNS, UNDERWAYS)
    // =======================================================================
    const CORRIDORS = [
      // 1) LEVEL 3/4: Metro Stack Spiral Flyover (+11.5m SKYWAY_EW -> +27m Banked Arc -> +22m SKYWAY_NS)
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
          [1080, 0.06, 260],
        ],
        gpsConnectStart: "sky_ns_m",
        gpsConnectEnd: "p_1080_s",
      },

      // 3) Apexia GP Express Diversion (Peels off +22m SKYWAY_NS -> Descends to GP Paddock Blvd)
      {
        id: "gp_diversion",
        zone: "APEXIA GP EXPRESS DIVERSION",
        kind: "viaduct",
        mat: roadMatBridge,
        halfW: 7.6,
        segs: 44,
        barriers: true,
        openEnds: 0.12,
        neonIdx: 1,
        piers: true,
        pts: [
          [-72, 22.05, 748],
          [-50, 20.2, 815],
          [30, 15.2, 886],
          [150, 8.6, 936],
          [265, 2.2, 950],
          [340, 0.06, 950],
        ],
        gpsConnectStart: "sky_ns_m",
        gpsConnectEnd: "a_e2_950",
      },

      // 4) Golden Bay Bridge -> Palm Roundabout Curved Diversion Slip-Lane
      {
        id: "palm_diversion",
        zone: "PALM RESORT DIVERSION RAMP",
        kind: "bridge",
        mat: roadMatBridge,
        halfW: 6.8,
        segs: 28,
        barriers: true,
        openEnds: 0.15,
        neonIdx: 4,
        piers: true,
        pts: [
          [885, 4.74, 0],
          [945, 3.3, -24],
          [1012, 1.3, -76],
          [1055, 0.15, -112],
          [1080, 0.05, -140],
        ],
        gpsConnectStart: "br_e",
        gpsConnectEnd: "p_1080_0",
      },

      // 5) LEVEL -1 (-6.2m): Metro Bay Central Underway (Dives Underneath z=0, z=60 & z=120 Avenues!)
      {
        id: "metro_underway",
        zone: "METRO BAY CENTRAL UNDERWAY",
        kind: "underpass",
        mat: roadMatHighway,
        halfW: 8.6,
        segs: 48,
        barriers: false,
        underpassWalls: true,
        overpassCrossings: [
          { z: 0, halfW: 13.5, addDeck: true },
          { z: 60, halfW: 12.5, addDeck: false },
          { z: 120, halfW: 11.5, addDeck: true },
        ],
        pts: [
          [165, 0.04, -240],
          [165, 0.02, -160],
          [165, -3.2, -118],
          [165, -6.2, -72],
          [165, -6.2, 118],
          [165, -3.0, 158],
          [165, 0.02, 196],
          [165, 0.04, 260],
        ],
        gpsConnectStart: "m_e_240n",
        gpsConnectEnd: "m_e_260",
      },

      // 6) LEVEL -1 (-7.5m): Palm–Solara Subsea Bay Tunnel (Illuminated Underwater Expressway Tube!)
      {
        id: "subsea_tunnel",
        zone: "PALM-SOLARA SUBSEA BAY TUNNEL",
        kind: "tunnel",
        mat: roadMatHighway,
        halfW: 9.2,
        segs: 56,
        barriers: false,
        underpassWalls: true,
        isTubeTunnel: true,
        tubeMinZ: -782,
        tubeMaxZ: -376,
        pts: [
          [1540, 0.04, -280],
          [1536, -0.5, -312],
          [1532, -4.8, -356],
          [1530, -7.5, -405],
          [1526, -7.5, -735],
          [1522, -4.2, -782],
          [1520, -0.4, -816],
          [1520, 0.04, -840],
        ],
        gpsConnectStart: "p_1540_n",
        gpsConnectEnd: "s_m_s",
      },

      // 7) Pinecrest Alpine Touge Switchbacks (Winding S-Curves + Banked 180-deg Hairpin U-Turn!)
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

      // 9) Palm Diagonal Resort Boulevard (Curved Diagonal Linking Roundabout -> North Marina)
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

      // 12) Solara Mesa Sweeping Cliffside Tech Ring (Non-90-deg Panoramic Perimeter)
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

      // 13) Metro Bay South Dedicated Highway U-Turn Loop (Before Apexia Bridge)
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

    // =======================================================================
    // 2. INSTANCED STRUCTURAL BATCHES & SPATIAL SEGMENT HASH (ZERO LAG!)
    // =======================================================================
    const girderBatch = [];
    const barrierBatch = [];
    const railBatch = [];
    const pierBatch = [];
    const wallBatch = [];
    const ceilingStripBatch = [];
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
      color: 0x1e293b,
      roughness: 0.72,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });
    const underWallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.84, metalness: 0.12 });
    const underLightMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0x38bdf8, emissiveIntensity: 3.0 });

    CORRIDORS.forEach((cfg) => {
      const vecPts = cfg.pts.map(([x, y, z]) => new THREE.Vector3(x, y, z));
      const curve = new THREE.CatmullRomCurve3(vecPts, Boolean(cfg.closed), "centripetal", 0.5);
      const samples = [];
      let accum = 0;

      for (let i = 0; i <= cfg.segs; i++) {
        const u = cfg.closed ? (i % cfg.segs) / cfg.segs : i / cfg.segs;
        const p = curve.getPointAt(u);
        const t = curve.getTangentAt(u).normalize();
        if (i > 0) {
          const prev = samples[i - 1];
          accum += Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z);
        }
        const horizL = Math.hypot(t.x, t.z) || 1;
        const tx = t.x / horizL;
        const tz = t.z / horizL;
        const rx = -tz;
        const rz = tx;
        const slope = t.y / horizL;
        const nLen = Math.hypot(slope, 1);

        samples.push({
          x: p.x,
          y: p.y,
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

      // 2) Register segments for fast spatial surface sampling, grass masking & minimap
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

        indexSegment({
          x1: a.x, y1: a.y, z1: a.z,
          x2: b.x, y2: b.y, z2: b.z,
          dx, dy, dz,
          lenSqXZ: dx * dx + dz * dz || 1,
          horizLen,
          halfW: cfg.halfW,
          kind: cfg.kind,
          zone: cfg.zone,
          isTubeTunnel: Boolean(cfg.isTubeTunnel),
          tubeMinZ: cfg.tubeMinZ || 0,
          tubeMaxZ: cfg.tubeMaxZ || 0,
        });

        if (i % mapStep === 0) {
          const bMap = samples[Math.min(cfg.segs, i + mapStep)];
          roadSegments.push({ x1: a.x, z1: a.z, x2: bMap.x, z2: bMap.z, w: cfg.halfW * 2, kind: cfg.kind });
        }

        // Elevated underside deck + piers + glowing side trim
        if (my > 0.65) {
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
            pierBatch.push({ x: mx, y: (my - 3.0) * 0.5, z: mz, sx: 1.6, sy: my + 2.0, sz: 1.6, rx: 0, ry: 0, rz: 0 });
            addCircleCollider(mx, mz, 1.1, -2, my - 1.5, false);
          }
        }

        // Side concrete barriers & rails (auto-opened at merge ends so diversions are 100% unobstructed)
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

        // Sunken underpass retaining walls: auto-lower beneath surface crossings & inside subsea tube
        if (cfg.underpassWalls && my < -0.15) {
          let underCrossing = false;
          if (cfg.overpassCrossings) {
            for (let k = 0; k < cfg.overpassCrossings.length; k++) {
              const ov = cfg.overpassCrossings[k];
              if (Math.abs(mz - ov.z) <= ov.halfW) {
                underCrossing = true;
                break;
              }
            }
          }

          const inSubseaTube = Boolean(cfg.isTubeTunnel && mz >= cfg.tubeMinZ && mz <= cfg.tubeMaxZ);
          const rampFade = THREE.MathUtils.clamp((-my - 0.15) / 1.2, 0, 1);
          const wallTop = inSubseaTube ? my + 2.1 : underCrossing ? -0.45 : 0.65 * rampFade;
          const wallH = Math.max(0.35, wallTop - my);
          const colMaxY = inSubseaTube ? my + 5.0 : underCrossing ? -0.5 : wallTop + 1.0;

          [-1, 1].forEach((side) => {
            const wx = mx + a.rx * side * (cfg.halfW + 0.55);
            const wz = mz + a.rz * side * (cfg.halfW + 0.55);
            wallBatch.push({ x: wx, y: my + wallH * 0.5, z: wz, sx: 1.0, sy: wallH, sz: segLen3D + 0.4, rx: 0, ry: yaw, rz: 0 });
            addOBB(wx, wz, 0.55, segLen3D * 0.5 + 0.15, yaw, my - 1.5, colMaxY);
          });
          if (i % 3 === 1 && my < -2.2) {
            ceilingStripBatch.push({ x: mx, y: my + (cfg.isTubeTunnel ? 6.5 : 5.4), z: mz, sx: 4.2, sy: 0.28, sz: 3.0, rx: 0, ry: yaw, rz: 0 });
          }
        }
      }

      // Overpass concrete deck caps where Metro Bay avenues cross over the sunken underway
      if (cfg.overpassCrossings) {
        cfg.overpassCrossings.forEach((ov) => {
          if (!ov.addDeck) return;
          const deck = new THREE.Mesh(new THREE.BoxGeometry(cfg.halfW * 2 + 4.0, 0.9, ov.halfW * 2), underWallMat);
          deck.position.set(165, -0.48, ov.z);
          bridgeUndersideGroup.add(deck);
        });
      }

      // Subsea Bay Illuminated Concrete-Arch Tunnel Shell (tucked cleanly beneath the ocean surface)
      if (cfg.isTubeTunnel) {
        const len = cfg.tubeMaxZ - cfg.tubeMinZ;
        const midZ = (cfg.tubeMaxZ + cfg.tubeMinZ) * 0.5;
        const archGeo = new THREE.CylinderGeometry(cfg.halfW + 1.3, cfg.halfW + 1.3, len, 22, 1, true, -Math.PI / 2, Math.PI);
        archGeo.rotateX(-Math.PI / 2);
        const tube = new THREE.Mesh(archGeo, tubeArchMat);
        tube.position.set(1528, -7.5, midZ);
        tube.scale.set(1.0, 0.7, 1.0);
        scene.add(tube);

        // Twin Underwater Portal Frames
        [cfg.tubeMinZ, cfg.tubeMaxZ].forEach((pz) => {
          const cap = new THREE.Mesh(new THREE.BoxGeometry(cfg.halfW * 2 + 5.5, 3.6, 3.2), underWallMat);
          cap.position.set(1528, 0.0, pz);
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

    // Flush all batched structural meshes into 7 single InstancedMeshes
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
    flushInst(boxGeo, underWallMat, wallBatch, scene, false);
    flushInst(boxGeo, underLightMat, ceilingStripBatch, scene, false);
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
        // Multi-level layer checks: never warp up onto an overpass or drop through a ground avenue into an underpass
        if (currentY < h - 3.8) continue;
        if (h < -2.2 && currentY > h + 3.8) continue;

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