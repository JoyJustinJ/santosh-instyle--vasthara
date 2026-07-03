const fs = require('fs');
const path = require('path');

const exts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.md', '.xml', '.gradle', '.plist', '.pbxproj'];
const excludeDirs = ['node_modules', '.git', 'dist', 'build', 'temp_repo'];
const rootExcludeDirs = ['node_modules', '.git', 'dist', 'android', 'ios', 'temp_repo'];

function walkAndReplace(dir, isRoot = false) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            const excludes = isRoot ? rootExcludeDirs : excludeDirs;
            if (!excludes.includes(file) && !fullPath.includes('build')) {
                walkAndReplace(fullPath, false);
            }
        } else {
            if (exts.includes(path.extname(fullPath)) || fullPath.endsWith('.env')) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let replaced = content
                    .replace(/VASTHARA/g, 'VASTRA')
                    .replace(/Vasthara/g, 'Vastra')
                    .replace(/vasthara/g, 'vastra');
                if (replaced !== content) {
                    fs.writeFileSync(fullPath, replaced, 'utf8');
                    console.log(`Updated ${fullPath}`);
                }
            }
        }
    }
}
walkAndReplace('.', true);
// Manually update android specific files we care about
const androidFiles = [
    'android/app/src/main/res/values/strings.xml',
    'android/app/src/main/AndroidManifest.xml'
];
androidFiles.forEach(f => {
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');
        let replaced = content
            .replace(/VASTHARA/g, 'VASTRA')
            .replace(/Vasthara/g, 'Vastra')
            .replace(/vasthara/g, 'vastra');
        if (replaced !== content) {
            fs.writeFileSync(f, replaced, 'utf8');
            console.log(`Updated ${f}`);
        }
    }
});
