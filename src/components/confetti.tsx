
"use client";

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

const PARTICLE_COUNT = 30;
const COLORS = ["#FFC700", "#FFD700", "#FF8C00", "#FF4500", "#FF69B4", "#1E90FF"];

const randomNumber = (min: number, max: number) => Math.random() * (max - min) + min;

const generateParticle = () => {
    const angle = randomNumber(0, 360);
    const distance = randomNumber(50, 100);
    const radians = (angle * Math.PI) / 180;
  
    return {
      id: String(randomNumber(10000, 99999)),
      color: COLORS[Math.floor(randomNumber(0, COLORS.length))],
      size: randomNumber(8, 14),
      style: {
        '--tx': `${Math.cos(radians) * distance}px`,
        '--ty': `${Math.sin(radians) * distance}px`,
        animationDelay: `${randomNumber(0, 200)}ms`,
      },
    };
};
  

type ConfettiProps = {
    onAnimationComplete: () => void;
    className?: string;
};

export const Confetti = ({ onAnimationComplete, className }: ConfettiProps) => {
    const particles = useMemo(() => {
        return Array.from({ length: PARTICLE_COUNT }).map(generateParticle);
    }, []);

    useEffect(() => {
        const timer = setTimeout(onAnimationComplete, 1000); // Corresponds to animation duration
        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    return (
        <div className={cn("absolute inset-0 flex items-center justify-center pointer-events-none z-50", className)}>
            {particles.map(particle => (
                <div
                    key={particle.id}
                    className="absolute rounded-full animate-confetti-burst"
                    style={{
                        ...particle.style,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        backgroundColor: particle.color,
                    }}
                />
            ))}
        </div>
    );
};
