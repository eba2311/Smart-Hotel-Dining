import React from 'react';

/**
 * Accessible button component with proper ARIA attributes
 */
export function AccessibleButton({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  ariaLabel,
  ariaDescribedby,
  onClick,
  className = '',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500 focus:ring-offset-brand-900',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-500 focus:ring-offset-slate-900 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 focus:ring-offset-rose-900',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-500 focus:ring-offset-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
  };

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  const isDisabled = disabled || loading;

  return (
    <button
      className={buttonClasses}
      disabled={isDisabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {Icon && iconPosition === 'left' && !loading && (
        <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
      )}

      <span className="flex-1">{children}</span>

      {Icon && iconPosition === 'right' && !loading && (
        <Icon className="ml-2 h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

/**
 * Accessible input component with proper labels and error handling
 */
export function AccessibleInput({
  label,
  error,
  hint,
  required = false,
  id,
  type = 'text',
  className = '',
  ...props
}) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const baseClasses = 'w-full px-4 py-2 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const stateClasses = error
    ? 'border-rose-500 focus:ring-rose-500 focus:ring-offset-rose-900'
    : 'border-slate-300 focus:ring-brand-500 focus:ring-offset-brand-900 dark:border-slate-700 dark:focus:ring-offset-slate-900';

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && <span className="text-rose-500 ml-1" aria-label="required">*</span>}
        </label>
      )}

      <input
        id={inputId}
        type={type}
        className={`${baseClasses} ${stateClasses} ${className}`}
        aria-invalid={!!error}
        aria-describedby={`${hint ? hintId + ' ' : ''}${error ? errorId : ''}`}
        aria-required={required}
        {...props}
      />

      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs text-rose-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Accessible modal component with proper focus management
 */
export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  ariaLabelledby,
  ariaDescribedby,
}) {
  const modalRef = React.useRef(null);
  const previousActiveElement = React.useRef(null);

  React.useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement;

      // Focus the modal
      modalRef.current?.focus();

      // Trap focus within the modal
      const trapFocus = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
          modalRef.current.focus();
        }
      };

      document.addEventListener('focusin', trapFocus);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('focusin', trapFocus);
        document.body.style.overflow = '';

        // Restore focus to the previous element
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id={ariaLabelledby} className="text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div id={ariaDescribedby}>
          {children}
        </div>
      </div>
    </div>
  );
}