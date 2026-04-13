import { io } from "socket.io-client";

// In development, the Vite proxy in vite.config.js handles forwarding
// /socket.io requests to the backend server (port 4000).
const URL = import.meta.env.VITE_API_URL || ""; 

export const socket = io(URL, {
    autoConnect: false,
    auth: {
        // JWT token is injected before connect() is called
        token: localStorage.getItem('jwt_token') || null,
    },
});

/**
 * Update the socket auth token and reconnect if needed.
 * Called after login (set token) and logout (clear token).
 */
export function setSocketToken(token) {
    socket.auth = { ...socket.auth, token };
    if (socket.connected) {
        // Disconnect and reconnect so the new token is sent in the handshake
        socket.disconnect();
        socket.connect();
    }
}
