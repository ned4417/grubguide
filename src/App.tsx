import { useState, useEffect, useRef } from 'react';
import GoogleAddressAutocomplete from './components/GoogleAddressInput';
import axios from 'axios';
import ImageCarousel from './components/Carousel';
import "react-multi-carousel/lib/styles.css";

// ─── helpers ────────────────────────────────────────────────────────────────

const PRICE_MAP: Record<number, string> = { 0: 'Free', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

const DEFAULT_PHOTOS = [
  '/breakfast.jpg', '/burger.jpg', '/dessert.jpg',
  '/fancy.jpg', '/tacos.jpg', '/pizza.jpg', '/sushi.jpg', '/pasta.jpg',
];

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 tracking-tight text-base" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= Math.floor(rating);
        const half   = !filled && i === Math.ceil(rating) && rating % 1 >= 0.5;
        return (
          <span key={i} className={filled ? 'opacity-100' : half ? 'opacity-50' : 'opacity-20'}>★</span>
        );
      })}
    </span>
  );
}

async function shareRestaurant(name: string, address: string, mapsUrl: string) {
  const data = { title: name, text: `Check out ${name} — ${address}`, url: mapsUrl };
  if (navigator.share && navigator.canShare?.(data)) {
    try { await navigator.share(data); return; } catch { /* cancelled */ }
  }
  // Fallback: copy link
  try {
    await navigator.clipboard.writeText(`${name}\n${address}\n${mapsUrl}`);
    alert('Copied to clipboard!');
  } catch {
    alert(mapsUrl);
  }
}

