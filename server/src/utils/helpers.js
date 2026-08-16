import crypto from 'crypto';

export const randomToken = (bytes = 24) => crypto.randomBytes(bytes).toString('hex');

export const randomCode = (length = 6) =>
  crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
