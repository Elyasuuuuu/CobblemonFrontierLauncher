import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Plain Vite (not electron-vite) for the renderer: this bundle isn't a full
// window/page, it's a fragment that mounts into a <div> inside the existing
// landing.ejs, so there's no index.html entry to speak of -- see plan doc §1/§3.
export default defineConfig({
    // Relative, not absolute (Vite's default) asset URLs: this bundle is
    // loaded over file:// from inside app/app.ejs, not served from a web
    // root, so a "/assets/..." URL would resolve against the filesystem
    // root, not this app's own directory.
    base: './',
    plugins: [react()],
    build: {
        outDir: path.resolve(__dirname, 'app/assets/react'),
        emptyOutDir: true,
        rollupOptions: {
            input: path.resolve(__dirname, 'src/renderer/main.jsx'),
            output: {
                entryFileNames: 'ui.js',
                assetFileNames: (assetInfo) => {
                    const name = assetInfo.names?.[0] ?? assetInfo.name ?? ''
                    if (name.endsWith('.css')) return 'ui.css'
                    return 'assets/[name][extname]'
                }
            }
        }
    }
})
