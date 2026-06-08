import * as THREE from "three";
import { APP_CONFIG, GESTURE_CONFIG } from "./config";
import { setupIntroExperience } from "./intro";
import { setupMusicExperience } from "./music";
import { requestMotionPermission } from "./motion";
import { setupVoiceExperience } from "./voice";
import { compositeFragmentShader, fullscreenVertexShader } from "./shaders";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#reveal-canvas");
const app = document.querySelector<HTMLElement>("#app");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-button");
const cursor = document.querySelector<HTMLDivElement>("#brush-cursor");
const progressFill = document.querySelector<HTMLElement>("#progress-fill");
const progressLabel = document.querySelector<HTMLElement>("#progress-label");
const hint = document.querySelector<HTMLElement>(".hint");

if (!canvas || !app || !resetButton || !cursor || !progressFill || !progressLabel || !hint) {
  throw new Error("Required UI elements are missing.");
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 1);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const geometry = new THREE.PlaneGeometry(2, 2);
const loader = new THREE.TextureLoader();

const loadTexture = (url: string) =>
  new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });

const textureSize = (texture: THREE.Texture) => {
  const image = texture.image as { width: number; height: number };
  return new THREE.Vector2(image.width, image.height);
};

const easeOutQuart = (value: number) => 1 - Math.pow(1 - value, 4);
const easeInOutCubic = (value: number) =>
  value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

