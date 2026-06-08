type Caption = {
  start: number;
  end: number;
  primary: string;
  secondary: string;
};

type MusicTrack = {
  src: string;
  captions: Caption[];
};

const TRACKS: Record<"early" | "late", MusicTrack> = {
  early: {
    src: "audio/prelude-soft.m4a",
    captions: [],
  },
  late: {
    src: "audio/so-high-soft.m4a",
    captions: [],
  },
};

const TARGET_VOLUME = 0.12;
const FADE_DURATION = 900;

export const setupMusicExperience = () => {
  const app = document.querySelector<HTMLElement>("#app");
  const toggle = document.querySelector<HTMLButtonElement>("#music-toggle");
  const subtitles = document.querySelector<HTMLElement>("#music-subtitles");
  const primary = document.querySelector<HTMLElement>("#music-subtitle-primary");
  const secondary = document.querySelector<HTMLElement>("#music-subtitle-secondary");

  if (!app || !toggle || !subtitles || !primary || !secondary) return;

  const audio = {
    early: new Audio(`${import.meta.env.BASE_URL}${TRACKS.early.src}`),
    late: new Audio(`${import.meta.env.BASE_URL}${TRACKS.late.src}`),
  };
  audio.early.loop = true;
  audio.late.loop = true;
  audio.early.preload = "metadata";
  audio.late.preload = "metadata";

  let activeKey: keyof typeof audio = "early";
  let started = false;
  let muted = false;
  let fadeFrame = 0;
  let activeCaption = -1;

  const pageTrack = (): keyof typeof audio =>
    app.classList.contains("is-fourth-page") ||
    app.classList.contains("is-ending-transition") ||
    app.classList.contains("is-ending-page")
      ? "late"
      : "early";

  const updateToggle = () => {
    toggle.classList.toggle("is-muted", muted);
    toggle.setAttribute("aria-pressed", String(!muted));
    toggle.setAttribute("aria-label", muted ? "播放背景音乐" : "暂停背景音乐");
  };

  const fade = (
    element: HTMLAudioElement,
    from: number,
    to: number,
    pauseWhenDone = false,
  ) => {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / FADE_DURATION, 1);
      element.volume = from + (to - from) * progress;
      if (progress < 1) {
        fadeFrame = requestAnimationFrame(step);
      } else if (pauseWhenDone) {
        element.pause();
      }
    };
    fadeFrame = requestAnimationFrame(step);
  };

  const showCaption = () => {
    const current = audio[activeKey];
    const captions = TRACKS[activeKey].captions;
    const index = captions.findIndex(
      (caption) => current.currentTime >= caption.start && current.currentTime < caption.end,
    );
    if (index === activeCaption) return;
    activeCaption = index;
    const caption = captions[index];
    subtitles.hidden = !caption;
    primary.textContent = caption?.primary ?? "";
    secondary.textContent = caption?.secondary ?? "";
  };

  const switchTrack = async (nextKey: keyof typeof audio) => {
    if (nextKey === activeKey) return;
    cancelAnimationFrame(fadeFrame);
    const previous = audio[activeKey];
    activeKey = nextKey;
    activeCaption = -1;
    const next = audio[activeKey];
    fade(previous, previous.volume, 0, true);
    if (started && !muted) {
      next.volume = 0;
      try {
        await next.play();
        fade(next, 0, TARGET_VOLUME);
      } catch {
        started = false;
      }
    }
    showCaption();
  };

  const start = async () => {
    if (started || muted) return;
    activeKey = pageTrack();
    const current = audio[activeKey];
    current.volume = 0;
    try {
      await current.play();
      started = true;
      fade(current, 0, TARGET_VOLUME);
    } catch {
      started = false;
    }
  };

  const observer = new MutationObserver(() => {
    void switchTrack(pageTrack());
  });
  observer.observe(app, { attributes: true, attributeFilter: ["class"] });

  const unlock = () => {
    void start();
  };
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });

  toggle.addEventListener("click", async (event) => {
    event.stopPropagation();
    muted = !muted;
    cancelAnimationFrame(fadeFrame);
    updateToggle();
    if (muted) {
      const current = audio[activeKey];
      fade(current, current.volume, 0, true);
      subtitles.hidden = true;
      return;
    }
    started = false;
    await start();
  });

  const render = () => {
    showCaption();
    requestAnimationFrame(render);
  };

  updateToggle();
  requestAnimationFrame(render);
};
