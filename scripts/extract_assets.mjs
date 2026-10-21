import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ASSET_SHEET = 'C:/Users/jkjus/Downloads/Silk Saree Store Background Asset Sheet.png';
const HOME_SCREEN = 'C:/Users/jkjus/Downloads/Vastra Silk Membership App Home Screen.png';
const OUT_DIR = 'public/assets';

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function extract() {
    console.log("Analyzing Asset Sheet...");
    const sheetMeta = await sharp(ASSET_SHEET).metadata();
    console.log("Sheet metadata:", sheetMeta.width, "x", sheetMeta.height);

    // Panel 1: Top Hero (0 to 512 Y)
    // The label is at the bottom left: Y ~ 450-510, X ~ 20-350.
    // In the hero banner, we can extract the full width 1536 x 512.
    await sharp(ASSET_SHEET)
        .extract({ left: 0, top: 0, width: 1536, height: 512 })
        .jpeg({ quality: 95 })
        .toFile(path.join(OUT_DIR, 'hero_bg.jpg'));
    console.log("Saved hero_bg.jpg");

    // Panel 2: Scheme Card Saree Stack (Bottom Left)
    // Left: 0, Top: 512, Width: 512, Height: 512
    await sharp(ASSET_SHEET)
        .extract({ left: 0, top: 512, width: 512, height: 512 })
        .jpeg({ quality: 95 })
        .toFile(path.join(OUT_DIR, 'scheme_sarees.jpg'));
    console.log("Saved scheme_sarees.jpg");

    // Panel 3: Section Background (Ivory Mandala)
    // Left: 512, Top: 512, Width: 512, Height: 512
    await sharp(ASSET_SHEET)
        .extract({ left: 512, top: 512, width: 512, height: 512 })
        .jpeg({ quality: 95 })
        .toFile(path.join(OUT_DIR, 'section_bg.jpg'));
    console.log("Saved section_bg.jpg");

    // Panel 4: Accent Maroon Fabric
    // Left: 1024, Top: 512, Width: 512, Height: 512
    await sharp(ASSET_SHEET)
        .extract({ left: 1024, top: 512, width: 512, height: 512 })
        .jpeg({ quality: 95 })
        .toFile(path.join(OUT_DIR, 'accent_bg.jpg'));
    console.log("Saved accent_bg.jpg");

    // Now let's inspect the Home Screen header logo from HOME_SCREEN (936 x 1681)
    // Header is at Y ~ 0 to 120.
    // Let's crop the header brand area (X: 30 to 450, Y: 15 to 95)
    await sharp(HOME_SCREEN)
        .extract({ left: 0, top: 0, width: 936, height: 110 })
        .png()
        .toFile(path.join(OUT_DIR, 'raw_header.png'));
    console.log("Saved raw_header.png");

    // Also extract the Brand Logo area specifically
    await sharp(HOME_SCREEN)
        .extract({ left: 120, top: 8, width: 440, height: 85 })
        .png()
        .toFile(path.join(OUT_DIR, 'brand_logo_full.png'));
    console.log("Saved brand_logo_full.png");

    // Also extract the featured scheme card from HOME_SCREEN to compare
    await sharp(HOME_SCREEN)
        .extract({ left: 40, top: 380, width: 856, height: 420 })
        .png()
        .toFile(path.join(OUT_DIR, 'ref_featured_card.png'));
    console.log("Saved ref_featured_card.png");

    // Also extract the saree thumbnail in the card from HOME_SCREEN
    await sharp(HOME_SCREEN)
        .extract({ left: 560, top: 390, width: 330, height: 230 })
        .png()
        .toFile(path.join(OUT_DIR, 'card_saree_transparent.png'));
    console.log("Saved card_saree_transparent.png");

    console.log("All assets extracted successfully!");
}

extract().catch(console.error);
