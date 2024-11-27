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
    include: ['src/**/*.test.ts'],
    // console.logを表示するための設定を追加
    silent: false,
    logHeapUsage: true,
  },
});
