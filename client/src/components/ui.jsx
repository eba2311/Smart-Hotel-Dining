import React from 'react';
import { clsx } from 'clsx';
import { X, Loader2 } from 'lucide-react';

export function Button({ variant = 'primary', loading, children, className, disabled, ...props }) {
  return (
    <button className={clsx(`btn-${variant}`, className)} disabled={loading || disabled} {...props}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Input({ label, error, icon, className, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</span>}
        <input className={clsx('input', error && 'border-rose-400', icon && 'pl-9', className)} {...props} />
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

export function Select({ label, children, className, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="label">{label}</label>}
      <select className={clsx('input', className)} {...props}>
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, className, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="label">{label}</label>}
      <textarea className={clsx('input', 'min-h-[80px]', className)} {...props} />
    </div>
  );
}

export function Badge({ className, children }) {
  return <span className={clsx('badge', className)}>{children}</span>;
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={clsx(
          'relative bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto',
          wide ? 'max-w-3xl' : 'max-w-lg'
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 size={32} className="animate-spin text-brand-600" />
      <p className="text-sm">{label || 'Loading...'}</p>
    </div>
  );
}

export function Empty({ title, subtitle, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
      <div className="text-5xl mb-3">{icon || '🗒️'}</div>
      <p className="font-semibold text-slate-600">{title || 'Nothing here yet'}</p>
      {subtitle && <p className="text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

export function StatCard({ icon, label, value, sub, color = 'bg-brand-50 text-brand-700' }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={clsx('rounded-xl p-3', color)}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, color = 'bg-brand-600' }) {
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className={clsx('h-full rounded-full', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
