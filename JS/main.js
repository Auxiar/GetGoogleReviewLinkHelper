/**
 * Main application controller
 */
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const elements = {
        apiKey: document.getElementById('apiKey'),
        placeInput: document.getElementById('placeInput'),
        fetchBtn: document.getElementById('fetchBtn'),
        output: document.getElementById('output')
    };

    // State
    let fullApiKey = '';
    let currentPlaceData = null;

    // Initialize the app
    init();

    /**
     * Initialize the application
     */
    function init() {
        console.log('Page loaded, checking for saved data...');

        // Load saved data
        loadSavedData();

        // Set up event listeners
        setupEventListeners();
    }

    /**
     * Load saved data from localStorage
     */
    function loadSavedData() {
        // Load API key
        const savedKey = getStoredApiKey();
        if (savedKey) {
            fullApiKey = savedKey;
            elements.apiKey.value = maskApiKey(savedKey);
            console.log('API key loaded and masked');
        }

        // Load business input
        const savedBusinessInput = getStoredBusinessInput();
        if (savedBusinessInput) {
            elements.placeInput.value = savedBusinessInput;
            console.log('Business input loaded');
        }

        // Load QR settings
        const savedQrSettings = qrCodeHandler.getStoredQrSettings();
        if (savedQrSettings) {
            console.log('QR settings loaded');
        }

        // Load and display last search result if available
        const savedSearchResult = getStoredSearchResult();
        if (savedSearchResult) {
            displayStoredSearchResult(savedSearchResult);
            console.log('Last search result loaded');
        }
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // API key field events
        elements.apiKey.addEventListener('focus', function () {
            if (fullApiKey && this.value.includes('•')) {
                this.value = fullApiKey;
            }
        });

        elements.apiKey.addEventListener('blur', function () {
            const currentValue = this.value.trim();
            if (currentValue && !currentValue.includes('•')) {
                fullApiKey = currentValue;
                setStoredApiKey(currentValue);
                this.value = maskApiKey(currentValue);
            }
        });

        // Business input event
        elements.placeInput.addEventListener('input', function () {
            setStoredBusinessInput(this.value);
        });

        // Fetch button event
        elements.fetchBtn.addEventListener('click', handleSearch);
    }

    /**
     * Handle search button click
     */
    async function handleSearch() {
        const apiKey = elements.apiKey.value.trim();
        const input = elements.placeInput.value.trim();

        // Clear previous output
        elements.output.textContent = '';

        // Validate inputs
        if (!apiKey || !input) {
            elements.output.innerHTML = '<p style="color:red;">Enter both API key and location input.</p>';
            return;
        }

        // Handle API key
        if (!apiKey.includes('•')) {
            fullApiKey = apiKey;
            setStoredApiKey(apiKey);
            elements.apiKey.value = maskApiKey(apiKey);
        }

        // Save the business input
        setStoredBusinessInput(input);

        // Show loading state
        elements.output.innerHTML = 'Loading...<div class="debug">Check browser console (F12) for debug info</div>';

        console.log('=== Starting place search ===');
        console.log('API Key:', fullApiKey.substring(0, 10) + '...');
        console.log('Input:', input);

        try {
            // Load Google Maps API
            console.log('Calling loadGoogleMaps...');
            await placesHandler.loadGoogleMaps(fullApiKey);
            console.log('Google Maps loaded successfully');

            // Search for the place
            const place = await placesHandler.searchPlace(input);
            console.log('Place found:', place);

            // Store the search result
            const placeData = {
                id: place.id,
                displayName: place.displayName,
                formattedAddress: place.formattedAddress
            };
            setStoredSearchResult(placeData);
            currentPlaceData = placeData;

            // Display the result
            displayPlaceInfo(place, elements.output);

        } catch (err) {
            console.error('Error:', err);
            elements.output.innerHTML = `<p style="color:red;"><strong>Error:</strong> ${err.message}</p><div class="debug">Check browser console (F12) for full error details</div>`;
            currentPlaceData = null;
        }
    }

    /**
     * Display place information in the output element
     * @param {Object} place - Place data from Google Places API
     * @param {HTMLElement} output - Output element to display results in
     */
    function displayPlaceInfo(place, output) {
        console.log('Displaying place info:', place);

        // The new API uses 'id' instead of 'place_id'
        const placeId = place.id;
        const placeName = place.displayName || 'N/A';
        const placeAddress = place.formattedAddress || 'N/A';
        const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
        const businessUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + placeAddress)}&query_place_id=${placeId}`;

        // Clear the output first to ensure we're not appending to existing content
        output.innerHTML = '';

        // Create the result container
        const resultContainer = document.createElement('div');
        resultContainer.innerHTML = `
      <p><strong>Place:</strong> ${placeName}</p>
      <p><strong>Address:</strong> ${placeAddress}</p>
      <p><strong>Place ID:</strong> ${placeId}</p>
      <div class="button-container">
        <a href="${businessUrl}" class="business-link" target="_blank">Google Maps Business Page</a>
      </div>
      <div class="link-box">
        <a href="${reviewUrl}" class="review-link" target="_blank">Google Review Page</a>
        <button class="copy">Copy Link</button>
      </div>
    `;

        // Add the container to the output
        output.appendChild(resultContainer);

        // Add copy button functionality with proper closure
        const copyButton = resultContainer.querySelector('button.copy');
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(reviewUrl);
        });

        // Generate QR codes
        qrCodeHandler.generateQRCodes(placeId, placeName, reviewUrl, businessUrl, output);
    }

    /**
     * Display stored search result
     * @param {Object} placeData - Stored place data
     */
    function displayStoredSearchResult(placeData) {
        const placeId = placeData.id;
        const placeName = placeData.displayName || 'N/A';
        const placeAddress = placeData.formattedAddress || 'N/A';
        const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
        const businessUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + placeAddress)}&query_place_id=${placeId}`;

        // Clear the output first
        elements.output.innerHTML = '';

        // Add the storage note at the top
        const storageNote = document.createElement('p');
        storageNote.className = 'default-output';
        storageNote.textContent = 'Previously loaded from local storage';
        elements.output.appendChild(storageNote);

        // Create the result container
        const resultContainer = document.createElement('div');
        resultContainer.innerHTML = `
      <p><strong>Place:</strong> ${placeName}</p>
      <p><strong>Address:</strong> ${placeAddress}</p>
      <p><strong>Place ID:</strong> ${placeId}</p>
      <div class="button-container">
        <a href="${businessUrl}" class="business-link" target="_blank">Google Maps Business Page</a>
      </div>
      <div class="link-box">
        <a href="${reviewUrl}" class="review-link" target="_blank">Google Review Page</a>
        <button class="copy">Copy Link</button>
      </div>
    `;

        // Add the container to the output
        elements.output.appendChild(resultContainer);

        // Add copy button functionality with proper closure
        const copyButton = resultContainer.querySelector('button.copy');
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(reviewUrl);
        });

        // Store current place data
        currentPlaceData = placeData;

        // Generate QR codes
        qrCodeHandler.generateQRCodes(placeId, placeName, reviewUrl, businessUrl, elements.output);
    }

    /**
     * Mask API key for display
     * @param {string} apiKey - Full API key
     * @returns {string} Masked API key
     */
    function maskApiKey(apiKey) {
        if (apiKey.length <= 6) return apiKey;
        return '•'.repeat(apiKey.length - 6) + apiKey.slice(-6);
    }

    // localStorage utilities
    function setStoredApiKey(value) {
        try {
            localStorage.setItem('google_api_key', value);
            console.log('API key saved to localStorage');
            return true;
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            return false;
        }
    }

    function getStoredApiKey() {
        try {
            const value = localStorage.getItem('google_api_key');
            if (value) {
                console.log('API key retrieved from localStorage:', value.substring(0, 10) + '...');
            } else {
                console.log('No API key found in localStorage');
            }
            return value;
        } catch (e) {
            console.error('Failed to read from localStorage:', e);
            return null;
        }
    }

    function setStoredBusinessInput(value) {
        try {
            localStorage.setItem('business_input', value);
            console.log('Business input saved to localStorage');
            return true;
        } catch (e) {
            console.error('Failed to save business input to localStorage:', e);
            return false;
        }
    }

    function getStoredBusinessInput() {
        try {
            const value = localStorage.getItem('business_input');
            if (value) {
                console.log('Business input retrieved from localStorage');
            } else {
                console.log('No business input found in localStorage');
            }
            return value;
        } catch (e) {
            console.error('Failed to read business input from localStorage:', e);
            return null;
        }
    }

    function setStoredSearchResult(placeData) {
        try {
            localStorage.setItem('last_search_result', JSON.stringify(placeData));
            console.log('Search result saved to localStorage');
            return true;
        } catch (e) {
            console.error('Failed to save search result to localStorage:', e);
            return false;
        }
    }

    function getStoredSearchResult() {
        try {
            const value = localStorage.getItem('last_search_result');
            if (value) {
                console.log('Search result retrieved from localStorage');
                return JSON.parse(value);
            } else {
                console.log('No search result found in localStorage');
                return null;
            }
        } catch (e) {
            console.error('Failed to read search result from localStorage:', e);
            return null;
        }
    }
});