// ─── component ──────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [restaurant, setRestaurant]       = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [radius, setRadius]               = useState('10');
  const [loading, setLoading]             = useState(false);
  const [locating, setLocating]           = useState(false);
  const [locError, setLocError]           = useState<string | null>(null);
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [photos, setPhotos]               = useState<string[]>(DEFAULT_PHOTOS);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPhotos(restaurant?.photos?.length ? restaurant.photos : DEFAULT_PHOTOS);
  }, [restaurant]);

  useEffect(() => {
    if (restaurant && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [restaurant]);

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchRestaurant = (address: string, rad: string, reroll = false, previousId?: string) => {
    setLoading(true);
    setFetchError(null);

    let url = `/api/getRestaurants?address=${encodeURIComponent(address)}&radius=${rad}`;
    if (reroll) {
      url += '&reroll=true';
      if (previousId) url += `&previousId=${previousId}`;
    }

    axios.get(url)
      .then(r  => setRestaurant(r.data))
      .catch(e => {
        setRestaurant(null);
        setFetchError(e.response?.data?.error || 'Could not find restaurants. Try a different location or larger radius.');
      })
      .finally(() => setLoading(false));
  };

  const handleSelectPlace = (place: google.maps.places.AutocompletePrediction) => {
    setSelectedAddress(place.description);
    fetchRestaurant(place.description, radius);
  };

  const rollAgain = () => {
    fetchRestaurant(selectedAddress, radius, true, restaurant?.place_id);
  };

  const handleLocate = () => {
    setLocating(true);
    setLocError(null);

    if (!navigator.geolocation) {
      setLocError('Geolocation not supported by your browser');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await axios.get(`/api/reverseGeocode?lat=${coords.latitude}&lng=${coords.longitude}`);
          if (res.data?.address) {
            const addr = res.data.address;
            setSelectedAddress(addr);
            fetchRestaurant(addr, radius);
          } else {
            setLocError('Could not determine your address');
          }
        } catch {
          setLocError('Error determining your location');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocError(err.code === 1 ? 'Location access denied. Please enable location services.' : 'Error getting your location');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── derived values ─────────────────────────────────────────────────────────

  const price   = restaurant?.price_level != null ? PRICE_MAP[restaurant.price_level] : null;
  const mapsUrl = restaurant?.place_id
    ? `https://www.google.com/maps/place/?q=place_id:${restaurant.place_id}`
    : null;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <main data-theme="dark" className="min-h-screen flex flex-col items-center px-4 sm:px-6 pb-16">

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <header className="w-full flex flex-col items-center pt-8 pb-2">
        <img
          src="/grubguide_logo_bg-removebg-preview.png"
          alt="Grub Guide"
          className="w-[140px] sm:w-[180px] md:w-[220px]"
        />
        <p className="text-xs sm:text-sm text-base-content/50 mt-1 tracking-wide">
          Let fate pick your next meal
        </p>
      </header>

      {/* ── Search card ───────────────────────────────────────────────────── */}
      <section className="w-full max-w-xl mt-5">
        <div className="bg-base-200/60 border border-base-300/30 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-5">

          {/* Address + locate */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-base-content/50 uppercase tracking-widest">
              Your location
            </label>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <GoogleAddressAutocomplete
                  onSelect={handleSelectPlace}
                  setSelectedAddress={setSelectedAddress}
                  radius={radius}
                />
              </div>
              <button
                className="btn btn-outline border-2 border-accent/60 hover:bg-accent/10 hover:border-accent shrink-0 h-12"
                onClick={handleLocate}
                disabled={locating}
                aria-label="Use my current location"
              >
                {locating ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            {locError && (
              <p className="text-error text-xs flex gap-1 items-start">
                <span className="shrink-0 mt-px">⚠</span>
                <span>{locError}</span>
              </p>
            )}
          </div>

          {/* Radius slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-base-content/50 uppercase tracking-widest">
                Search radius
              </label>
              <span className="text-sm font-bold text-accent">{radius} mi</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              value={radius}
              className="range range-accent range-sm w-full"
              onChange={e => setRadius(e.target.value)}
            />
            <div className="flex justify-between text-xs text-base-content/30 px-0.5">
              <span>5 mi</span>
              <span>30 mi</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── Photo carousel ────────────────────────────────────────────────── */}
      <section className="w-full max-w-4xl mt-6">
        <div className="w-full aspect-[4/3] sm:aspect-[16/9] max-h-[48vh] sm:max-h-[480px] rounded-2xl overflow-hidden shadow-2xl">
          <ImageCarousel photos={photos} />
        </div>
      </section>

      {/* ── Restaurant info card ──────────────────────────────────────────── */}
      <section className="w-full max-w-4xl mt-4 min-h-[80px]">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-8 text-base-content/60">
            <span className="loading loading-spinner loading-md text-accent" />
            <span className="text-sm animate-pulse">Finding the perfect spot…</span>
          </div>

        ) : fetchError ? (
          <div className="flex items-start gap-2 bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-sm text-error">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>{fetchError}</span>
          </div>

        ) : restaurant ? (
          <div
            ref={cardRef}
            className="bg-base-200/60 border border-base-300/30 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm"
          >
            {/* Name */}
            <h2 className="text-2xl sm:text-3xl font-bold break-words leading-tight mb-2">
              {restaurant.name}
            </h2>

            {/* Rating · Price · Distance */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
              {restaurant.rating > 0 && (
                <>
                  <StarRating rating={restaurant.rating} />
                  <span className="text-sm font-semibold">{restaurant.rating.toFixed(1)}</span>
                  {restaurant.user_ratings_total > 0 && (
                    <span className="text-xs text-base-content/40">
                      ({restaurant.user_ratings_total.toLocaleString()} reviews)
                    </span>
                  )}
                </>
              )}

              {price && (
                <>
                  {restaurant.rating > 0 && <span className="text-base-content/25 mx-1">·</span>}
                  <span className="text-sm font-semibold text-accent">{price}</span>
                </>
              )}

              {restaurant.distance && restaurant.distance !== 'N/A' && (
                <>
                  <span className="text-base-content/25 mx-1">·</span>
                  <span className="text-xs text-base-content/50">
                    📍 {restaurant.distance} away
                  </span>
                </>
              )}
            </div>

            {/* Address */}
            <p className="text-sm text-base-content/55 break-words mb-4">
              {restaurant.formatted_address}
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline border-base-content/20 hover:border-accent hover:text-accent gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Open in Maps
                </a>
              )}

              {mapsUrl && (
                <button
                  className="btn btn-sm btn-ghost border border-base-content/10 gap-1.5 hover:border-accent/40"
                  onClick={() => shareRestaurant(restaurant.name, restaurant.formatted_address, mapsUrl)}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Share
                </button>
              )}
            </div>
          </div>
        ) : selectedAddress && !loading ? (
          <div className="text-center text-sm text-base-content/30 py-6">
            Searching for restaurants…
          </div>
        ) : null}
      </section>

      {/* ── Roll Again CTA ────────────────────────────────────────────────── */}
      {selectedAddress && (
        <section className="w-full flex justify-center mt-6">
          <button
            className="btn btn-primary btn-lg gap-2 px-8 shadow-lg shadow-primary/20 min-w-[200px]"
            onClick={rollAgain}
            disabled={!restaurant || loading}
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Finding a spot…
              </>
            ) : (
              <>
                <span className="text-xl">🎲</span>
                Roll Again
              </>
            )}
          </button>
        </section>
      )}

    </main>
  );
};

export default App;
