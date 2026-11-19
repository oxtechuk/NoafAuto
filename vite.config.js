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
        hmr: {
            host: 'localhost',
        },
        watch: {
            ignored: [
                '**/storage/framework/views/**',
                '**/resources/reference/**',
                '**/resources/refrence/**',
            ],
        },
    },
    build: {
        outDir: 'public/build',
        emptyOutDir: true,
        target: 'es2020',
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                            return 'vendor-react';
                        }
                        if (id.includes('@tanstack/react-query') || id.includes('axios')) {
                            return 'vendor-query';
                        }
                        if (id.includes('lucide-react')) {
                            return 'vendor-icons';
                        }
                    }
                },
            },
        },
    },
});
