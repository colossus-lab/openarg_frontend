'use client';

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

interface FadeInProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  delay?: number;
  duration?: number;
  blur?: boolean;
  className?: string;
  once?: boolean;
}

export default function FadeIn({
  children,
  direction = 'up',
  distance = 30,
  delay = 0,
  duration = 0.6,
  blur = false,
  className = '',
  once = true
}: FadeInProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: '-80px' });
  const shouldReduceMotion = useReducedMotion();

  // Respect prefers-reduced-motion: render content immediately, no animation
  if (shouldReduceMotion) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  const directionMap = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 }
  };

  const { x, y } = directionMap[direction];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        y,
        x,
        filter: blur ? 'blur(8px)' : 'none'
      }}
      animate={isInView ? {
        opacity: 1,
        y: 0,
        x: 0,
        filter: blur ? 'blur(0px)' : 'none'
      } : {}}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
    >
      {children}
    </motion.div>
  );
}
