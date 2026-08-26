import React from 'react';

export default function QrDisplay({ url, size = 200 }) {
  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm"
      >
        No URL
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&color=1a3a8f&bgcolor=ffffff&margin=10`;

  return (
    <img
      src={qrUrl}
      alt="QR code"
      style={{ width: size, height: size }}
      className="rounded-lg"
    />
  );
}
