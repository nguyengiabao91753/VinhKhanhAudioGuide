const http = require('http');
const qrcode = require('qrcode-terminal');
const localtunnel = require('localtunnel');
const { createQrPayload } = require('./qr-service');

const CHECK_SERVER_PORT = 5174;

function renderHtml(title, message) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#f8fafc; color:#111827; font-family:system-ui, sans-serif; }
    .card { padding:24px; border-radius:16px; background:white; box-shadow:0 20px 80px rgba(15,23,42,.12); text-align:center; max-width:520px; }
    h1 { margin:0 0 16px; font-size:1.6rem; }
    p { margin:0; line-height:1.75; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

function respondHtml(res, status, title, message) {
  const body = renderHtml(title, message);
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function handleCheckRequest(req, res) {
  const fullUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = fullUrl.pathname;

  if (pathname !== '/checkQR') {
    respondHtml(res, 404, 'Không tìm thấy', 'Trang này không tồn tại.');
    return;
  }

  const redirect = fullUrl.searchParams.get('redirect');
  const from = fullUrl.searchParams.get('from');
  const to = fullUrl.searchParams.get('to');

  if (!redirect || !from || !to) {
    respondHtml(res, 400, 'QR không hợp lệ', 'Thiếu dữ liệu QR.');
    return;
  }

  const now = new Date();
  const fromDate = new Date(from);
  const toDate = new Date(to);

  console.log('DEBUG: now =', now.toISOString());
  console.log('DEBUG: from =', from);
  console.log('DEBUG: to =', to);
  console.log('DEBUG: now >= fromDate:', now >= fromDate);
  console.log('DEBUG: now <= toDate:', now <= toDate);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    respondHtml(res, 400, 'QR không hợp lệ', 'Dữ liệu thời gian QR không hợp lệ.');
    return;
  }

  if (now < fromDate || now > toDate) {
    console.log('DEBUG: QR expired');
    respondHtml(res, 410, 'QR quá hạn sử dụng', 'QR quá hạn sử dụng.');
    return;
  }

  console.log('DEBUG: QR valid, redirecting to', redirect);
  res.writeHead(302, { Location: redirect });
  res.end();
}

async function startCheckServer() {
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET') {
      respondHtml(res, 405, 'Phương thức không được hỗ trợ', 'Chỉ hỗ trợ GET.');
      return;
    }
    handleCheckRequest(req, res);
  });

  return new Promise((resolve, reject) => {
    server.listen(CHECK_SERVER_PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

async function main() {
  const redirectArg = process.argv[2];
  const redirectUrl = redirectArg || 'https://audio-tour-jet.vercel.app/';

  const server = await startCheckServer();
  const tunnel = await localtunnel({ port: CHECK_SERVER_PORT });
  const publicUrl = tunnel.url.replace(/\/+$/, '');

  const payload = createQrPayload(redirectUrl, 2, publicUrl);

  console.log('='.repeat(60));
  console.log('🌐 CHECK SERVER READY');
  console.log('Port:', CHECK_SERVER_PORT);
  console.log('Public tunnel:', publicUrl);
  console.log('Generated QR payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\nScan this QR code:');
  qrcode.generate(payload.checkUrl, { small: true });
  console.log('');
  console.log('➡️ Keep this terminal open while scanning.');
  console.log('➡️ You can also open the public URL directly:');
  console.log(payload.checkUrl);
  console.log('='.repeat(60));

  tunnel.on('close', () => {
    console.log('Tunnel closed.');
    server.close();
  });

  process.on('SIGINT', () => {
    tunnel.close();
    server.close();
    process.exit();
  });
}

main().catch((err) => {
  console.error('Error:', err);
});