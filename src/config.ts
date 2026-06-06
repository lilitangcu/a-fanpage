export const GESTURE_CONFIG = {
  /** Drag distance in CSS pixels that represents a full commit gesture. */
  triggerDistance: 220,
  /** Release after this preview progress to complete the reveal. */
  commitProgress: 0.42,
  /** A short fast flick also commits, measured in CSS pixels per millisecond. */
  flickVelocity: 0.75,
  /** Fast flicks must still travel this far to avoid accidental taps. */
  minimumFlickDistance: 80,
  /** Entering this fraction of either horizontal edge commits the reveal. */
  horizontalEdgeZone: 0.16,
  /** Minimum horizontal travel before the edge zone can commit. */
  minimumEdgeTravel: 36,
  /** Ignore tiny movements when determining the reveal direction. */
  directionLockDistance: 12,
  /** Maximum reveal shown while the pointer is still held down. */
  dragPreviewMax: 0.68,
  /** Width of the soft moving edge in UV space. */
  edgeSoftness: 0.055,
  /** Large bow applied to the moving edge. */
  edgeCurve: 0.19,
  /** Small secondary ripple that keeps the edge from feeling mechanical. */
  edgeWave: 0.025,
  /** Foreground movement along the gesture direction. */
  parallax: 0.075,
  completeDuration: 760,
  returnDuration: 380,
  archiveHoldDuration: 3000,
  nameFocusDuration: 1300,
  lineGrowDelay: 480,
  fallDelay: 1850,
  fallDuration: 1100,
} as const;

export const APP_CONFIG = {
  foregroundUrl: `${import.meta.env.BASE_URL}images/foreground.svg`,
  backgroundUrl: `${import.meta.env.BASE_URL}images/a-portrait.jpg`,
  maxDevicePixelRatio: 2,
} as const;

export type ArchiveCategory = "x-video" | "voice" | "recording" | "qa";

export type ArchiveItem = {
  title: string;
  meta: string;
  url?: string;
  poster?: string;
};

const createXItems = (label: string, urls: string[]): ArchiveItem[] =>
  urls.map((url, index) => ({
    title: `${label} / ${String(index + 1).padStart(2, "0")}`,
    meta: "X VIDEO · 点击观看",
    url,
  }));

const ideaUrls = [
  "https://x.com/AlbertKwongonly/status/1785540657274388749/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/1989199362870899014/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/1990630909104812243/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/1990699612181840264/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/1999027210225856858/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2036054090711765157/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2051656045681164326/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2053310484053643280/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2056618096400724372/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2061006678775271501/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2062109998474543609/video/1?s=46",
];

const scriptUrls = [
  "https://x.com/AlbertKwongonly/status/1786971239489441865/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/1889689292793901419/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/1991194594529419644/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2000464661037396469/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2000524718739247339/video/1?s=46",
  "https://x.com/dameizhongguo3/status/2063076348911140869/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2001852072124448818/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2016322843651531139/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2022504938337927464/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2022529421178220562/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2026998035906208173/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2026999556991496329/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2028479635793858812/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2029197758490615888/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2029854346687697254/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2029924953479659992/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2031016158804291701/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2031347674079965533/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2031748613412724806/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2032100375533326635/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2037526457304662360/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2037836236287889553/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2038962412255391877/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2040047848453206153/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2041095310135738775/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2046223618527604805/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2057001433598497219/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2057028556698362301/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2058091381890150764/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2058910176271626416/video/1?s=46",
];

const recordingUrls = [
  "https://x.com/AlbertKwongonly/status/1884549914291822654/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/1787360104205213750/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/1990808343624232983/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2016390866194333965/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2019449075096035655/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2019962287818494217/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2020184306124222931/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2021533848501436725/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2022668726978646377/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2024781069434696009/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2025935580417360181/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2027036122862551233/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2032756593536938086/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2038219872560406600/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2046589317905330294/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2053709400792318362/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2054437487570034875/video/1?s=46",
];

const qaUrls = [
  "https://x.com/AlbertKwongonly/status/2019723770681012227/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2020494819903394066/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2020766045095834062/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2019449692350824949/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2023235652901552579/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2024343795983405162/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2025187304059666834/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2025588243882967197/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2026665684743463376/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2028047066736611397/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2033098285653832069/video/1?s=46",
  "https://x.com/AlbertKwongonly/status/2035349073994432821/video/1?s=46",
  "https://x.com/albertkwongonly/status/2041501560635818389?s=46",
  "https://x.com/albertkwongonly/status/2042226333133197445?s=46",
  "https://x.com/albertkwongonly/status/2043312269401158139?s=46",
];

export const ARCHIVE_CONTENT: Record<
  ArchiveCategory,
  {
    eyebrow: string;
    title: string;
    description: string;
    items: ArchiveItem[];
  }
> = {
  "x-video": {
    eyebrow: "HEAD / IMAGINATION",
    title: "A的奇思妙想",
    description: "没有休止符的暴风雨",
    items: createXItems("奇思妙想", ideaUrls),
  },
  voice: {
    eyebrow: "LIPS / SCRIPT",
    title: "A的台本作品",
    description: "听，是这个季节最清脆的回响",
    items: createXItems("台本作品", scriptUrls),
  },
  recording: {
    eyebrow: "HAND / LIVE RECORD",
    title: "实录",
    description: "最真实的自己，展现给你",
    items: createXItems("实录", recordingUrls),
  },
  qa: {
    eyebrow: "SMOKE / Q&A",
    title: "A的Q&A",
    description: "向A的距离再迈进一步",
    items: createXItems("Q&A", qaUrls),
  },
};
