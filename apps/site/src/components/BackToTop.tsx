'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollUp() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <button
      type="button"
      onClick={scrollUp}
      aria-label="Voltar ao topo"
      className={`fixed bottom-6 right-6 z-40 inline-flex items-center justify-center
                  w-11 h-11 border border-mist/60 bg-graphite/90 backdrop-blur-md text-chrome
                  hover:border-platinum hover:text-platinum
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum
                  transition-all duration-300
                  ${visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}
    >
      <ArrowUp size={16} strokeWidth={1} />
    </button>
  );
}
