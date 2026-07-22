import { useEffect, useRef } from 'react';
import './InteractiveBackground.css';

export default function InteractiveBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  // Mouse spotlight coords (in pixels relative to container)
  const spotlightTargetRef = useRef({ x: 0, y: 0, opacity: 0 });
  const spotlightCurrentRef = useRef({ x: 0, y: 0, opacity: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Spotlight coordinates
      spotlightTargetRef.current.x = x;
      spotlightTargetRef.current.y = y;
      spotlightTargetRef.current.opacity = 1;
    };

    const handleMouseLeave = () => {
      spotlightTargetRef.current.opacity = 0;
    };

    const parent = containerRef.current?.closest('.hero-section');
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove as EventListener);
      parent.addEventListener('mouseleave', handleMouseLeave);
    }

    let animationId: number;

    const tick = () => {
      // Spotlight Lerp
      spotlightCurrentRef.current.x += (spotlightTargetRef.current.x - spotlightCurrentRef.current.x) * 0.10;
      spotlightCurrentRef.current.y += (spotlightTargetRef.current.y - spotlightCurrentRef.current.y) * 0.10;
      spotlightCurrentRef.current.opacity += (spotlightTargetRef.current.opacity - spotlightCurrentRef.current.opacity) * 0.08;

      if (spotlightRef.current) {
        spotlightRef.current.style.setProperty('--mouse-x', `${spotlightCurrentRef.current.x.toFixed(1)}px`);
        spotlightRef.current.style.setProperty('--mouse-y', `${spotlightCurrentRef.current.y.toFixed(1)}px`);
        spotlightRef.current.style.setProperty('--spotlight-opacity', spotlightCurrentRef.current.opacity.toFixed(3));
      }

      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);

    return () => {
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove as EventListener);
        parent.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div ref={containerRef} className="interactive-bg-container" aria-hidden="true">
      {/* Layer 1: Aurora Gradients */}
      <div className="aurora-blob aurora-blob--a" />
      <div className="aurora-blob aurora-blob--b" />

      {/* Layer 2: Grid and Cursor Spotlight */}
      <div className="hero-grid" />
      <div ref={spotlightRef} className="hero-spotlight" />

      {/* Layer 3: Card Spotlight */}
      <div className="hero-card-spotlight" />

      {/* Layer 4: Noise Grain */}
      <div className="hero-noise" />
    </div>
  );
}