import { createWorker } from 'tesseract.js';
import fs from 'fs';
import sharp from 'sharp';

async function analyzeLogo() {
    console.log("Starting OCR analysis on original logo...");
    const worker = await createWorker('eng');
    const { data } = await worker.recognize('src/assets/logo.jpg');
    
    console.log("Raw text:", data.text);
    
    if (data.words && data.words.length > 0) {
        let maxSilksY = 0;
        let minVastharaY = 9999;
        for (const word of data.words) {
            const text = word.text.toUpperCase();
            console.log(`Found text: ${text} at Y: ${word.bbox.y0} to ${word.bbox.y1}`);
            if (text.includes('SILK') || text.includes('ILKS')) {
                if (word.bbox.y1 > maxSilksY) maxSilksY = word.bbox.y1;
            }
            if (text.includes('VASTH') || text.includes('STHARA')) {
                if (word.bbox.y0 < minVastharaY) minVastharaY = word.bbox.y0;
            }
        }
        
        console.log(`Silks bottom edge: ${maxSilksY}`);
        console.log(`VASTHARA top edge: ${minVastharaY}`);
        
        if (maxSilksY > 0 && minVastharaY < 9999 && minVastharaY > maxSilksY) {
            const cropPoint = Math.floor((maxSilksY + minVastharaY) / 2);
            console.log(`Safe crop point: ${cropPoint}`);
            
            const metadata = await sharp('src/assets/logo.jpg').metadata();
            await sharp('src/assets/logo.jpg')
                .extract({ left: 0, top: 0, width: metadata.width, height: cropPoint })
                .toFile('src/assets/logo_cropped.jpg');
            console.log('Successfully created logo_cropped.jpg');
        } else {
            console.log('Could not find safe separation between text blocks.');
        }
    } else {
        console.log("No words array found. Keys of data:", Object.keys(data));
    }
    
    await worker.terminate();
}

analyzeLogo().catch(console.error);
