import { MAX_BUSINESS_LOGO_DATA_URL_LENGTH } from "./branding";

export const MAX_LOGO_SOURCE_BYTES = 2 * 1024 * 1024;

const MAX_DECODED_PIXELS = 40_000_000;
const MAX_SOURCE_EDGE = 16_384;
const IMAGE_LOAD_TIMEOUT_MS = 15_000;
const MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

class LogoProcessingError extends Error {}

type RasterMetadata = {
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
};

function corruptImage(): Error {
  return new LogoProcessingError(
    "This image could not be read. Choose a valid PNG, JPG, or WEBP logo.",
  );
}

function matches(bytes: Uint8Array, offset: number, expected: number[]) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, offset: number, expected: string) {
  return [...expected].every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  );
}

function uint24(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

/** Inspect dimensions before asking the browser to allocate a decoded bitmap. */
function rasterMetadata(buffer: ArrayBuffer): RasterMetadata {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  if (matches(bytes, 0, [137, 80, 78, 71, 13, 10, 26, 10])) {
    if (
      bytes.length < 33 ||
      view.getUint32(8) !== 13 ||
      !ascii(bytes, 12, "IHDR")
    )
      throw corruptImage();
    return {
      mimeType: "image/png",
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  }

  if (matches(bytes, 0, [255, 216, 255])) {
    if (bytes.length < 12 || !matches(bytes, bytes.length - 2, [255, 217]))
      throw corruptImage();
    let offset = 2;
    const frameMarkers = new Set([
      0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
      0xcf,
    ]);
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) throw corruptImage();
      while (offset < bytes.length && bytes[offset] === 0xff) offset++;
      if (offset >= bytes.length) throw corruptImage();
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (marker === 0x00 || offset + 2 > bytes.length) throw corruptImage();
      const segmentLength = view.getUint16(offset);
      if (segmentLength < 2 || offset + segmentLength > bytes.length)
        throw corruptImage();
      if (frameMarkers.has(marker)) {
        if (segmentLength < 8) throw corruptImage();
        return {
          mimeType: "image/jpeg",
          width: view.getUint16(offset + 5),
          height: view.getUint16(offset + 3),
        };
      }
      offset += segmentLength;
    }
    throw corruptImage();
  }

  if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) {
    if (bytes.length < 20) throw corruptImage();
    const containerEnd = view.getUint32(4, true) + 8;
    if (containerEnd < 20 || containerEnd > bytes.length) throw corruptImage();
    let offset = 12;
    while (offset + 8 <= containerEnd) {
      const chunkLength = view.getUint32(offset + 4, true);
      const payload = offset + 8;
      if (payload + chunkLength > containerEnd) throw corruptImage();
      if (ascii(bytes, offset, "VP8X")) {
        if (chunkLength !== 10) throw corruptImage();
        return {
          mimeType: "image/webp",
          width: uint24(bytes, payload + 4) + 1,
          height: uint24(bytes, payload + 7) + 1,
        };
      }
      if (ascii(bytes, offset, "VP8 ")) {
        if (
          chunkLength < 10 ||
          !matches(bytes, payload + 3, [0x9d, 0x01, 0x2a])
        )
          throw corruptImage();
        return {
          mimeType: "image/webp",
          width: view.getUint16(payload + 6, true) & 0x3fff,
          height: view.getUint16(payload + 8, true) & 0x3fff,
        };
      }
      if (ascii(bytes, offset, "VP8L")) {
        if (chunkLength < 5 || bytes[payload] !== 0x2f) throw corruptImage();
        const bits = view.getUint32(payload + 1, true);
        if (bits >>> 29 !== 0) throw corruptImage();
        return {
          mimeType: "image/webp",
          width: (bits & 0x3fff) + 1,
          height: ((bits >>> 14) & 0x3fff) + 1,
        };
      }
      offset = payload + chunkLength + (chunkLength % 2);
    }
    throw corruptImage();
  }
  throw corruptImage();
}

function validateDimensions(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  )
    throw corruptImage();
  if (
    width > MAX_SOURCE_EDGE ||
    height > MAX_SOURCE_EDGE ||
    width * height > MAX_DECODED_PIXELS
  )
    throw new LogoProcessingError(
      "This image has very large pixel dimensions. Choose a smaller logo image to process it safely.",
    );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    const finish = () => {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
    };
    const timeout = window.setTimeout(() => {
      finish();
      image.src = "";
      reject(
        new LogoProcessingError(
          "This image took too long to load. Try a smaller logo image.",
        ),
      );
    }, IMAGE_LOAD_TIMEOUT_MS);
    image.onload = () => {
      finish();
      try {
        validateDimensions(image.naturalWidth, image.naturalHeight);
        resolve(image);
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => {
      finish();
      reject(corruptImage());
    };
    image.src = url;
  });
}

/** Save a small raster copy, never the original file or a remote image URL. */
export async function processBusinessLogo(file: File): Promise<string> {
  if (!MIME_TYPES.has(file.type.toLowerCase()))
    throw new LogoProcessingError(
      "Choose a PNG, JPG, or WEBP image. Other file formats are not supported.",
    );
  if (file.size > MAX_LOGO_SOURCE_BYTES)
    throw new LogoProcessingError(
      "This image is larger than 2 MB. Choose a smaller logo file.",
    );
  if (file.size === 0) throw corruptImage();
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new LogoProcessingError(
      "This file could not be opened. Choose the logo image again.",
    );
  }
  const metadata = rasterMetadata(buffer);
  if (metadata.mimeType !== file.type.toLowerCase())
    throw new LogoProcessingError(
      "The image contents do not match its file type. Choose a valid PNG, JPG, or WEBP image.",
    );
  validateDimensions(metadata.width, metadata.height);

  let url: string;
  try {
    url = URL.createObjectURL(new Blob([buffer], { type: metadata.mimeType }));
  } catch {
    throw new LogoProcessingError(
      "Your browser could not process this logo. Please try another image.",
    );
  }
  try {
    const image = await loadImage(url);
    const scale = Math.min(
      1,
      600 / image.naturalWidth,
      300 / image.naturalHeight,
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new LogoProcessingError(
        "Your browser could not process this logo. Please try another image.",
      );
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    // The untouched transparent canvas preserves PNG and WEBP alpha channels.
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const processed = canvas.toDataURL("image/png");
    canvas.width = 0;
    canvas.height = 0;
    if (
      !processed.startsWith("data:image/png;base64,") ||
      processed.length > MAX_BUSINESS_LOGO_DATA_URL_LENGTH
    )
      throw new LogoProcessingError(
        "This logo could not be saved at a suitable size. Please try a simpler image.",
      );
    return processed;
  } catch (error) {
    if (error instanceof LogoProcessingError) throw error;
    throw new LogoProcessingError(
      "Your browser could not process this logo. Please try another image.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
