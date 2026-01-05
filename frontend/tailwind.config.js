/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dashboard-bg': '#0f172a',
        'panel-bg': '#1e293b',
        'panel-border': '#334155',
        'accent': '#3b82f6',
        'accent-hover': '#2563eb',
        'success': '#22c55e',
        'warning': '#f59e0b',
        'danger': '#ef4444',
      },
    },
  },
  plugins: [],
}
