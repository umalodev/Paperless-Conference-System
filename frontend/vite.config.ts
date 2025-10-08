import { defineConfig } from "vite";
import path from "node:path";
import fs from "node:fs";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";

/**
 * 🔹 Plugin custom untuk copy file .bat ke dist-electron setelah build
 */
function batCopyPlugin() {
  return {
    name: "copy-electron-extras",
    closeBundle() {
      const extraFiles = [
        "screenCapture_1.3.2.bat",
        "app.manifest"  // ← tambahkan ini
      ];

      for (const file of extraFiles) {
        const src = path.join(__dirname, "electron", file);
        const dest = path.join(__dirname, "dist-electron", file);
        try {
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`📄 Copied ${file} → dist-electron/`);
          } else {
            console.warn(`⚠️ Missing ${file} in electron/`);
          }
        } catch (err) {
          console.error(`❌ Failed to copy ${file}:`, err);
        }
      }
    },
  };
}


export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              input: {
                main: path.join(__dirname, "electron/main.ts"),
                preload: path.join(__dirname, "electron/preload.ts"),
              },
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, "electron/preload.ts"),
        vite: {
          build: {
            rollupOptions: {
              output: {
                format: "cjs",
                entryFileNames: "preload.cjs",
              },
            },
          },
        },
      },
    }),
    batCopyPlugin(), // ✅ Tambahkan plugin di luar electron()
  ],
});
