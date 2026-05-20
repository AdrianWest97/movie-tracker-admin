/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08070a',
          900: '#0e0d11',
          850: '#13121a',
          800: '#1a1822',
          700: '#262332',
          600: '#3a3650',
          500: '#5a5470'
        },
        bone: {
          50:  '#f8f4ec',
          100: '#ece6d6',
          200: '#d4cbb0',
          300: '#9b9279',
          400: '#6b6450'
        },
        amber: {
          accent: '#e8b04a',
          warm: '#d99a2b',
          deep: '#7a5519'
        },
        ruby: {
          400: '#ef6d75',
          500: '#dc4d56',
          700: '#7a1d27'
        },
        moss: {
          400: '#7ec488',
          500: '#5fa46d'
        }
      },
      fontFamily: {
        display: ['"Inter Tight"', '"Inter"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      letterSpacing: {
        eyebrow: '0.22em',
        display: '-0.025em',
        'display-tight': '-0.035em'
      },
      boxShadow: {
        poster: '0 30px 60px -25px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)',
        lift:   '0 10px 30px -10px rgba(0,0,0,0.6)',
        rim:    'inset 0 1px 0 rgba(255,255,255,0.05)'
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        kenburns: {
          '0%':   { transform: 'scale(1.05) translate3d(0,0,0)' },
          '100%': { transform: 'scale(1.12) translate3d(-1%,-1%,0)' }
        }
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease-out both',
        'kenburns': 'kenburns 18s ease-in-out infinite alternate'
      }
    }
  },
  plugins: []
};
