// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    ...devices['iPhone 13'],
  },
});
