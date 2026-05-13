/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F7F5F0',
          dark: '#EFECE5',
        },
        charcoal: {
          DEFAULT: '#2C2C2C',
          light: '#555555',
          muted: '#888888',
        },
        'indigo-accent': '#5B7FA6',
        'indigo-light': '#EBF0F7',
        'indigo-dark': '#3D5A7A',
        border: '#E8E4DC',
      },
      fontFamily: {
        sans: ['var(--font-noto)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
