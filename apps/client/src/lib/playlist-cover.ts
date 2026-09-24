// Square JPEG covers for the playlists, Spotify takes 256 KB at most
const SIZE = 640;
const MAX_BASE64 = 340_000;
const FONT = '"Inter Variable", "Segoe UI", system-ui, sans-serif';

export const COVER_THEMES = {
  green: ["#1ed760", "#0f766e"],
  violet: ["#8b5cf6", "#1e1b4b"],
  sunset: ["#f97316", "#be123c"],
  ocean: ["#06b6d4", "#1e3a8a"],
  night: ["#312e81", "#020617"],
  gold: ["#facc15", "#b45309"],
  rose: ["#f472b6", "#7c3aed"],
} as const;

export type CoverTheme = keyof typeof COVER_THEMES;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

// A mosaic of the first covers under a gradient, with the title on top
export async function renderPlaylistCover(options: {
  title: string;
  subtitle?: string;
  images: string[];
  theme?: CoverTheme;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const [from, to] = COVER_THEMES[options.theme ?? "green"];

  const images = (
    await Promise.all(
      [...new Set(options.images)].slice(0, 4).map((url) => loadImage(url)),
    )
  ).filter((image): image is HTMLImageElement => image !== null);

  ctx.fillStyle = to;
  ctx.fillRect(0, 0, SIZE, SIZE);
  if (images.length >= 4) {
    const half = SIZE / 2;
    images.forEach((image, index) => {
      ctx.drawImage(
        image,
        (index % 2) * half,
        Math.floor(index / 2) * half,
        half,
        half,
      );
    });
  } else if (images[0]) {
    ctx.drawImage(images[0], 0, 0, SIZE, SIZE);
  }

  const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  gradient.addColorStop(0, `${from}c7`);
  gradient.addColorStop(1, `${to}e8`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText("Your Spotify", 44, 72);

  ctx.fillStyle = "#ffffff";
  let fontSize = 76;
  let lines: string[];
  do {
    ctx.font = `800 ${fontSize}px ${FONT}`;
    lines = wrap(ctx, options.title, SIZE - 88);
    fontSize -= 4;
  } while (lines.length > 4 && fontSize > 36);
  const lineHeight = fontSize * 1.12;
  const subtitleSpace = options.subtitle ? 56 : 0;
  let y = SIZE - 52 - subtitleSpace - (lines.length - 1) * lineHeight;
  for (const line of lines) {
    ctx.fillText(line, 44, y);
    y += lineHeight;
  }
  if (options.subtitle) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(options.subtitle, 44, SIZE - 52);
  }

  for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5]) {
    const base64 = canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "";
    if (base64.length <= MAX_BASE64) {
      return base64;
    }
  }
  throw new Error("Cover too large");
}
