import React from 'react';

/**
 * Skeleton loading components for better UX during data fetching
 */

export function Skeleton({ className = '', variant = 'default', ...props }) {
  const baseClasses = 'animate-pulse bg-slate-200 dark:bg-neutral-800 rounded';

  const variantClasses = {
    default: 'h-4 w-full',
    text: 'h-4 w-3/4',
    title: 'h-6 w-1/2',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24',
    card: 'h-32 w-full',
    image: 'h-48 w-full',
    thumbnail: 'h-16 w-16',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard({ count = 1 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-slate-200 dark:border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-4">
            <Skeleton variant="thumbnail" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="title" />
              <Skeleton variant="text" />
              <Skeleton variant="text" className="w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonMenu({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <Skeleton variant="image" />
          <div className="p-4 space-y-3">
            <Skeleton variant="title" />
            <Skeleton variant="text" />
            <div className="flex justify-between items-center">
              <Skeleton variant="text" className="w-16" />
              <Skeleton variant="button" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 p-4">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-neutral-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton key={j} variant="text" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-slate-200 dark:border-neutral-800 rounded-xl p-6 space-y-3">
            <Skeleton variant="text" className="w-1/3" />
            <Skeleton variant="title" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="border border-slate-200 dark:border-neutral-800 rounded-xl p-6">
        <Skeleton variant="title" className="mb-4" />
        <Skeleton variant="card" className="h-64" />
      </div>

      {/* Recent activity */}
      <div className="border border-slate-200 dark:border-neutral-800 rounded-xl p-6">
        <Skeleton variant="title" className="mb-4" />
        <SkeletonCard count={3} />
      </div>
    </div>
  );
}