module.exports = {
  content: [
    "./src/**/*.{html,njk,md}",
    "./.eleventy.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Merriweather', 'serif'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
