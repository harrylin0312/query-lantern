const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests",
  timeout: 25000,
  use: {
    baseURL: process.env.TEST_URL || "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: process.env.TEST_URL
    ? undefined
    : {
        command: "python3 -m http.server 4173 --directory dist",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: true,
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit-mobile", use: { ...devices["iPhone 13"] } },
  ],
});
