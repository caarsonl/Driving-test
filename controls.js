window.HorizonControls = (() => {
  "use strict";

  const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

  const touchState = {
    steer: 0,
    steerPointerId: null,
    left: false,
    right: false,
    gas: false,
    brake: false,
    drift: false,
    nitro: false,
    horn: false,
  };

  const padState = {
    connected: false,
    id: "",
    accel: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    nitro: false,
    horn: false,
    prevButtons: [],
    prevStickX: 0,
    prevStickY: 0,
    rumbleCooldown: 0,
  };

  let touchVisible = isTouchDevice;
  let actions = {};

  // =========================================================================
  // 1. TOUCH CONTROLS UI BINDING (MULTI-TOUCH POINTER EVENTS)
  // =========================================================================
  function setTouchVisible(visible) {
    touchVisible = Boolean(visible);
    const el = document.getElementById("touch-controls");
    const btn = document.getElementById("btn-touch");
    const lbl = document.getElementById("touch-label");

    if (el) el.classList.toggle("hidden", !touchVisible);
    document.body.classList.toggle("touch-mode", touchVisible);
    if (btn) btn.classList.toggle("active", touchVisible);
    if (lbl) lbl.textContent = touchVisible ? "ON" : "OFF";

    if (!touchVisible) resetTouchInputs();
  }

  function resetTouchInputs() {
    touchState.steer = 0;
    touchState.steerPointerId = null;
    touchState.left = false;
    touchState.right = false;
    touchState.gas = false;
    touchState.brake = false;
    touchState.drift = false;
    touchState.nitro = false;
    touchState.horn = false;

    const pad = document.getElementById("touch-steer-pad");
    const thumb = document.getElementById("touch-steer-thumb");
    if (pad) pad.classList.remove("active");
    if (thumb) thumb.style.left = "50%";

    [
      "touch-left",
      "touch-right",
      "touch-gas",
      "touch-brake",
      "touch-handbrake",
      "touch-drift",
      "touch-nitro",
      "touch-horn",
    ].forEach((id) => {
      const b = document.getElementById(id);
      if (b) b.classList.remove("pressed");
    });
  }

  function setupTouchControls() {
    const steerPad = document.getElementById("touch-steer-pad");
    const steerThumb = document.getElementById("touch-steer-thumb");

    if (steerPad && steerThumb) {
      const updateSteerFromClientX = (clientX) => {
        const rect = steerPad.getBoundingClientRect();
        const rel = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        const clamped = Math.max(-1, Math.min(1, rel));
        const abs = Math.abs(clamped);
        let curved = 0;
        if (abs > 0.08) {
          const norm = (abs - 0.08) / 0.92;
          curved = Math.sign(clamped) * Math.pow(norm, 1.25);
        }
        touchState.steer = -curved;
        steerThumb.style.left = `${50 + clamped * 40}%`;
      };

      steerPad.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (actions.unlockAudio) actions.unlockAudio();
        touchState.steerPointerId = e.pointerId;
        if (steerPad.setPointerCapture) {
          try { steerPad.setPointerCapture(e.pointerId); } catch (_) {}
        }
        steerPad.classList.add("active");
        updateSteerFromClientX(e.clientX);
      });

      steerPad.addEventListener("pointermove", (e) => {
        if (e.pointerId !== touchState.steerPointerId) return;
        e.preventDefault();
        updateSteerFromClientX(e.clientX);
      });

      const endSteer = (e) => {
        if (e.pointerId !== touchState.steerPointerId) return;
        touchState.steerPointerId = null;
        touchState.steer = 0;
        steerPad.classList.remove("active");
        steerThumb.style.left = "50%";
      };

      steerPad.addEventListener("pointerup", endSteer);
      steerPad.addEventListener("pointercancel", endSteer);
    }

    function bindHoldButton(id, stateKey) {
      const btn = document.getElementById(id);
      if (!btn) return;
      const activePointers = new Set();

      const onDown = (e) => {
        e.preventDefault();
        if (actions.unlockAudio) actions.unlockAudio();
        activePointers.add(e.pointerId);
        if (btn.setPointerCapture) {
          try { btn.setPointerCapture(e.pointerId); } catch (_) {}
        }
        touchState[stateKey] = true;
        btn.classList.add("pressed");
      };

      const onUp = (e) => {
        activePointers.delete(e.pointerId);
        if (activePointers.size === 0) {
          touchState[stateKey] = false;
          btn.classList.remove("pressed");
        }
      };

      btn.addEventListener("pointerdown", onDown);
      btn.addEventListener("pointerup", onUp);
      btn.addEventListener("pointercancel", onUp);
    }

    bindHoldButton("touch-left", "left");
    bindHoldButton("touch-right", "right");
    bindHoldButton("touch-gas", "gas");
    bindHoldButton("touch-brake", "brake");
    bindHoldButton("touch-handbrake", "drift");
    bindHoldButton("touch-drift", "drift");
    bindHoldButton("touch-nitro", "nitro");
    bindHoldButton("touch-horn", "horn");

    const touchSiren = document.getElementById("touch-siren");
    if (touchSiren) {
      touchSiren.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (actions.unlockAudio) actions.unlockAudio();
        if (actions.toggleSiren) actions.toggleSiren();
      });
    }

    const toggleBtn = document.getElementById("btn-touch");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", (e) => {
        e.currentTarget.blur();
        setTouchVisible(!touchVisible);
      });
    }

    window.addEventListener("blur", resetTouchInputs);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) resetTouchInputs();
    });

    setTouchVisible(touchVisible);
  }

  // =========================================================================
  // 2. CONSOLE GAMEPAD ENGINE (XBOX / PLAYSTATION / SWITCH / BLUETOOTH)
  // =========================================================================
  function updatePadBadge(connected, name = "") {
    const badge = document.getElementById("btn-pad") || document.getElementById("pad-badge");
    const label = document.getElementById("pad-label");
    if (!badge || !label) return;
    badge.classList.toggle("connected", connected);
    label.textContent = connected ? "READY" : "OFF";
    if (connected && name) badge.title = `Connected: ${name}`;
  }

  function applyStickDeadzone(val, dz = 0.12) {
    const abs = Math.abs(val);
    if (abs < dz) return 0;
    const norm = (abs - dz) / (1 - dz);
    return Math.sign(val) * Math.pow(norm, 1.3);
  }

  function readBtnValue(btn) {
    if (!btn) return 0;
    if (typeof btn === "number") return btn;
    return typeof btn.value === "number" ? btn.value : btn.pressed ? 1 : 0;
  }

  function isBtnPressed(btn) {
    if (!btn) return false;
    if (typeof btn === "number") return btn > 0.5;
    return Boolean(btn.pressed || btn.value > 0.5);
  }

  function getActiveGamepad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    for (let i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) return pads[i];
    }
    return null;
  }

  window.addEventListener("gamepadconnected", (e) => {
    padState.connected = true;
    padState.id = e.gamepad.id || "Controller";
    updatePadBadge(true, padState.id);
    if (actions.onBanner) actions.onBanner("CONTROLLER CONNECTED");
  });

  window.addEventListener("gamepaddisconnected", () => {
    const remaining = getActiveGamepad();
    padState.connected = Boolean(remaining);
    updatePadBadge(padState.connected, remaining ? remaining.id : "");
    if (!padState.connected) {
      padState.accel = 0;
      padState.brake = 0;
      padState.steer = 0;
      padState.handbrake = false;
      padState.nitro = false;
      padState.horn = false;
      if (actions.onBanner) actions.onBanner("CONTROLLER DISCONNECTED");
    }
  });

  function poll(dt) {
    if (padState.rumbleCooldown > 0) padState.rumbleCooldown -= dt;

    const gp = getActiveGamepad();
    if (!gp) {
      if (padState.connected) {
        padState.connected = false;
        updatePadBadge(false);
      }
      padState.accel = 0;
      padState.brake = 0;
      padState.steer = 0;
      padState.handbrake = false;
      padState.nitro = false;
      padState.horn = false;
      return;
    }

    if (!padState.connected) {
      padState.connected = true;
      padState.id = gp.id || "Controller";
      updatePadBadge(true, padState.id);
    }

    const btns = gp.buttons || [];
    const axes = gp.axes || [];

    const justPressed = (idx) => {
      const cur = isBtnPressed(btns[idx]);
      const prev = Boolean(padState.prevButtons[idx]);
      return cur && !prev;
    };

    for (let i = 0; i < btns.length; i++) {
      if (isBtnPressed(btns[i])) {
        if (actions.unlockAudio) actions.unlockAudio();
        break;
      }
    }

    const garageOpen = actions.isGarageOpen ? actions.isGarageOpen() : false;
    const mapOpen = actions.isMapOpen ? actions.isMapOpen() : false;

    if (justPressed(9) && actions.toggleGarage) {
      actions.toggleGarage();
    } else if (mapOpen) {
      if ((justPressed(0) || justPressed(1) || justPressed(8)) && actions.toggleMap) {
        actions.toggleMap(false);
      }
      padState.accel = 0;
      padState.brake = 0;
      padState.steer = 0;
      padState.handbrake = false;
      padState.nitro = false;
      padState.horn = false;
    } else if (garageOpen) {
      const stickX = axes[0] || 0;
      const stickY = axes[1] || 0;
      const stickUp = stickY < -0.6 && padState.prevStickY >= -0.6;
      const stickDown = stickY > 0.6 && padState.prevStickY <= 0.6;
      const stickLeft = stickX < -0.6 && padState.prevStickX >= -0.6;
      const stickRight = stickX > 0.6 && padState.prevStickX <= 0.6;

      if ((justPressed(12) || stickUp) && actions.stepGarageCar) actions.stepGarageCar(-1);
      if ((justPressed(13) || stickDown) && actions.stepGarageCar) actions.stepGarageCar(1);
      if ((justPressed(14) || stickLeft) && actions.stepGaragePaint) actions.stepGaragePaint(-1);
      if ((justPressed(15) || stickRight) && actions.stepGaragePaint) actions.stepGaragePaint(1);
      if ((justPressed(0) || justPressed(1)) && actions.toggleGarage) actions.toggleGarage(false);

      padState.accel = 0;
      padState.brake = 0;
      padState.steer = 0;
      padState.handbrake = false;
      padState.nitro = false;
      padState.horn = false;
    } else {
      const rawStickX = axes[0] || 0;
      padState.steer = -applyStickDeadzone(rawStickX, 0.12);

      const rt = readBtnValue(btns[7]);
      const lt = readBtnValue(btns[6]);
      padState.accel = rt > 0.04 ? rt : 0;
      padState.brake = lt > 0.04 ? lt : 0;

      padState.nitro = isBtnPressed(btns[0]);
      padState.handbrake = isBtnPressed(btns[1]) || isBtnPressed(btns[2]);
      padState.horn = isBtnPressed(btns[4]);

      if (justPressed(3) && actions.cycleCamera) actions.cycleCamera();
      if (justPressed(5) && actions.toggleSiren) actions.toggleSiren();
      if (justPressed(8) && actions.resetCar) actions.resetCar();
      if (justPressed(12) && actions.cycleWeather) actions.cycleWeather();
      if (justPressed(13) && actions.cycleTimeOfDay) actions.cycleTimeOfDay();
      if (justPressed(14) && actions.cycleWarp) actions.cycleWarp();
      if (justPressed(15) && actions.toggleRayTracing) actions.toggleRayTracing();
    }

    for (let i = 0; i < btns.length; i++) {
      padState.prevButtons[i] = isBtnPressed(btns[i]);
    }
    padState.prevStickX = axes[0] || 0;
    padState.prevStickY = axes[1] || 0;
  }

  function rumble(strong = 0.5, weak = 0.4, durationMs = 120) {
    if (padState.rumbleCooldown > 0) return;
    padState.rumbleCooldown = Math.min(0.16, durationMs / 1000);

    const gp = getActiveGamepad();
    if (gp && gp.vibrationActuator && typeof gp.vibrationActuator.playEffect === "function") {
      try {
        gp.vibrationActuator.playEffect("dual-rumble", {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: Math.min(1, Math.max(0, weak)),
          strongMagnitude: Math.min(1, Math.max(0, strong)),
        });
      } catch (_) {}
    } else if (touchVisible && navigator.vibrate && strong > 0.35) {
      try {
        navigator.vibrate(Math.min(70, Math.round(durationMs * 0.45)));
      } catch (_) {}
    }
  }

  function syncPoliceSirenUI(isPolice, sirenOn) {
    const el = document.getElementById("touch-siren");
    if (!el) return;
    el.classList.toggle("hidden", !isPolice);
    el.classList.toggle("siren-on", Boolean(isPolice && sirenOn));
  }

  function getInput() {
    const touchAccel = touchState.gas ? 1 : 0;
    const touchBrake = touchState.brake ? 1 : 0;
    const btnSteer = (touchState.left ? 1 : 0) - (touchState.right ? 1 : 0);

    let steer = 0;
    let isAnalogSteer = false;
    if (Math.abs(padState.steer) > 0.01) {
      steer = padState.steer;
      isAnalogSteer = true;
    } else if (Math.abs(touchState.steer) > 0.01) {
      steer = touchState.steer;
      isAnalogSteer = true;
    } else if (btnSteer !== 0) {
      steer = btnSteer;
      isAnalogSteer = false;
    }

    return {
      accel: Math.max(padState.accel, touchAccel),
      brake: Math.max(padState.brake, touchBrake),
      steer,
      isAnalogSteer,
      handbrake: padState.handbrake || touchState.drift,
      nitro: padState.nitro || touchState.nitro,
      horn: padState.horn || touchState.horn,
      gamepadConnected: padState.connected,
      touchVisible,
    };
  }

  function init(actionHooks) {
    actions = actionHooks || {};
    setupTouchControls();
  }

  return {
    isTouchDevice,
    init,
    poll,
    getInput,
    rumble,
    syncPoliceSirenUI,
    setTouchVisible,
  };
})();