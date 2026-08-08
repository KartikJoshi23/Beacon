import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, animate } from 'framer-motion';

/**
 * Smoothly counts to `value` when scrolled into view (and on value change),
 * formatting each frame with `format`.
 */
export default function AnimatedNumber({ value, format = (v) => v, duration = 1.1, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-8% 0px' });
  const mv = useMotionValue(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView) return;
    const from = started.current ? mv.get() : 0;
    started.current = true;
    const controls = animate(mv, value ?? 0, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, inView, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref} className={className}>{format(value ?? 0)}</span>;
}
