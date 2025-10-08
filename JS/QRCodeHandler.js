/**
 * Handles QR code generation and management
 */
class QRCodeHandler {
    constructor() {
        this.qrCodeInstances = {
            review: null,
            business: null
        };
    }

    /**
     * Generate QR codes for the business and review pages
     * @param {string} placeId - Google Place ID
     * @param {string} placeName - Name of the place
     * @param {string} reviewUrl - URL for the review page
     * @param {string} businessUrl - URL for the business page
     * @param {HTMLElement} output - Output element to append QR codes to
     */
    generateQRCodes(placeId, placeName, reviewUrl, businessUrl, output) {
        // Get QR settings from localStorage
        const qrSettings = this.getStoredQrSettings();
        const correctionLevel = qrSettings.correctionLevel || 'M';

        // Create QR section
        const qrSection = document.createElement('div');
        qrSection.className = 'qr-section';

        // Create QR settings
        const qrSettingsDiv = document.createElement('div');
        qrSettingsDiv.className = 'qr-settings';
        qrSettingsDiv.innerHTML = `
      <h3>QR Code Settings</h3>
      <div class="dropdown-container">
        <label for="correction-level">Error Correction:</label>
        <select id="correction-level" class="correction-dropdown">
          <option value="L" ${correctionLevel === 'L' ? 'selected' : ''}>Low (7%)</option>
          <option value="M" ${correctionLevel === 'M' ? 'selected' : ''}>Medium (15%)</option>
          <option value="Q" ${correctionLevel === 'Q' ? 'selected' : ''}>Quartile (25%)</option>
          <option value="H" ${correctionLevel === 'H' ? 'selected' : ''}>High (30%)</option>
        </select>
      </div>
    `;

        // Create QR codes container
        const qrCodesContainer = document.createElement('div');
        qrCodesContainer.className = 'qr-codes-container';

        // Create Review QR code
        const reviewQRWrapper = document.createElement('div');
        reviewQRWrapper.className = 'qr-code-wrapper';
        reviewQRWrapper.innerHTML = `
      <div class="qr-code-label">Review Page:</div>
      <div class="qr-code" id="review-qr-container"></div>
      <button class="qr-button" id="review-view-btn">View Raw</button>
    `;

        // Create Business QR code
        const businessQRWrapper = document.createElement('div');
        businessQRWrapper.className = 'qr-code-wrapper';
        businessQRWrapper.innerHTML = `
      <div class="qr-code-label">Maps Page:</div>
      <div class="qr-code" id="business-qr-container"></div>
      <button class="qr-button" id="business-view-btn">View Raw</button>
    `;

        // Append elements
        qrCodesContainer.appendChild(reviewQRWrapper);
        qrCodesContainer.appendChild(businessQRWrapper);
        qrSection.appendChild(qrSettingsDiv);
        qrSection.appendChild(qrCodesContainer);
        output.appendChild(qrSection);

        // Generate the QR codes
        this.generateQRCode('review', reviewUrl, correctionLevel);
        this.generateQRCode('business', businessUrl, correctionLevel);

        // Set up event listeners
        const correctionDropdown = document.getElementById('correction-level');

        correctionDropdown.addEventListener('change', () => {
            const level = correctionDropdown.value;
            this.setStoredQrSettings({ correctionLevel: level });

            // Regenerate QR codes with new settings
            this.generateQRCode('review', reviewUrl, level);
            this.generateQRCode('business', businessUrl, level);
        });

        // View button event listeners
        document.getElementById('review-view-btn').addEventListener('click', () => {
            this.openQRCodeInNewTab('review', reviewUrl);
        });

        document.getElementById('business-view-btn').addEventListener('click', () => {
            this.openQRCodeInNewTab('business', businessUrl);
        });
    }

    /**
     * Generate a QR code
     * @param {string} type - Type of QR code ('review' or 'business')
     * @param {string} url - URL to encode in the QR code
     * @param {string} correctionLevel - Error correction level
     */
    generateQRCode(type, url, correctionLevel) {
        const container = document.getElementById(`${type}-qr-container`);

        // Clear previous QR code
        container.innerHTML = '';

        // Create a temporary div for the QR code
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        container.appendChild(tempDiv);

        // Generate QR code with custom styling
        this.qrCodeInstances[type] = new QRCode(tempDiv, {
            text: url,
            width: 1024,
            height: 1024,
            colorDark: "rgb(170,101,25)",
            colorLight: "rgba(0,0,0,0)",
            correctLevel: QRCode.CorrectLevel[correctionLevel]
        });

        // Wait for the QR code to be generated, then show it
        setTimeout(() => {
            const img = tempDiv.querySelector('img');
            if (img) {
                // Create a new image element to display the QR code
                const displayImg = document.createElement('img');
                displayImg.src = img.src;
                displayImg.style.display = 'block';
                displayImg.style.maxWidth = '100%';
                displayImg.style.maxHeight = '100%';
                displayImg.style.width = 'auto';
                displayImg.style.height = 'auto';
                displayImg.style.objectFit = 'contain';

                // Clear the container and add the properly sized image
                container.innerHTML = '';
                container.appendChild(displayImg);
            }
        }, 100);
    }

    /**
     * Open QR code in a new tab with raw colors
     * @param {string} type - Type of QR code ('review' or 'business')
     * @param {string} url - URL to encode in the QR code
     */
    openQRCodeInNewTab(type, url) {
        // Create a temporary container for the QR code
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        document.body.appendChild(tempContainer);

        // Generate QR code with raw colors
        const tempQR = new QRCode(tempContainer, {
            text: url,
            width: 1024,
            height: 1024,
            colorDark: "#000000",
            colorLight: "#FFFFFF",
            correctLevel: QRCode.CorrectLevel[this.getStoredQrSettings().correctionLevel || 'M']
        });

        // Wait for the QR code to be generated
        setTimeout(() => {
            const img = tempContainer.querySelector('img');
            if (img) {
                const newWindow = window.open();
                newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>QR Code - ${type}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background-color: #f5f5f5;
              }
              img {
                max-width: 100%;
                height: auto;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
              }
            </style>
          </head>
          <body>
            <img src="${img.src}" alt="QR Code">
          </body>
          </html>
        `);
            }

            // Clean up
            document.body.removeChild(tempContainer);
        }, 100);
    }

    /**
     * Store QR settings in localStorage
     * @param {Object} settings - QR settings to store
     * @returns {boolean} Success status
     */
    setStoredQrSettings(settings) {
        try {
            const currentSettings = this.getStoredQrSettings();
            const newSettings = { ...currentSettings, ...settings };
            localStorage.setItem('qr_settings', JSON.stringify(newSettings));
            console.log('QR settings saved to localStorage');
            return true;
        } catch (e) {
            console.error('Failed to save QR settings to localStorage:', e);
            return false;
        }
    }

    /**
     * Get QR settings from localStorage
     * @returns {Object} QR settings
     */
    getStoredQrSettings() {
        try {
            const value = localStorage.getItem('qr_settings');
            if (value) {
                console.log('QR settings retrieved from localStorage');
                return JSON.parse(value);
            } else {
                console.log('No QR settings found in localStorage, using defaults');
                return { correctionLevel: 'M' };
            }
        } catch (e) {
            console.error('Failed to read QR settings from localStorage:', e);
            return { correctionLevel: 'M' };
        }
    }
}

// Create a singleton instance
const qrCodeHandler = new QRCodeHandler();