/**
 * Compresses an image file to a square JPEG data URI suitable for use as an
 * avatar. Resizes to fit within `maxSize` (default 256px) and JPEG-encodes at
 * `quality` (default 0.8) so the resulting string is small enough to store
 * inline in a profiles row without a separate storage bucket.
 *
 * Throws if the file isn't an image or the browser can't decode it.
 */
export async function compressAvatar(
  file: File,
  maxSize = 256,
  quality = 0.8,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selected file is not an image");
  }
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  // Square crop centred on the image so the avatar circle never stretches.
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const target = Math.min(side, maxSize);

  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);

  return canvas.toDataURL("image/jpeg", quality);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = src;
  });
}
