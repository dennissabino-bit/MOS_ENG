/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Work Sans', 'sans-serif'],
        data: ['Inter', 'sans-serif'],
      },
      colors: {
        mos: {
          50:  '#fff0f0',
          100: '#ffd6d6',
          200: '#ffadad',
          300: '#ff8080',
          400: '#ff4d4d',
          500: '#cc0000',
          600: '#990000',
          700: '#610000',
          800: '#4a0000',
          900: '#330000',
        },
        surface: {
          0: '#ffffff',
          1: '#f7f7f7',
          2: '#f0f0f0',
          3: '#e8e8e8',
        },
        text: {
          primary:   '#1a1c1d',
          secondary: '#5a5f63',
          tertiary:  '#8c9196',
          disabled:  '#b8bcc0',
          inverse:   '#ffffff',
        },
        status: {
          success:      '#16a34a',
          successLight: '#dcfce7',
          warning:      '#d97706',
          warningLight: '#fef3c7',
          error:        '#dc2626',
          errorLight:   '#fee2e2',
          info:         '#2563eb',
          infoLight:    '#dbeafe',
        },
        chart: {
          orcado:    '#d1d5db',
          realizado: '#610000',
        },
        role: {
          master:      '#610000',
          masterLight: '#fff0f0',
          gestor:      '#d97706',
          gestorLight: '#fef3c7',
          engenheiro:      '#2563eb',
          engenheiroLight: '#dbeafe',
          comprador:      '#16a34a',
          compradorLight: '#dcfce7',
        },
      },
      borderRadius: {
        xs:  '4.8px',
        sm:  '7.2px',
        md:  '9.6px',
        lg:  '12.8px',
        xl:  '16px',
        '2xl': '20.8px',
      },
      boxShadow: {
        modal: '0 8px 32px rgba(26, 28, 29, 0.06)',
        card:  '0 2px 12px rgba(26, 28, 29, 0.04)',
        'card-hover': '0 4px 20px rgba(26, 28, 29, 0.08)',
      },
      keyframes: {
        'skeleton-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.4' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to:   { opacity: '0' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to:   { transform: 'translateX(0)' },
        },
      },
      animation: {
        'skeleton': 'skeleton-pulse 1800ms ease-in-out infinite',
        'fade-in':  'fade-in 150ms ease-out',
        'fade-out': 'fade-out 80ms ease-in',
        'slide-in': 'slide-in-left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionTimingFunction: {
        'submenu': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
