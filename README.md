# ToolTutor: Advanced Educational Document Editor

## Overview

ToolTutor is a comprehensive educational document editor designed to help students take notes, understand complex concepts, and complete homework assignments. Unlike traditional document editors, ToolTutor integrates advanced AI capabilities and specialized scientific tools that transform it into an intelligent learning assistant.

## Table of Contents

1. [Core Features](#core-features)
2. [Architecture Overview](#architecture-overview)
3. [Component Structure](#component-structure)
4. [Scientific Diagram Generation](#scientific-diagram-generation)
5. [Document Management](#document-management)
6. [Authentication System](#authentication-system)
7. [Data Storage](#data-storage)
8. [Proxy Server](#proxy-server)
9. [Installation and Setup](#installation-and-setup)
10. [Development Guide](#development-guide)
11. [Troubleshooting](#troubleshooting)

## Core Features

### Rich Text Editing
ToolTutor provides a full-featured document editor with support for formatting, styles, and multimedia content. Built on Draft.js, it offers a familiar interface while extending functionality beyond standard editors.

### Scientific Diagram Generation
One of ToolTutor's standout features is its ability to generate interactive scientific diagrams directly within documents:

- **Physics Diagrams**: Force diagrams, circuit diagrams, kinematics visualizations
- **Chemistry Structures**: 2D and 3D molecular structures via PubChem integration
- **Math Visualizations**: Graphs, charts, and mathematical function plots

### AI-Assisted Learning
ToolTutor incorporates AI capabilities to help students understand and improve their notes:

- **Concept Explanation**: Get detailed explanations of complex topics
- **Problem Solving**: Step-by-step guidance for homework problems
- **Content Summarization**: Condense lengthy notes into key points

### Collaborative Features
- Real-time collaboration with classmates
- Teacher annotation and feedback tools
- Version history and change tracking

## Architecture Overview

ToolTutor follows a modern React-based architecture with several interconnected systems:

```
┌─────────────────────────────────┐
│           React Frontend         │
│                                 │
│  ┌───────────┐    ┌───────────┐ │
│  │  Document │    │ Scientific │ │
│  │   Editor  │◄───┤  Services │ │
│  └───────────┘    └───────────┘ │
│         ▲               ▲        │
└─────────┼───────────────┼───────┘
          │               │
┌─────────┼───────────────┼───────┐
│         │               │        │
│  ┌──────▼──────┐ ┌──────▼─────┐ │
│  │   Firebase  │ │ Proxy Server│ │
│  │  (Storage)  │ │  (API Hub)  │ │
│  └─────────────┘ └─────────────┘ │
│                                   │
│         Backend Services          │
└───────────────────────────────────┘
```

### Key Architectural Components

1. **React Frontend**: The user interface built with React, utilizing Draft.js for document editing
2. **Scientific Services**: Specialized modules for generating and rendering scientific content
3. **Firebase Backend**: Handles authentication, document storage, and user management
4. **Proxy Server**: Node.js server that interfaces with external APIs and services

## Component Structure

ToolTutor is organized into several key component directories:

### `/src/components`
Contains all React components, organized by feature:

- **`/DetailedDoc`**: Components for the document editor interface
  - `TextEditor.js`: Core document editing functionality
  - `SelectionToolbar.js`: Context-sensitive formatting toolbar
  - `CanvasBlock.js`: Handles rendering of scientific diagrams
  - `ScienceToolbar.js`: Tools for generating scientific content

- **`/Authentication`**: Login, registration, and user management
- **`/DocumentList`**: Document browsing and management interface

### `/src/services`
Contains service modules that handle business logic and external API interactions:

- **`scienceService.js`**: Coordinates generation of scientific diagrams
- **`pubchemService.js`**: Interfaces with PubChem for chemical structures
- **`documentService.js`**: Handles document CRUD operations
- **`authService.js`**: Manages authentication flows

### `/src/utils`
Utility functions and helper modules used throughout the application

## Scientific Diagram Generation

The scientific diagram system is one of ToolTutor's most sophisticated features, comprising several interconnected components:

### Diagram Generation Flow

1. **User Request**: User selects text and requests a specific diagram type
2. **Text Processing**: Selected text is analyzed to identify relevant scientific content
3. **Script Generation**: A specialized drawing script is generated based on the content
4. **Rendering**: The script is executed within a canvas element to render the diagram
5. **Interaction**: For 3D diagrams, interactive elements are added to allow manipulation

### Diagram Types and Implementation

#### Physics Diagrams
Physics diagrams are rendered using canvas-based JavaScript drawing functions. The system:

1. Analyzes the physics problem description
2. Generates appropriate JavaScript code to visualize the scenario
3. Executes the code within a sandboxed environment
4. Renders the result as an interactive diagram

#### Chemical Structures
Chemical structure rendering involves:

1. Parsing chemical compound names or formulas
2. Querying the PubChem API through the proxy server
3. Rendering 2D structures directly on canvas
4. For 3D structures, using 3Dmol.js to create interactive molecular visualizations

### Canvas Block System

The `CanvasBlock.js` component is responsible for executing and rendering diagram scripts:

1. It creates a canvas element within the document
2. Executes the provided JavaScript drawing script in a controlled environment
3. Handles errors and provides fallback rendering when needed
4. For 3D chemical structures, it creates a specialized interactive viewer

## Document Management

ToolTutor's document management system provides a complete solution for creating, editing, and organizing educational content:

### Document Data Model

Each document consists of:

- **Metadata**: Title, creation date, last modified date, owner, collaborators
- **Content**: The document content stored as Draft.js ContentState
- **Entities**: Special elements like diagrams, images, and interactive components

### Storage and Retrieval

Documents are stored in Firebase with the following workflow:

1. **Auto-saving**: Documents are automatically saved during editing
2. **Serialization**: Draft.js content is serialized for storage
3. **Special handling**: Canvas diagrams are stored as executable scripts rather than images

### Offline Support

ToolTutor implements IndexedDB for offline document access:

1. Documents are cached locally when accessed
2. Changes made offline are synchronized when connectivity is restored
3. Conflict resolution handles simultaneous edits

## Authentication System

The authentication system uses Firebase Authentication with support for:

- Email/password authentication
- Google OAuth integration
- Role-based access control (student, teacher, administrator)
- Session management and security

## Data Storage

ToolTutor uses a combination of storage solutions:

1. **Firebase Firestore**: For document metadata and user data
2. **Firebase Storage**: For large binary assets
3. **IndexedDB**: For local caching and offline support

### Data Schema

```
- users/
  - {userId}/
    - profile
    - settings
    - documents/
      - {documentId}

- documents/
  - {documentId}/
    - metadata
    - content
    - collaborators
    - history/
      - {versionId}
```

## Proxy Server

The proxy server (`proxy-server.js`) serves as a middleware between the frontend and external APIs:

1. **API Proxying**: Forwards requests to external services like PubChem
2. **Rate Limiting**: Manages API request quotas
3. **Response Caching**: Caches common requests to improve performance
4. **Security**: Prevents exposure of API keys and provides request validation

### Key Endpoints

- `/api/pubchem/*`: Proxies requests to PubChem API
- `/api/generate-drawing-script`: Generates scientific drawing scripts
- `/api/auth/*`: Authentication-related endpoints

## Installation and Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Firebase account

### Environment Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/tool-tutor.git
   cd tool-tutor
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file with your Firebase configuration
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```

### Running the Application

1. Start the proxy server
   ```bash
   node proxy-server.js
   ```

2. In a separate terminal, start the React application
   ```bash
   npm start
   ```

3. Access the application at http://localhost:3000

## Development Guide

### Project Structure

```
/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   ├── services/        # Business logic and API services
│   ├── utils/           # Utility functions
│   ├── styles/          # CSS and style files
│   ├── App.js           # Main application component
│   └── index.js         # Application entry point
├── proxy-server.js      # API proxy server
└── package.json         # Project dependencies
```

### Adding New Diagram Types

To add a new scientific diagram type:

1. Create a new generator function in the appropriate service file
2. Add the diagram type to the SelectionToolbar options
3. Implement the rendering logic in CanvasBlock.js
4. Add any necessary API endpoints to the proxy server

### Testing

Run tests with:
```bash
npm test
```

The test suite includes:
- Unit tests for individual components and services
- Integration tests for diagram generation
- End-to-end tests for document editing flows

## Troubleshooting

### Common Issues

#### Diagram Rendering Problems
- Check browser console for JavaScript errors
- Verify that the proxy server is running
- Ensure external APIs (like PubChem) are accessible

#### Document Saving Issues
- Verify Firebase credentials and permissions
- Check network connectivity
- Inspect IndexedDB storage in browser developer tools

#### 3D Chemical Structure Display
- Ensure WebGL is enabled in the browser
- Verify that 3Dmol.js is loading correctly
- Check for script execution errors in CanvasBlock.js

### Support and Contact

For issues, feature requests, or contributions, please:
- Open an issue on GitHub
- Contact the development team at support@tooltutor.edu

---

## License

ToolTutor is licensed under the MIT License. See the LICENSE file for details.

---

© 2025 ToolTutor Team. All rights reserved.
