"use client";

const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const MAX_DIMENSION = 2200;
const QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66];

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gagal membaca file gambar."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Gagal memproses gambar."));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

function buildOutputName(file: File, mimeType: string) {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  const extension =
    mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
  return `${baseName}.${extension}`;
}

export async function prepareImageForUpload(file: File) {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  if (file.type === "image/gif") {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("GIF terlalu besar. Gunakan file di bawah 3.5MB.");
    }

    return file;
  }

  const image = await loadImage(file);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const shouldResize = longestSide > MAX_DIMENSION;
  const shouldCompress = file.size > MAX_UPLOAD_BYTES;

  if (!shouldResize && !shouldCompress) {
    return file;
  }

  const scale = shouldResize ? MAX_DIMENSION / longestSide : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas browser tidak tersedia untuk kompresi gambar.");
  }

  context.drawImage(image, 0, 0, width, height);

  const outputType =
    file.type === "image/png" || file.type === "image/webp"
      ? "image/webp"
      : "image/jpeg";

  let bestBlob: Blob | null = null;

  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, outputType, quality);
    bestBlob = blob;

    if (blob.size <= MAX_UPLOAD_BYTES) {
      return new File([blob], buildOutputName(file, outputType), {
        type: outputType,
      });
    }
  }

  if (!bestBlob) {
    throw new Error("Gagal menyiapkan file gambar.");
  }

  if (bestBlob.size > MAX_UPLOAD_BYTES) {
    throw new Error("Gambar terlalu besar. Coba gunakan resolusi yang lebih kecil.");
  }

  return new File([bestBlob], buildOutputName(file, outputType), {
    type: outputType,
  });
}

