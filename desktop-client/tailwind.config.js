/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: ['./src/**/*.{html,ts}'],
    theme: {
        extend: {
            colors: { dark: '#333' },
        },
    },
    plugins: [],
    blocklist: ['container'],
    corePlugins: {
        preflight: false,
    },
    important: true,
};
