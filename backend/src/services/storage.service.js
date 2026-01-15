const axios = require('axios');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');

class StorageService {
    constructor() {
        // Ensure uploads directory exists
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
            console.log('[StorageService] Created uploads directory:', UPLOAD_DIR);
        }
    }

    /**
     * Downloads an image from URL and saves it locally with retry logic.
     * Returns the local file path (relative for serving).
     * @param {string} imageUrl - URL to download from
     * @param {number} orderId - Order ID for filename
     * @param {number} retries - Number of retry attempts (default: 3)
     */
    async downloadAndSaveImage(imageUrl, orderId, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`[StorageService] Downloading image for order ${orderId} (attempt ${attempt}/${retries})...`);

                const response = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 60000, // 60 second timeout (increased)
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                // Check if we got valid data
                if (!response.data || response.data.length < 100) {
                    throw new Error('Downloaded file is too small or empty');
                }

                // Determine file extension from content type or URL
                const contentType = response.headers['content-type'] || 'image/jpeg';
                let ext = '.jpg';
                if (contentType.includes('png')) ext = '.png';
                else if (contentType.includes('gif')) ext = '.gif';
                else if (contentType.includes('webp')) ext = '.webp';

                const filename = `order_${orderId}_${Date.now()}${ext}`;
                const filepath = path.join(UPLOAD_DIR, filename);

                // Save file
                fs.writeFileSync(filepath, response.data);

                // Verify file was saved correctly
                const stats = fs.statSync(filepath);
                if (stats.size < 100) {
                    fs.unlinkSync(filepath);
                    throw new Error('Saved file is too small');
                }

                console.log(`[StorageService] Image saved successfully: ${filename} (${stats.size} bytes)`);

                // Return relative path for serving
                return `/uploads/${filename}`;

            } catch (error) {
                console.error(`[StorageService] Attempt ${attempt} failed:`, error.message);

                if (attempt === retries) {
                    console.error(`[StorageService] All ${retries} attempts failed for order ${orderId}. Saving URL as fallback.`);
                    // Return original URL as fallback (better than nothing)
                    return imageUrl;
                }

                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }

        return null;
    }

    /**
     * Check if a local image exists
     */
    imageExists(localPath) {
        if (!localPath || localPath.startsWith('http')) return false;
        const fullPath = path.join(__dirname, '../../public', localPath);
        return fs.existsSync(fullPath);
    }

    /**
     * Get full filesystem path for a local image
     */
    getFullPath(localPath) {
        return path.join(__dirname, '../../public', localPath);
    }
}

module.exports = new StorageService();
