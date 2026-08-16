import qrcode from 'qrcode';

export const qrUrl = (token) => `${process.env.PUBLIC_URL || 'http://localhost:5173'}/#/menu/${token}`;

export const generateQRDataUrl = async (value) => {
  return qrcode.toDataURL(value, {
    width: 512,
    margin: 1,
    color: { dark: '#1a3a8f', light: '#ffffff' },
  });
};
