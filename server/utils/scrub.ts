/**
 * Best-effort metadata removal, so a party photo doesn't carry the GPS
 * coordinates of someone's flat. The browser already re-encodes images
 * before upload; this is the server-side safety net.
 */
export function scrubMetadata(buf: Uint8Array, mime: string): Uint8Array {
  try {
    if (mime === "image/jpeg") return scrubJpeg(buf);
    if (mime === "image/png") return scrubPng(buf);
    if (mime.startsWith("video/") || mime.startsWith("audio/")) return scrubIso6709(buf);
  } catch {
    // Malformed file: keep it as-is rather than losing the upload.
  }
  return buf;
}

/** Replaces every APP1 (EXIF/XMP) and APP13 (IPTC) segment with an EXIF block that holds only the orientation. */
function scrubJpeg(buf: Uint8Array) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return buf;
  const parts: Uint8Array[] = [buf.subarray(0, 2)];
  let orientation = 1;
  let i = 2;

  while (i + 4 <= buf.length && buf[i] === 0xff) {
    const marker = buf[i + 1]!;
    if (marker === 0xda) break; // Start of scan: the rest is image data.
    const len = (buf[i + 2]! << 8) | buf[i + 3]!;
    const segment = buf.subarray(i, i + 2 + len);
    if (marker === 0xe1) {
      orientation = readOrientation(segment.subarray(4)) ?? orientation;
    } else if (marker !== 0xed) {
      parts.push(segment);
    }
    i += 2 + len;
  }
  if (orientation !== 1) {
    // EXIF belongs right after the JFIF (APP0) header when there is one.
    const at = parts[1]?.[1] === 0xe0 ? 2 : 1;
    parts.splice(at, 0, orientationApp1(orientation));
  }
  parts.push(buf.subarray(i));
  return concat(parts);
}

function readOrientation(app1: Uint8Array): number | null {
  if (String.fromCharCode(...app1.subarray(0, 4)) !== "Exif") return null;
  const tiff = new DataView(app1.buffer, app1.byteOffset + 6, app1.byteLength - 6);
  const le = tiff.getUint16(0) === 0x4949;
  const ifd = tiff.getUint32(4, le);
  const count = tiff.getUint16(ifd, le);
  for (let n = 0; n < count; n++) {
    const at = ifd + 2 + n * 12;
    if (tiff.getUint16(at, le) === 0x0112) return tiff.getUint16(at + 8, le);
  }
  return null;
}

function orientationApp1(orientation: number) {
  const out = new Uint8Array(36);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0xffe1);
  v.setUint16(2, 34); // Segment length, excluding the marker.
  out.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4); // "Exif\0\0"
  out.set([0x4d, 0x4d, 0x00, 0x2a], 10); // Big-endian TIFF header
  v.setUint32(14, 8); // IFD0 offset
  v.setUint16(18, 1); // One entry
  v.setUint16(20, 0x0112); // Orientation
  v.setUint16(22, 3); // SHORT
  v.setUint32(24, 1);
  v.setUint16(28, orientation);
  v.setUint32(32, 0); // No next IFD
  return out;
}

/** Drops EXIF and text chunks. Chunk CRCs stay valid because whole chunks go. */
function scrubPng(buf: Uint8Array) {
  const drop = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);
  const parts: Uint8Array[] = [buf.subarray(0, 8)];
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let i = 8;
  while (i + 12 <= buf.length) {
    const len = view.getUint32(i);
    const type = String.fromCharCode(...buf.subarray(i + 4, i + 8));
    const chunk = buf.subarray(i, i + 12 + len);
    if (!drop.has(type)) parts.push(chunk);
    i += 12 + len;
    if (type === "IEND") break;
  }
  return concat(parts);
}

/**
 * Phones write video/audio locations as ISO 6709 text ("+48.2082+016.3738/").
 * Zero the digits in place: same length, so the container stays valid.
 */
function scrubIso6709(buf: Uint8Array) {
  const text = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength).toString("latin1");
  const pattern = /[+-]\d{2}\.\d{3,}[+-]\d{3}\.\d{3,}(?:[+-]\d+\.\d+)?/g;
  for (const match of text.matchAll(pattern)) {
    for (let k = 0; k < match[0].length; k++) {
      const c = match[0][k]!;
      if (c >= "0" && c <= "9") buf[match.index! + k] = 0x30;
    }
  }
  return buf;
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
