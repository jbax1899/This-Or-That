import React, { useEffect, useState } from 'react';
import { Meteor } from 'meteor/meteor';

export const App = () => {
  const [image1, setImage1] = useState<{ url: string; tags: string[] } | null>(null);
  const [image2, setImage2] = useState<{ url: string; tags: string[] } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Function to fetch new images from the server
  const fetchImages = async () => {
    try {
      setLoading(true); // Set loading to true while fetching new images

      // Fetch images from the server
      const images = await Meteor.callAsync('getImageFromSafeBooru');

      if (images && images.image1 && images.image2) {
        // Set the new images
        setImage1({ url: images.image1.url, tags: images.image1.tags });
        setImage2({ url: images.image2.url, tags: images.image2.tags });
      } else {
        throw new Error('No images found in the response');
      }
      setLoading(false); // Set loading to false once images are fetched
    } catch (error: any) {
      console.error('Error fetching images:', error.message || error);
      alert('There was an error fetching the images. Please try again.');
      setLoading(false); // Set loading to false even if there is an error
    }
  };

  // UseEffect to fetch images on component mount
  useEffect(() => {
    fetchImages(); // Fetch images when the component mounts
  }, []);

  const handleChoice = (imageNumber: number) => {
    if (!image1 || !image2) return;

    // Identify the chosen and unchosen images
    const chosenImage = imageNumber === 1 ? image1 : image2;
    const unchosenImage = imageNumber === 1 ? image2 : image1;

    console.log('Chosen Image:', chosenImage.url, 'Tags:', chosenImage.tags);
    console.log('Unchosen Image:', unchosenImage.url, 'Tags:', unchosenImage.tags);

    // Call server method to update tag weights
    Meteor.call('updateTagWeights', chosenImage.tags, unchosenImage.tags);

    // Fetch new images after the choice is made
    fetchImages();
  };

  if (loading) return <div>Loading images...</div>;

  return (
    <div>
      <h1>This or That</h1>
      <div className="image-container">
        <img 
          src={image1?.url}
          alt="Image 1" 
          style={{ cursor: 'pointer' }} 
          onClick={() => handleChoice(1)} 
        />
        <img 
          src={image2?.url} 
          alt="Image 2" 
          style={{ cursor: 'pointer' }} 
          onClick={() => handleChoice(2)} 
        />
      </div>
    </div>
  );
};