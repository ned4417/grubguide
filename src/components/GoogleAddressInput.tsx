import React, { useState, useRef, useEffect } from 'react';

interface GoogleAddressAutocompleteProps {
  onSelect: (place: google.maps.places.AutocompletePrediction) => void;
  setSelectedAddress: React.Dispatch<React.SetStateAction<string>>;
  radius?: string;
}

interface Prediction {
  description: string;
  placeId: string;
}

const GoogleAddressAutocomplete: React.FC<GoogleAddressAutocompleteProps> = ({ onSelect, setSelectedAddress }) => {
  const [autocompleteInput, setAutocompleteInput] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isApiReady, setIsApiReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const predictionsRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<any>(null);

  // Poll until google.maps.places is available (script loads async)
  useEffect(() => {
    const check = () => {
      if ((window as any).google?.maps?.places) {
        setIsApiReady(true);
        return true;
      }
      return false;
    };

    if (check()) return; // Already loaded

    const interval = setInterval(() => {
      if (check()) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Close predictions when clicking or touching outside
  useEffect(() => {
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (
        predictionsRef.current &&
        !predictionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setPredictions([]);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setAutocompleteInput(value);

    if (!value || !isApiReady) {
      setPredictions([]);
      return;
    }

    try {
      const places = (google.maps as any).places;

      if (places.AutocompleteSuggestion) {
        // New Places API (recommended as of March 2025)
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new places.AutocompleteSessionToken();
        }
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value,
          sessionToken: sessionTokenRef.current,
        });
        setPredictions(
          suggestions.map((s: any) => ({
            description: s.placePrediction.text.toString(),
            placeId: s.placePrediction.placeId,
          }))
        );
      } else {
        // Fallback: legacy AutocompleteService
        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions({ input: value }, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results.map(r => ({ description: r.description, placeId: r.place_id })));
          } else {
            setPredictions([]);
          }
        });
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
      setPredictions([]);
    }
  };

  const handleSelectSuggestion = (description: string, placeId: string) => {
    setAutocompleteInput(description);
    setSelectedAddress(description);
    // Reset session token after selection (billing best practice)
    sessionTokenRef.current = null;
    setPredictions([]);
    onSelect({ description, place_id: placeId } as google.maps.places.AutocompletePrediction);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          className="input input-bordered w-full shadow-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200"
          type="text"
          autoComplete="off"
          value={autocompleteInput}
          onChange={handleInputChange}
          placeholder={isApiReady ? 'Enter a location' : 'Loading maps…'}
          disabled={!isApiReady}
          aria-label="Location search"
          aria-autocomplete="list"
          aria-haspopup="listbox"
        />
        {autocompleteInput && (
          <button
            className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-400 hover:text-gray-200 min-w-[44px]"
            onClick={() => {
              setAutocompleteInput('');
              setPredictions([]);
              sessionTokenRef.current = null;
              inputRef.current?.focus();
            }}
            aria-label="Clear input"
          >
            ✕
          </button>
        )}
      </div>

      {predictions.length > 0 && (
        <div
          ref={predictionsRef}
          role="listbox"
          className="absolute z-10 mt-1 w-full bg-base-100 shadow-lg rounded-md border border-base-300 max-h-60 overflow-y-auto"
        >
          {predictions.map((p) => (
            <button
              key={p.placeId}
              role="option"
              className="w-full text-left py-3 px-4 cursor-pointer hover:bg-base-200 active:bg-base-300 text-sm border-b border-base-200 last:border-b-0 min-h-[44px]"
              onMouseDown={(e) => e.preventDefault()} // keep input focused
              onClick={() => handleSelectSuggestion(p.description, p.placeId)}
            >
              {p.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GoogleAddressAutocomplete;
