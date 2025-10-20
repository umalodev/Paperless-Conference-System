// src/features/whiteboard/utils/canvasUtils.js

/**
 * Export canvas ke file PNG dan auto-download
 */
export function exportCanvasAsPNG(canvasRef, fileName = "whiteboard") {
  const canvas = canvasRef?.current;
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

/**
 * Clear canvas (menghapus semua gambar)
 */
export function clearCanvas(canvasRef, color = "#fff") {
  const canvas = canvasRef?.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Resize canvas sesuai ukuran elemen pembungkus
 */
export function resizeCanvasToParent(canvasRef, parentRef) {
  const canvas = canvasRef?.current;
  const parent = parentRef?.current;
  if (!canvas || !parent) return;

  const rect = parent.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, rect.width, rect.height);
}
