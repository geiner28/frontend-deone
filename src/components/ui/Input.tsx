import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-[#1d212b]">
            {label}
            {props.required && <span className="text-[#ef4444] ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-[#1d212b] placeholder-[#737780] focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 transition ${
            error
              ? 'border-[#ef4444] focus:ring-[#ef4444]/50'
              : 'border-[#e5e7eb] focus:border-[#ff8d2d]'
          } ${className}`}
          {...props}
        />
        {hint && !error && <p className="text-xs text-[#6d7382]">{hint}</p>}
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
