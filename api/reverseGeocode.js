export default async function handler(req, res) {
    const { lat, lng } = req.query;

    // Use server API key for server-side calls (no referrer restrictions)
    const apiKey = process.env.GOOGLE_SERVER_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Missing required parameters: lat and lng' });
    }

    try {
        // Call Google's Geocoding API to convert coordinates to address
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch data from Google Geocoding API');
        }

        const data = await response.json();

        // Check if we got a REQUEST_DENIED error
        if (data.status === 'REQUEST_DENIED') {
            console.log('Geocoding API access denied, using fallback address for testing');

            // For testing purposes, generate a location name based on the coordinates
            return res.status(200).json({
                address: `Location at ${lat}, ${lng}`,
                note: "Using approximate location. API key needs Geocoding API enabled."
            });
        }

        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
            return res.status(404).json({ error: 'No address found for these coordinates' });
        }

        // Return the formatted address from the first result
        return res.status(200).json({
            address: data.results[0].formatted_address
        });
    } catch (error) {
        console.error('Error reverse geocoding:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
