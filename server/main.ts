import { Meteor } from 'meteor/meteor';
import { UserChoices } from '/imports/api/userChoices';

Meteor.startup(() => {
  // Fetch image from SafeBooru
  Meteor.methods({
    'getImageFromSafeBooru': async function () {
      try {
        // SafeBooru API endpoint
        const url = 'https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=2';

        // Use the fetch API to get data from SafeBooru
        const response = await fetch(url);
        if (!response.ok) {
          throw new Meteor.Error('api-error', `Failed to fetch images: ${response.statusText}`);
        }

        // Parse the JSON response
        const data = await response.json();

        // Log the raw response data
        //console.log('Response from SafeBooru:', data);

        // Check if the response contains the expected data
        if (data && Array.isArray(data) && data.length >= 2) {
          return {
            image1: data[0].sample_url,
            image2: data[1].sample_url,
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

    // Save user choice to the database
    'saveUserChoice': function (choiceData: { image: string; time: number }) {
      try {
        // Insert the user's choice into the MongoDB collection
        UserChoices.insertAsync({
          image: choiceData.image,
          time: choiceData.time,
          createdAt: new Date(), // Store the date and time of the choice
        });
        console.log('User choice saved successfully');
      } catch (error) {
        console.error('Error saving user choice:', (error as Error).message);
      }
    },
  });
});