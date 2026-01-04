import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://restic-ui-backend:3500',
                changeOrigin: true,
            },
            '/ws': {
                target: 'ws://restic-ui-backend:3500',
                ws: true,
            },
        },
    },
    build: {
        outDir: 'dist',
    },
})
