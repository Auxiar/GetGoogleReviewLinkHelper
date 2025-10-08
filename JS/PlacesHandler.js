/**
 * Handles all Google Places API interactions
 */
class PlacesHandler {
    constructor() {
        this.mapsLoadingPromise = null;
        this.scriptLoadTimeout = null;
    }

    /**
     * Loads the Google Maps API
     * @param {string} apiKey - Google Maps API key
     * @returns {Promise} Resolves when API is loaded
     */
    loadGoogleMaps(apiKey) {
        console.log('loadGoogleMaps called');

        // If already loaded, return immediately
        if (window.google && window.google.maps && window.google.maps.places) {
            console.log('Google Maps already loaded');
            return Promise.resolve();
        }

        // If currently loading, return the existing promise
        if (this.mapsLoadingPromise) {
            console.log('Google Maps is currently loading, returning existing promise');
            return this.mapsLoadingPromise;
        }

        // Create new loading promise
        this.mapsLoadingPromise = new Promise((resolve, reject) => {
            console.log('Creating new Google Maps loading promise');

            // Set timeout in case callback never fires
            this.scriptLoadTimeout = setTimeout(() => {
                console.error('Script load timeout - callback was not called within 10 seconds');
                this.mapsLoadingPromise = null;
                reject(new Error('Timeout loading Google Maps. Please check your API key and try again.'));
            }, 10000);

            // Set up callback before loading script
            window.initMap = () => {
                console.log('initMap callback fired');
                clearTimeout(this.scriptLoadTimeout);
                delete window.initMap; // Clean up

                // Verify the API actually loaded
                if (window.google && window.google.maps && window.google.maps.places) {
                    console.log('Google Maps API fully loaded');
                    resolve();
                } else {
                    console.error('initMap called but API not fully available');
                    reject(new Error('Google Maps API did not load properly'));
                }
            };

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
            script.async = true;
            script.defer = true;

            script.onload = () => {
                console.log('Script tag loaded');
            };

            script.onerror = (error) => {
                console.error('Script load error:', error);
                clearTimeout(this.scriptLoadTimeout);
                this.mapsLoadingPromise = null;
                reject(new Error('Failed to load Google Maps script. Check your API key, internet connection, and browser console for details.'));
            };

            console.log('Appending script tag to head');
            document.head.appendChild(script);
        });

        return this.mapsLoadingPromise;
    }

    /**
     * Extract place ID from Google Maps URL if present
     * @param {string} input - URL or search query
     * @returns {string|null} Extracted place ID or null
     */
    extractPlaceIdFromUrl(input) {
        // Check for place_id parameter
        const placeIdMatch = input.match(/[?&]place_id=([^&]+)/);
        if (placeIdMatch) return placeIdMatch[1];

        // Check for ftid parameter (sometimes used)
        const ftidMatch = input.match(/[?&]ftid=([^&]+)/);
        if (ftidMatch) return ftidMatch[1];

        return null;
    }

    /**
     * Extract business name from Google Maps URL
     * @param {string} input - URL
     * @returns {string|null} Extracted business name or null
     */
    extractNameFromUrl(input) {
        // Try to extract from /place/ URL structure
        const placeMatch = input.match(/\/place\/([^\/]+)/);
        if (placeMatch) {
            return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        }
        return null;
    }

    /**
     * Search for a place using Text Search API
     * @param {string} searchQuery - Business name or search query
     * @returns {Promise<Object>} Place data
     */
    async searchPlaceByText(searchQuery) {
        console.log('Searching for place with text:', searchQuery);

        const { Place } = await google.maps.importLibrary("places");

        const request = {
            textQuery: searchQuery,
            fields: ['id', 'displayName', 'formattedAddress'],
            maxResultCount: 5 // Increased to get more results for validation
        };

        const { places } = await Place.searchByText(request);

        if (!places || places.length === 0) {
            throw new Error('No results found for the search query');
        }

        // Check if we have multiple results with different names/addresses
        if (places.length > 1) {
            console.log('Multiple results found:', places);

            // Check if all results have the same name (chain restaurants)
            const firstPlaceName = places[0].displayName;
            const allSameName = places.every(place => place.displayName === firstPlaceName);

            if (!allSameName) {
                // Different businesses found, need more specific search
                throw new Error('Multiple different businesses found. Please be more specific with your search terms.');
            }

            // Same business name but multiple locations
            if (places.length > 2) {
                // Many locations found, need to specify city/address
                throw new Error(`Multiple locations for "${firstPlaceName}" found. Please include city or address in your search.`);
            }
        }

        // Return the first (and likely only) relevant result
        return places[0];
    }

    /**
     * Get place details by ID using Places API
     * @param {string} placeId - Google Place ID
     * @returns {Promise<Object>} Place data
     */
    async getPlaceById(placeId) {
        console.log('Getting place details for ID:', placeId);

        const { Place } = await google.maps.importLibrary("places");

        const place = new Place({
            id: placeId,
            requestedLanguage: 'en'
        });

        await place.fetchFields({
            fields: ['id', 'displayName', 'formattedAddress']
        });

        return place;
    }

    /**
     * Search for a place using either ID or text query
     * @param {string} input - Google Maps URL, place ID, or business name
     * @returns {Promise<Object>} Place data
     */
    async searchPlace(input) {
        // Check if input is a Google Maps URL with a place_id
        const extractedPlaceId = this.extractPlaceIdFromUrl(input);
        console.log('Extracted Place ID:', extractedPlaceId);

        if (extractedPlaceId) {
            // Get place by ID using new API
            return await this.getPlaceById(extractedPlaceId);
        } else {
            // Extract business name from URL or use input as-is
            const searchQuery = this.extractNameFromUrl(input) || input;
            console.log('Search query:', searchQuery);

            // Search for place using new API
            return await this.searchPlaceByText(searchQuery);
        }
    }
}

// Create a singleton instance
const placesHandler = new PlacesHandler();