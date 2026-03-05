'use client';

import React, { useRef } from 'react';

interface SpotlightCardProps extends React.PropsWithChildren {
  className?: string;
  spotlightColor?: string;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColor = 'rgba(116, 172, 223, 0.15)'
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = e => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    divRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    divRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    divRef.current.style.setProperty('--spotlight-color', spotlightColor);
  };

  return (
    <div ref={divRef} onMouseMove={handleMouseMove} className={`card-spotlight ${className}`}>
      {children}
    </div>
  );
};

export default SpotlightCard;
