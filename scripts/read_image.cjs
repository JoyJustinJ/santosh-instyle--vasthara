const fs = require('fs');
const Tesseract = require('tesseract.js');

const dir = 'C:/Users/Administrator/.gemini/antigravity/brain/2b37426e-1980-4673-a466-ed123e87f63d/.tempmediaStorage';
const files = fs.readdirSync(dir)
  .filter(f => f.endsWith('.png'))
  .map(f => ({ name: f, time: fs.statSync(dir + '/' + f).mtime.getTime() }))
  .sort((a,b) => b.time - a.time)
  .slice(0, 10); // Look at last 10 images

async function runAll() {
  for (const file of files) {
    console.log(`\n\n--- Analyzing ${file.name} ---`);
    try {
      const { data: { text } } = await Tesseract.recognize(dir + '/' + file.name, 'eng');
      console.log(text.substring(0, 500)); // Print first 500 chars to see what it is
    } catch(err) {
      console.error(err);
    }
  }
}

runAll();
