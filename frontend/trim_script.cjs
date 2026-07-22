const fs = require('fs');
const sharp = require('sharp');

let svg = fs.readFileSync('src/assets/logo/stacksave-logo.svg', 'utf8');
svg = svg.replace(/<path d="M0 0 C654.*?fill="#FDFDFD".*?\/>/g, '');
fs.writeFileSync('temp.svg', svg);

sharp('temp.svg')
  .trim()
  .toFile('src/assets/logo/stacksave-logo-trimmed.png')
  .then(info => {
    console.log('Trimmed info:', info);
  })
  .catch(err => {
    console.error('Error trimming:', err);
  });
