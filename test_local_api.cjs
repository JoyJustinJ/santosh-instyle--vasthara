require('ts-node').register({ transpileOnly: true });

const { default: handler } = require('./api/send-otp.ts');

const req = {
  method: 'POST',
  body: { phone: '9345578962' },
  headers: {}
};

const res = {
  setHeader: () => {},
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log(`Status: ${this.statusCode}`);
    console.log(`Response:`, data);
  },
  end: function() {
    console.log(`Status: ${this.statusCode} (ended)`);
  }
};

handler(req, res).catch(console.error);
