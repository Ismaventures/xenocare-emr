/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx}', './src/renderer/index.ejs'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f2fcf5',
          100: '#e1f8e8',
          200: '#c3eed2',
          300: '#94deb2',
          400: '#5bc68b',
          500: '#34a868',
          600: '#258850',
          700: '#006400', // NDC Green — single source of truth
          800: '#195838',
          900: '#154830',
          950: '#0b281b',
        },
        // Semantic status tokens — use instead of raw emerald/red/amber/blue
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Surface tokens for consistent background usage
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f9fafb', // gray-50
          subtle: '#f3f4f6', // gray-100
          raised: '#ffffff',
        },
      },
      borderRadius: {
        // Enterprise radius scale
        card: '0.75rem', // 12px — all cards
        modal: '1rem', // 16px — modals, slide-overs
        button: '0.5rem', // 8px  — buttons, inputs
      },
      keyframes: {
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in-scale': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        progress: 'progress 1s linear infinite',
        'fade-in-scale': 'fade-in-scale 0.2s ease-out',
        'slide-up': 'slide-up 0.15s ease-out',
      },
    },
  },
  plugins: [],
};
