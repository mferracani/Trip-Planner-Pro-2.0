"use client";

import { ButtonHTMLAttributes, forwardRef, PointerEvent as ReactPointerEvent, useRef, useState } from "react";

interface RippleInstance {
  x: number;
  y: number;
  id: number;
}

interface PressableProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string;
  as?: "button";
}

export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(function Pressable(
  { children, className = "", rippleColor = "rgba(255,255,255,0.35)", onPointerDown, style, ...rest },
  ref,
) {
  const [ripples, setRipples] = useState<RippleInstance[]>([]);
  const counter = useRef(0);

  function handlePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++counter.current;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipples((prev) => [...prev, { x, y, id }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 700);
    onPointerDown?.(e);
  }

  const hasPosition = /\b(fixed|absolute|sticky)\b/.test(className);
  const positionClass = hasPosition ? "" : "relative";

  return (
    <button
      ref={ref}
      {...rest}
      onPointerDown={handlePointerDown}
      className={`${positionClass} overflow-hidden press-feedback ${className}`}
      style={style}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="absolute pointer-events-none rounded-full animate-ripple"
          style={{
            left: r.x,
            top: r.y,
            width: 12,
            height: 12,
            backgroundColor: rippleColor,
          }}
        />
      ))}
    </button>
  );
});
