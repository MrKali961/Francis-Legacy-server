const ImageKit = require('imagekit');

// Initialize ImageKit instance with error handling
let imagekit = null;

try {
    if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY) {
        console.warn('ImageKit credentials not found in environment variables. ImageKit features will be disabled.');
    } else {
        imagekit = new ImageKit({
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/ptze2wqby/'
        });
        console.log('✅ ImageKit initialized successfully');
    }
} catch (error) {
    console.error('❌ Failed to initialize ImageKit:', error.message);
}

module.exports = imagekit;