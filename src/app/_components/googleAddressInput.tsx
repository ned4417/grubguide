// components/GoogleAddressAutocomplete.tsx
import React, { useState, useRef, useEffect } from 'react';

interface GoogleAddressAutocompleteProps {
  onSelect: (place: google.maps.places.AutocompletePrediction) => void;
  setSelectedAddress: React.Dispatch<React.SetStateAction<string>>;
  radius?: string;
}

const GoogleAddressAutocomplete: React.FC<GoogleAddressAutocompleteProps> = ({ onSelect, setSelectedAddress }) => {
  const [inputValue, setInputValue] = useState('');
  const [isApiReady, setIsApiReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Poll until window.google.maps.places is available (script loads async)
  useEffect(() => {
    const check = () => {
      if ((window as any).google?.maps?.places) {
        setIsApiReady(true);
        return true;
      }
      return false;
    };
    if (check()) return;
    const interval = setInterval(() => { if (check()) clearInterval(interval); }, 200);
    return () => clearInterval(interval);
  }, []);

  // Attach the Autocomplete widget once the API is ready
  useEffect(() => {
    if (!isApiReady || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'place_id', 'name'],
    });
    autocompleteRef.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const address = place.formatted_address || place.name || '';
      if (!address) return;

      setInputValue(address);
      setSelectedAddress(address);
      // Cast to satisfy the existing onSelect signature; page.tsx only uses .description
      onSelect({ description: address, place_id: place.place_id ?? '' } as google.maps.places.AutocompletePrediction);
    });
  }, [isApiReady, onSelect, setSelectedAddress]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          className="input input-bordered w-full shadow-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200"
          type="text"
          autoComplete="off"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isApiReady ? 'Enter a location' : 'Loading maps\u2026'}
          disabled={!isApiReady}
          aria-label="Location search"
        />
        {inputValue && (
          <button
            className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-400 hover:text-gray-200 min-w-[44px]"
            onClick={() => {
              setInputValue('');
              inputRef.current?.focus();
            }}
            aria-label="Clear input"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default GoogleAddressAutocomplete;
