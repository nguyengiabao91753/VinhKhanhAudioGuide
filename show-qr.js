const qrcode = require('qrcode-terminal');
const http = require('http');

function getNgrokUrl(callback) {
  http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
    let data = '';

    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);

        // lấy https tunnel
        const tunnel = json.tunnels.find(t => t.proto === 'https');

        if (!tunnel) {
          console.error('❌ No HTTPS tunnel found. Is ngrok running?');
          return;
        }

        callback(tunnel.public_url);
      } catch (err) {
        console.error('❌ Error parsing ngrok response:', err);
      }
    });
  }).on('error', (err) => {
    console.error('❌ Cannot connect to ngrok API:', err.message);
  });
}

// MAIN
getNgrokUrl((publicUrl) => {
  console.log('='.repeat(60));
  console.log('🌐 PUBLIC QR CODE - AUTO UPDATED!');
  console.log('='.repeat(60));
  console.log(`🔗 Public URL: ${publicUrl}`);
  console.log('');

  qrcode.generate(publicUrl, { small: true });

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Ready for mobile access!');
  console.log('='.repeat(60));
});