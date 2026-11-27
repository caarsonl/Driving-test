window.HorizonCars = (() => {
  "use strict";

  // Helper: extrudes a smooth 2D side silhouette (x: -halfL front -> +halfL rear, y: height)
  // across the vehicle width with rounded bevels so reflections flow smoothly over every panel.
  function createSculptedProfile(pointsFn, width, bevelSize = 0.14, bevelThick = 0.16, bevelSegs = 4) {
    const shape = new THREE.Shape();
    pointsFn(shape);
    shape.closePath();

    const coreDepth = Math.max(0.08, width - bevelThick * 2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: coreDepth,
      bevelEnabled: true,
      bevelSegments: bevelSegs,
      steps: 1,
      bevelSize,
      bevelThickness: bevelThick,
      curveSegments: 14,
    });
    geo.translate(0, 0, -coreDepth * 0.5);
    // Maps shape +X -> world +Z (rear), shape -X -> world -Z (front), shape +Y -> world +Y
    geo.rotateY(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }

  function addMirror(parent, side, x, y, z, bodyMat, trimMat) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.07), trimMat);
    stalk.position.set(x, y, z);
    parent.add(stalk);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bodyMat);
    cap.scale.set(1.25, 0.72, 0.95);
    cap.position.set(x + side * 0.1, y + 0.03, z + 0.02);
    parent.add(cap);
  }

  function addSculptedWheel(pivot, radius, width, side, tireMat, chromeMat, trimMat, caliperMat, isHeavy) {
    const wheelSpinGroup = new THREE.Group();

    // Smooth 28-segment tire tread barrel + twin torus rounded sidewalls
    const barrelW = Math.max(0.12, width * 0.74);
    const barrelGeo = new THREE.CylinderGeometry(radius, radius, barrelW, 28);
    barrelGeo.rotateZ(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, tireMat);
    barrel.castShadow = true;
    wheelSpinGroup.add(barrel);

    const tubeR = Math.min(width * 0.24, radius * 0.26);
    const ringGeo = new THREE.TorusGeometry(radius - tubeR * 0.92, tubeR, 10, 28);
    ringGeo.rotateY(Math.PI / 2);
    [-width * 0.5 + tubeR, width * 0.5 - tubeR].forEach((ox) => {
      const shoulder = new THREE.Mesh(ringGeo, tireMat);
      shoulder.position.x = ox;
      wheelSpinGroup.add(shoulder);
    });

    // Recessed metallic rim barrel
    const rimR = radius * 0.65;
    const rimGeo = new THREE.CylinderGeometry(rimR, rimR, width * 0.88, 22);
    rimGeo.rotateZ(Math.PI / 2);
    wheelSpinGroup.add(new THREE.Mesh(rimGeo, trimMat));

    const outerFaceX = side * (width * 0.44);
    const lipGeo = new THREE.TorusGeometry(rimR * 0.96, 0.026, 8, 24);
    lipGeo.rotateY(Math.PI / 2);
    const lip = new THREE.Mesh(lipGeo, chromeMat);
    lip.position.x = outerFaceX;
    wheelSpinGroup.add(lip);

    // 5-Spoke Star Alloy Spokes (or 6-lug heavy dish on semi truck)
    const spokeCount = isHeavy ? 6 : 5;
    const spokeGeo = new THREE.BoxGeometry(0.035, rimR * 0.92, isHeavy ? 0.08 : 0.055);
    for (let s = 0; s < spokeCount; s++) {
      const ang = (s / spokeCount) * Math.PI * 2;
      const spk = new THREE.Mesh(spokeGeo, chromeMat);
      spk.position.set(outerFaceX - side * 0.02, Math.cos(ang) * rimR * 0.46, Math.sin(ang) * rimR * 0.46);
      spk.rotation.x = ang;
      wheelSpinGroup.add(spk);
    }

    const capGeo = new THREE.CylinderGeometry(rimR * 0.24, rimR * 0.24, 0.06, 12);
    capGeo.rotateZ(Math.PI / 2);
    const cap = new THREE.Mesh(capGeo, chromeMat);
    cap.position.x = outerFaceX;
    wheelSpinGroup.add(cap);

    pivot.add(wheelSpinGroup);

    // Stationary brake disc + painted caliper (does not spin with tire!)
    const rotorGeo = new THREE.CylinderGeometry(rimR * 0.82, rimR * 0.82, 0.04, 18);
    rotorGeo.rotateZ(Math.PI / 2);
    const rotor = new THREE.Mesh(rotorGeo, chromeMat);
    rotor.position.x = side * (width * 0.22);
    pivot.add(rotor);

    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.09, rimR * 0.48, rimR * 0.34), caliperMat);
    caliper.position.set(side * (width * 0.26), rimR * 0.22, -rimR * 0.48);
    pivot.add(caliper);

    return wheelSpinGroup;
  }

  function buildPlayerVehicle(carId, sp, mats, carGroup, carBodyGroup) {
    const {
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
    } = mats;

    const caliperMat = new THREE.MeshStandardMaterial({
      color: carId === "supercar" || carId === "formula" || carId === "lmp" ? 0xf59e0b : 0xef4444,
      metalness: 0.45,
      roughness: 0.3,
    });

    const halfL = sp.bodyLen * 0.5;
    const baseY = sp.wheelRadius;
    const wheelPivots = [];
    const wheelMeshes = [];
    const wheelIsRear = [];
    const frontWheelPivots = [];
    const volumetricBeams = [];
    const flames = [];
    let policeLightbar = null;
    let activeWingPivot = null;

    if (carId === "formula") {
      // AEROFORMULA R1 — Smooth Tapered Nosecone, Sculpted Sidepods, Curved Halo & Multi-Element Wings
      const monoGeo = createSculptedProfile((s) => {
        s.moveTo(-2.52, 0.18);
        s.quadraticCurveTo(-1.85, 0.28, -1.05, 0.52);
        s.lineTo(-0.35, 0.62);
        s.quadraticCurveTo(0.25, 0.96, 0.95, 0.92);
        s.quadraticCurveTo(1.72, 0.78, 2.25, 0.46);
        s.lineTo(2.32, 0.14);
        s.lineTo(-2.46, 0.10);
      }, 0.88, 0.08, 0.12, 4);
      const mono = new THREE.Mesh(monoGeo, bodyMat);
      mono.position.y = baseY - 0.14;
      mono.castShadow = true;
      carBodyGroup.add(mono);

      // Sculpted aerodynamic sidepods
      const podGeo = createSculptedProfile((s) => {
        s.moveTo(-0.68, 0.08);
        s.quadraticCurveTo(-0.58, 0.46, 0.15, 0.48);
        s.quadraticCurveTo(1.05, 0.46, 1.55, 0.22);
        s.lineTo(1.52, 0.04);
        s.lineTo(-0.65, 0.04);
      }, 0.54, 0.08, 0.10, 4);
      [-0.64, 0.64].forEach((sx) => {
        const pod = new THREE.Mesh(podGeo, bodyMat);
        pod.position.set(sx, baseY - 0.12, 0.18);
        pod.castShadow = true;
        carBodyGroup.add(pod);
      });

      const floor = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.06, 3.05), trimMat);
      floor.position.set(0, baseY - 0.15, 0.22);
      carBodyGroup.add(floor);

      // Swept curved front wing + endplates
      const fw = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.07, 0.52), trimMat);
      fw.position.set(0, baseY - 0.16, -halfL + 0.28);
      fw.rotation.x = 0.08;
      carBodyGroup.add(fw);
      [-1.06, 1.06].forEach((ex) => {
        const ep = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.6), bodyMat);
        ep.position.set(ex, baseY - 0.08, -halfL + 0.28);
        carBodyGroup.add(ep);
      });

      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), secondaryWhiteMat);
      helmet.position.set(0, baseY + 0.44, 0.02);
      carBodyGroup.add(helmet);
      const visor = new THREE.Mesh(new THREE.SphereGeometry(0.245, 14, 10, -0.9, 1.8, 1.0, 0.55), cabinMat);
      visor.rotation.y = Math.PI;
      visor.position.copy(helmet.position);
      carBodyGroup.add(visor);

      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.042, 8, 18, Math.PI), trimMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, baseY + 0.52, -0.06);
      carBodyGroup.add(halo);

      [-0.78, 0.78].forEach((ex) => {
        const ep = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.78, 0.65), trimMat);
        ep.position.set(ex, baseY + 0.52, halfL - 0.34);
        carBodyGroup.add(ep);
      });
      const mainPlane = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.06, 0.34), bodyMat);
      mainPlane.position.set(0, baseY + 0.68, halfL - 0.32);
      carBodyGroup.add(mainPlane);

      activeWingPivot = new THREE.Group();
      activeWingPivot.position.set(0, baseY + 0.84, halfL - 0.24);
      const drsFlap = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.06, 0.28), trimMat);
      drsFlap.position.set(0, 0, -0.08);
      activeWingPivot.add(drsFlap);
      carBodyGroup.add(activeWingPivot);
    } else if (carId === "lmp") {
      // HELIOS PROTO-X — Curved Teardrop Prototype Canopy, Sculpted Wheel Pontoons & Dorsal Fin
      const hullGeo = createSculptedProfile((s) => {
        s.moveTo(-2.42, 0.14);
        s.quadraticCurveTo(-2.12, 0.44, -1.25, 0.50);
        s.lineTo(1.35, 0.54);
        s.quadraticCurveTo(2.18, 0.52, 2.42, 0.34);
        s.lineTo(2.40, 0.08);
        s.lineTo(-2.38, 0.06);
      }, sp.bodyW, 0.14, 0.18, 4);
      const hull = new THREE.Mesh(hullGeo, bodyMat);
      hull.position.y = baseY - 0.1;
      hull.castShadow = true;
      carBodyGroup.add(hull);

      // Sculpted Bubble Canopy
      const canopyGeo = createSculptedProfile((s) => {
        s.moveTo(-1.12, 0.44);
        s.quadraticCurveTo(-0.55, 0.94, 0.15, 0.92);
        s.quadraticCurveTo(0.88, 0.88, 1.38, 0.48);
        s.lineTo(-1.12, 0.44);
      }, 1.12, 0.10, 0.14, 4);
      const canopy = new THREE.Mesh(canopyGeo, cabinMat);
      canopy.position.y = baseY - 0.08;
      canopy.castShadow = true;
      carBodyGroup.add(canopy);

      // Sweeping Dorsal Fin
      const finGeo = createSculptedProfile((s) => {
        s.moveTo(0.28, 0.82);
        s.quadraticCurveTo(1.25, 0.84, 2.25, 0.68);
        s.lineTo(2.25, 0.44);
        s.lineTo(0.28, 0.44);
      }, 0.08, 0.02, 0.02, 2);
      const fin = new THREE.Mesh(finGeo, bodyMat);
      fin.position.y = baseY - 0.08;
      carBodyGroup.add(fin);

      const splitter = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW + 0.08, 0.06, 0.6), trimMat);
      splitter.position.set(0, baseY - 0.09, -halfL + 0.12);
      carBodyGroup.add(splitter);

      [-0.98, 0.98].forEach((ex) => {
        const ep = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.64, 0.68), trimMat);
        ep.position.set(ex, baseY + 0.56, halfL - 0.22);
        carBodyGroup.add(ep);
      });

      activeWingPivot = new THREE.Group();
      activeWingPivot.position.set(0, baseY + 0.78, halfL - 0.24);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.07, 0.48), trimMat);
      wing.castShadow = true;
      activeWingPivot.add(wing);
      carBodyGroup.add(activeWingPivot);
    } else if (carId === "supercar") {
      // ZENITH AERO-X — Low Sleek Wedge Hypercar with Curved Teardrop Greenhouse
      const bodyGeo = createSculptedProfile((s) => {
        s.moveTo(-2.32, 0.12);
        s.quadraticCurveTo(-2.22, 0.36, -1.35, 0.50);
        s.lineTo(0.95, 0.58);
        s.quadraticCurveTo(1.95, 0.58, 2.30, 0.46);
        s.lineTo(2.32, 0.16);
        s.lineTo(2.05, 0.06);
        s.lineTo(-2.28, 0.06);
      }, sp.bodyW, 0.14, 0.18, 4);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = baseY - 0.1;
      body.castShadow = true;
      carBodyGroup.add(body);

      const cabinGeo = createSculptedProfile((s) => {
        s.moveTo(-1.05, 0.46);
        s.quadraticCurveTo(-0.35, 0.92, 0.32, 0.90);
        s.quadraticCurveTo(1.18, 0.86, 1.82, 0.52);
        s.lineTo(-1.05, 0.46);
      }, 1.62, 0.12, 0.16, 4);
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.y = baseY - 0.08;
      cabin.castShadow = true;
      carBodyGroup.add(cabin);

      const splitter = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW + 0.1, 0.07, 0.55), trimMat);
      splitter.position.set(0, baseY - 0.08, -halfL + 0.12);
      carBodyGroup.add(splitter);

      [-0.66, 0.66].forEach((sx) => {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.38, 0.26), trimMat);
        strut.position.set(sx, baseY + 0.58, halfL - 0.28);
        carBodyGroup.add(strut);
      });

      activeWingPivot = new THREE.Group();
      activeWingPivot.position.set(0, baseY + 0.78, halfL - 0.28);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW, 0.07, 0.48), trimMat);
      wing.castShadow = true;
      activeWingPivot.add(wing);
      carBodyGroup.add(activeWingPivot);

      addMirror(carBodyGroup, -1, -0.96, baseY + 0.54, -0.58, bodyMat, trimMat);
      addMirror(carBodyGroup, 1, 0.96, baseY + 0.54, -0.58, bodyMat, trimMat);
    } else if (carId === "gt3" || carId === "gt" || carId === "drift") {
      // VERIDIAN GT / CINDER GT-R3 / KITSUNE S-DRIFT — Smooth Sculpted Coupe Fastback Profiles
      const isGT3 = carId === "gt3";
      const isDrift = carId === "drift";
      const bodyGeo = createSculptedProfile((s) => {
        s.moveTo(-halfL + 0.06, 0.12);
        s.quadraticCurveTo(-halfL + 0.12, 0.44, -halfL + 0.92, 0.54);
        s.lineTo(halfL - 0.45, 0.62);
        s.quadraticCurveTo(halfL - 0.06, 0.60, halfL - 0.04, 0.44);
        s.lineTo(halfL - 0.04, 0.14);
        s.lineTo(-halfL + 0.08, 0.08);
      }, sp.bodyW, 0.14, 0.18, 4);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = baseY - 0.1;
      body.castShadow = true;
      carBodyGroup.add(body);

      const cabinGeo = createSculptedProfile((s) => {
        s.moveTo(-0.92, 0.50);
        s.quadraticCurveTo(-0.28, 1.04, 0.35, 1.02);
        s.quadraticCurveTo(1.08, 0.98, 1.65, 0.58);
        s.lineTo(-0.92, 0.50);
      }, sp.bodyW * 0.78, 0.12, 0.16, 4);
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.y = baseY - 0.08;
      cabin.castShadow = true;
      carBodyGroup.add(cabin);

      // Front splitter + rear diffuser
      const splitter = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW + (isGT3 ? 0.14 : 0.06), 0.07, 0.52), trimMat);
      splitter.position.set(0, baseY - 0.07, -halfL + 0.04);
      carBodyGroup.add(splitter);

      const diffuser = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW - 0.16, 0.16, 0.32), trimMat);
      diffuser.position.set(0, baseY - 0.02, halfL - 0.04);
      carBodyGroup.add(diffuser);

      if (isGT3) {
        [-1, 1].forEach((side) => {
          const canard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.42), trimMat);
          canard.position.set(side * (sp.bodyW * 0.5 + 0.04), baseY + 0.14, -halfL + 0.38);
          canard.rotation.z = side * 0.22;
          carBodyGroup.add(canard);
        });
      }

      if (isDrift) {
        const intercooler = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.24, 0.14), chromeMat);
        intercooler.position.set(0, baseY + 0.1, -halfL + 0.02);
        carBodyGroup.add(intercooler);
      }

      const wingH = isGT3 || isDrift ? baseY + 0.96 : baseY + 0.80;
      [-0.64, 0.64].forEach((sx) => {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.07, wingH - (baseY + 0.46), 0.24), trimMat);
        strut.position.set(sx, (wingH + baseY + 0.46) * 0.5, halfL - 0.2);
        carBodyGroup.add(strut);
      });

      if (isDrift) {
        const driftWing = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW + 0.1, 0.07, 0.42), trimMat);
        driftWing.position.set(0, wingH, halfL - 0.2);
        driftWing.rotation.x = -0.14;
        carBodyGroup.add(driftWing);
      } else {
        activeWingPivot = new THREE.Group();
        activeWingPivot.position.set(0, wingH, halfL - 0.2);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW + (isGT3 ? 0.08 : -0.02), 0.07, 0.44), trimMat);
        wing.castShadow = true;
        activeWingPivot.add(wing);
        if (isGT3) {
          [-sp.bodyW * 0.5 - 0.04, sp.bodyW * 0.5 + 0.04].forEach((ex) => {
            const ep = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.5), bodyMat);
            ep.position.set(ex, -0.04, 0);
            activeWingPivot.add(ep);
          });
        }
        carBodyGroup.add(activeWingPivot);
      }

      addMirror(carBodyGroup, -1, -sp.bodyW * 0.45, baseY + 0.62, -0.42, bodyMat, trimMat);
      addMirror(carBodyGroup, 1, sp.bodyW * 0.45, baseY + 0.62, -0.42, bodyMat, trimMat);
    } else if (carId === "ev") {
      // ARCDRIVE EV — Ultra-Smooth Wind-Tunnel Teardrop Fastback + Wrap-Around Cyan LED Blade
      const bodyGeo = createSculptedProfile((s) => {
        s.moveTo(-halfL + 0.06, 0.14);
        s.quadraticCurveTo(-halfL + 0.15, 0.48, -1.12, 0.60);
        s.quadraticCurveTo(-0.25, 1.06, 0.42, 1.04);
        s.quadraticCurveTo(1.45, 0.96, halfL - 0.08, 0.56);
        s.quadraticCurveTo(halfL, 0.38, halfL - 0.06, 0.14);
        s.lineTo(-halfL + 0.08, 0.08);
      }, sp.bodyW, 0.16, 0.22, 5);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = baseY - 0.1;
      body.castShadow = true;
      carBodyGroup.add(body);

      const glassGeo = createSculptedProfile((s) => {
        s.moveTo(-1.05, 0.58);
        s.quadraticCurveTo(-0.25, 1.08, 0.42, 1.06);
        s.quadraticCurveTo(1.25, 0.98, 1.75, 0.66);
        s.lineTo(-1.05, 0.58);
      }, sp.bodyW * 0.8, 0.10, 0.12, 4);
      const glass = new THREE.Mesh(glassGeo, cabinMat);
      glass.position.y = baseY - 0.08;
      carBodyGroup.add(glass);

      const frontStrip = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW - 0.24, 0.08, 0.08), evCyanGlowMat);
      frontStrip.position.set(0, baseY + 0.28, -halfL - 0.01);
      carBodyGroup.add(frontStrip);

      const rearStrip = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW - 0.24, 0.09, 0.08), brakeLightMat);
      rearStrip.position.set(0, baseY + 0.34, halfL + 0.01);
      carBodyGroup.add(rearStrip);

      activeWingPivot = new THREE.Group();
      activeWingPivot.position.set(0, baseY + 0.54, halfL - 0.28);
      const aeroLip = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW - 0.22, 0.06, 0.34), trimMat);
      activeWingPivot.add(aeroLip);
      carBodyGroup.add(activeWingPivot);

      addMirror(carBodyGroup, -1, -sp.bodyW * 0.45, baseY + 0.60, -0.45, bodyMat, trimMat);
      addMirror(carBodyGroup, 1, sp.bodyW * 0.45, baseY + 0.60, -0.45, bodyMat, trimMat);
    } else if (carId === "muscle") {
      // BRAWLER V8 — Sculpted Long-Hood Classic Fastback + Rounded Chrome Blower
      const bodyGeo = createSculptedProfile((s) => {
        s.moveTo(-halfL + 0.06, 0.14);
        s.quadraticCurveTo(-halfL + 0.04, 0.56, -halfL + 0.45, 0.60);
        s.lineTo(halfL - 0.14, 0.66);
        s.quadraticCurveTo(halfL, 0.54, halfL - 0.06, 0.16);
        s.lineTo(-halfL + 0.08, 0.08);
      }, sp.bodyW, 0.14, 0.18, 4);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = baseY - 0.1;
      body.castShadow = true;
      carBodyGroup.add(body);

      const cabinGeo = createSculptedProfile((s) => {
        s.moveTo(-0.62, 0.56);
        s.quadraticCurveTo(-0.18, 1.12, 0.48, 1.10);
        s.quadraticCurveTo(1.22, 1.06, 1.88, 0.64);
        s.lineTo(-0.62, 0.56);
      }, sp.bodyW * 0.80, 0.12, 0.16, 4);
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.y = baseY - 0.08;
      cabin.castShadow = true;
      carBodyGroup.add(cabin);

      const blower = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.82, 14), chromeMat);
      blower.rotation.x = Math.PI / 2;
      blower.position.set(0, baseY + 0.64, -1.08);
      carBodyGroup.add(blower);

      const ducktail = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW - 0.22, 0.2, 0.28), trimMat);
      ducktail.position.set(0, baseY + 0.64, halfL - 0.16);
      ducktail.rotation.x = -0.35;
      carBodyGroup.add(ducktail);

      addMirror(carBodyGroup, -1, -sp.bodyW * 0.45, baseY + 0.66, -0.25, bodyMat, trimMat);
      addMirror(carBodyGroup, 1, sp.bodyW * 0.45, baseY + 0.66, -0.25, bodyMat, trimMat);
    } else if (carId === "rally") {
      // BOREAL RALLY R4 — Sculpted Compact Hatchback with Blister Fenders, Roof Scoop & Rally Wing
      const bodyGeo = createSculptedProfile((s) => {
        s.moveTo(-halfL + 0.06, 0.14);
        s.quadraticCurveTo(-halfL + 0.14, 0.54, -1.05, 0.62);
        s.quadraticCurveTo(-0.48, 1.24, 0.22, 1.26);
        s.lineTo(1.38, 1.24);
        s.quadraticCurveTo(1.92, 1.06, halfL - 0.04, 0.58);
        s.lineTo(halfL - 0.04, 0.16);
        s.lineTo(-halfL + 0.08, 0.10);
      }, sp.bodyW, 0.14, 0.18, 4);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = baseY - 0.1;
      body.castShadow = true;
      carBodyGroup.add(body);

      const glassGeo = createSculptedProfile((s) => {
        s.moveTo(-0.98, 0.64);
        s.quadraticCurveTo(-0.46, 1.20, 0.22, 1.22);
        s.lineTo(1.35, 1.20);
        s.lineTo(1.78, 0.70);
        s.lineTo(-0.98, 0.64);
      }, sp.bodyW * 0.84, 0.08, 0.10, 3);
      const glass = new THREE.Mesh(glassGeo, cabinMat);
      glass.position.y = baseY - 0.08;
      carBodyGroup.add(glass);

      const roofScoop = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.56), trimMat);
      roofScoop.position.set(0, baseY + 1.22, -0.05);
      carBodyGroup.add(roofScoop);

      [-0.42, -0.14, 0.14, 0.42].forEach((lx) => {
        const pod = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), headlightMat);
        pod.position.set(lx, baseY + 0.42, -halfL - 0.04);
        carBodyGroup.add(pod);
      });

      [-0.82, 0.82].forEach((ex) => {
        const ep = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.52), bodyMat);
        ep.position.set(ex, baseY + 1.18, halfL - 0.28);
        carBodyGroup.add(ep);
      });
      const topWing = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.07, 0.44), trimMat);
      topWing.position.set(0, baseY + 1.38, halfL - 0.28);
      topWing.rotation.x = -0.18;
      carBodyGroup.add(topWing);
    } else if (carId === "buggy") {
      // SANDRUNNER X — Curved Open-Cage Desert Exocar with Contoured Nose & Tubular Bars
      const tubGeo = createSculptedProfile((s) => {
        s.moveTo(-halfL + 0.18, 0.22);
        s.quadraticCurveTo(-1.35, 0.52, -0.55, 0.52);
        s.lineTo(1.15, 0.46);
        s.quadraticCurveTo(1.85, 0.44, halfL - 0.12, 0.26);
        s.lineTo(halfL - 0.2, 0.08);
        s.lineTo(-halfL + 0.25, 0.08);
      }, 1.48, 0.10, 0.14, 4);
      const tub = new THREE.Mesh(tubGeo, bodyMat);
      tub.position.y = baseY - 0.05;
      tub.castShadow = true;
      carBodyGroup.add(tub);

      // Curved tubular roll-cage arches
      [-0.66, 0.66].forEach((sx) => {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(sx, baseY + 0.35, -0.95),
          new THREE.Vector3(sx, baseY + 1.12, -0.25),
          new THREE.Vector3(sx, baseY + 1.14, 0.85),
          new THREE.Vector3(sx, baseY + 0.38, 1.65),
        ]);
        const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.052, 8, false), trimMat);
        rail.castShadow = true;
        carBodyGroup.add(rail);
      });
      [-0.25, 0.85].forEach((cz) => {
        const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 1.32, 8), trimMat);
        cross.rotation.z = Math.PI / 2;
        cross.position.set(0, baseY + 1.13, cz);
        carBodyGroup.add(cross);
      });

      const ledBar = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.11, 0.12), headlightMat);
      ledBar.position.set(0, baseY + 1.22, -0.35);
      carBodyGroup.add(ledBar);

      [-0.32, 0.32].forEach((sx) => {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.42), trimMat);
        seat.position.set(sx, baseY + 0.48, 0.18);
        carBodyGroup.add(seat);
      });
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.86, 12), chromeMat);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(0, baseY + 0.46, 1.32);
      carBodyGroup.add(engine);
    } else if (carId === "suv") {
      // RIDGEBACK 4X4 — Beveled Sculpted Off-Road SUV with Curved Roof Rack & Spare Wheel
      const bodyGeo = createSculptedProfile((s) => {
        s.moveTo(-halfL + 0.06, 0.14);
        s.quadraticCurveTo(-halfL + 0.08, 0.72, -1.12, 0.80);
        s.quadraticCurveTo(-0.78, 1.54, -0.25, 1.56);
        s.lineTo(1.75, 1.54);
        s.quadraticCurveTo(halfL - 0.08, 1.44, halfL - 0.06, 0.82);
        s.lineTo(halfL - 0.06, 0.18);
        s.lineTo(-halfL + 0.08, 0.12);
      }, sp.bodyW, 0.14, 0.18, 4);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = baseY - 0.06;
      body.castShadow = true;
      carBodyGroup.add(body);

      const glassGeo = createSculptedProfile((s) => {
        s.moveTo(-1.04, 0.82);
        s.quadraticCurveTo(-0.74, 1.44, -0.24, 1.46);
        s.lineTo(1.72, 1.44);
        s.lineTo(2.14, 0.84);
        s.lineTo(-1.04, 0.82);
      }, sp.bodyW * 0.88, 0.08, 0.08, 3);
      const glass = new THREE.Mesh(glassGeo, cabinMat);
      glass.position.y = baseY - 0.04;
      carBodyGroup.add(glass);

      const ledBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.11, 0.13), headlightMat);
      ledBar.position.set(0, baseY + 1.62, -0.78);
      carBodyGroup.add(ledBar);

      const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.38, 0.2), trimMat);
      bullbar.position.set(0, baseY + 0.34, -halfL - 0.12);
      carBodyGroup.add(bullbar);

      const spareGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.28, 18);
      spareGeo.rotateX(Math.PI / 2);
      const spare = new THREE.Mesh(spareGeo, tireMat);
      spare.position.set(0, baseY + 0.68, halfL + 0.14);
      carBodyGroup.add(spare);

      addMirror(carBodyGroup, -1, -sp.bodyW * 0.46, baseY + 0.86, -0.78, bodyMat, trimMat);
      addMirror(carBodyGroup, 1, sp.bodyW * 0.46, baseY + 0.86, -0.78, bodyMat, trimMat);
    } else if (carId === "police") {
      // AEGIS PATROL — Sleek Contoured Pursuit Interceptor + Two-Tone Doors & Aerodynamic Lightbar
      const bodyGeo = createSculptedProfile((s) => {
        s.moveTo(-halfL + 0.06, 0.14);
        s.quadraticCurveTo(-halfL + 0.14, 0.50, -1.12, 0.60);
        s.lineTo(halfL - 0.22, 0.64);
        s.quadraticCurveTo(halfL - 0.04, 0.54, halfL - 0.06, 0.16);
        s.lineTo(-halfL + 0.08, 0.10);
      }, sp.bodyW, 0.14, 0.18, 4);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = baseY - 0.1;
      body.castShadow = true;
      carBodyGroup.add(body);

      const doorBand = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW + 0.03, 0.46, 2.05), secondaryWhiteMat);
      doorBand.position.set(0, baseY + 0.24, 0.12);
      carBodyGroup.add(doorBand);

      const cabinGeo = createSculptedProfile((s) => {
        s.moveTo(-0.98, 0.54);
        s.quadraticCurveTo(-0.42, 1.12, 0.25, 1.12);
        s.quadraticCurveTo(0.95, 1.10, 1.56, 0.60);
        s.lineTo(-0.98, 0.54);
      }, sp.bodyW * 0.82, 0.12, 0.14, 4);
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.y = baseY - 0.08;
      cabin.castShadow = true;
      carBodyGroup.add(cabin);

      const roofWhite = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.08, 1.45), secondaryWhiteMat);
      roofWhite.position.set(0, baseY + 1.07, 0.12);
      carBodyGroup.add(roofWhite);

      const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.42, 0.2), trimMat);
      pushBar.position.set(0, baseY + 0.26, -halfL - 0.1);
      carBodyGroup.add(pushBar);

      const redMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff1111, emissiveIntensity: 0.4 });
      const blueMat = new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x1155ff, emissiveIntensity: 0.4 });

      const redPod = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.28), redMat);
      redPod.position.set(-0.36, baseY + 1.20, 0.05);
      carBodyGroup.add(redPod);
      const bluePod = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.28), blueMat);
      bluePod.position.set(0.36, baseY + 1.20, 0.05);
      carBodyGroup.add(bluePod);

      const redLight = new THREE.PointLight(0xff1e1e, 0, 24, 2);
      redLight.position.set(-0.6, baseY + 1.7, 0.05);
      carBodyGroup.add(redLight);
      const blueLight = new THREE.PointLight(0x2563eb, 0, 24, 2);
      blueLight.position.set(0.6, baseY + 1.7, 0.05);
      carBodyGroup.add(blueLight);
      policeLightbar = { redMat, blueMat, redLight, blueLight };

      addMirror(carBodyGroup, -1, -sp.bodyW * 0.45, baseY + 0.64, -0.45, bodyMat, trimMat);
      addMirror(carBodyGroup, 1, sp.bodyW * 0.45, baseY + 0.64, -0.45, bodyMat, trimMat);
    } else {
      // MAMMOTH 6X4 — Sculpted Aerodynamic Long-Nose Semi Tractor + Curved Wind Fairing & Chrome Tanks
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.42, sp.bodyLen), trimMat);
      frame.position.set(0, baseY + 0.16, 0);
      carBodyGroup.add(frame);

      const cabGeo = createSculptedProfile((s) => {
        s.moveTo(-halfL + 0.15, 0.32);
        s.quadraticCurveTo(-halfL + 0.18, 1.48, -1.42, 1.56);
        s.quadraticCurveTo(-1.18, 2.52, -0.78, 2.66);
        s.quadraticCurveTo(0.05, 3.22, 0.92, 3.12);
        s.lineTo(0.98, 0.36);
        s.lineTo(-halfL + 0.18, 0.32);
      }, 2.34, 0.14, 0.18, 4);
      const cab = new THREE.Mesh(cabGeo, bodyMat);
      cab.position.y = baseY - 0.1;
      cab.castShadow = true;
      carBodyGroup.add(cab);

      const ws = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.72, 0.16), cabinMat);
      ws.position.set(0, baseY + 2.02, -1.24);
      ws.rotation.x = -0.22;
      carBodyGroup.add(ws);

      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.0, 0.12), chromeMat);
      grille.position.set(0, baseY + 0.88, -halfL + 0.14);
      carBodyGroup.add(grille);

      const bumper = new THREE.Mesh(new THREE.BoxGeometry(sp.bodyW, 0.40, 0.28), chromeMat);
      bumper.position.set(0, baseY + 0.18, -halfL - 0.04);
      carBodyGroup.add(bumper);

      // Cylindrical chrome fuel tanks & twin exhaust stacks
      [-1.12, 1.12].forEach((sx) => {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.85, 14), chromeMat);
        tank.rotation.x = Math.PI / 2;
        tank.position.set(sx, baseY + 0.22, 0.15);
        carBodyGroup.add(tank);

        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 3.0, 10), chromeMat);
        stack.position.set(sx, baseY + 1.98, 0.96);
        carBodyGroup.add(stack);
      });

      const hitch = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 16), trimMat);
      hitch.position.set(0, baseY + 0.46, 2.0);
      carBodyGroup.add(hitch);
    }

    // Headlights, Soft Volumetric Beams, Taillights & Nitro Exhaust Flames
    const lightY =
      carId === "truck"
        ? baseY + 0.62
        : carId === "suv"
        ? baseY + 0.5
        : carId === "formula" || carId === "lmp"
        ? baseY + 0.16
        : baseY + 0.28;
    const beamGeo = new THREE.ConeGeometry(1.45, 11.5, 22, 1, true);
    beamGeo.rotateX(Math.PI / 2);
    const lightSpan = carId === "formula" ? 0.42 : carId === "buggy" ? 0.52 : sp.bodyW * 0.33;

    [-lightSpan, lightSpan].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(carId === "formula" ? 0.22 : 0.44, 0.12, 0.08), headlightMat);
      hl.position.set(lx, lightY, -halfL - 0.01);
      carBodyGroup.add(hl);

      const cone = new THREE.Mesh(beamGeo, softBeamMat);
      cone.position.set(lx, lightY - 0.24, -halfL - 5.75);
      cone.rotation.x = -0.055;
      carBodyGroup.add(cone);
      volumetricBeams.push(cone);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(carId === "formula" ? 0.26 : 0.52, 0.13, 0.08), brakeLightMat);
      tl.position.set(lx, lightY + 0.04, halfL + 0.01);
      carBodyGroup.add(tl);
    });

    const headSpot = new THREE.SpotLight(0xfff8e7, 3.2, 125, Math.PI / 4.5, 0.52, 1.15);
    headSpot.position.set(0, lightY + 0.28, -halfL + 0.1);
    const headTarget = new THREE.Object3D();
    headTarget.position.set(0, 0.0, -34);
    carBodyGroup.add(headSpot);
    carBodyGroup.add(headTarget);
    headSpot.target = headTarget;

    const rearGlowLight = new THREE.PointLight(0xff2222, 0.7, 10, 2);
    rearGlowLight.position.set(0, 0.24, halfL + 1.05);
    carBodyGroup.add(rearGlowLight);

    const flameOffsets = carId === "formula" ? [0] : [-0.50, 0.50];
    flameOffsets.forEach((fx) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 10), chromeMat);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(fx, baseY - 0.01, halfL + 0.02);
      carBodyGroup.add(tip);

      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.25, 10), flameMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(fx, baseY - 0.01, halfL + 0.64);
      cone.visible = false;
      carBodyGroup.add(cone);
      flames.push(cone);
    });

    // Rounded Sculpted Wheels + 5-Spoke Alloys + Stationary Calipers
    const wheelList = sp.isSixWheel
      ? [
          { x: -sp.wheelX, y: sp.wheelRadius, z: -2.25, front: true, side: -1 },
          { x: sp.wheelX, y: sp.wheelRadius, z: -2.25, front: true, side: 1 },
          { x: -sp.wheelX, y: sp.wheelRadius, z: 1.35, front: false, side: -1 },
          { x: sp.wheelX, y: sp.wheelRadius, z: 1.35, front: false, side: 1 },
          { x: -sp.wheelX, y: sp.wheelRadius, z: 2.65, front: false, side: -1 },
          { x: sp.wheelX, y: sp.wheelRadius, z: 2.65, front: false, side: 1 },
        ]
      : [
          { x: -sp.wheelX, y: sp.wheelRadius, z: -sp.wheelZ, front: true, side: -1 },
          { x: sp.wheelX, y: sp.wheelRadius, z: -sp.wheelZ, front: true, side: 1 },
          { x: -sp.wheelX, y: sp.wheelRadius, z: sp.wheelZ, front: false, side: -1 },
          { x: sp.wheelX, y: sp.wheelRadius, z: sp.wheelZ, front: false, side: 1 },
        ];

    wheelList.forEach((wp) => {
      const pivot = new THREE.Group();
      pivot.position.set(wp.x, wp.y, wp.z);
      const spinGrp = addSculptedWheel(
        pivot,
        sp.wheelRadius,
        sp.wheelWidth,
        wp.side,
        tireMat,
        chromeMat,
        trimMat,
        caliperMat,
        sp.isSixWheel
      );
      carGroup.add(pivot);

      wheelPivots.push(pivot);
      wheelMeshes.push(spinGrp);
      wheelIsRear.push(!wp.front);
      if (wp.front) frontWheelPivots.push(pivot);
    });

    return {
      wheelPivots,
      wheelMeshes,
      wheelIsRear,
      frontWheelPivots,
      volumetricBeams,
      flames,
      headSpot,
      rearGlowLight,
      policeLightbar,
      activeWingPivot,
    };
  }

  return { buildPlayerVehicle, createSculptedProfile };
})();