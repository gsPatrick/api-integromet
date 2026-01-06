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
     * Downloads an image from URL and saves it locally.
     * Returns the local file path (relative for serving).
     */
    async downloadAndSaveImage(imageUrl, orderId) {
        try {
            console.log(`[StorageService] Downloading image for order ${orderId}...`);

            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000 // 30 second timeout
            });

            // Determine file extension from content type or URL
            const contentType = response.headers['content-type'] || 'image/jpeg';
            const ext = contentType.includes('png') ? '.png' : '.jpg';
            const filename = `order_${orderId}_${Date.now()}${ext}`;
            const filepath = path.join(UPLOAD_DIR, filename);

            // Save file
            fs.writeFileSync(filepath, response.data);
            console.log(`[StorageService] Image saved: ${filename}`);

            // Return relative path for serving
            return `/uploads/${filename}`;

        } catch (error) {
            console.error('[StorageService] Failed to download image:', error.message);
            return null;
        }
    }
}

module.exports = new StorageService();
