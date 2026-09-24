import { translate as t } from "@/lib/i18n";

export interface RecapImageData {
  year: number;
  minutes: string;
  topArtist: { name: string; image: string | undefined } | null;
  topTracks: { name: string; artist: string; image: string | undefined }[];
  musicalAge: number | null;
  topGenre: string | null;
}

const WIDTH = 1080;
const HEIGHT = 1920;
const FONT = '"Inter Variable", "Segoe UI", system-ui, sans-serif';

// Spotify's CDN allows cross origin reads, so the canvas stays exportable
function loadImage(url: string | undefined): Promise<HTMLImageElement | null> {
  if (!url) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  radius: number,
) {
  ctx.save();
  roundedRect(ctx, x, y, size, size, radius);
  ctx.clip();
  if (image) {
    ctx.drawImage(image, x, y, size, size);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

export async function renderRecapImage(data: RecapImageData): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not supported");
  }

  const [artistImage, ...trackImages] = await Promise.all([
    loadImage(data.topArtist?.image),
    ...data.topTracks.map((track) => loadImage(track.image)),
  ]);

  // Background
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#1db954");
  gradient.addColorStop(0.5, "#0f9b8e");
  gradient.addColorStop(1, "#4338ca");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(880, 180, 0, 880, 180, 700);
  glow.addColorStop(0, "rgba(255,255,255,0.28)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";

  // Header
  ctx.font = `600 40px ${FONT}`;
  ctx.globalAlpha = 0.8;
  ctx.fillText(t("recap.inMusic", { year: data.year }).toUpperCase(), 90, 170);
  ctx.globalAlpha = 1;

  ctx.font = `800 220px ${FONT}`;
  ctx.fillText(data.minutes, 80, 400);
  ctx.font = `600 56px ${FONT}`;
  ctx.fillText(t("recap.imageMinutes"), 90, 480);

  // Top artist
  let y = 600;
  if (data.topArtist) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(90 + 130, y + 130, 130, 0, Math.PI * 2);
    ctx.clip();
    if (artistImage) {
      ctx.drawImage(artistImage, 90, y, 260, 260);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(90, y, 260, 260);
    }
    ctx.restore();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.75;
    ctx.font = `600 36px ${FONT}`;
    ctx.fillText(t("recap.imageTopArtist").toUpperCase(), 400, y + 100);
    ctx.globalAlpha = 1;
    ctx.font = `800 76px ${FONT}`;
    ctx.fillText(fitText(ctx, data.topArtist.name, 600), 400, y + 190);
    y += 330;
  }

  // Top tracks
  ctx.globalAlpha = 0.75;
  ctx.font = `600 36px ${FONT}`;
  ctx.fillText(t("recap.imageTopSongs").toUpperCase(), 90, y + 40);
  ctx.globalAlpha = 1;
  y += 80;
  data.topTracks.slice(0, 5).forEach((track, index) => {
    const rowY = y + index * 130;
    ctx.font = `800 52px ${FONT}`;
    ctx.globalAlpha = 0.6;
    ctx.fillText(String(index + 1), 90, rowY + 72);
    ctx.globalAlpha = 1;
    drawCover(ctx, trackImages[index] ?? null, 150, rowY, 104, 14);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 42px ${FONT}`;
    ctx.fillText(fitText(ctx, track.name, 720), 280, rowY + 48);
    ctx.globalAlpha = 0.75;
    ctx.font = `500 34px ${FONT}`;
    ctx.fillText(fitText(ctx, track.artist, 720), 280, rowY + 92);
    ctx.globalAlpha = 1;
  });
  y += 5 * 130 + 40;

  // Musical age and genre
  const boxes = [
    data.musicalAge !== null
      ? { label: t("recap.imageMusicalAge"), value: String(data.musicalAge) }
      : null,
    data.topGenre
      ? { label: t("recap.imageTopGenre"), value: data.topGenre }
      : null,
  ].filter((box): box is { label: string; value: string } => box !== null);
  const boxWidth = boxes.length > 1 ? 435 : 900;
  boxes.forEach((box, index) => {
    const x = 90 + index * (boxWidth + 30);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    roundedRect(ctx, x, y, boxWidth, 200, 36);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.75;
    ctx.font = `600 32px ${FONT}`;
    ctx.fillText(box.label.toUpperCase(), x + 40, y + 70);
    ctx.globalAlpha = 1;
    ctx.font = `800 64px ${FONT}`;
    const value = box.value.charAt(0).toUpperCase() + box.value.slice(1);
    ctx.fillText(fitText(ctx, value, boxWidth - 80), x + 40, y + 150);
  });

  // Footer
  ctx.globalAlpha = 0.8;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText("Your Spotify", 90, HEIGHT - 90);
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
      "image/png",
    );
  });
}

// Native share sheet on phones, a download elsewhere
export async function shareRecapImage(blob: Blob, year: number) {
  const file = new File([blob], `your-spotify-${year}.png`, {
    type: "image/png",
  });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: t("recap.shareTitle", { year }),
    });
    return "shared" as const;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded" as const;
}
