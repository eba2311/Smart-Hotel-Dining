import React from 'react';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';

const FLOW = ['CREATED', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED'];

const LABELS = {
  CREATED: 'Order Placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Being Prepared',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
};

export default function OrderStatusTimeline({ status }) {
  const cancelled = status === 'CANCELLED';
  const currentIdx = FLOW.indexOf(status);

  return (
    <div className="flex items-center w-full">
      {FLOW.map((step, idx) => {
        const done = !cancelled && idx < currentIdx;
        const current = !cancelled && idx === currentIdx;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                  done && 'bg-emerald-500 border-emerald-500 text-white',
                  current && 'bg-brand-600 border-brand-600 text-white ring-4 ring-brand-100',
                  !done && !current && 'bg-white border-slate-300 text-slate-400'
                )}
              >
                {done ? <Check size={16} /> : idx + 1}
              </div>
              <p className={clsx('text-[10px] mt-2 text-center font-medium hidden sm:block', current ? 'text-brand-700' : 'text-slate-400')}>
                {LABELS[step]}
              </p>
            </div>
            {idx < FLOW.length - 1 && (
              <div className={clsx('flex-1 h-0.5 -mt-5', idx < currentIdx && !cancelled ? 'bg-emerald-500' : 'bg-slate-200')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
