import { memo, useState, useEffect, useCallback, useRef } from "react";

interface CarouselProps {
  photos: string[];
}

const ImageCarousel = memo(({ photos }: CarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Simple navigation functions
  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
  }, [photos.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Re-show swipe hint whenever the photo set changes
  useEffect(() => {
    setCurrentIndex(0);
    setShowSwipeHint(true);
  }, [photos]);

  // Auto-hide swipe hint after 3 seconds
  useEffect(() => {
    if (!showSwipeHint) return;
    const timer = setTimeout(() => {
      setShowSwipeHint(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [showSwipeHint]);

  // Touch handlers
  useEffect(() => {
    const element = carouselRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchEndX.current = null;
      setIsSwiping(true);
      setShowSwipeHint(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;

      const horizontalDistance = currentX - touchStartX.current;
      const verticalDistance = Math.abs(currentY - touchStartY.current);

      // If vertical scrolling, don't handle as swipe
      if (verticalDistance > Math.abs(horizontalDistance) * 1.2) {
        touchStartX.current = null;
        touchStartY.current = null;
        setIsSwiping(false);
        return;
      }

      if (Math.abs(horizontalDistance) > 10) {
        e.preventDefault();
      }

      touchEndX.current = currentX;
    };

    const handleTouchEnd = () => {
      if (touchStartX.current === null || touchEndX.current === null) {
        setIsSwiping(false);
        return;
      }

      const swipeDistance = touchEndX.current - touchStartX.current;
      const minSwipeDistance = 30;

      if (swipeDistance > minSwipeDistance) {
        prevSlide();
      } else if (swipeDistance < -minSwipeDistance) {
        nextSlide();
      }

      touchStartX.current = null;
      touchStartY.current = null;
      touchEndX.current = null;
      setIsSwiping(false);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [nextSlide, prevSlide]);

  // Auto-advance slides every 5 seconds if not in modal view
  useEffect(() => {
    if (isModalOpen) {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
      return;
    }

    autoplayRef.current = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    };
  }, [isModalOpen, nextSlide]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'Escape' && isModalOpen) closeModal();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [nextSlide, prevSlide, isModalOpen]);

  // Get the current photo
  const currentPhoto = photos[currentIndex];

  return (
    <>
      <div
        className="relative w-full h-full rounded-lg overflow-hidden shadow-xl group"
      >
        {/* Main Image */}
        <div
          ref={carouselRef}
          className="relative w-full h-full cursor-pointer"
          onClick={openModal}
        >
          {/* Swipe hint */}
          {showSwipeHint && (
            <div className="absolute inset-0 z-20 pointer-events-none sm:hidden flex items-center justify-center">
              <div className="text-white text-xs bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                Swipe to navigate
              </div>
            </div>
          )}
          <img
            src={currentPhoto}
            alt={`Food item ${currentIndex + 1}`}
            className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
          />

          {/* Image overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/50 transition-all transform hover:scale-110 z-10 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
          aria-label="Previous image"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/50 transition-all transform hover:scale-110 z-10 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
          aria-label="Next image"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Indicator Pills */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-1 sm:space-x-2 z-10">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`transition-all duration-300 ease-in-out rounded-full ${
                index === currentIndex
                  ? 'w-5 sm:w-8 h-1.5 sm:h-2 bg-accent'
                  : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to image ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>

        {/* Fullscreen button */}
        <button
          onClick={openModal}
          className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/50 transition-all transform hover:scale-110 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="View fullscreen"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Modal View */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-95"
          onClick={closeModal}
        >
          {/* Top controls bar */}
          <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 z-20">
            <div className="text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm bg-black/30">
              {currentIndex + 1} / {photos.length}
            </div>

            <button
              onClick={closeModal}
              className="text-white hover:text-accent p-2 rounded-full backdrop-blur-sm bg-black/30"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Image */}
          <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 pb-20 sm:pb-24" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[currentIndex]}
              alt={`Full size ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Navigation buttons */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 bg-black/30 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/50 transition-all transform hover:scale-110"
            aria-label="Previous image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 bg-black/30 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/50 transition-all transform hover:scale-110"
            aria-label="Next image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Thumbnail strip */}
          <div className="absolute bottom-0 left-0 right-0 overflow-x-auto pb-3 pt-2 z-10 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex items-center gap-1 sm:gap-2 px-4 min-w-max mx-auto">
              {photos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`relative h-12 sm:h-16 w-16 sm:w-24 rounded-md overflow-hidden transition-all duration-300 shrink-0 ${
                    idx === currentIndex
                      ? 'ring-1 sm:ring-2 ring-accent scale-110'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  aria-label={`View image ${idx + 1}`}
                >
                  <img
                    src={photo}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

ImageCarousel.displayName = 'ImageCarousel';

export default ImageCarousel;
