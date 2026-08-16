import { useState } from 'react';

export default function DishImage({
  src,
  alt = '',
  className = '',
  size = 'w-10 h-10',
  rounded = 'rounded-lg',
  textSize = 'text-xl',
}) {
  const [error, setError] = useState(false);

  if (src && src.startsWith('http') && !error) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setError(true)}
        className={`${size} ${rounded} object-cover shrink-0 bg-slate-100 ${className}`}
      />
    );
  }
  return (
    <span
      className={`${size} ${rounded} bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center ${textSize} shrink-0 ${className}`}
    >
      {src || '🍽️'}
    </span>
  );
}
