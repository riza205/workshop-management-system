// Browser image compression: scales down + re-encodes to JPEG so the result is <= maxBytes.
export async function compressImage(
  file: File,
  opts: { maxBytes?: number; maxDimension?: number } = {},
): Promise<Blob> {
  const maxBytes = opts.maxBytes ?? 500 * 1024;
  const maxDim = opts.maxDimension ?? 1600;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to load image"));
    i.src = dataUrl;
  });

  let { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.9;
  let blob: Blob | null = await new Promise((res) =>
    canvas.toBlob((b) => res(b), "image/jpeg", quality),
  );
  while (blob && blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", quality),
    );
  }
  if (!blob) throw new Error("Failed to compress image");
  return blob;
}
