const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Notification = require('./models/Notification');

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server });

  // Map to store user connections (userId -> WebSocket)
  const clients = new Map();

  wss.on('connection', (ws, req) => {
    // Extract token from query parameters
    const token = req.url.split('token=')[1];
    
    if (!token) {
      ws.close();
      return;
    }

    try {
      // Verify token and get user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      // Store connection
      clients.set(userId, ws);
      console.log(`User ${userId} connected`);

      // Handle disconnection
      ws.on('close', () => {
        clients.delete(userId);
        console.log(`User ${userId} disconnected`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
        clients.delete(userId);
      });

    } catch (error) {
      console.error('Invalid WebSocket token:', error);
      ws.close();
    }
  });

  // Function to send notification to specific user
  const sendNotification = (userId, notification) => {
    const client = clients.get(userId.toString());
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'NEW_NOTIFICATION',
        data: notification
      }));
    }
  };

  // Function to broadcast to multiple users
  const broadcastToUsers = (userIds, notification) => {
    userIds.forEach(userId => {
      sendNotification(userId, notification);
    });
  };

  return { sendNotification, broadcastToUsers };
};

module.exports = setupWebSocket;