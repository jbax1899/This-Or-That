import React, { useEffect, useState } from 'react';
import { Meteor } from 'meteor/meteor';

export const App = () => {
  const [image1, setImage1] = useState<{ url: string; tags: string[]; id: string } | null>(null);
  const [image2, setImage2] = useState<{ url: string; tags: string[]; id: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<string>(''); // Store session ID

  // Function to fetch new images from the server
  const fetchImages = async () => {
    try {
      setLoading(true);
      
      // Replace with user session ID
      const sessionId = localStorage.getItem('sessionId') || '';
  
      // Fetch recommended images
      const images = await Meteor.callAsync('getRecommendedImages', sessionId);
  
      if (images && images.length >= 2) {
        setImage1({ 
          url: images[0].sample_url, 
          tags: images[0].tags,
          id: images[0]._id 
        });
        setImage2({
          url: images[1].sample_url, 
          tags: images[1].tags,
          id: images[1]._id
        });
      } else {
        throw new Error('No images found');
      }
  
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching images:', error.message || error);
    }
  };

  // UseEffect to generate sessionId and fetch images on component mount
  useEffect(() => {
    // Generate a new session ID if not already set
    let storedSessionId = localStorage.getItem('sessionId');
    if (!storedSessionId) {
      storedSessionId = Math.random().toString(36).substring(2); // Generate a random session ID
      localStorage.setItem('sessionId', storedSessionId); // Store it in localStorage
    }
    setSessionId(storedSessionId); // Set the sessionId in state
    fetchImages(); // Fetch images when the component mounts
  }, []);

  const handleChoice = (imageNumber: number) => {
    if (!image1 || !image2) return;
  
    // Identify the chosen and unchosen images
    const chosenImage = imageNumber === 1 ? image1 : image2;
    const unchosenImage = imageNumber === 1 ? image2 : image1;
  
    // Get the image ID (from CachedImages)
    const imageId = imageNumber === 1 ? chosenImage.id : unchosenImage.id;
  
    // Call the server method to update tag weights, passing sessionId and imageId
    Meteor.call('updateTagWeights', chosenImage.tags, unchosenImage.tags, imageId, sessionId, (err: Meteor.Error | undefined) => {
      if (err) {
        console.error('Error updating tag weights:', err);
      } else {
        // Fetch new images after the choice is made
        fetchImages();
      }
    });
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