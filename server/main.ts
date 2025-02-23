import { Meteor } from 'meteor/meteor';
import { UserSessionTags } from '../imports/api/userSessionTags';

Meteor.startup(() => {
  // Fetch image from SafeBooru
  Meteor.methods({
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

        // Log the raw response data
        console.log('Response from SafeBooru:', data);

        // Check if the response contains the expected data
        if (data && Array.isArray(data) && data.length >= 2) {
          return {
            image1: {
              url: data[0].sample_url,
              tags: data[0].tags.split(" "),
            },
            image2: {
              url: data[1].sample_url,
              tags: data[1].tags.split(" "),
            }
          };
        } else {
          throw new Meteor.Error('no-images', 'No images found or invalid response format');
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching from SafeBooru:', error.message);
        } else {
          console.error('Error fetching from SafeBooru:', error);
        }
        throw new Meteor.Error('api-error', `Failed to fetch images: ${(error as Error).message}`);
      }
    },

    // Update tag weights when user makes a choice
    'updateTagWeights': async function (chosenTags: string[], unchosenTags: string[]) {
      try {
        // Insert or update weights for the chosen tags (+1)
        for (const tag of chosenTags) {
          const existingTag = await UserSessionTags.findOneAsync({ tag });
          if (existingTag) {
            // If the tag exists, update its weight
            await UserSessionTags.updateAsync(
              { tag }, // Find the tag entry
              { $inc: { weight: 1 } } // Increment weight by 1
            );
          } else {
            // If the tag doesn't exist, insert a new document with a weight of 1
            await UserSessionTags.insertAsync({
              tag,
              weight: 1
            });
          }
        }

        // Insert or update weights for the unchosen tags (-1)
        for (const tag of unchosenTags) {
          const existingTag = await UserSessionTags.findOneAsync({ tag });
          if (existingTag) {
            // If the tag exists, update its weight
            await UserSessionTags.updateAsync(
              { tag }, // Find the tag entry
              { $inc: { weight: -1 } } // Decrement weight by 1
            );
          } else {
            // If the tag doesn't exist, insert a new document with a weight of -1
            await UserSessionTags.insertAsync({
              tag,
              weight: -1
            });
          }
        }

        console.log('Updated tag weights');
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error updating tag weights:', error.message);
        } else {
          console.error('Error updating tag weights:', error);
        }
      }
    },
  });
});