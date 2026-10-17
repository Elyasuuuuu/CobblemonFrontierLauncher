import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Only `preload` is configured here on purpose -- `main` stays index.js,
// built/run the normal Node way (see plan doc §1). Run with
// --ignoreConfigWarning since electron-vite otherwise warns about the
// missing `main` block.
export default defineConfig({
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            // Its own dedicated folder, never app/assets/js/ itself --
            // Vite empties its outDir on build, and app/assets/js/ is where
            // the hand-written legacy backend lives.
            outDir: path.resolve(__dirname, 'app/preload-dist'),
            emptyOutDir: true,
            rollupOptions: {
                input: path.resolve(__dirname, 'src/preload/index.js'),
                output: {
                    entryFileNames: 'preload-bridge.js',
                    format: 'cjs'
                }
            }
        }
    }
})
