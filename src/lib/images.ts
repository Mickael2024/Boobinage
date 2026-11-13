// Compression d'images côté navigateur (canvas → JPEG).

export const PHOTO_MAX_DIMENSION = 1600;
export const PHOTO_QUALITY = 0.8;

async function loadImage(source: Blob) {
  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function draw(img: HTMLImageElement, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d")!;
  // fond blanc : les PNG transparents ne deviennent pas noirs en JPEG
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Redimensionne (côté le plus long ≤ maxDimension) et recompresse en JPEG. */
export async function compressImage(source: Blob, maxDimension = PHOTO_MAX_DIMENSION, quality = PHOTO_QUALITY): Promise<Blob> {
  const canvas = draw(await loadImage(source), maxDimension);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Compression impossible"))), "image/jpeg", quality),
  );
}

/** Même chose en data-URL (repli lorsque Firebase Storage est indisponible). */
export async function compressImageToDataUrl(source: Blob, maxDimension = 1024, quality = 0.6) {
  return draw(await loadImage(source), maxDimension).toDataURL("image/jpeg", quality);
}

export const isDataUrl = (src: string) => src.startsWith("data:");
