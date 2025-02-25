const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://127.0.0.1:3001/ThisOrThat'; // MongoDB URI
const DB_NAME = 'ThisOrThat'; // Database name
const COLLECTION_NAME = 'cachedImages'; // Collection name
const SAVE_DIR = './downloaded_images'; // Directory to save images

// Create the download directory if it doesn't exist
if (!fs.existsSync(SAVE_DIR)){
    fs.mkdirSync(SAVE_DIR);
}

// Connect to MongoDB
async function fetchImagesFromDB() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Get all cached images from the collection
    const images = await collection.find({}).toArray();
    console.log(`Fetched ${images.length} images.`);

    // Log all fetched images for debugging
    images.forEach((image, index) => {
      console.log(`Image ${index + 1}:`, image);
    });

    return images;
  } catch (error) {
    console.error('Error fetching images:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Download an image using Axios
async function downloadImage(url, filename) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    const filePath = path.join(SAVE_DIR, filename);

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`Downloaded: ${filename}`);
  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error);
  }
}

// Main function to download all images sequentially
async function downloadAllImages() {
  const images = await fetchImagesFromDB();
  
  const imagesToDownload = images.filter(image => image.preview_url);
  console.log(`Found ${imagesToDownload.length} images to download.`);

  for (const image of imagesToDownload) {
    const filename = `${image.id}.jpg`; // Change the extension based on file type
    await downloadImage(image.preview_url, filename);
  }

  console.log('Download complete.');
}

downloadAllImages().catch(console.error);