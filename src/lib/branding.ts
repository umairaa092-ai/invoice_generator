export const DEFAULT_INVOICE_ACCENT = "#7560db";

export const BRAND_ACCENT_PRESETS = [
  { name: "Indigo", color: DEFAULT_INVOICE_ACCENT },
  { name: "Navy", color: "#24466b" },
  { name: "Teal", color: "#147d83" },
  { name: "Emerald", color: "#287b59" },
  { name: "Burgundy", color: "#8b3451" },
  { name: "Charcoal", color: "#414653" },
] as const;

export const MAX_BUSINESS_LOGO_DATA_URL_LENGTH = 1_048_576;

export function businessInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "YB";
  const first = Array.from(words[0])[0];
  const second =
    words.length > 1
      ? Array.from(words[words.length - 1])[0]
      : Array.from(words[0])[1];
  return `${first}${second || ""}`.toLocaleUpperCase();
}

export function invoiceAccent(color?: string): string {
  return color && /^#[\da-f]{6}$/i.test(color) ? color : DEFAULT_INVOICE_ACCENT;
}

type RGB = [number, number, number];

function rgb(color: string): RGB {
  return [1, 3, 5].map((offset) =>
    Number.parseInt(color.slice(offset, offset + 2), 16),
  ) as RGB;
}

function hex(color: RGB): string {
  return `#${color.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function mix(base: RGB, target: RGB, targetAmount: number): RGB {
  return base.map((channel, index) =>
    Math.round(channel * (1 - targetAmount) + target[index] * targetAmount),
  ) as RGB;
}

function luminance(color: RGB): number {
  const linear = color.map((channel) => {
    const scaled = channel / 255;
    return scaled <= 0.04045
      ? scaled / 12.92
      : ((scaled + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: RGB, background: RGB): number {
  const first = luminance(foreground),
    second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function readableInk(accent: RGB, backgrounds: RGB[], towards: RGB): RGB {
  const readable = (candidate: RGB) =>
    backgrounds.every((background) => contrast(candidate, background) >= 4.5);
  if (readable(accent)) return accent;
  // Preserve the chosen hue, adjusting only its brightness until normal text is readable.
  let low = 0,
    high = 1;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const amount = (low + high) / 2;
    if (readable(mix(accent, towards, amount))) high = amount;
    else low = amount;
  }
  return mix(accent, towards, high);
}

/** Brand tokens are scoped to customer identity; they never override Billora's UI palette. */
export function brandingColors(color?: string): {
  accent: string;
  lightInk: string;
  darkInk: string;
  lightSurface: string;
  darkSurface: string;
} {
  const accent = invoiceAccent(color);
  const chosen = rgb(accent),
    lightBase: RGB = [255, 255, 255],
    darkBase = rgb("#20212d");
  const lightSurface = mix(lightBase, chosen, 0.08);
  const darkSurface = mix(darkBase, chosen, 0.08);
  return {
    accent,
    lightInk: hex(readableInk(chosen, [lightBase, lightSurface], [0, 0, 0])),
    darkInk: hex(readableInk(chosen, [darkBase, darkSurface], [255, 255, 255])),
    lightSurface: hex(lightSurface),
    darkSurface: hex(darkSurface),
  };
}

/** Accept only small, embedded raster images. No remote URLs, SVG, HTML, or active content. */
export function isSafeBusinessLogo(value: string): boolean {
  if (value === "") return true;
  if (
    typeof value !== "string" ||
    value.length > MAX_BUSINESS_LOGO_DATA_URL_LENGTH
  )
    return false;
  const match =
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  try {
    const bytes = atob(match[2]);
    if (btoa(bytes) !== match[2]) return false;
    const byte = (index: number) => bytes.charCodeAt(index);
    if (match[1] === "png") {
      return (
        bytes.length >= 33 &&
        [137, 80, 78, 71, 13, 10, 26, 10].every(
          (expected, index) => byte(index) === expected,
        ) &&
        bytes.slice(12, 16) === "IHDR"
      );
    }
    if (match[1] === "jpeg") {
      return (
        bytes.length >= 4 &&
        byte(0) === 255 &&
        byte(1) === 216 &&
        byte(2) === 255 &&
        byte(bytes.length - 2) === 255 &&
        byte(bytes.length - 1) === 217
      );
    }
    return (
      bytes.length >= 20 &&
      bytes.slice(0, 4) === "RIFF" &&
      bytes.slice(8, 12) === "WEBP" &&
      ["VP8 ", "VP8L", "VP8X"].includes(bytes.slice(12, 16))
    );
  } catch {
    return false;
  }
}
