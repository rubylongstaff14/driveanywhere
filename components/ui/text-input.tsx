import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextInput({
  id,
  label,
  error,
  className,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;
  const errorId = inputId ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm text-mist">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-11 w-full rounded-md border bg-ink-950 px-3 text-sm text-white placeholder:text-fog/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          error ? "border-signal/60" : "border-line",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-signal" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
