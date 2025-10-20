// src/features/whiteboard/utils/debounce.js

/**
 * Debounce: menjalankan fungsi hanya setelah jeda waktu terakhir.
 * Cocok untuk autosave whiteboard agar tidak membanjiri server.
 */
export function debounce(fn, delay = 800) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
