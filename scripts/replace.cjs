const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else {
            callback(path.join(dir, f));
        }
    });
}

function processFile(filePath) {
    if (!filePath.match(/\.(ts|tsx|json|html)$/)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    content = content.replace(/Vasthara/g, 'Vastra');
    content = content.replace(/VASTHARA/g, 'VASTRA');
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated: ' + filePath);
    }
}

walk('./src', processFile);
processFile('./index.html');
