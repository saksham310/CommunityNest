
const http = require('http');
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser");
const path = require("path");
const { Server: SocketIOServer } = require('socket.io');
const dashboardRoutes = require("./routes/dashboard");
const noticeRoutes = require("./routes/notice");
const authRoutes = require("./routes/auth");
const documentRoutes = require("./routes/documents");
const departmentRoutes = require("./routes/department");
const files = require("./routes/files");
const meetingRoutes = require("./routes/meeting");
const communityRoutes = require("./routes/community");
const eventRoutes = require("./routes/events");
const googleSheetsRoutes = require("./routes/googleSheetsRoutes");
const googleAuth = require("./routes/googleAuth");
// Add near other route imports
const notificationRoutes = require('./routes/notifications');
const jwt = require('jsonwebtoken'); 
const chatRoutes = require('./routes/chat');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const Message = require('./models/Message'); // You'll need to create this model

// Store connected clients
const connectedClients = new Map();

// Update your Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle authentication immediately when connection is established
  socket.on('authenticate', async (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Store the user ID in the socket object
      socket.userId = decoded.userId;
      
      // Join user's personal room
      socket.join(`user_${decoded.userId}`);
      
      // Add to connected clients map
      connectedClients.set(decoded.userId, socket);
      
      console.log(`User ${decoded.userId} authenticated and joined their room`);
      socket.emit('authenticated', { success: true });
      
      // Send online status to all connected clients
      updateOnlineUsers();
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('authenticated', { success: false, error: 'Authentication failed' });
      socket.disconnect();
    }
  });

// Replace your current 'private-message' handler with:
socket.on('private-message', async (message, callback) => {
  try {
    // Validate input
    if (!message.sender || !message.recipient || !message.content) {
      throw new Error('Invalid message format');
    }

    // Create and save message
    const newMessage = new Message({
      sender: message.sender,
      recipient: message.recipient,
      content: message.content
    });

    const savedMessage = await newMessage.save();
    
    // Deep populate the message
    const populatedMessage = await Message.populate(savedMessage, [
      { path: 'sender', select: 'username profileImage' },
      { path: 'recipient', select: 'username profileImage' }
    ]);

    // Convert to plain object and format IDs
    const messageToSend = populatedMessage.toObject();
    messageToSend._id = messageToSend._id.toString();
    messageToSend.sender._id = messageToSend.sender._id.toString();
    messageToSend.recipient._id = messageToSend.recipient._id.toString();

    // Emit to both parties
    io.to(`user_${message.sender}`).emit('new-message', messageToSend);
    io.to(`user_${message.recipient}`).emit('new-message', messageToSend);

    // Update conversation lists with error handling
    const updateConvoList = async (userId) => {
      try {
        const partners = await getConversationPartners(userId);
        io.to(`user_${userId}`).emit('conversation-update', partners);
      } catch (err) {
        console.error('Failed to update conversation list:', err);
      }
    };

    await Promise.all([
      updateConvoList(message.sender),
      updateConvoList(message.recipient)
    ]);

    // Acknowledge success
    if (callback) callback({ success: true, message: messageToSend });
  } catch (error) {
    console.error('Message handling error:', error);
    if (callback) callback({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
  
  // Add this helper function (put it outside the connection handler)
  // Update the getConversationPartners function in index.js
async function getConversationPartners(userId) {
  try {
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    // First check if there are any messages for this user
    const hasMessages = await Message.exists({
      $or: [
        { sender: objectId },
        { recipient: objectId }
      ]
    });

    if (!hasMessages) {
      return []; // Return empty array if no messages exist
    }

    return await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: objectId },
            { recipient: objectId }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", objectId] },
              "$recipient",
              "$sender"
            ]
          },
          lastMessage: { $first: "$$ROOT" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
      },
      {
        $project: {
          _id: "$user._id",
          username: "$user.username",
          email: "$user.email",
          profileImage: "$user.profileImage",
          status: "$user.status",
          lastMessage: {
            _id: "$lastMessage._id",
            content: "$lastMessage.content",
            timestamp: "$lastMessage.timestamp",
            sender: "$lastMessage.sender",
            recipient: "$lastMessage.recipient"
          }
        }
      },
      {
        $sort: { "lastMessage.timestamp": -1 }
      }
    ]);
  } catch (error) {
    console.error('Aggregation error:', error);
    throw error;
  }
}

  // Handle message history requests
  socket.on('get-messages', async ({ userId1, userId2 }) => {
    try {
      const messages = await Message.find({
        $or: [
          { sender: userId1, recipient: userId2 },
          { sender: userId2, recipient: userId1 }
        ]
      }).sort({ timestamp: 1 }).populate('sender recipient', 'username profileImage');

      socket.emit('previous-messages', messages);
    } catch (error) {
      console.error('Error fetching message history:', error);
    }
  });

  // socket.on('get-messages', async ({ userId1, userId2 }) => {
  //    try {
  //     const messages = await Message.find({
  //       $or: [
  //         { sender: userId1, recipient: userId2 },
  //         { sender: userId2, recipient: userId1 }
  //       ]
  //     })
  //     .sort({ timestamp: 1 })
  //     .populate('sender recipient', 'username profileImage');
  
  //     // Mark messages as read
  //     await Message.updateMany(
  //       {
  //         sender: userId2,
  //         recipient: userId1,
  //         read: false
  //       },
  //       { $set: { read: true } }
  //     );
  
  //     socket.emit('previous-messages', messages);
  //   } catch (error) {
  //     console.error('Error fetching message history:', error);
  //   }
  // });
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
    if (socket.userId) {
      connectedClients.delete(socket.userId);
      updateOnlineUsers();
    }
  });

  // Helper function to update online users
  function updateOnlineUsers() {
    const onlineUsers = Array.from(connectedClients.keys());
    io.emit('online-users', onlineUsers);
  }
});

// Update the sendNotification utility
function sendNotification(userId, notification) {
  io.to(`user_${userId}`).emit('new-notification', notification);
  console.log(`Notification sent to user ${userId}`);
}


// Enhanced notification utility function
function sendNotification(userId, data) {
  // Get the socket instance from the server
  const io = app.get('io');
  
  // Emit to the specific user's room
  io.to(`user_${userId}`).emit('new-notification', data);
  
  console.log(`Notification sent to user ${userId}`);
}
// Make io accessible to routes
app.set('io', io);

// Middleware to parse cookies
app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL,
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], 
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://apis.google.com",
          "https://accounts.google.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "https://www.googleapis.com",
          "https://oauth2.googleapis.com",
        ],
        frameSrc: ["https://accounts.google.com", "https://www.googleapis.com"],
      },
    },
  })
);

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database connection
mongoose
  .connect(process.env.MONGO_URL, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  })
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("DB not connected:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/file", files);
app.use("/api/meeting", meetingRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/google-sheets", googleSheetsRoutes);
app.use("/api/google", googleAuth.router);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notice", noticeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

// Utility function to send notifications
function sendNotification(userId, data) {
  const clientSocket = connectedClients.get(userId);
  if (clientSocket) {
    clientSocket.emit('notification', data);
  }
}

// Make sendNotification available to routes
app.set('sendNotification', sendNotification);
