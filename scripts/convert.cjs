const sharp = require('sharp');
const fs = require('fs');

async function convert() {
  const publicJpg = './public/vasthara-icon.jpeg';
  const publicPng = './public/vasthara-icon.png';
  const assetsJpg = './src/assets/vasthara-icon.jpeg';
  const assetsPng = './src/assets/vasthara-icon.png';

  if (fs.existsSync(publicJpg)) {
    await sharp(publicJpg).png().toFile(publicPng);
    console.log('Converted public image');
    fs.unlinkSync(publicJpg);
  }

  if (fs.existsSync(assetsJpg)) {
    await sharp(assetsJpg).png().toFile(assetsPng);
    console.log('Converted assets image');
    fs.unlinkSync(assetsJpg);
  }
}

convert().catch(console.error);
