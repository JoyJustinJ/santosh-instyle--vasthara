const https = require('https');
const fs = require('fs');
const path = require('path');

// Get token from git credential store
const { execSync } = require('child_process');

let token = '';
try {
  // Try to get the stored GitHub token
  const result = execSync('git credential fill', { 
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf-8' 
  });
  const match = result.match(/password=(.+)/);
  if (match) token = match[1].trim();
} catch(e) {}

if (!token) {
  console.log('No token found automatically.');
  console.log('Please set GITHUB_TOKEN env variable and re-run this script.');
  console.log('Get a token from: https://github.com/settings/tokens (with "repo" scope)');
  process.exit(1);
}

const OWNER = 'JoyJustinJ';
const REPO = 'santosh-instyle--vasthara';
const TAG = 'v1.0.0';
const APK_PATH = path.join(__dirname, '..', 'public', 'MySanthoshapp.apk');

async function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'MySanthosh-Release-Script',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));

    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.status || res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function uploadAsset(uploadUrl, filePath) {
  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath);
  const url = uploadUrl.replace('{?name,label}', `?name=${encodeURIComponent(fileName)}`);
  const urlObj = new URL(url);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'MySanthosh-Release-Script',
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': fileContent.length,
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.write(fileContent);
    req.end();
  });
}

async function main() {
  console.log(`Creating GitHub Release ${TAG}...`);

  // Delete existing release with same tag if it exists
  const listRes = await apiRequest('GET', `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`);
  if (listRes.status === 200) {
    console.log(`Deleting existing release ${listRes.data.id}...`);
    await apiRequest('DELETE', `/repos/${OWNER}/${REPO}/releases/${listRes.data.id}`);
    await apiRequest('DELETE', `/repos/${OWNER}/${REPO}/git/refs/tags/${TAG}`);
  }

  // Create Release
  const releaseRes = await apiRequest('POST', `/repos/${OWNER}/${REPO}/releases`, {
    tag_name: TAG,
    name: 'MySanthosh App v1.0.0',
    body: 'Latest release of MySanthosh App with all bug fixes and improvements.',
    draft: false,
    prerelease: false
  });

  if (releaseRes.status !== 201) {
    console.error('Failed to create release:', releaseRes.data);
    process.exit(1);
  }

  console.log(`Release created: ${releaseRes.data.html_url}`);
  console.log(`Uploading APK (${(fs.statSync(APK_PATH).size / 1024 / 1024).toFixed(1)} MB)...`);

  const uploadRes = await uploadAsset(releaseRes.data.upload_url, APK_PATH);
  if (uploadRes.status !== 201) {
    console.error('Upload failed:', uploadRes.data.message || uploadRes.data);
    process.exit(1);
  }

  console.log(`✅ APK uploaded! Download URL:`);
  console.log(uploadRes.data.browser_download_url);
}

main().catch(e => { console.error(e); process.exit(1); });
