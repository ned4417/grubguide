// components/GoogleAddressAutocomplete.tsx
import React, { useState, useRef, useEffect } from 'react';

interface GoogleAddressAutocompleteProps {
  onSelect: (place: google.maps.places.AutocompletePrediction) => void;
  setSelectedAddress: React.Dispatch<React.SetStateAction<string>>;
  radius?: string;
}

const GoogleAddressAutocomplete: React.FC<GoogleAddressAutocompleteProps> = ({ onSelect, setSelectedAddress }) => {
  const [autocompleteInput, setAutocompleteInput] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const predictionsRef = useRef<HTMLDivElement>(null);

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

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAutocompleteInput(event.target.value);
    if (event.target.value) {
      const autocompleteService = new google.maps.places.AutocompleteService();
      autocompleteService.getPlacePredictions({ input: event.target.value }, (predictions, status) => {
        if (status === 'OK' && predictions) {
          setPredictions(predictions);
        }
      });
    } else {
      setPredictions([]);
    }
  };

  // Handle the selection of a suggestion
  const handleSelectSuggestion = (suggestion: google.maps.places.AutocompletePrediction) => {
    setAutocompleteInput(suggestion.description);
    setSelectedAddress(suggestion.description); // Set the selected address in page.tsx state
    onSelect(suggestion); // Pass the selected suggestion back to page.tsx
    setPredictions([]);
    setIsFocused(false);
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
          onFocus={() => setIsFocused(true)}
          placeholder="Enter a location"
          aria-label="Location search"
        />
        {autocompleteInput && (
          <button
            className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-400 hover:text-gray-200 min-w-[44px]"
            onClick={() => {
              setAutocompleteInput('');
              setPredictions([]);
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
          className="absolute z-10 mt-1 w-full bg-base-100 shadow-lg rounded-md border border-base-300 max-h-60 overflow-y-auto"
        >
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              className="w-full text-left py-3 px-4 cursor-pointer hover:bg-base-200 active:bg-base-300 text-sm border-b border-base-200 last:border-b-0 min-h-[44px]"
              onMouseDown={(e) => {
                // Use onMouseDown so it fires before the input's onBlur clears predictions
                e.preventDefault();
                handleSelectSuggestion(prediction);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleSelectSuggestion(prediction);
              }}
            >
              {prediction.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GoogleAddressAutocomplete;
