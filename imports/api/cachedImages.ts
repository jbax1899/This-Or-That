import { Mongo } from 'meteor/mongo';

// Collection to store cached images
export const CachedImages = new Mongo.Collection('cachedImages');