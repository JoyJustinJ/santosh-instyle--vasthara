import { createWorker } from 'tesseract.js';
import fs from 'fs';
import sharp from 'sharp';

async function analyzeLogo() {
    const worker = await createWorker('eng');
    const { data } = await worker.recognize('src/assets/logo.jpg');
    
    console.log("Blocks found:");
    if (data.blocks) {
        for (const block of data.blocks) {
            console.log(`Block text: ${block.text.replace(/\n/g, ' ')}`);
            console.log(`BBox: Y0=${block.bbox.y0}, Y1=${block.bbox.y1}`);
        }
    }
    
    await worker.terminate();
}

analyzeLogo().catch(console.error);
