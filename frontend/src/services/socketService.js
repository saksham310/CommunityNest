import { io } from 'socket.io-client';

let socket = null;

export const initializeSocket = (token) => {
  if (!socket) {
    socket = io('http://localhost:5001', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized!');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};