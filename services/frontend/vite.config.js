import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const GATEWAY = process.env.GATEWAY_URL || "http://localhost:8080";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: GATEWAY,
        changeOrigin: true
      },
      "/auth": {
        target: GATEWAY,
        changeOrigin: true
      },
      "/ws": {
        target: GATEWAY,
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    target: "es2022"
  }
});
