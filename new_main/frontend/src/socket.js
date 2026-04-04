import { io } from "socket.io-client";

// In development, the Vite proxy in vite.config.js handles forwarding
// /socket.io requests to the backend server (port 4000).
const URL = ""; 

export const socket = io(URL, {
    autoConnect: false
});
