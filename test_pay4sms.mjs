fetch('http://pay4sms.in')
  .then(res => console.log('HTTP:', res.status))
  .catch(err => console.error('HTTP Error:', err.message));

fetch('https://pay4sms.in')
  .then(res => console.log('HTTPS:', res.status))
  .catch(err => console.error('HTTPS Error:', err.message));
