import { Client, Account, Databases, Functions, Storage } from 'react-native-appwrite';

export const client = new Client();

client
    .setEndpoint('https://sfo.cloud.appwrite.io/v1') // Your Appwrite Endpoint
    .setProject('1212125') // Your project ID
    .setPlatform('com.jobhub.app'); // Required for mobile sessions

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export const storage = new Storage(client);

export default client;
