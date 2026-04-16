import { LRUCache } from 'lru-cache';

// Initialize cache with 100 items and 5 minutes TTL
const cache = new LRUCache({
    max: 100,
    ttl: 1000 * 60 * 5, // 5 minutes
});

// Track shown restaurants for each address+radius combination
const shownRestaurantsMap = new Map();

// Function to convert miles to meters
const milesToMeters = (miles) => {
    return miles * 1609;
};

// Function to generate cache key
const generateCacheKey = (address, radius) => {
    return `${address}-${radius}`;
};

// Function to get or create a set of shown restaurants
const getShownRestaurants = (cacheKey) => {
    if (!shownRestaurantsMap.has(cacheKey)) {
        shownRestaurantsMap.set(cacheKey, new Set());
    }
    return shownRestaurantsMap.get(cacheKey);
};

// Function to calculate approximate distance using the Haversine formula
const calculateApproximateDistance = async (address, destLat, destLng, apiKey) => {
    try {
        // First, geocode the origin address to get its coordinates
        const geocodeResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
        );

        if (!geocodeResponse.ok) {
            return 'N/A';
        }

        const geocodeData = await geocodeResponse.json();

        if (geocodeData.status !== 'OK' || !geocodeData.results?.[0]?.geometry?.location) {
            return 'N/A';
        }

        const originLat = geocodeData.results[0].geometry.location.lat;
        const originLng = geocodeData.results[0].geometry.location.lng;

        // Calculate distance using Haversine formula
        const R = 3958.8; // Earth's radius in miles
        const dLat = toRadians(destLat - originLat);
        const dLng = toRadians(destLng - originLng);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(originLat)) * Math.cos(toRadians(destLat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return `${distance.toFixed(1)} mi`;
    } catch (error) {
        console.error('Error calculating approximate distance:', error);
        return 'N/A';
    }
};

// Helper function to convert degrees to radians
const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
};

export default async function handler(req, res) {
    const { address, radius: radiusParam, reroll, previousId } = req.query;

    // Use server API key for server-side calls (no referrer restrictions)
    const apiKey = process.env.GOOGLE_SERVER_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    if (!address || !radiusParam) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const radius = Number(radiusParam);
    const isReroll = reroll === 'true';
    const cacheKey = generateCacheKey(address, radius);

    // If this is not a reroll and we have a cached result, return it
    const cachedResult = cache.get(cacheKey);
    if (!isReroll && cachedResult) {
        return res.status(200).json(cachedResult);
    }

    // Get the set of shown restaurants for this address+radius
    const shownRestaurants = getShownRestaurants(cacheKey);

    // If we have a previousId, add it to the shown restaurants
    if (previousId) {
        shownRestaurants.add(previousId);
    }

    const radiusInMeters = milesToMeters(radius);

    try {
        // First, geocode the address to get coordinates for location bias
        const geocodeResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
        );

        let centerLat = 0;
        let centerLng = 0;

        if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            if (geocodeData.status === 'OK' && geocodeData.results?.[0]?.geometry?.location) {
                centerLat = geocodeData.results[0].geometry.location.lat;
                centerLng = geocodeData.results[0].geometry.location.lng;
            }
        }

        // Use the new Places API (New) with Text Search - requires POST request
        const restaurantsResponse = await fetch(
            `https://places.googleapis.com/v1/places:searchText`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.photos'
                },
                body: JSON.stringify({
                    textQuery: `restaurants near ${address}`,
                    locationBias: {
                        circle: {
                            center: {
                                latitude: centerLat,
                                longitude: centerLng
                            },
                            radius: radiusInMeters
                        }
                    }
                })
            }
        );

        if (!restaurantsResponse.ok) {
            const errorText = await restaurantsResponse.text();
            console.error('Places API error:', errorText);
            throw new Error(`Failed to fetch data from Google Places API: ${restaurantsResponse.status}`);
        }

        const restaurantsData = await restaurantsResponse.json();

        // Convert new API format to old format for compatibility
        const results = restaurantsData.places?.map((place) => ({
            place_id: place.id,
            name: place.displayName?.text || 'Unknown Restaurant',
            formatted_address: place.formattedAddress || '',
            rating: place.rating || 0,
            user_ratings_total: place.userRatingCount || 0,
            price_level: place.priceLevel || 0,
            geometry: {
                location: {
                    lat: place.location?.latitude || 0,
                    lng: place.location?.longitude || 0
                }
            },
            photos: place.photos || []
        })) || [];

        const convertedData = { results };

        if (convertedData.results.length === 0) {
            return res.status(404).json({ error: 'No restaurants found near the address' });
        }

        // Filter out restaurants that have already been shown
        let availableRestaurants = convertedData.results.filter(
            (restaurant) => !shownRestaurants.has(restaurant.place_id)
        );

        // If all restaurants have been shown, reset the shown restaurants set
        if (availableRestaurants.length === 0) {
            shownRestaurants.clear();
            if (previousId) {
                shownRestaurants.add(previousId);
            }
            availableRestaurants = convertedData.results.filter(
                (restaurant) => !shownRestaurants.has(restaurant.place_id)
            );
        }

        // Select a random restaurant from the available ones
        const randomIndex = Math.floor(Math.random() * availableRestaurants.length);
        const randomRestaurant = availableRestaurants[randomIndex];

        // Add the selected restaurant to the shown restaurants set
        shownRestaurants.add(randomRestaurant.place_id);

        // Extract photos from the restaurant data (new API includes photos in the response)
        const photos = randomRestaurant.photos?.map((photo) => {
            if (photo.name) {
                return `https://places.googleapis.com/v1/${photo.name}/media?key=${apiKey}&maxHeightPx=800&maxWidthPx=800`;
            }
            return null;
        }).filter(Boolean) || [];

        // Use fallback photos if no restaurant photos are available
        const finalPhotos = photos.length > 0 ? photos : [
            '/breakfast.jpg',
            '/burger.jpg',
            '/dessert.jpg',
            '/fancy.jpg',
            '/tacos.jpg'
        ];

        // Calculate distance using Haversine formula
        const distanceText = await calculateApproximateDistance(
            address,
            randomRestaurant.geometry.location.lat,
            randomRestaurant.geometry.location.lng,
            apiKey
        );

        // Combine all data
        const result = {
            ...randomRestaurant,
            photos: finalPhotos,
            distance: distanceText,
        };

        // Cache the result (only if it's not a reroll)
        if (!isReroll) {
            cache.set(cacheKey, result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
