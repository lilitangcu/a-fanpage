import { ARCHIVE_CONTENT, type ArchiveCategory } from "./config";
import { setupFluidCursor } from "./fluid";

export const setupIntroExperience = () => {
  const app = document.querySelector<HTMLElement>("#app");
  const stage = document.querySelector<HTMLElement>("#intro-stage");
  const figure = document.querySelector<HTMLElement>(".portrait-figure");
  const backCanvas = document.querySelector<HTMLCanvasElement>("#smoke-canvas-back");
  const frontCanvas = document.querySelector<HTMLCanvasElement>("#smoke-canvas-front");
  const drawer = document.querySelector<HTMLElement>("#archive-drawer");
  const drawerEyebrow = document.querySelector<HTMLElement>("#drawer-eyebrow");
  const drawerTitle = document.querySelector<HTMLElement>("#drawer-title");
  const drawerDescription = document.querySelector<HTMLElement>("#drawer-description");
  const drawerItems = document.querySelector<HTMLElement>("#drawer-items");
  const drawerClose = document.querySelector<HTMLButtonElement>("#drawer-close");
  const hotspots = Array.from(
    document.querySelectorAll<HTMLButtonElement>(".portrait-hotspot"),
  );

  if (
    !app ||
    !stage ||
    !figure ||
    !backCanvas ||
    !frontCanvas ||
    !drawer ||
    !drawerEyebrow ||
    !drawerTitle ||
    !drawerDescription ||
    !drawerItems ||
    !drawerClose
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

  drawer.addEventListener("pointerenter", () => {
    pointer.active = false;
  });
  drawer.addEventListener("pointerleave", () => {
    if (supportsHover.matches && !lockedCategory) closeDrawer();
  });
  drawerClose.addEventListener("click", () => closeDrawer(true));
  window.addEventListener("resize", resize);

  setupFluidCursor(
    stage,
    backCanvas,
    frontCanvas,
    () => app.classList.contains("is-third-page"),
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

    requestAnimationFrame(render);
  };

  resize();
  pointer.x = width * 0.72;
  pointer.y = height * 0.5;
  pointer.targetX = pointer.x;
  pointer.targetY = pointer.y;
  requestAnimationFrame(render);
};
