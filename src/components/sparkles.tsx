"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const DEFAULT_COLOR = '#FFC700'; // Gold color

const SparkleIcon = ({ color = DEFAULT_COLOR, className, ...rest }) => {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-current", className)}
      {...rest}
    >
      <path
        d="M8 0L9.06066 6.93934L16 8L9.06066 9.06066L8 16L6.93934 9.06066L0 8L6.93934 6.93934L8 0Z"
        fill="currentColor"
      />
    </svg>
  );
};

const randomNumber = (min, max) => Math.random() * (max - min) + min;

const generateSparkle = (color) => {
  return {
    id: String(randomNumber(10000, 99999)),
    createdAt: Date.now(),
    color,
    size: randomNumber(8, 18),
    style: {
      top: randomNumber(0, 100) + '%',
      left: randomNumber(0, 100) + '%',
      animationDelay: randomNumber(0, 1000) + 'ms',
    },
  };
};

export const Sparkles = ({
  color = DEFAULT_COLOR,
  count = 20,
  className,
  ...rest
}) => {
  const [sparkles, setSparkles] = useState(() => {
    return Array.from({ length: count }).map(() => generateSparkle(color));
  });

  useEffect(() => {
    const interval = setInterval(() => {
        // This creates a continuous effect by replacing old sparkles with new ones.
        setSparkles(Array.from({ length: count }).map(() => generateSparkle(color)));
    }, 1000); // Regenerate sparkles every second

    return () => clearInterval(interval);
  }, [count, color]);

  return (
    <div className={cn("absolute inset-[-10px] pointer-events-none", className)} {...rest}>
      {sparkles.map(sparkle => (
        <SparkleIcon
          key={sparkle.id}
          style={{
            ...sparkle.style,
            width: sparkle.size,
            height: sparkle.size,
            color: sparkle.color,
          }}
          className="absolute animate-sparkle"
        />
      ))}
    </div>
  );
};
