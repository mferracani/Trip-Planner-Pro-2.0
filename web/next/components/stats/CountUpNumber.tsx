"use client";

import { useCountUp } from "@/lib/hooks";

interface Props {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

export function CountUpNumber({ value, duration = 1200, suffix = "", className }: Props) {
  const current = useCountUp(value, duration);

  return (
    <span className={className}>
      {current}
      {suffix}
    </span>
  );
}
