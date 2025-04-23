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
const groupRoutes = require('./routes/group');
const Message = require('./models/Message'); 
const config = require('./config');
// const postRoutes = require('./routes/posts');
// const conversationRoutes = require('./routes/conversations');
// const messageRoutes = require('./routes/messages');



// Load environment variables
dotenv.config();
const Group = require('./models/Group');

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



// Store connected clients
const connectedClients = new Map();


io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // socket.on('new-message', () => {
  //   console.log('New message event received');
  //   const message = 'BRISITNA'
  //   io.emit('refetch',{message})
  // })

  // Handle authentication
  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      
      // Store the connection
      connectedClients.set(decoded.userId, socket);
      
      // Join user's personal room
      socket.join(`user_${decoded.userId}`);
      
      // Join all group rooms for this user
      const userGroups = await Group.find({ members: decoded.userId });
      userGroups.forEach(group => {
        socket.join(`group_${group._id}`);
      });
      
      socket.emit('authenticated', { success: true });
      updateOnlineUsers();
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('authenticated', { success: false, error: 'Authentication failed' });
      socket.disconnect();
    }
  });

  // Handle private chat joining
  socket.on('join-private-chat', ({ userId1, userId2 }) => {
    const roomId = [userId1, userId2].sort().join('_');

    socket.join(`private_${roomId}`);
    
    console.log(`User ${socket.userId} joined private chat ${roomId}`);
  });

  // Handle group chat joining
  socket.on('join-group-chat', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`User ${socket.userId} joined group chat ${groupId}`);
  });

  

// Handle private messages
socket.on('private-message', async (messageData) => {
  console.log('Received private message:', messageData);
  try {
    // Validate sender
    // if (messageData.sender !== socket.userId) {
    //   throw new Error('Unauthorized message sender');
    // }
    // Create and save message
    const message = new Message({
      sender: messageData.sender,
      recipient: messageData.recipient,
      content: messageData.content,
      timestamp: new Date(),
      type: 'private',
      status: 'delivered'
    });

    const savedMessage = await message.save();
    const populatedMessage = await Message.populate(savedMessage, [
      { path: 'sender', select: 'username profileImage' },
      { path: 'recipient', select: 'username profileImage' }
    ]);

    io.emit('refetch',{messageData})
    // // Send to recipient
    // io.to(`user_${messageData.sender}`).emit('private-message', {
    //   message: populatedMessage,
    //   isOwnMessage: true
    // });

    // // Send confirmation to sender
    // callback({ 
    //   status: 'success',
    //   message: {
    //     ...populatedMessage.toObject(),
    //     status: 'delivered'
    //   }
    // });

    // io.to(`user_${messageData.recipient}`).emit('private-message', {
    //   message: populatedMessage,
    //   isOwnMessage: false
    // });
    

  } catch (error) {
    console.error('Message send error:', error);
    callback({ status: 'error', error: error.message });
  }
});

// Handle group messages
socket.on('group-message', async (data) => {
  try {
    const { groupId, message } = data;
    
    // Verify user is member of the group
    const isMember = await Group.exists({
      _id: groupId,
      members: socket.userId
    });

    if (!isMember) {
      throw new Error('Not a member of this group');
    }

    // Save message to database
    const newMessage = new Message({
      sender: socket.userId,
      group: groupId,
      content: message.content,
      timestamp: new Date(),
      type: 'group'
    });

    const savedMessage = await newMessage.save();
    
    // Update group's last message
    await Group.findByIdAndUpdate(groupId, {
      lastMessage: savedMessage._id
    });

    // Populate the message
    const populatedMessage = await Message.populate(savedMessage, [
      { path: 'sender', select: 'username profileImage' },
      { path: 'group', select: 'name' }
    ]);

    // Broadcast to all group members
    io.to(`group_${groupId}`).emit('group-message', {
      message: populatedMessage
    });
    
  } catch (error) {
    console.error('Error handling group message:', error);
    socket.emit('error', { message: 'Failed to send group message' });
  }
});



socket.on('get-group-conversations', async () => {
  if (!socket.userId) return;
  
  try {
    const groups = await Group.aggregate([
      { $match: { members: mongoose.Types.ObjectId(socket.userId) } },
      {
        $lookup: {
          from: 'messages',
          let: { groupId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ['$group', '$$groupId'] },
                type: 'group'
              } 
            },
            { $sort: { timestamp: -1 } },
            { $limit: 1 }
          ],
          as: 'lastMessage'
        }
      },
      { $unwind: { path: '$lastMessage', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.sender',
          foreignField: '_id',
          as: 'lastMessage.sender'
        }
      },
      { $unwind: { path: '$lastMessage.sender', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          members: 1,
          lastMessage: {
            $cond: {
              if: { $ifNull: ['$lastMessage', false] },
              then: {
                content: '$lastMessage.content',
                timestamp: '$lastMessage.timestamp',
                sender: {
                  _id: '$lastMessage.sender._id',
                  username: '$lastMessage.sender.username'
                }
              },
              else: null
            }
          }
        }
      },
      { $sort: { 'lastMessage.timestamp': -1 } }
    ]);

    socket.emit('group-conversations', groups);
  } catch (error) {
    console.error('Error fetching group conversations:', error);
  }
});

socket.on('new-msg',async ({selectedId,currentId}) => {
io.emit(`${selectedId}`,currentId);
}
);

// Add this helper function
async function getGroupConversations(userId) {
  return await Group.aggregate([
    {
      $match: {
        members: mongoose.Types.ObjectId(userId)
      }
    },
    {
      $lookup: {
        from: "messages",
        let: { groupId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$group", "$$groupId"] },
                  { $eq: ["$type", "group"] }
                ]
              }
            }
          },
          { $sort: { timestamp: -1 } },
          { $limit: 1 }
        ],
        as: "lastMessage"
      }
    },
    {
      $unwind: {
        path: "$lastMessage",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "lastMessage.sender",
        foreignField: "_id",
        as: "lastMessage.sender"
      }
    },
    {
      $unwind: {
        path: "$lastMessage.sender",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        image: 1,
        members: 1,
        unreadCount: 0, // You can implement this later
        lastMessage: {
          $cond: {
            if: { $ifNull: ["$lastMessage", false] },
            then: {
              _id: "$lastMessage._id",
              content: "$lastMessage.content",
              timestamp: "$lastMessage.timestamp",
              sender: {
                _id: "$lastMessage.sender._id",
                username: "$lastMessage.sender.username",
                profileImage: "$lastMessage.sender.profileImage"
              }
            },
            else: null
          }
        }
      }
    },
    {
      $sort: { "lastMessage.timestamp": -1 }
    }
  ]);
}
  
  // Add this helper function (put it outside the connection handler)
  async function getConversationPartners(userId) {
    return await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: mongoose.Types.ObjectId(userId) },
            { recipient: mongoose.Types.ObjectId(userId) }
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
              { $eq: ["$sender", mongoose.Types.ObjectId(userId)] },
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
            content: "$lastMessage.content",
            timestamp: "$lastMessage.timestamp"
          }
        }
      },
      {
        $sort: { "lastMessage.timestamp": -1 }
      }
    ]);
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
app.use('/api/group', groupRoutes);
// app.use('/api/posts', postRoutes);
// app.use('/api/conversations', conversationRoutes);
// app.use('/api/messages', messageRoutes);

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