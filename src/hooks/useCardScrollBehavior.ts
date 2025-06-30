import { useEffect, useRef, useState, useCallback } from 'react';

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isCardStackMostlyVisible(el, threshold = 0.8) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const height = rect.bottom - rect.top;
  const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  return visibleHeight / height >= threshold;
}

export const useCardScrollBehavior = () => {
  const [activeCard, setActiveCard] = useState(0);
  const [isInCardSection, setIsInCardSection] = useState(false);
  const isInCardSectionRef = useRef(false);
  const transitioning = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardStackRef = useRef<Element | null>(null);

  // Swipe gesture state
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Wheel for desktop
  const preventWheelScroll = useCallback((e: WheelEvent) => {
    if (!isInCardSectionRef.current || transitioning.current) return;
    if (Math.abs(e.deltaY) < 40) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    transitioning.current = true;
    if (e.deltaY > 0) {
      setActiveCard(prev => {
        const next = Math.min(prev + 1, 3);
        setTimeout(() => { transitioning.current = false; }, 400);
        return next;
      });
    } else {
      setActiveCard(prev => {
        const next = Math.max(prev - 1, 0);
        setTimeout(() => { transitioning.current = false; }, 400);
        return next;
      });
    }
  }, []);

  // Keyboard navigation for desktop
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isInCardSectionRef.current || transitioning.current) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveCard(prev => {
        const next = Math.min(prev + 1, 3);
        transitioning.current = true;
        setTimeout(() => { transitioning.current = false; }, 400);
        return next;
      });
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveCard(prev => {
        const next = Math.max(prev - 1, 0);
        transitioning.current = true;
        setTimeout(() => { transitioning.current = false; }, 400);
        return next;
      });
    }
  }, []);

  // Touch events for mobile
  useEffect(() => {
    const advancedSection = document.getElementById('advanced-features');
    if (!advancedSection) return;
    const cardStack = advancedSection.querySelector('.flex.justify-center.items-center');
    if (!cardStack) return;
    cardStackRef.current = cardStack;

    // IntersectionObserver for in-section state
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const inStack = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        setIsInCardSection(inStack);
        isInCardSectionRef.current = inStack;
        if (!inStack) {
          transitioning.current = false;
        }
      },
      {
        threshold: [0.5],
        rootMargin: '0px 0px 0px 0px'
      }
    );
    observerRef.current.observe(cardStack);

    // Desktop: wheel and keyboard events on window
    if (!isMobile()) {
      window.addEventListener('wheel', preventWheelScroll, { passive: false });
      window.addEventListener('keydown', handleKeyDown, { passive: false });
    }

    // Mobile: swipe gesture
    if (isMobile()) {
      const handleTouchStart = (e: TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
      };
      const handleTouchMove = (e: TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
      };
      const handleTouchEnd = () => {
        const deltaX = touchEndX.current - touchStartX.current;
        if (Math.abs(deltaX) > 50 && !transitioning.current) {
          transitioning.current = true;
          if (deltaX < 0) {
            // Swipe left: next card
            setActiveCard(prev => {
              const next = Math.min(prev + 1, 3);
              setTimeout(() => { transitioning.current = false; }, 400);
              return next;
            });
          } else {
            // Swipe right: previous card
            setActiveCard(prev => {
              const next = Math.max(prev - 1, 0);
              setTimeout(() => { transitioning.current = false; }, 400);
              return next;
            });
          }
        }
      };
      cardStack.addEventListener('touchstart', handleTouchStart);
      cardStack.addEventListener('touchmove', handleTouchMove);
      cardStack.addEventListener('touchend', handleTouchEnd);
      // Cleanup
      return () => {
        cardStack.removeEventListener('touchstart', handleTouchStart);
        cardStack.removeEventListener('touchmove', handleTouchMove);
        cardStack.removeEventListener('touchend', handleTouchEnd);
      };
    }
    // Cleanup for desktop
    return () => {
      if (!isMobile()) {
        window.removeEventListener('wheel', preventWheelScroll);
        window.removeEventListener('keydown', handleKeyDown);
      }
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [preventWheelScroll, handleKeyDown]);

  return {
    activeCard,
    isInCardSection,
    setActiveCard
  };
};
