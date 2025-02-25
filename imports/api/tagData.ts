import { Mongo } from 'meteor/mongo';

// Collection to store tag analytics data
export const TagData = new Mongo.Collection('tagData');