import { useId, useState } from 'react';

import { formatPhPhone, normalizePhPhone } from '@smartapp/core';

import { Field, FieldDescription, FieldError, FieldLabel } from '#components/field';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '#components/input-group';

export interface PhoneFieldProps {
  label: string;
  /** `+639171234567`, or `null` while empty or not a mobile number. */
  value: string | null;
  onChange: (phone: string | null) => void;
  words: { phonePlaceholder: string; phoneInvalid: string };
  description?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
}

/**
 * A Philippine mobile number, typed any way (0917…, 917…, +63 917…). Saves `+639…`; shows `0917 123 4567`
 * after leaving the field, and an error only then.
 */
export function PhoneField({ label, value, onChange, words, description, required, disabled, name }: PhoneFieldProps) {
  const id = useId();
  const [text, setText] = useState(value ? formatPhPhone(value) : '');
  const [touched, setTouched] = useState(false);
  const invalid = touched && text.trim() !== '' && normalizePhPhone(text) === null;

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>+63</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={words.phonePlaceholder}
          value={text}
          required={required}
          disabled={disabled}
          aria-invalid={invalid}
          onChange={(event) => {
            setText(event.target.value);
            onChange(normalizePhPhone(event.target.value));
          }}
          onBlur={() => {
            setTouched(true);
            const phone = normalizePhPhone(text);
            if (phone) setText(formatPhPhone(phone));
          }}
        />
      </InputGroup>
      {description && !invalid && <FieldDescription>{description}</FieldDescription>}
      {invalid && <FieldError>{words.phoneInvalid}</FieldError>}
    </Field>
  );
}
