import sharp from 'sharp';
import fs from 'fs';

async function main() {
    try {
        console.log("Generating icon.png...");
        await sharp('src/assets/logo.jpg')
            .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile('assets/icon.png');
            
        console.log("Generating splash.png...");
        await sharp('src/assets/logo.jpg')
            .resize(2732, 2732, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile('assets/splash.png');
            
        console.log("Assets created successfully.");
    } catch (e) {
        console.error(e);
    }
}

main();
