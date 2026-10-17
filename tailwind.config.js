/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/renderer/**/*.{js,jsx}'
    ],
    theme: {
        extend: {
            colors: {
                cf: {
                    bg: '#0c0c11',
                    panel: '#16161d',
                    panelLight: '#1e1e28',
                    border: 'rgba(255,255,255,0.08)',
                    text: '#f2f2f5',
                    textDim: '#9a9aa5',
                    accent: '#9b5cf6',
                    accentLight: '#b98cff',
                    accentDark: '#6d3fd6',
                    orange: '#ff8a3d',
                    orangeDark: '#b85a1f',
                    green: '#4fd67a',
                    red: '#e5484d'
                }
            },
            fontFamily: {
                avenir: ['Avenir Book', 'sans-serif'],
                avenirMedium: ['Avenir Medium', 'sans-serif'],
                avenirHeavy: ['Avenir Heavy', 'sans-serif']
            }
        }
    },
    plugins: []
}
