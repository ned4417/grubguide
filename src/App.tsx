import { useState, useEffect, useRef } from 'react';
import GoogleAddressAutocomplete from './components/GoogleAddressInput';
import axios from 'axios';
import ImageCarousel from './components/Carousel';
import "react-multi-carousel/lib/styles.css";

// ─── helpers ────────────────────────────────────────────────────────────────

const PRICE_MAP: Record<number, string> = { 0: '', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

const DEFAULT_PHOTOS = [
  '/breakfast.jpg', '/burger.jpg', '/dessert.jpg',
  '/fancy.jpg', '/tacos.jpg', '/pizza.jpg', '/sushi.jpg', '/pasta.jpg',
];

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <span className="text-yellow-400 text-sm leading-none">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ opacity: i <= full ? 1 : i === full + 1 && rating % 1 >= 0.5 ? 0.45 : 0.18 }}>★</span>
      ))}
    </span>
  );
}

async function shareRestaurant(name: string, address: string, mapsUrl: string) {
  const data = { title: name, text: `${name} — ${address}`, url: mapsUrl };
  if (navigator.share && navigator.canShare?.(data)) {
    try { await navigator.share(data); return; } catch { /* cancelled */ }
  }
  try {
    await navigator.clipboard.writeText(`${name}\n${address}\n${mapsUrl}`);
    alert('Link copied!');
  } catch { alert(mapsUrl); }
}

// ─── component ──────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [restaurant, setRestaurant]           = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [radius, setRadius]                   = useState('10');
  const [loading, setLoading]                 = useState(false);
  const [locating, setLocating]               = useState(false);
  const [locError, setLocError]               = useState<string | null>(null);
  const [fetchError, setFetchError]           = useState<string | null>(null);
  const [photos, setPhotos]                   = useState<string[]>(DEFAULT_PHOTOS);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPhotos(restaurant?.photos?.length ? restaurant.photos : DEFAULT_PHOTOS);
  }, [restaurant]);

  useEffect(() => {
    if (restaurant && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [restaurant]);

  const fetchRestaurant = (address: string, rad: string, reroll = false, previousId?: string) => {
    setLoading(true);
    setFetchError(null);
    let url = `/api/getRestaurants?address=${encodeURIComponent(address)}&radius=${rad}`;
    if (reroll) {
      url += '&reroll=true';
      if (previousId) url += `&previousId=${previousId}`;
    }
    axios.get(url)
      .then(r => setRestaurant(r.data))
      .catch(e => {
        setRestaurant(null);
        setFetchError(e.response?.data?.error || 'No restaurants found. Try a wider radius.');
      })
      .finally(() => setLoading(false));
  };

  const handleSelectPlace = (place: google.maps.places.AutocompletePrediction) => {
    setSelectedAddress(place.description);
    fetchRestaurant(place.description, radius);
  };

  const rollAgain = () => fetchRestaurant(selectedAddress, radius, true, restaurant?.place_id);

  const handleLocate = () => {
    setLocating(true);
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported');
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
        setLocError(err.code === 1 ? 'Location access denied.' : 'Could not get location');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const price   = restaurant?.price_level ? PRICE_MAP[restaurant.price_level] : null;
  const mapsUrl = restaurant?.place_id
    ? `https://www.google.com/maps/place/?q=place_id:${restaurant.place_id}`
    : null;

  return (
    <main data-theme="dark" className="min-h-screen flex flex-col items-center px-4 sm:px-8 pb-20">

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <header className="pt-8 pb-6 w-full max-w-4xl">
        <img
          src="/grubguide_logo_bg-removebg-preview.png"
          alt="Grub Guide"
          className="w-[130px] sm:w-[160px]"
        />
      </header>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <section className="w-full max-w-4xl space-y-4">
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <GoogleAddressAutocomplete
              onSelect={handleSelectPlace}
              setSelectedAddress={setSelectedAddress}
              radius={radius}
            />
          </div>
          <button
            className="btn btn-outline border-base-content/20 hover:bg-base-content/5 hover:border-accent shrink-0 h-12"
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
          <p className="text-error text-xs">{locError}</p>
        )}

        {/* Radius */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-base-content/50 shrink-0">Radius</span>
          <input
            type="range"
            min={5}
            max={30}
            value={radius}
            className="range range-accent range-xs flex-1"
            onChange={e => setRadius(e.target.value)}
          />
          <span className="text-sm font-medium text-base-content/80 w-12 text-right shrink-0">{radius} mi</span>
        </div>
      </section>

      {/* ── Carousel ──────────────────────────────────────────────────────── */}
      <section className="w-full max-w-4xl mt-8">
        <div className="w-full aspect-[4/3] sm:aspect-[16/9] max-h-[50vh] sm:max-h-[480px] rounded-xl overflow-hidden shadow-2xl">
          <ImageCarousel photos={photos} />
        </div>
      </section>

      {/* ── Restaurant info ───────────────────────────────────────────────── */}
      <section className="w-full max-w-4xl mt-6 min-h-[60px]">

        {loading && (
          <div className="flex items-center gap-2.5 text-base-content/50">
            <span className="loading loading-dots loading-sm text-accent" />
            <span className="text-sm">Finding somewhere good…</span>
          </div>
        )}

        {!loading && fetchError && (
          <p className="text-error text-sm">{fetchError}</p>
        )}

        {!loading && restaurant && (
          <div ref={cardRef}>
            {/* Restaurant name — the hero */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight break-words mb-3">
              {restaurant.name}
            </h2>

            {/* One compact metadata row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/60 mb-2">
              {restaurant.rating > 0 && (
                <span className="flex items-center gap-1">
                  <Stars rating={restaurant.rating} />
                  <span className="font-medium text-base-content/80">{restaurant.rating.toFixed(1)}</span>
                  {restaurant.user_ratings_total > 0 && (
                    <span className="text-xs">({restaurant.user_ratings_total.toLocaleString()})</span>
                  )}
                </span>
              )}
              {price && <span className="font-medium text-accent">{price}</span>}
              {restaurant.distance && restaurant.distance !== 'N/A' && (
                <span>{restaurant.distance} away</span>
              )}
            </div>

            {/* Address */}
            <p className="text-sm text-base-content/40 mb-4">{restaurant.formatted_address}</p>

            {/* Links */}
            <div className="flex items-center gap-4">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:underline underline-offset-2"
                >
                  Open in Maps →
                </a>
              )}
              {mapsUrl && (
                <button
                  className="text-sm text-base-content/40 hover:text-base-content/70 transition-colors"
                  onClick={() => shareRestaurant(restaurant.name, restaurant.formatted_address, mapsUrl)}
                >
                  Share
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Roll Again ────────────────────────────────────────────────────── */}
      {selectedAddress && (
        <section className="w-full max-w-4xl mt-8">
          <button
            className="btn btn-primary w-full sm:w-auto sm:px-12"
            onClick={rollAgain}
            disabled={!restaurant || loading}
          >
            {loading ? (
              <><span className="loading loading-spinner loading-sm" /> Finding a spot…</>
            ) : (
              'Try another'
            )}
          </button>
        </section>
      )}

    </main>
  );
};

export default App;
