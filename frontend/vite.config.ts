import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite 설정 파일
 *
 * 당위성:
 * - Vite를 사용하여 빠른 개발 서버와 최적화된 프로덕션 빌드를 제공합니다.
 * - React Fast Refresh를 통해 개발 경험을 향상시킵니다.
 * - 환경 변수를 통해 API URL을 동적으로 설정할 수 있습니다.
 */
export default defineConfig({
  plugins: [react()],

  // 개발 서버 설정
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Docker 환경에서 파일 변경 감지를 위해 필요
    },
  },

  // 프로덕션 빌드 설정
  build: {
    outDir: 'dist',
    sourcemap: false, // 프로덕션에서는 소스맵 비활성화
    minify: 'terser', // 코드 압축
    rollupOptions: {
      output: {
        manualChunks: {
          // 벤더 코드 분리로 캐싱 최적화
          vendor: ['react', 'react-dom'],
          api: ['axios'],
        },
      },
    },
  },

  // 환경 변수 접두사
  envPrefix: 'VITE_',
});
