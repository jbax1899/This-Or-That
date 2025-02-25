import { Meteor } from 'meteor/meteor';
import { UserSessionTags } from '../imports/api/userSessionTags';
import { CachedImages } from '../imports/api/cachedImages';
import { TagData } from '../imports/api/tagData';

const CACHED_MAX = 1000; // Maximum number of images to cache

// Function to get tag scores
const getTagScore = async () => {
  return await TagData.find({}, { fields: { _id: 1, score: 1 } }).fetchAsync();
};

// Define Meteor methods BEFORE they are used
Meteor.methods({
  'getTagScore': getTagScore,

  'updateTagWeights': async function (chosenTags: string[], unchosenTags: string[], sessionId: string) {
    try {
      console.log(`Updating tag weights for session: ${sessionId}...`);

      // Increase weight for chosen tags
      for (const tag of chosenTags) {
        const existingTag = await UserSessionTags.findOneAsync({ sessionId, tag });

        if (existingTag) {
          await UserSessionTags.updateAsync(
            { sessionId, tag },
            { $inc: { weight: 1 }, $set: { updatedAt: new Date() } }
          );
        } else {
          await UserSessionTags.insertAsync({ sessionId, tag, weight: 1, updatedAt: new Date() });
        }
      }

      // Decrease weight for unchosen tags
      for (const tag of unchosenTags) {
        const existingTag = await UserSessionTags.findOneAsync({ sessionId, tag });

        if (existingTag) {
          await UserSessionTags.updateAsync(
            { sessionId, tag },
            { $inc: { weight: -1 }, $set: { updatedAt: new Date() } }
          );
        } else {
          await UserSessionTags.insertAsync({ sessionId, tag, weight: -1, updatedAt: new Date() });
        }
      }
    } catch (error) {
      console.error('Error updating tag weights for session:', error);
    }
  },

  'getImageFromSafeBooru': async function () {
    try {
      // Generate a random page number
      const randomPage = Math.floor(Math.random() * 100) + 1;

      // SafeBooru API endpoint with a random page number
      const url = `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=2&pid=${randomPage}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Meteor.Error('api-error', `Failed to fetch images: ${response.statusText}`);
      }

      // Parse the JSON response
      const data = await response.json();

      // Check if the response contains the expected data
      if (data && Array.isArray(data) && data.length >= 2) {
        return {
          image1: { url: data[0].sample_url, tags: data[0].tags.split(" ") },
          image2: { url: data[1].sample_url, tags: data[1].tags.split(" ") }
        };
      } else {
        throw new Meteor.Error('no-images', 'No images found or invalid response format');
      }
    } catch (error) {
      console.error('Error fetching from SafeBooru:', error);
      if (error instanceof Error) {
        throw new Meteor.Error('api-error', `Failed to fetch images: ${error.message}`);
      } else {
        throw new Meteor.Error('api-error', 'Failed to fetch images: unknown error');
      }
    }
  }
});

const fetchAndCacheTopPosts = async () => {
  try {
    console.log('Starting cache update process...');
    let currentCacheCount = await CachedImages.find().countAsync();
    let page = 1;
    const limit = 50;

    while (currentCacheCount < CACHED_MAX) {
      console.log(`Fetching page ${page}... Current cache count: ${currentCacheCount}`);
      const url = `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=${limit}&tags=sort:score&pid=${page}`;
      const response = await fetch(url);

      if (!response.ok) throw new Meteor.Error('api-error', `Failed to fetch top posts: ${response.statusText}`);

      const data = await response.json();
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('No more images found. Stopping cache update.');
        break;
      }

      for (const post of data) {
        if (currentCacheCount >= CACHED_MAX) {
          console.log(`Cache limit reached (${CACHED_MAX} images). Stopping.`);
          break;
        }

        const existingImage = await CachedImages.findOneAsync({ id: post.id });

        if (existingImage) {
          const hasChanges =
            post.score !== existingImage.score ||
            post.comment_count !== existingImage.comment_count ||
            post.rating !== existingImage.rating;

          if (hasChanges) {
            await CachedImages.updateAsync(
              { id: post.id },
              {
                $set: {
                  score: post.score || existingImage.score,
                  comment_count: post.comment_count || existingImage.comment_count,
                  rating: post.rating || existingImage.rating,
                  updatedAt: new Date(),
                }
              }
            );
          }
        } else {
          await CachedImages.insertAsync({
            id: post.id,
            preview_url: post.preview_url,
            sample_url: post.sample_url,
            tags: post.tags.split(' '),
            comment_count: post.comment_count || 0,
            rating: post.rating,
            score: post.score || 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          currentCacheCount++;
        }
      }

      page++;
      await new Promise(resolve => setTimeout(resolve, 100)); //delay for API
    }

    console.log('Finished caching top posts.');
  } catch (error) {
    console.error('Error caching top posts:', error);
  }
};

const calculateTagData = async () => {
  try {
    console.log('Starting tag data calculation...');

    // Fetch all cached images
    const allImages = await CachedImages.find().fetchAsync();
    const totalImages = allImages.length;
    if (totalImages === 0) {
      console.log('No cached images found. Skipping tag data calculation.');
      return;
    }

    // Initialize tag counters
    const tagCounts: Record<string, number> = {}; // Number of images each tag appears in
    const tagScores: Record<string, number> = {}; // Total score contributed by images each tag appears in
    let totalScore = 0;

    for (const image of allImages) {
      if (!image.tags || !Array.isArray(image.tags)) continue;

      const imageScore = image.score || 0; // Ensure we have a numeric score
      totalScore += imageScore;

      for (const tag of image.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        tagScores[tag] = (tagScores[tag] || 0) + imageScore; // Sum up scores of images where this tag appears
      }
    }

    console.log(`Total images: ${totalImages}, Unique tags counted: ${Object.keys(tagCounts).length}`);
    console.log(`Total combined image score: ${totalScore}`);

    // Update TagData collection
    for (const [tag, count] of Object.entries(tagCounts)) {
      const score = tagScores[tag] || 0;
      const existingTag = await TagData.findOneAsync({ _id: tag });

      if (existingTag) {
        if (existingTag.count !== count || existingTag.score !== score) {
          await TagData.updateAsync(
            { _id: tag },
            { $set: { count, score, updatedAt: new Date() } }
          );
          //console.log(`Updated tag: ${tag}, Count: ${count}, Score: ${score}`);
        }
      } else {
        await TagData.insertAsync({
          _id: tag,
          count,
          score,
          updatedAt: new Date(),
        });
        //console.log(`Inserted new tag: ${tag}, Count: ${count}, Score: ${score}`);
      }
    }

    console.log('Tag data calculation completed.');
  } catch (error) {
    console.error('Error calculating tag data:', error);
  }
};

Meteor.startup(async () => {
  console.log("Starting initial caching and tag calculation...");
  await fetchAndCacheTopPosts();
  await calculateTagData();
  console.log("Initial caching and tag calculation completed.");

  Meteor.setInterval(async () => {
    console.log("Running scheduled cache update and tag calculation...");
    await fetchAndCacheTopPosts();
    await calculateTagData();
    console.log("Scheduled cache update and tag calculation completed.");
  }, 1000 * 60 * 60 * 24);
});