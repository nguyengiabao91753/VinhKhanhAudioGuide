import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

const QrCodeDisplay: React.FC = () => {
  const [localUrl, setLocalUrl] = useState<string>('');

  useEffect(() => {
    // Fetch local IP from backend
    fetch('/api/pois/local-ip')
      .then(res => res.json())
      .then(data => {
        const url = `http://${data.ip}:5176`; // AudioTourApp runs on 5176
        setLocalUrl(url);
      })
      .catch(err => console.error('Failed to get local IP:', err));
  }, []);

  if (!localUrl) return <div>Loading QR code...</div>;

  return (
    <div style={{ textAlign: 'center', margin: '20px' }}>
      <h3>Scan to access Audio Tour App on mobile</h3>
      <QRCode value={localUrl} size={256} />
      <p>URL: {localUrl}</p>
    </div>
  );
};

export default QrCodeDisplay;