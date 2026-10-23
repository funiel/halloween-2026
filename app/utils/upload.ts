import type { SubmitResult } from "#shared/types/fungpt";

const MAX_EDGE = 2048;
const REENCODE = /^image\/(jpeg|png|webp|heic|heif|avif)$/;

/**
 * Re-encodes photos through a canvas: drops EXIF/GPS and shrinks them for
 * party-grade mobile data. GIFs keep their animation. Anything the browser
 * can't decode is uploaded as-is (the server strips JPEG/PNG metadata too).
 */
export async function prepareFile(file: File): Promise<File> {
  if (!REENCODE.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const png = file.type === "image/png";
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, png ? "image/png" : "image/jpeg", 0.85));
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${png ? "png" : "jpg"}`, { type: blob.type });
  } catch {
    return file;
  }
}

export class SubmitError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** XHR instead of fetch, because fetch can't report upload progress. */
export function submitEntry(text: string, file: File | null, onProgress: (fraction: number) => void) {
  return new Promise<SubmitResult>((resolve, reject) => {
    const form = new FormData();
    if (text) form.append("text", text);
    if (file) form.append("file", file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/submit");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr.response);
      const message = xhr.response?.statusMessage || xhr.response?.message || `Error ${xhr.status}`;
      reject(new SubmitError(message, xhr.status));
    };
    xhr.onerror = () => reject(new SubmitError("I lost my connection to the cloud. Is the Wi-Fi haunted?", 0));
    xhr.send(form);
  });
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function kindOfMime(mime: string) {
  if (mime.startsWith("image/")) return "image" as const;
  if (mime.startsWith("audio/")) return "audio" as const;
  if (mime.startsWith("video/")) return "video" as const;
  return "file" as const;
}
