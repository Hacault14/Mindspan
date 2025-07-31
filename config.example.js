// Example configuration file
// Copy this to config.js and update with your Firebase settings

export const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

export const gameConfig = {
  defaultClueTimeLimit: 120,
  defaultGuessingTimeLimit: 60,
  defaultRoundsPerGame: 5,
  defaultMaxPlayers: 8,
  defaultGameMode: 'free-for-all'
}; 