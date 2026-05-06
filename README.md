# UPI Tracker

A mobile application built with React Native and Expo to automatically track your UPI transactions, monitor local SMS alerts, and help you maintain your budget.

## 🌟 Features

- **SMS Sync**: Automatically parses bank transaction SMS messages to record UPI spends.
- **Budget Alerts**: Set budget limits and get notified when you're close to exceeding them.
- **Secure Authentication**: User sign-in and sign-up powered by Clerk.
- **Modern UI**: Clean and attractive interface using React Native Paper and Poppins Google Font.
- **Transaction Management**: View history, add manual entries, and edit past transactions.

## 🛠 Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) / [Expo](https://expo.dev/) (Expo Router)
- **UI Components**: [React Native Paper](https://callstack.github.io/react-native-paper/)
- **Authentication**: [Clerk](https://clerk.com/)
- **Fonts**: `@expo-google-fonts/poppins`
- **Backend**: Node.js custom server (in `/server` directory)

## 🚀 Getting Started

### Prerequisites

- Node.js LTS
- npm or Yarn
- Expo Go app on your phone (or Android Studio / Xcode for emulators)

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd UPI-tracker
   ```

2. **Install frontend dependencies:**

   ```bash
   npm install
   ```

3. **Install backend dependencies (if applicable):**

   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Environment Variables:**
   Create a `.env` file in the root directory and add your Clerk publishable key:
   ```env
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   ```

### Running the App

Start the Expo development server:

```bash
npx expo start
```

- Press `a` to open on Android emulator.
- Press `i` to open on iOS simulator.
- Scan the QR code with your Expo Go app (Android) or Camera app (iOS) to run on a physical device.

## 📁 Project Structure

- `/app` - Expo Router screens and navigation (`(auth)`, `(tabs)`, etc.)
- `/assets` - Local assets (animations, images)
- `/components` - Reusable UI components (SmsSyncButton, SwipeableRow, etc.)
- `/hooks` - Custom React hooks
- `/services` - Business logic, SMS parsing, Clerk token cache, and budget storage
- `/server` - Backend configuration and API routes

## 📝 License

This project is licensed under the MIT License.
