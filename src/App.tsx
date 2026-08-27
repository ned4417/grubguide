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
    <span className="text-yellow-400 text-sm leading-none" aria-label={`${rating} stars`}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ opacity: i <= full ? 1 : i === full+1 && rating%1 >= 0.5 ? 0.45 : 0.18 }}>★</span>
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

// ─── sub-components ──────────────────────────────────────────────────────────

function RestaurantCard({
  restaurant,
  mapsUrl,
  price,
  cardRef,
  vibeDescription,
  vibeLoading,
}: {
  restaurant: any;
  mapsUrl: string | null;
  price: string | null;
  cardRef?: React.RefObject<HTMLDivElement>;
  vibeDescription?: string | null;
  vibeLoading?: boolean;
}) {
  return (
    <div ref={cardRef}>
      {/* Name — display font for editorial feel */}
      <h2 className="font-display text-4xl sm:text-5xl lg:text-4xl xl:text-5xl font-bold leading-tight break-words mb-3">
        {restaurant.name}
      </h2>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/55 mb-2">
        {restaurant.rating > 0 && (
          <span className="flex items-center gap-1.5">
            <Stars rating={restaurant.rating} />
            <span className="font-medium text-base-content/80">{restaurant.rating.toFixed(1)}</span>
            {restaurant.user_ratings_total > 0 && (
              <span className="text-xs text-base-content/40">
                ({restaurant.user_ratings_total.toLocaleString()})
              </span>
            )}
          </span>
        )}
        {price && (
          <>
            <span className="text-base-content/20">·</span>
            <span className="font-medium text-orange-400">{price}</span>
          </>
        )}
        {restaurant.distance && restaurant.distance !== 'N/A' && (
          <>
            <span className="text-base-content/20">·</span>
            <span>{restaurant.distance} away</span>
          </>
        )}
      </div>

      {/* Address + open status */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-sm text-base-content/35 break-words">{restaurant.formatted_address}</p>
        {restaurant.opening_hours && (
          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
            restaurant.opening_hours.open_now
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-red-500/15 text-red-400'
          }`}>
            {restaurant.opening_hours.open_now ? 'Open now' : 'Closed'}
          </span>
        )}
      </div>

      {/* AI vibe description */}
      {vibeLoading && (
        <div className="flex items-center gap-2 mb-4">
          <span className="loading loading-dots loading-xs" style={{ color: '#f97316' }} />
          <span className="text-xs text-base-content/30">Getting the vibe…</span>
        </div>
      )}
      {!vibeLoading && vibeDescription && (
        <p className="text-sm text-base-content/60 leading-relaxed mb-5 italic border-l-2 border-orange-500/40 pl-3">
          {vibeDescription}
        </p>
      )}

      {/* Links */}
      {mapsUrl && (
        <div className="flex items-center gap-5">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
          >
            Open in Maps →
          </a>
          <button
            className="text-sm text-base-content/35 hover:text-base-content/60 transition-colors"
            onClick={() => shareRestaurant(restaurant.name, restaurant.formatted_address, mapsUrl)}
          >
            Share
          </button>
        </div>
      )}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [restaurant, setRestaurant]           = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [radius, setRadius]                   = useState('10');
  const [loading, setLoading]                 = useState(false);
  const [locating, setLocating]               = useState(false);
  const [locError, setLocError]               = useState<string | null>(null);
  const [fetchError, setFetchError]           = useState<string | null>(null);
  const [photos, setPhotos]                   = useState<string[]>(DEFAULT_PHOTOS);
  const [vibeDescription, setVibeDescription] = useState<string | null>(null);
  const [vibeLoading, setVibeLoading]         = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPhotos(restaurant?.photos?.length ? restaurant.photos : DEFAULT_PHOTOS);
  }, [restaurant]);

  // Fetch AI vibe description whenever a new restaurant loads
  useEffect(() => {
    if (!restaurant) { setVibeDescription(null); return; }
    setVibeLoading(true);
    setVibeDescription(null);
    axios.post('/api/getVibeDescription', {
      name: restaurant.name,
      address: restaurant.formatted_address,
      rating: restaurant.rating,
      priceLevel: restaurant.price_level,
      distance: restaurant.distance,
    })
      .then(r => setVibeDescription(r.data.description || null))
      .catch(() => setVibeDescription(null))
      .finally(() => setVibeLoading(false));
  }, [restaurant]);

  // On mobile, scroll the result into view after it appears below the carousel
  useEffect(() => {
    if (restaurant && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [restaurant]);

  // ── data ───────────────────────────────────────────────────────────────────

  const fetchRestaurant = (address: string, rad: string, reroll = false, previousId?: string) => {
    if (!address.trim()) return;
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

  const handleFind = () => {
    if (restaurant) {
      fetchRestaurant(selectedAddress, radius, true, restaurant.place_id);
    } else {
      fetchRestaurant(selectedAddress, radius);
    }
  };

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

  // ── derived ────────────────────────────────────────────────────────────────

  const price   = restaurant?.price_level ? PRICE_MAP[restaurant.price_level] : null;
  const mapsUrl = restaurant?.place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.place_id}`
    : null;
  const hasAddress = selectedAddress.trim().length > 0;

  // ── shared search UI ───────────────────────────────────────────────────────

  const searchSection = (
    <div className="space-y-4">
      {/* Address + locate */}
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <GoogleAddressAutocomplete
            onSelect={handleSelectPlace}
            setSelectedAddress={setSelectedAddress}
            radius={radius}
          />
        </div>
        <button
          className="btn btn-outline border-base-content/15 hover:bg-base-content/5 hover:border-base-content/30 shrink-0 h-12 gap-2"
          onClick={handleLocate}
          disabled={locating}
          aria-label="Use my current location"
        >
          {locating ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          )}
          <span className="hidden sm:inline text-sm">My location</span>
        </button>
      </div>

      {locError && <p className="text-error text-xs">{locError}</p>}

      {/* Radius */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-base-content/35 shrink-0">Radius</span>
        <input
          type="range"
          min={5}
          max={30}
          value={radius}
          className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
          style={{ accentColor: '#f97316' }}
          onChange={e => setRadius(e.target.value)}
        />
        <span className="text-sm text-base-content/55 w-12 text-right tabular-nums shrink-0">{radius} mi</span>
      </div>

      {/* CTA */}
      <button
        className="w-full py-3.5 rounded-xl font-semibold text-base transition-all duration-150
          bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white
          disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={handleFind}
        disabled={!hasAddress || loading}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="loading loading-spinner loading-sm" />
            Finding a spot…
          </span>
        ) : restaurant ? (
          'Try another'
        ) : (
          'Find a restaurant'
        )}
      </button>

      {!hasAddress && (
        <p className="text-center text-xs text-base-content/25">
          Enter an address or use your location above
        </p>
      )}

      {!loading && fetchError && (
        <p className="text-error text-sm">{fetchError}</p>
      )}
    </div>
  );

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <main data-theme="dark" className="min-h-screen lg:grid lg:grid-cols-[460px_1fr]">

      {/* ── LEFT PANEL ────────────────────────────────────────────────────── */}
      <div className="lg:h-screen lg:overflow-y-auto flex flex-col px-6 sm:px-10 lg:px-12 pt-10 pb-8">

        {/* Logo + tagline */}
        <div className="mb-8">
          <img
            src="/grubguide_logo_bg-removebg-preview.png"
            alt="Grub Guide"
            className="w-[160px] sm:w-[200px] mb-5"
          />
          <p className="text-2xl sm:text-3xl font-semibold leading-snug text-base-content/80 max-w-xs">
            Stop overthinking dinner.
            <span className="text-base-content/40"> We'll pick.</span>
          </p>
          <p className="mt-2 text-sm text-base-content/40 max-w-xs leading-relaxed">
            Enter your location and we'll choose a random restaurant nearby.
          </p>
        </div>

        {/* Search */}
        {searchSection}

        {/* Result — desktop only (on mobile it lives below the carousel) */}
        {(loading || restaurant) && (
          <div className="hidden lg:block mt-10 pt-8 border-t border-base-content/8">
            {loading ? (
              <div className="flex items-center gap-2.5 text-base-content/40">
                <span className="loading loading-dots loading-sm" style={{ color: '#f97316' }} />
                <span className="text-sm">Finding somewhere good…</span>
              </div>
            ) : restaurant ? (
              <RestaurantCard
                restaurant={restaurant}
                mapsUrl={mapsUrl}
                price={price}
                vibeDescription={vibeDescription}
                vibeLoading={vibeLoading}
              />
            ) : null}
          </div>
        )}

        {/* Spacer pushes content up on tall desktop screens */}
        <div className="flex-1 hidden lg:block" />
      </div>

      {/* ── RIGHT PANEL — carousel ─────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-0 lg:h-screen">
        {/* Mobile: styled as a contained carousel with margin + rounded corners */}
        <div className="lg:hidden mx-4 sm:mx-10 mt-8 rounded-xl overflow-hidden shadow-2xl
          aspect-[4/3] sm:aspect-video max-h-[50vh]">
          <ImageCarousel photos={photos} />
        </div>

        {/* Desktop: fills the entire right panel edge-to-edge */}
        <div className="hidden lg:block w-full h-full">
          <ImageCarousel photos={photos} />
        </div>
      </div>

      {/* ── MOBILE RESULT — below the carousel ────────────────────────────── */}
      <div className="lg:hidden px-6 sm:px-10 py-8 col-span-full">
        {loading ? (
          <div className="flex items-center gap-2.5 text-base-content/40">
            <span className="loading loading-dots loading-sm" style={{ color: '#f97316' }} />
            <span className="text-sm">Finding somewhere good…</span>
          </div>
        ) : restaurant ? (
          <RestaurantCard
            restaurant={restaurant}
            mapsUrl={mapsUrl}
            price={price}
            cardRef={cardRef}
            vibeDescription={vibeDescription}
            vibeLoading={vibeLoading}
          />
        ) : null}
      </div>

    </main>
  );
};

export default App;
