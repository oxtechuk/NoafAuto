import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    base: '',
    plugins: [
        laravel({
            input: [
                'resources/react/main.tsx',
                'resources/react/admin/main.tsx',
            ],
            publicDirectory: 'public',
            hotFile: 'public/hot',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        port: 5159,
        host: '0.0.0.0',
        cors: true,
        hmr: {
            host: 'localhost',
        },
        watch: {
            ignored: [
                '**/storage/**',
                '**/vendor/**',
                '**/.git/**',
                '**/resources/reference/**',
                '**/resources/refrence/**',
            ],
        },
    },
    build: {
        outDir: 'public/build',
        emptyOutDir: true,
        target: 'es2020',
        rolldownOptions: {
            output: {
                // Vite 8 bundles with Rolldown: use codeSplitting groups (object-form manualChunks is unsupported).
                // Patterns match exact package folders so e.g. react-icons / react-query don't land in vendor-react.
                codeSplitting: {
                    groups: [
                        { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/, priority: 20 },
                        { name: 'vendor-query', test: /node_modules[\\/](@tanstack[\\/]|axios[\\/])/, priority: 10 },
                    ],
                },
            },
        },
    },
});
