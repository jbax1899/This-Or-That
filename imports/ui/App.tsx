import React, { useEffect, useState } from 'react';
import { Meteor } from 'meteor/meteor';

export const App = () => {
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch two random images from SafeBooru
    const fetchImages = async () => {
      try {
        // Call the server method to fetch the images
        const images = await Meteor.callAsync('getImageFromSafeBooru');
        
        // Set the image URLs from the response
        setImage1(images.image1);
        setImage2(images.image2);
        setLoading(false);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching images:', error.message);
        } else {
          console.error('Error fetching images:', error);
        }
      }
    };

    fetchImages();
  }, []);

  const handleChoice = (image: number) => {
    const decisionTime = Date.now();
    const chosenImage = image === 1 ? image1 : image2;

    console.log('Chosen Image:', chosenImage, 'Decision Time:', decisionTime);

    // Save the user choice to the MongoDB database
    Meteor.call('saveUserChoice', { image: chosenImage, time: decisionTime });
  };

  if (loading) return <div>Loading images...</div>;

  return (
    <div>
      <h1>This or That</h1>
      <div className="image-container">
        <a href={image1 || '#'} data-lightbox="image" data-title="Image 1">
          <img src={image1 || ''} alt="Image 1" />
        </a>
        <a href={image2 || '#'} data-lightbox="image" data-title="Image 2">
          <img src={image2 || ''} alt="Image 2" />
        </a>
      </div>
      <div className="button-container">
        <button onClick={() => handleChoice(1)}>Choose Image 1</button>
        <button onClick={() => handleChoice(2)}>Choose Image 2</button>
      </div>
    </div>
  );
};