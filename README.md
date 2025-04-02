# 7Down - Find-The-Difference Game

![7Down](7down.png)

Welcome to the Find The Difference Game repository – a web app built with TypeScript, Angular, Node.js, Express, and Firebase, with a mobile client developed in Flutter and Dart. This multiplayer game challenges users to identify differences between two images, featuring a robust backend with Socket.IO for real-time communication. The game creation system includes drawing tools for image manipulation, and data persistence is managed through Firebase. The app was originally deployed on GitLab Pages and AWS.

## Project Structure

The codebase consists of multiple clients and a single server:

-   **Desktop Client**: Angular-based web client
-   **Android Client**: Flutter-based mobile client
-   **Server**: Node.js/Express backend

## Setup Instructions

### Prerequisites

-   Node.js and npm (for the server and desktop client)
-   Flutter (for the mobile client)
-   Firebase account (for authentication and database)

### Installation

1. Clone the repository
2. Install dependencies for each component:

    ```
    # Server
    cd server
    npm ci

    # Desktop client
    cd desktop-client
    npm ci
    ```

3. Configure Firebase credentials:

    - For the server, create a file `server/app/utils/fbkey.json` from the template `server/app/utils/fbkey.template.json`
    - For the desktop client, create a file `desktop-client/firebase/firebaseConfig.ts` from the template `desktop-client/firebase/firebaseConfig.template.ts`

4. Start the development servers:

    ```
    # Server
    cd server
    npm start

    # Desktop client
    cd desktop-client
    npm start
    ```

### Development

-   The desktop client runs on `http://localhost:4200/`
-   The server runs on `http://localhost:3000/`
-   Server API documentation is available at `http://localhost:3000/api/docs`

## Features

-   **Real-time Multiplayer**: Play with others using Socket.IO
-   **Game Creation**: Create custom Find-The-Difference games
-   **Authentication**: User accounts with Firebase
-   **Mobile Support**: Play on Android with dedicated Flutter client
-   **Drawing Tools**: Edit and create game images
-   **Leaderboards**: Track high scores and game stats

## Technologies

-   **Frontend**: Angular, TypeScript, Socket.IO client
-   **Mobile**: Flutter, Dart
-   **Backend**: Node.js, Express, Socket.IO
-   **Database**: Firebase Realtime Database
-   **Authentication**: Firebase Auth
-   **Deployment**: AWS, GitLab Pages

## Security & Credentials

For security reasons, authentication files are not included in the repository. Template files are provided for configuration. Firebase credentials must be added manually after cloning the repository.

## License

This project was developed as part of a university course (LOG3900) at Polytechnique Montréal, in a team of 6 students.
