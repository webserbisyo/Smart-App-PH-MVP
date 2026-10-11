"use client";

import * as React from "react";

type InputValue = string[] | string;

interface VisuallyHiddenInputProps<T = InputValue> extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "checked" | "onReset"
> {
  value?: T;
  checked?: boolean;
  control: HTMLElement | null;
  bubbles?: boolean;
}

function VisuallyHiddenInput<T = InputValue>(
  props: VisuallyHiddenInputProps<T>,
) {
  const {
    control,
    value,
    checked,
    bubbles = true,
    type = "hidden",
    style,
    ...inputProps
  } = props;

  const isCheckInput = React.useMemo(
    () => type === "checkbox" || type === "radio" || type === "switch",
    [type],
  );
  const inputRef = React.useRef<HTMLInputElement>(null);

  const prevValueRef = React.useRef<T | boolean | undefined>(
    isCheckInput ? checked : value,
  );

  const [measuredSize, setMeasuredSize] = React.useState<{
    control: HTMLElement | null;
    width?: number;
    height?: number;
  }>({ control: null });

  const controlSize = React.useMemo<{ width?: number; height?: number }>(() => {
    if (!control || measuredSize.control !== control) return {};
    const { width, height } = measuredSize;
    return width !== undefined && height !== undefined ? { width, height } : {};
  }, [control, measuredSize]);

  React.useLayoutEffect(() => {
    if (!control) return;

    if (typeof window === "undefined") return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const borderSize = entry.borderBoxSize[0];
      const width = borderSize ? borderSize.inlineSize : control.offsetWidth;
      const height = borderSize ? borderSize.blockSize : control.offsetHeight;

      setMeasuredSize({ control, width, height });
    });

    resizeObserver.observe(control, { box: "border-box" });
    return () => {
      resizeObserver.disconnect();
    };
  }, [control]);

  React.useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const inputProto = window.HTMLInputElement.prototype;
    const propertyKey = isCheckInput ? "checked" : "value";
    const eventType = isCheckInput ? "click" : "input";
    const currentValue = isCheckInput ? checked : value;

    const serializedCurrentValue = isCheckInput
      ? checked
      : typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : value;

    const prevValue = prevValueRef.current;
    prevValueRef.current = currentValue;

    if (prevValue !== currentValue) {
      const event = new Event(eventType, { bubbles });
      // Call the native prototype setter so React's value tracker sees the change.
      if (Reflect.set(inputProto, propertyKey, serializedCurrentValue, input)) {
        input.dispatchEvent(event);
      }
    }
  }, [value, checked, bubbles, isCheckInput]);

  const composedStyle = React.useMemo<React.CSSProperties>(() => {
    return {
      ...style,
      ...(controlSize.width !== undefined && controlSize.height !== undefined
        ? controlSize
        : {}),
      border: 0,
      clip: "rect(0 0 0 0)",
      clipPath: "inset(50%)",
      height: "1px",
      margin: "-1px",
      overflow: "hidden",
      padding: 0,
      position: "absolute",
      whiteSpace: "nowrap",
      width: "1px",
    };
  }, [style, controlSize]);

  return (
    <input
      type={type}
      {...inputProps}
      ref={inputRef}
      aria-hidden={isCheckInput}
      tabIndex={-1}
      defaultChecked={isCheckInput ? checked : undefined}
      style={composedStyle}
    />
  );
}

export { VisuallyHiddenInput };
