import { defineConfig } from 'wxt';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  runner: {
    disabled: true,
  },
  manifest: {
    name: 'Call-an-Expert',
    description: 'Connect with AI experts for 1-hour screen share sessions',
    permissions: ['storage', 'activeTab', 'tabs'],
    host_permissions: ['http://localhost:54321/*', 'https://*/*'],
  },
  vite() {
    return {
      plugins: [vue()],
      resolve: {
        alias: {
          '~': '/Users/bobacu/test/callAnExpert/extensions/src',
          '@': '/Users/bobacu/test/callAnExpert/extensions/src',
        },
      },
    };
  },
});
