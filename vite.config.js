import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5000,
    strictPort: true,
    allowedHosts: ['.ts.net', 'localhost'],
    hmr: {
      protocol: 'wss',
      host: '20180089nb.flicker-broadnose.ts.net',
      clientPort: 443,
    },
  },
});
