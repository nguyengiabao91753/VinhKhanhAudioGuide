const { exec } = require('child_process');
const qrcode = require('qrcode-terminal');

// Start ngrok tunnel to AudioTourApp
console.log('🚀 Starting ngrok tunnel to AudioTourApp...');
console.log('This will create a secure HTTPS URL accessible from anywhere!');
console.log('');

const ngrokProcess = exec('ngrok http 5177', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`Output: ${stdout}`);
});

// Wait a bit for ngrok to start, then get the URL
setTimeout(() => {
  exec('curl -s http://localhost:4040/api/tunnels', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Could not get ngrok URL. Make sure ngrok is running.');
      console.log('💡 Try running: ngrok http 5177');
      return;
    }

    try {
      const data = JSON.parse(stdout);
      const tunnel = data.tunnels.find(t => t.proto === 'https');

      if (tunnel) {
        const publicUrl = tunnel.public_url;
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
        console.log('✅ Features:');
        console.log('• HTTPS secure connection');
        console.log('• Accessible from any device worldwide');
        console.log('• No router configuration needed');
        console.log('• Works on mobile data or any network');
        console.log('='.repeat(60));
        console.log('💡 Keep this terminal open to maintain the tunnel');
        console.log('💡 Press Ctrl+C to stop the tunnel');

      } else {
        console.error('❌ No HTTPS tunnel found. Ngrok might still be starting...');
        console.log('💡 Try running this script again in a few seconds');
      }
    } catch (e) {
      console.error('❌ Error parsing ngrok response');
    }
  });
}, 3000);