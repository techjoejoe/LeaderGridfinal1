
"use client";

import { useMemo } from 'react';

type GlitterSparklesProps = {
  count?: number;
  color: string;
};

export function GlitterSparkles({ count = 20, color }: GlitterSparklesProps) {
  
  const sparkles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const duration = Math.random() * 1 + 0.5; // 0.5s to 1.5s
      const delay = Math.random() * 1.5; // 0s to 1.5s
      const endRotation = Math.random() * 360; // 0 to 360 degrees

      return {
        id: i,
        style: {
          top: `${top}%`,
          left: `${left}%`,
          backgroundColor: color,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          '--end-rotation': endRotation,
        } as React.CSSProperties,
      };
    });
  }, [count, color]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          className="absolute w-2 h-2 rounded-full sparkle"
          style={sparkle.style}
        />
      ))}
    </div>
  );
}
