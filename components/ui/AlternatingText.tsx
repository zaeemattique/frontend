/**
 * Alternating Text Component
 *
 * Displays text that alternates between provided messages with a fade animation.
 */

'use client';

import React, { useState, useEffect } from 'react';

interface AlternatingTextProps {
  /** Array of messages to alternate between */
  messages: string[];
  /** Interval in milliseconds between message changes (default: 1500ms) */
  interval?: number;
  /** Optional className for the text span */
  className?: string;
}

export function AlternatingText({
  messages,
  interval = 1500,
  className = '',
}: AlternatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, interval);

    return () => clearInterval(timer);
  }, [messages.length, interval]);

  return (
    <span
      key={currentIndex}
      className={`transition-opacity duration-300 ${className}`}
    >
      {messages[currentIndex]}
    </span>
  );
}
