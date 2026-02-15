import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3001",
    extraHTTPHeaders: {
      "Content-Type": "application/json",
    },
  },
  webServer: {
    command: "npx ts-node src/app.ts",
    port: 3001,
    timeout: 15000,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: "3001",
    },
  },
});
