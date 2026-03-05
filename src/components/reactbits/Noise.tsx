'use client';

import { useRef, useEffect } from 'react';

interface NoiseProps {
  patternSize?: number;
  patternRefreshInterval?: number;
  patternAlpha?: number;
  className?: string;
}

const Noise: React.FC<NoiseProps> = ({
  patternSize = 250,
  patternRefreshInterval = 2,
  patternAlpha = 15,
  className = ''
}) => {
  const grainRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = grainRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let frame = 0;
    let animationId: number;
    const canvasSize = patternSize * 4;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvasSize;
      canvas.height = canvasSize;
    };

    const drawGrain = () => {
      const imageData = ctx.createImageData(canvasSize, canvasSize);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = patternAlpha;
      }
      ctx.putImageData(imageData, 0, 0);
    };

    const loop = () => {
      if (frame % patternRefreshInterval === 0) drawGrain();
      frame++;
      animationId = window.requestAnimationFrame(loop);
    };

    resize();
    loop();

    return () => window.cancelAnimationFrame(animationId);
  }, [patternSize, patternRefreshInterval, patternAlpha]);

  return (
    <canvas
      className={`noise-overlay ${className}`}
      ref={grainRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        imageRendering: 'pixelated',
        zIndex: 0,
        opacity: 0.6
      }}
    />
  );
};

export default Noise;
