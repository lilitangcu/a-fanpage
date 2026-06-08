import { ARCHIVE_CONTENT, type ArchiveCategory } from "./config";
import { setupFluidCursor } from "./fluid";
import { subscribeToDeviceTilt } from "./motion";

export const setupIntroExperience = () => {
  const fanWorks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".fan-work"));
  let previewedWork: HTMLAnchorElement | null = null;
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const item = event.target.closest<HTMLAnchorElement>(".fan-work");
      if (!item) {
        previewedWork?.classList.remove("is-previewing");
        previewedWork = null;
        return;
      }

      if (previewedWork !== item) {
        event.preventDefault();
        previewedWork?.classList.remove("is-previewing");
        previewedWork = item;
        item.classList.add("is-previewing");
        return;
      }

      if (item.getAttribute("href") === "#") event.preventDefault();
    },
    true,
  );

  const app = document.querySelector<HTMLElement>("#app");
  const stage = document.querySelector<HTMLElement>("#intro-stage");
  const figure = document.querySelector<HTMLElement>(".portrait-figure");
  const backCanvas = document.querySelector<HTMLCanvasElement>("#smoke-canvas-back");
  const drawer = document.querySelector<HTMLElement>("#archive-drawer");
  const drawerEyebrow = document.querySelector<HTMLElement>("#drawer-eyebrow");
  const drawerTitle = document.querySelector<HTMLElement>("#drawer-title");
  const drawerDescription = document.querySelector<HTMLElement>("#drawer-description");
  const drawerItems = document.querySelector<HTMLElement>("#drawer-items");
  const drawerClose = document.querySelector<HTMLButtonElement>("#drawer-close");
  const continueButton = document.querySelector<HTMLButtonElement>("#continue-button");
  const introBack = document.querySelector<HTMLButtonElement>("#intro-back");
  const continuationBack = document.querySelector<HTMLButtonElement>("#continuation-back");
  const continuationStage =
    document.querySelector<HTMLElement>("#continuation-stage");
  const fanArchive = document.querySelector<HTMLElement>(".fan-archive");
  const fanPanel = document.querySelector<HTMLElement>(".fan-v-panel");
  const endingTrigger = document.querySelector<HTMLButtonElement>("#ending-trigger");
  const endingTransition = document.querySelector<HTMLElement>("#ending-transition");
  const endingReset = document.querySelector<HTMLButtonElement>("#ending-reset");
  const resetButton = document.querySelector<HTMLButtonElement>("#reset-button");
  const hotspots = Array.from(
    document.querySelectorAll<HTMLButtonElement>(".portrait-hotspot"),
  );

  if (
    !app ||
    !stage ||
    !figure ||
    !backCanvas ||
    !drawer ||
    !drawerEyebrow ||
    !drawerTitle ||
    !drawerDescription ||
    !drawerItems ||
    !drawerClose ||
    !continueButton ||
    !introBack ||
    !continuationBack ||
    !continuationStage ||
    !fanArchive ||
    !fanPanel ||
    !endingTrigger ||
    !endingTransition ||
    !endingReset ||
    !resetButton
  ) {
    return;
  }

  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
  const tilt = { x: 0, y: 0, targetX: 0, targetY: 0 };
  figure.style.setProperty(
    "--portrait-url",
    `url("${import.meta.env.BASE_URL}images/a-cutout.png")`,
  );
  let activeCategory: ArchiveCategory | null = null;
  let lockedCategory: ArchiveCategory | null = null;
  let width = 1;
  let height = 1;
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)");

  const resize = () => {
    width = stage.clientWidth;
    height = stage.clientHeight;
  };

  const setFigureTilt = (clientX: number, clientY: number) => {
    const x = clientX / Math.max(window.innerWidth, 1) - 0.5;
    const y = clientY / Math.max(window.innerHeight, 1) - 0.5;
    tilt.targetX = -y * 11;
    tilt.targetY = x * 14;
  };

  const renderItems = (category: ArchiveCategory) => {
    const content = ARCHIVE_CONTENT[category];
    drawerEyebrow.textContent = content.eyebrow;
    drawerTitle.textContent = content.title;
    drawerDescription.textContent = content.description;
    drawer.dataset.category = category;
    drawerItems.replaceChildren(
      ...content.items.map((item, index) => {
        const element = document.createElement(item.url ? "a" : "div");
        element.className = "media-strip";
        if (item.url && element instanceof HTMLAnchorElement) {
          element.href = item.url;
          element.target = "_blank";
          element.rel = "noreferrer";
        }

        const number = document.createElement("span");
        number.className = "media-strip-number";
        number.textContent = String(index + 1).padStart(2, "0");

        const copy = document.createElement("span");
        copy.className = "media-strip-copy";
        const title = document.createElement("strong");
        title.textContent = item.title;
        const meta = document.createElement("small");
        meta.textContent = item.meta;
        copy.append(title, meta);

        const action = document.createElement("span");
        action.className = "media-strip-action";
        action.textContent = item.url ? "↗" : "·";
        element.append(number, copy, action);
        return element;
      }),
    );
  };

  const openDrawer = (category: ArchiveCategory, lock = false) => {
    activeCategory = category;
    if (lock) lockedCategory = category;
    renderItems(category);
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    hotspots.forEach((hotspot) => {
      const isActive = hotspot.dataset.category === category;
      hotspot.classList.toggle("is-active", isActive);
      hotspot.setAttribute("aria-expanded", String(isActive));
    });
  };

  const closeDrawer = (force = false) => {
    if (lockedCategory && !force) return;
    activeCategory = null;
    lockedCategory = null;
    drawer.classList.remove("is-open");
    hotspots.forEach((hotspot) => {
      hotspot.classList.remove("is-active");
      hotspot.setAttribute("aria-expanded", "false");
    });
    window.setTimeout(() => {
      if (!activeCategory) drawer.hidden = true;
    }, 420);
  };

  hotspots.forEach((hotspot) => {
    const category = hotspot.dataset.category as ArchiveCategory;
    hotspot.addEventListener("pointerenter", (event) => {
      if (supportsHover.matches && event.pointerType === "mouse" && !lockedCategory) {
        openDrawer(category);
      }
    });
    hotspot.addEventListener("focus", () => {
      if (hotspot.matches(":focus-visible")) openDrawer(category);
    });
    hotspot.addEventListener("click", () => {
      if (lockedCategory === category) closeDrawer(true);
      else openDrawer(category, true);
    });
  });

  stage.addEventListener("pointerleave", () => {
    pointer.active = false;
    if (!lockedCategory) closeDrawer();
    tilt.targetX = 0;
    tilt.targetY = 0;
  });

  stage.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    pointer.targetX = event.clientX - rect.left;
    pointer.targetY = event.clientY - rect.top;
    pointer.active = true;
    setFigureTilt(event.clientX, event.clientY);
  });

  subscribeToDeviceTilt(
    () =>
      app.classList.contains("is-third-page") &&
      !app.classList.contains("is-fourth-page"),
    (x, y) => {
      tilt.targetX = x * -9;
      tilt.targetY = y * 11;
    },
  );

  drawer.addEventListener("pointerenter", () => {
    pointer.active = false;
  });
  drawer.addEventListener("pointerleave", () => {
    if (supportsHover.matches && !lockedCategory) closeDrawer();
  });
  drawerClose.addEventListener("click", () => closeDrawer(true));
  introBack.addEventListener("click", () => {
    closeDrawer(true);
    app.classList.remove("is-third-page");
  });
  let pageTransitionTimer: number | null = null;
  let pageTransitionCleanupTimer: number | null = null;
  continueButton.addEventListener("click", () => {
    if (app.classList.contains("is-page-transition")) return;
    app.classList.add("is-page-transition");
    pageTransitionTimer = window.setTimeout(() => {
      app.classList.add("is-fourth-page");
    }, 420);
    pageTransitionCleanupTimer = window.setTimeout(() => {
      app.classList.remove("is-page-transition");
    }, 1320);
  });
  continuationBack.addEventListener("click", () => {
    if (pageTransitionTimer !== null) window.clearTimeout(pageTransitionTimer);
    if (pageTransitionCleanupTimer !== null) {
      window.clearTimeout(pageTransitionCleanupTimer);
    }
    app.classList.remove("is-page-transition");
    app.classList.remove("is-ending-transition", "is-ending-page");
    app.classList.remove("is-fourth-page");
  });
  let endingTimer: number | null = null;
  endingTrigger.addEventListener("click", () => {
    if (app.classList.contains("is-ending-transition")) return;
    app.classList.add("is-ending-transition");
    endingTransition.setAttribute("aria-hidden", "false");
    endingTimer = window.setTimeout(() => {
      app.classList.add("is-ending-page");
    }, 1850);
  });
  endingReset.addEventListener("click", () => {
    if (endingTimer !== null) {
      window.clearTimeout(endingTimer);
      endingTimer = null;
    }
    continuationStage.scrollTo({ top: 0, behavior: "auto" });
    endingTransition.setAttribute("aria-hidden", "true");
    endingTransition.getAnimations().forEach((animation) => animation.cancel());
    document.querySelectorAll(".fan-work.is-previewing").forEach((item) => {
      item.classList.remove("is-previewing");
    });
    resetButton.click();
  });
  const fanTilt = { x: 0, y: 0, targetX: 0, targetY: 0 };
  continuationStage.addEventListener("pointermove", (event) => {
    const bounds = fanPanel.getBoundingClientRect();
    const x = Math.max(-0.5, Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5));
    const y = Math.max(-0.5, Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5));
    fanTilt.targetX = y * -14;
    fanTilt.targetY = x * 18;
  });
  continuationStage.addEventListener("pointerleave", () => {
    fanTilt.targetX = 0;
    fanTilt.targetY = 0;
  });
  subscribeToDeviceTilt(
    () =>
      app.classList.contains("is-fourth-page") &&
      !app.classList.contains("is-ending-page"),
    (x, y) => {
      fanTilt.targetX = x * -4;
      fanTilt.targetY = y * 6;
    },
  );
  window.addEventListener("resize", resize);
  window.addEventListener("beforeunload", () => {
    if (endingTimer !== null) window.clearTimeout(endingTimer);
    if (pageTransitionTimer !== null) window.clearTimeout(pageTransitionTimer);
    if (pageTransitionCleanupTimer !== null) {
      window.clearTimeout(pageTransitionCleanupTimer);
    }
  });

  setupFluidCursor(
    stage,
    backCanvas,
    () =>
      app.classList.contains("is-third-page") &&
      !app.classList.contains("is-fourth-page"),
  );

  const render = () => {
    pointer.x += (pointer.targetX - pointer.x) * 0.12;
    pointer.y += (pointer.targetY - pointer.y) * 0.12;
    tilt.x += (tilt.targetX - tilt.x) * 0.1;
    tilt.y += (tilt.targetY - tilt.y) * 0.1;
    figure.style.setProperty("--tilt-x", `${tilt.x.toFixed(2)}deg`);
    figure.style.setProperty("--tilt-y", `${tilt.y.toFixed(2)}deg`);
    figure.style.setProperty("--image-x", `${(-tilt.y * 0.72).toFixed(2)}px`);
    figure.style.setProperty("--image-y", `${(tilt.x * 0.58).toFixed(2)}px`);
    figure.style.setProperty("--shadow-x", `${(-tilt.y * 1.2).toFixed(2)}px`);
    figure.style.setProperty("--shadow-y", `${(12 + tilt.x * 0.9).toFixed(2)}px`);
    figure.style.setProperty("--shadow-back-x", `${(tilt.y * 1.2).toFixed(2)}px`);
    figure.style.setProperty("--shadow-back-y", `${(6 + tilt.x * 0.45).toFixed(2)}px`);
    stage.style.setProperty("--intro-page-x", `${(tilt.y * 1.4).toFixed(2)}px`);
    stage.style.setProperty("--intro-page-y", `${(-tilt.x * 1.1).toFixed(2)}px`);
    stage.style.setProperty("--intro-grid-x", `${(tilt.y * -2).toFixed(2)}px`);
    stage.style.setProperty("--intro-grid-y", `${(tilt.x * 1.7).toFixed(2)}px`);
    stage.style.setProperty("--intro-id-x", `${(tilt.y * -0.72).toFixed(2)}px`);
    stage.style.setProperty("--intro-id-y", `${(tilt.x * 0.58).toFixed(2)}px`);
    fanTilt.x += (fanTilt.targetX - fanTilt.x) * 0.08;
    fanTilt.y += (fanTilt.targetY - fanTilt.y) * 0.08;
    fanArchive.style.setProperty("--fan-tilt-x", `${fanTilt.x.toFixed(2)}deg`);
    fanArchive.style.setProperty("--fan-tilt-y", `${fanTilt.y.toFixed(2)}deg`);
    fanArchive.style.setProperty("--fan-shift-x", `${(fanTilt.y * -0.85).toFixed(2)}px`);
    fanArchive.style.setProperty("--fan-shift-y", `${(fanTilt.x * 0.7).toFixed(2)}px`);

    requestAnimationFrame(render);
  };

  resize();
  pointer.x = width * 0.72;
  pointer.y = height * 0.5;
  pointer.targetX = pointer.x;
  pointer.targetY = pointer.y;
  requestAnimationFrame(render);
};
