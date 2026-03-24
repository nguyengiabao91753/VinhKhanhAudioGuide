const qrcode = require('qrcode-terminal');

// Public URL for the AudioTourApp via ngrok
const publicUrl = 'https://pachydermatous-creolized-kareem.ngrok-free.dev';

console.log('='.repeat(60));
console.log('🌐 PUBLIC QR CODE - ACCESSIBLE FROM ANYWHERE!');
console.log('='.repeat(60));
console.log(`🔗 Public URL: ${publicUrl}`);
console.log('');
console.log('Scan this QR code from any device (even outside your network):');
console.log('');

qrcode.generate(publicUrl, { small: true }, function (qrcode) {
  console.log(qrcode);
});

console.log('');
console.log('='.repeat(60));
console.log('✅ Ready for mobile access!');
console.log('='.repeat(60));