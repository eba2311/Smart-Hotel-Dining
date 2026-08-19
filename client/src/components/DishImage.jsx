import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function DishImage({
  src,
  alt = '',
  className = '',
  size = 'w-10 h-10',
  rounded = 'rounded-lg',
  textSize = 'text-xl',
  zoomable = false,
}) {
  const [error, setError] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  const imageEl = src && !error ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className={`${size} ${rounded} object-cover shrink-0 bg-slate-100 ${className} ${zoomable ? 'cursor-pointer' : ''}`}
      onClick={zoomable ? (e) => { e.stopPropagation(); setZoomed(true); } : undefined}
    />
  ) : (
    <span
      className={`${size} ${rounded} bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center ${textSize} shrink-0 ${className}`}
    >
      {alt || '🍽️'}
    </span>
  );

  return (
    <>
      {imageEl}
      {zoomable && zoomed && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          <button onClick={() => setZoomed(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30">
            <X size={24} />
          </button>
          <img src={src} alt={alt} className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain" />
          <p className="absolute bottom-6 text-white text-sm font-semibold text-center bg-black/40 rounded-xl px-4 py-2">{alt}</p>
        </div>
      )}
    </>
  );
}
