/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0b1220',
        panel:   '#111a2c',
        card:    '#0f1930',
        border:  '#1e2a42',
        accent:  '#22c55e',
        accent2: '#16a34a',
        muted:   '#8b96ab',
        text:    '#e6ebf5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        xl:  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        card:  '0 4px 24px 0 rgba(0,0,0,0.4)',
        glow:  '0 0 20px rgba(34,197,94,0.25)',
        'glow-sm': '0 0 8px rgba(34,197,94,0.15)',
      },
    },
  },
  plugins: [],
};
