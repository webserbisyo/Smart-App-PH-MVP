import { useId, useState } from 'react';

import { parsePesoInput, pesoInputText } from '@smartapp/core';

import { Field, FieldDescription, FieldError, FieldLabel } from '#components/field';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '#components/input-group';

export interface PesoFieldProps {
  label: string;
  /** Centavos, or `null` while empty or not an amount. */
  value: number | null;
  onChange: (centavos: number | null) => void;
  words: { pesoPlaceholder: string; pesoInvalid: string };
  description?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
}

/** A peso amount typed any way ("120", "₱120", "1,200", "120.50"), saved as centavos. */
export function PesoField({ label, value, onChange, words, description, required, disabled, name }: PesoFieldProps) {
  const id = useId();
  const [text, setText] = useState(value === null ? '' : pesoInputText(value));
  const [touched, setTouched] = useState(false);
  const invalid = touched && text.trim() !== '' && parsePesoInput(text) === null;

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>₱</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          name={name}
          inputMode="decimal"
          autoComplete="off"
          placeholder={words.pesoPlaceholder}
          value={text}
          required={required}
          disabled={disabled}
          aria-invalid={invalid}
          className="tabular"
          onChange={(event) => {
            setText(event.target.value);
            onChange(parsePesoInput(event.target.value));
          }}
          onBlur={() => {
            setTouched(true);
            const centavos = parsePesoInput(text);
            if (centavos !== null) setText(pesoInputText(centavos));
          }}
        />
      </InputGroup>
      {description && !invalid && <FieldDescription>{description}</FieldDescription>}
      {invalid && <FieldError>{words.pesoInvalid}</FieldError>}
    </Field>
  );
}