const init = async () => {
  const [foreground, background] = await Promise.all([
    loadTexture(APP_CONFIG.foregroundUrl),
    loadTexture(APP_CONFIG.backgroundUrl),
  ]);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uForeground: { value: foreground },
      uBackground: { value: background },
      uViewport: { value: new THREE.Vector2(1, 1) },
      uForegroundSize: { value: textureSize(foreground) },
      uBackgroundSize: { value: textureSize(background) },
      uDirection: { value: new THREE.Vector2(1, 0) },
      uEdgePosition: { value: -0.55 },
      uEdgeCrossPosition: { value: 0 },
      uEdgeSoftness: { value: GESTURE_CONFIG.edgeSoftness },
      uEdgeCurve: { value: GESTURE_CONFIG.edgeCurve },
      uEdgeWave: { value: GESTURE_CONFIG.edgeWave },
      uParallax: { value: GESTURE_CONFIG.parallax },
      uComplete: { value: 0 },
      uPortraitScale: { value: 1 },
    },
    vertexShader: fullscreenVertexShader,
    fragmentShader: compositeFragmentShader,
    depthTest: false,
    depthWrite: false,
  });

  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));

  let reveal = 0;
  let dragging = false;
  let completed = false;
  let pointerId: number | null = null;
  let startPoint = new THREE.Vector2();
  let lastPoint = new THREE.Vector2();
  let lastMoveTime = 0;
  let velocity = 0;
  let dragDistance = 0;
  let reachedHorizontalEdge = false;
  let animation: {
    from: number;
    to: number;
    start: number;
    duration: number;
  } | null = null;
  let portraitAnimationStart = 0;
  let timelineTimers: number[] = [];

  const clearTimeline = () => {
    timelineTimers.forEach((timer) => window.clearTimeout(timer));
    timelineTimers = [];
    portraitAnimationStart = 0;
  };

  const scheduleArchiveTimeline = () => {
    clearTimeline();
    timelineTimers.push(
      window.setTimeout(() => {
        portraitAnimationStart = performance.now();
        app.classList.add("is-name-focused");
      }, GESTURE_CONFIG.archiveHoldDuration),
      window.setTimeout(() => {
        app.classList.add("are-lines-visible");
      }, GESTURE_CONFIG.archiveHoldDuration + GESTURE_CONFIG.lineGrowDelay),
      window.setTimeout(() => {
        app.classList.add("is-falling");
      }, GESTURE_CONFIG.archiveHoldDuration + GESTURE_CONFIG.fallDelay),
      window.setTimeout(() => {
        app.classList.add("is-voice-page");
      }, GESTURE_CONFIG.archiveHoldDuration + GESTURE_CONFIG.fallDelay + GESTURE_CONFIG.fallDuration),
    );
  };

  const edgeExtent = () => {
    const direction = material.uniforms.uDirection.value as THREE.Vector2;
    return 0.5 * (Math.abs(direction.x) + Math.abs(direction.y));
  };

  const revealFromEdge = (edgePosition: number) => {
    const extent = edgeExtent();
    return THREE.MathUtils.clamp(
      (edgePosition + extent + GESTURE_CONFIG.edgeSoftness) /
        (2 * (extent + GESTURE_CONFIG.edgeSoftness)),
      0,
      1,
    );
  };

  const edgeFromReveal = (value: number) => {
    const extent = edgeExtent();
    return THREE.MathUtils.lerp(
      -extent - GESTURE_CONFIG.edgeSoftness,
      extent + GESTURE_CONFIG.edgeSoftness,
      value,
    );
  };

  const setEdgePosition = (edgePosition: number) => {
    material.uniforms.uEdgePosition.value = edgePosition;
    const value = revealFromEdge(edgePosition);
    reveal = THREE.MathUtils.clamp(value, 0, 1);
    progressFill.style.transform = `scaleX(${reveal})`;
    progressLabel.textContent = `${Math.round(reveal * 100).toString().padStart(2, "0")}%`;
    app.style.setProperty("--gesture-progress", reveal.toString());
  };

  const animateTo = (to: number, duration: number) => {
    animation = {
      from: material.uniforms.uEdgePosition.value as number,
      to: edgeFromReveal(to),
      start: performance.now(),
      duration,
    };
  };

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, APP_CONFIG.maxDevicePixelRatio));
    renderer.setSize(width, height, false);
    material.uniforms.uViewport.value.set(width, height);
  };

  const moveCursor = (event: PointerEvent) => {
    cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
    cursor.classList.add("is-visible");
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (completed) return;
    dragging = true;
    pointerId = event.pointerId;
    animation = null;
    startPoint.set(event.clientX, event.clientY);
    lastPoint.copy(startPoint);
    lastMoveTime = performance.now();
    velocity = 0;
    dragDistance = 0;
    reachedHorizontalEdge = false;
    canvas.setPointerCapture(event.pointerId);
    cursor.classList.add("is-active");
    app.classList.add("is-dragging");
    moveCursor(event);
  });

  canvas.addEventListener("pointermove", (event) => {
    moveCursor(event);
    if (!dragging || event.pointerId !== pointerId) return;

    const current = new THREE.Vector2(event.clientX, event.clientY);
    const delta = current.clone().sub(startPoint);
    const distance = delta.length();
    dragDistance = distance;
    const edgeThreshold = window.innerWidth * GESTURE_CONFIG.horizontalEdgeZone;
    reachedHorizontalEdge =
      Math.abs(delta.x) >= GESTURE_CONFIG.minimumEdgeTravel &&
      (event.clientX <= edgeThreshold ||
        event.clientX >= window.innerWidth - edgeThreshold);
    const now = performance.now();
    velocity = current.distanceTo(lastPoint) / Math.max(now - lastMoveTime, 1);
    lastPoint.copy(current);
    lastMoveTime = now;

    if (distance >= GESTURE_CONFIG.directionLockDistance) {
      material.uniforms.uDirection.value.set(delta.x, -delta.y).normalize();
    }

    const pointerUv = new THREE.Vector2(
      event.clientX / window.innerWidth - 0.5,
      0.5 - event.clientY / window.innerHeight,
    );
    const direction = material.uniforms.uDirection.value as THREE.Vector2;
    const tangent = new THREE.Vector2(-direction.y, direction.x);
    material.uniforms.uEdgeCrossPosition.value = pointerUv.dot(tangent);
    setEdgePosition(pointerUv.dot(direction) - GESTURE_CONFIG.edgeSoftness);

    if (reachedHorizontalEdge) {
      finishGesture(event);
    }
  });

  const finishGesture = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    cursor.classList.remove("is-active");
    app.classList.remove("is-dragging");

    const shouldOpen =
      reachedHorizontalEdge ||
      dragDistance >= GESTURE_CONFIG.triggerDistance * GESTURE_CONFIG.commitProgress ||
      (dragDistance >= GESTURE_CONFIG.minimumFlickDistance &&
        velocity >= GESTURE_CONFIG.flickVelocity);

    if (shouldOpen) {
      void requestMotionPermission();
      completed = true;
      app.classList.add("is-revealed");
      hint.textContent = "已揭开隐藏图层";
      animateTo(1, GESTURE_CONFIG.completeDuration);
    } else {
      animateTo(0, GESTURE_CONFIG.returnDuration);
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  canvas.addEventListener("pointerup", finishGesture);
  canvas.addEventListener("pointercancel", finishGesture);
  canvas.addEventListener("pointerleave", (event) => {
    if (!dragging && event.pointerType === "mouse") cursor.classList.remove("is-visible");
  });

  resetButton.addEventListener("click", () => {
    clearTimeline();
    completed = false;
    animation = null;
    material.uniforms.uComplete.value = 0;
    material.uniforms.uPortraitScale.value = 1;
    material.uniforms.uDirection.value.set(1, 0);
    material.uniforms.uEdgeCrossPosition.value = 0;
    app.classList.remove(
      "is-revealed",
      "is-complete",
      "is-dragging",
      "is-name-focused",
      "are-lines-visible",
      "is-falling",
      "is-voice-page",
      "is-third-page",
      "is-fourth-page",
      "is-page-transition",
      "is-ending-transition",
      "is-ending-page",
    );
    hint.textContent = "按住并滑动一次，打开隐藏图层";
    setEdgePosition(edgeFromReveal(0));
  });

  window.addEventListener("resize", resize);

  const render = (time: number) => {
    if (animation) {
      const elapsed = (time - animation.start) / animation.duration;
      const t = THREE.MathUtils.clamp(elapsed, 0, 1);
      const eased = animation.to > animation.from ? easeOutQuart(t) : easeInOutCubic(t);
      setEdgePosition(THREE.MathUtils.lerp(animation.from, animation.to, eased));
      if (t >= 1) {
        animation = null;
        if (completed) {
          material.uniforms.uComplete.value = 1;
          app.classList.add("is-complete");
          scheduleArchiveTimeline();
        }
      }
    }

    if (portraitAnimationStart > 0) {
      const portraitProgress = THREE.MathUtils.clamp(
        (time - portraitAnimationStart) / GESTURE_CONFIG.nameFocusDuration,
        0,
        1,
      );
      material.uniforms.uPortraitScale.value = THREE.MathUtils.lerp(
        1,
        0.72,
        easeInOutCubic(portraitProgress),
      );
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };

  resize();
  setEdgePosition(edgeFromReveal(0));
  requestAnimationFrame(render);
};

setupIntroExperience();
setupVoiceExperience();
setupMusicExperience();

init().catch((error: unknown) => {
  console.error("Failed to initialize the reveal experience.", error);
});
