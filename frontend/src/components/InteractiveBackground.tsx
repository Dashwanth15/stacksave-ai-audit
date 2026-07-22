import { useEffect, useRef } from 'react';
import './InteractiveBackground.css';

export default function InteractiveBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  // Mouse coords (normalized from -1 to 1)
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

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

      // Parallax target (-8px to 8px offset)
      const normX = (x / rect.width) * 2 - 1;
      const normY = (y / rect.height) * 2 - 1;
      targetRef.current.x = normX * 8;
      targetRef.current.y = normY * 8;
    };

    const handleMouseLeave = () => {
      targetRef.current.x = 0;
      targetRef.current.y = 0;
      spotlightTargetRef.current.opacity = 0;
    };

    const parent = containerRef.current?.closest('.hero-section');
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove as EventListener);
      parent.addEventListener('mouseleave', handleMouseLeave);
    }

    let animationId: number;
    let time = 0;

    const tick = () => {
      time += 0.001; // Slow ambient drift speed

      // 1. Ambient Drift (slow circular path of 2-3px)
      const driftX = Math.cos(time * 2 * Math.PI) * 2.5;
      const driftY = Math.sin(time * 2 * Math.PI) * 2.5;

      // 2. Parallax Lerp (linear interpolation for smooth damping)
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.06;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.06;

      // Combine drift + mouse parallax
      const finalX = currentRef.current.x + driftX;
      const finalY = currentRef.current.y + driftY;

      // Grid is intentionally static — no transform applied

      // 3. Spotlight Lerp
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
      <div ref={gridRef} className="hero-grid" />
      <div ref={spotlightRef} className="hero-spotlight" />

      {/* Layer 3: Card Spotlight */}
      <div className="hero-card-spotlight" />

      {/* Layer 4: Noise Grain */}
      <div className="hero-noise" />
    </div>
  );
}