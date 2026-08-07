const https = require('https');

const data = JSON.stringify({ phone: '9345578962' });

const options = {
  hostname: 'santosh-instyle-vastra.vercel.app',
  port: 443,
  path: '/api/send-otp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, res => {
  console.log(`Vercel app statusCode: ${res.statusCode}`);
});

req.on('error', error => console.error(error));
req.write(data);
req.end();

const options2 = {
  hostname: 'www.mysanthosh.com',
  port: 443,
  path: '/api/send-otp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req2 = https.request(options2, res => {
  console.log(`mysanthosh.com statusCode: ${res.statusCode}`);
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => { console.log("mysanthosh response:", body); });
});

req2.on('error', error => console.error(error));
req2.write(data);
req2.end();
