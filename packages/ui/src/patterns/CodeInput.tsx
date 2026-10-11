import { REGEXP_ONLY_DIGITS } from 'input-otp';

import { InputOTP, InputOTPGroup, InputOTPSlot } from '#components/input-otp';

/** The 6-digit email code: six boxes, digits only, paste-friendly, filled in from the phone's keyboard suggestion. */
export function CodeInput({
  id,
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  label,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  label: string;
}) {
  return (
    <InputOTP
      {...(id === undefined ? {} : { id })}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      value={value}
      onChange={onChange}
      {...(onComplete === undefined ? {} : { onComplete })}
      disabled={disabled ?? false}
      aria-label={label}
      aria-invalid={invalid ?? false}
    >
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <InputOTPSlot key={index} index={index} className="size-12 text-lg" />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
