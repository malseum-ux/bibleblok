import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 설정 화면 "앱 정보"에 보이는 버전 — package.json 의 version (AI 는 Supabase 서버를 쓰므로 개발용 중계 설정은 없다)
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
})
