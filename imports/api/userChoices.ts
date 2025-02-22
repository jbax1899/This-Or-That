import { Mongo } from 'meteor/mongo';

// Define the collection to store user choices
export const UserChoices = new Mongo.Collection('userChoices');