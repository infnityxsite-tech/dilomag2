import { v2 as cloudinary } from 'cloudinary';

export default function handler(request, response) {
  // It is crucial that these are NOT prefixed with VITE_
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return response.status(500).json({ error: "Cloudinary credentials are not configured correctly on the server." });
  }

  // Configure Cloudinary within the function call
  cloudinary.config({ 
    cloud_name: cloudName, 
    api_key: apiKey, 
    api_secret: apiSecret,
  });

  const timestamp = Math.round((new Date()).getTime() / 1000);

  try {
    // Generate the secure signature
    const signature = cloudinary.utils.api_sign_request({ timestamp: timestamp }, apiSecret);

    // Send the signature and timestamp back to the browser
    return response.status(200).json({
      signature: signature,
      timestamp: timestamp
    });
  } catch (error) {
    console.error("Error generating signature:", error);
    return response.status(500).json({ error: "Failed to generate signature" });
  }
}