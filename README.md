# Wavelength Game

A web-based multiplayer party game inspired by Wavelength, built as a Progressive Web App (PWA) optimized for mobile devices.

## 🎮 Game Concept

Wavelength is a round-based party game where:

- One player (the "Clue Giver") is given a random scale (e.g., "Hot – Cold") and a hidden target value
- The Clue Giver provides a word or phrase to guide players toward the target
- All other players attempt to position a needle along the scale to match the hidden value
- Players earn points based on proximity to the target
- The Clue Giver earns bonus points if players cluster around the correct region

## ✨ Features

### 🏠 Lobby System
- Create/join game lobbies via shareable codes
- Real-time player list with connection status
- Host controls for game settings and starting
- Support for both Free-For-All and Teams modes

### 🎯 Game Mechanics
- Dynamic scale generation with random targets
- Drag-based needle selector for intuitive guessing
- Real-time scoring system with proximity-based points
- Clue giver rotation across rounds
- Timer-based phases with automatic progression

### 📱 Mobile-First Design
- Responsive layout optimized for mobile devices
- Touch-friendly drag interactions
- PWA support for app-like experience
- Offline splash screen and caching

### 🔐 Authentication
- Anonymous guest authentication
- Optional Firebase Auth integration
- Persistent user identity

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Backend**: Firebase (Auth + Firestore)
- **Real-time**: Firestore snapshot listeners
- **PWA**: Vite PWA Plugin
- **Animations**: Framer Motion
- **Icons**: React Icons

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wavelength-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   
   Create a new Firebase project and enable:
   - Authentication (Anonymous)
   - Firestore Database
   - Hosting

   **Configure Firebase (IMPORTANT - Security)**
   
   Copy the example configuration file:
   ```bash
   cp config.example.js config.js
   ```
   
   Update `config.js` with your Firebase configuration:
   ```javascript
   export const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```
   
   ⚠️ **Security Note**: The `config.js` file contains sensitive API keys and is automatically excluded from version control via `.gitignore`. Never commit this file to your repository.

4. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Build for Production**
   ```bash
   npm run build
   ```

7. **Deploy to Firebase**
   ```bash
   firebase deploy
   ```

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── GameBoard.tsx   # Main game interface
│   ├── Lobby.tsx       # Game lobby
│   ├── PlayerList.tsx  # Player management
│   ├── Scoreboard.tsx  # Score display
│   ├── NeedleSlider.tsx # Drag-based slider
│   └── LoadingScreen.tsx
├── pages/              # Page components
│   ├── HomePage.tsx    # Landing page
│   └── GamePage.tsx    # Game page
├── hooks/              # Custom hooks
│   └── useGameState.ts # Zustand store
├── lib/                # Utilities
│   ├── firebase.ts     # Firebase config
│   └── scoring.ts      # Scoring logic
└── types/              # TypeScript types
    └── game.ts         # Game interfaces
```

## 🎯 Game Rules

### Scoring System
- **Perfect Guess (±5%)**: 100 points
- **Close Guess (±10%)**: 80 points
- **Good Guess (±15%)**: 60 points
- **Fair Guess (±20%)**: 40 points
- **Poor Guess (±30%)**: 20 points
- **Miss**: 0 points

### Clue Giver Bonus
- Base score: Average accuracy of all guesses
- Clustering bonus: Up to 50 points for tight clustering near target

### Game Flow
1. **Lobby**: Players join, host starts game
2. **Clue Phase**: Clue giver sees target, provides clue (2 min)
3. **Guessing Phase**: Players drag needle to guess (1 min)
4. **Reveal**: Target shown, scores calculated
5. **Repeat**: Next round or game end

## 📱 PWA Features

- **Install Prompt**: Add to home screen
- **Offline Support**: Cached assets and splash screen
- **App-like Experience**: Full-screen mode
- **Push Notifications**: (Future enhancement)

## 🔧 Configuration

### Game Settings
- `clueTimeLimit`: Time for clue giving (default: 120s)
- `guessingTimeLimit`: Time for guessing (default: 60s)
- `roundsPerGame`: Number of rounds (default: 5)
- `maxPlayers`: Maximum players per game (default: 8)

### Environment Variables
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## 🚀 Deployment

### Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

### Vercel
```bash
npm run build
vercel --prod
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the original Wavelength board game
- Built with modern web technologies for optimal mobile experience
- Real-time multiplayer powered by Firebase

## 📞 Support

For questions or issues:
- Create an issue on GitHub
- Check the Firebase documentation
- Review the game rules and mechanics

---

**Happy Gaming! 🎮✨** 