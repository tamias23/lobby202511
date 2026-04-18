import { createContext } from 'react';

// Shared context so components can consume the socket without importing App.jsx
// (which would create a circular dependency: App → Component → App).
export const SocketContext = createContext(null);
