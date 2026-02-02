/**
 * SOW Step Animation Component
 *
 * Displays a cycling animation of SOW generation steps with fade transitions.
 * Images take full width, cover with top alignment (can be cut from bottom).
 * Cycles: step_1 -> step_2 -> step_3 -> step_1...
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const STEPS = [
  '/sow/step_1.png',
  '/sow/step_2.png',
  '/sow/step_3.png',
];

interface SOWStepAnimationProps {
  /** Duration each step is displayed in milliseconds (default: 2500ms) */
  interval?: number;
  /** Duration of fade transition in milliseconds (default: 400ms) */
  fadeDuration?: number;
  /** Whether the animation is paused */
  paused?: boolean;
  /** Optional className for the container */
  className?: string;
}

export function SOWStepAnimation({
  interval = 2500,
  fadeDuration = 400,
  paused = false,
  className = '',
}: SOWStepAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (paused) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % STEPS.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, paused]);

  return (
    <div className={`relative w-full h-full min-h-[400px] overflow-hidden ${className}`}>
      {/* All images stacked - crossfade effect */}
      {STEPS.map((src, index) => (
        <div
          key={src}
          className="absolute inset-0"
          style={{
            opacity: currentStep === index ? 1 : 0,
            transition: `opacity ${fadeDuration}ms ease-in-out`,
            zIndex: currentStep === index ? 1 : 0,
          }}
        >
          <Image
            src={src}
            alt={`SOW Generation Step ${index + 1}`}
            fill
            className="object-cover object-top"
            priority={index === 0}
            sizes="50vw"
          />
        </div>
      ))}
    </div>
  );
}
