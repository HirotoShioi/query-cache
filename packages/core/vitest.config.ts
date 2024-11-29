import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // ブラウザテスト用の設定
    browser: {
      enabled: process.env.TEST_ENV === 'browser',
      name: 'chromium',
      provider: 'playwright',
      headless: true,
    },
    include: ['__test__/*.test.ts'],
    silent: false,
    logHeapUsage: true,
  },
});
