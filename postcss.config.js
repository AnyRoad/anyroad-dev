const path = require('path');

module.exports = {
  plugins: {
    'tailwindcss/nesting': {},
    tailwindcss: {
      config: path.join(__dirname, 'tailwind.config.js') // update this if your path differs!
    },
    autoprefixer: {}
  }
};
