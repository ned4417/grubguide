import { memo, useState, useEffect, useCallback, useRef } from "react";

interface CarouselProps {
  photos: string[];
}

const AUTOPLAY_MS = 6000;
const KB_VARIANTS = 4; // must match the number of kenBurnsN keyframes in index.css

const ImageCarousel = memo(({ photos }: CarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animKey, setAnimKey]           = useState(0); // remounts img → restarts Ken Burns
  const [kbVariant, setKbVariant]       = useState(0);
  const [progress, setProgress]         = useState(0);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const carouselRef    = useRef<HTMLDivElement>(null);
  const autoplayRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX    = useRef<number | null>(null);
  const touchStartY    = useRef<number | null>(null);
  const touchEndX      = useRef<number | null>(null);

  // ── navigation ────────────────────────────────────────────────────────────

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
    setAnimKey(k => k + 1);
    setKbVariant(v => (v + 1) % KB_VARIANTS);
    setProgress(0);
  }, []);

  const nextSlide = useCallback(() => {
    goTo((currentIndex + 1) % photos.length);
  }, [currentIndex, photos.length, goTo]);

  const prevSlide = useCallback(() => {
    goTo((currentIndex - 1 + photos.length) % photos.length);
  }, [currentIndex, photos.length, goTo]);

  // Reset when photos change (new restaurant selected)
  useEffect(() => {
    goTo(0);
    setKbVariant(0);
  }, [photos]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── progress bar ticker ───────────────────────────────────────────────────

  useEffect(() => {
    if (isModalOpen) { setProgress(0); return; }

    const start = Date.now();
    const tick = () => {
      const pct = Math.min(((Date.now() - start) / AUTOPLAY_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) progressRef.current = setTimeout(tick, 40);
    };
    progressRef.current = setTimeout(tick, 40);
    return () => { if (progressRef.current) clearTimeout(progressRef.current); };
  }, [currentIndex, isModalOpen]);

  // ── autoplay ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isModalOpen) {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      return;
    }
    autoplayRef.current = setInterval(nextSlide, AUTOPLAY_MS);
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [isModalOpen, nextSlide]);

  // ── touch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchEndX.current = null;
    };
    const onMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      if (dy > Math.abs(dx) * 1.2) { touchStartX.current = null; return; }
      if (Math.abs(dx) > 10) e.preventDefault();
      touchEndX.current = e.touches[0].clientX;
    };
    const onEnd = () => {
      if (touchStartX.current === null || touchEndX.current === null) return;
      const dist = touchEndX.current - touchStartX.current;
      if (dist > 30) prevSlide();
      else if (dist < -30) nextSlide();
      touchStartX.current = null;
      touchEndX.current = null;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [nextSlide, prevSlide]);

  // ── keyboard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'Escape' && isModalOpen) setIsModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextSlide, prevSlide, isModalOpen]);

  // ── render ────────────────────────────────────────────────────────────────

  const chevronLeft = (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
  const chevronRight = (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );

  return (
    <>
      {/* ── Main carousel ─────────────────────────────────────────────────── */}
      <div
        ref={carouselRef}
        className="relative w-full h-full overflow-hidden group bg-base-300"
      >
        {/* Photo with Ken Burns + fade-in */}
        <img
          key={animKey}
          src={photos[currentIndex]}
          alt={`Photo ${currentIndex + 1} of ${photos.length}`}
          className={`w-full h-full object-cover cursor-pointer carousel-photo-${kbVariant}`}
          onClick={() => setIsModalOpen(true)}
        />

        {/* Subtle bottom gradient so progress bars are legible */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        {/* Nav arrows — appear on hover/focus only */}
        <button
          onClick={(e) => { e.stopPropagation(); prevSlide(); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 text-white/60 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Previous photo"
        >
          {chevronLeft}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); nextSlide(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 text-white/60 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Next photo"
        >
          {chevronRight}
        </button>

        {/* Progress bar indicators (Stories-style) */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex gap-1">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
              className="relative h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden"
              aria-label={`Go to photo ${i + 1}`}
            >
              {/* completed */}
              {i < currentIndex && (
                <span className="absolute inset-0 bg-white" />
              )}
              {/* active — animated fill */}
              {i === currentIndex && (
                <span
                  className="absolute inset-y-0 left-0 bg-white"
                  style={{ width: `${progress}%` }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Photo count pill — hover only */}
        <div className="absolute top-3 right-3 z-10 text-white/50 text-xs tabular-nums opacity-0 group-hover:opacity-100 transition-opacity select-none">
          {currentIndex + 1} / {photos.length}
        </div>
      </div>

      {/* ── Fullscreen modal ──────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/96 flex items-center justify-center"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Close */}
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 text-white/50 hover:text-white p-2 z-10 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image */}
          <img
            src={photos[currentIndex]}
            alt=""
            className="max-w-full max-h-[75vh] object-contain px-4"
            onClick={e => e.stopPropagation()}
          />

          {/* Nav */}
          <button
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 transition-colors"
            aria-label="Previous"
          >{chevronLeft}</button>
          <button
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 transition-colors"
            aria-label="Next"
          >{chevronRight}</button>

          {/* Thumbnail strip */}
          <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 px-4 pb-4 pt-2 overflow-x-auto bg-gradient-to-t from-black/60 to-transparent">
            {photos.map((photo, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); goTo(idx); }}
                className={`shrink-0 h-12 w-16 rounded overflow-hidden transition-opacity duration-200 ${
                  idx === currentIndex ? 'opacity-100 ring-1 ring-white/80' : 'opacity-35 hover:opacity-65'
                }`}
                aria-label={`View photo ${idx + 1}`}
              >
                <img src={photo} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
});

ImageCarousel.displayName = 'ImageCarousel';
export default ImageCarousel;
