/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,vue,html}",
    "./public/index.html",
    "../shared/src/**/*.{js,ts,jsx,tsx,vue}",
  ],
  // Tailwind v4 uses CSS imports instead of JS config for most customization
  // The actual theme configuration is handled in src/styles/theme/
};
