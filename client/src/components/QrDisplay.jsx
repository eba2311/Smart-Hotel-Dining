import React from 'react';
import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';

export default function QrDisplay({ url, size = 200 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: '#1a3a8f', light: '#ffffff' },
    }).then((dataUrl) => {
      if (ref.current) ref.current.src = dataUrl;
    });
  }, [url, size]);

  return <img ref={ref} alt="QR code" style={{ width: size, height: size }} className="rounded-lg" />;
}
