const express = require('express');
const router = express.Router();
const authenticate = require('./authenticate');
const Message = require('../models/Message');
const User = require('../models/User');

// Get messages between current user and another user
router.get('/messages/:userId', authenticate, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.userId, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.userId },
      ],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Search for users
router.get('/search', authenticate, async (req, res) => {
  try {
    const term = req.query.term;
    if (!term) {
      return res.json([]);
    }

    const users = await User.find({
      $or: [
        { username: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ],
    }).select('username email profileImage status');

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
});

// Save a message
router.post('/messages', authenticate, async (req, res) => {
  try {
    const { sender, receiver, content } = req.body;

    const message = new Message({
      sender,
      receiver,
      content,
      timestamp: new Date(),
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ message: 'Error saving message' });
  }
});

// //for chat history
// router.get('/conversations', authenticate, async (req, res) => {
//     try {
//       // Find all unique users the current user has messaged with
//       const conversations = await Message.aggregate([
//         {
//           $match: {
//             $or: [
//               { sender: mongoose.Types.ObjectId(req.userId) },
//               { recipient: mongoose.Types.ObjectId(req.userId) }
//             ]
//           }
//         },
//         {
//           $project: {
//             partner: {
//               $cond: [
//                 { $eq: ["$sender", mongoose.Types.ObjectId(req.userId)] },
//                 "$recipient",
//                 "$sender"
//               ]
//             },
//             content: 1,
//             timestamp: 1
//           }
//         },
//         {
//           $group: {
//             _id: "$partner",
//             lastMessage: { $last: "$$ROOT" }
//           }
//         },
//         {
//           $lookup: {
//             from: "users",
//             localField: "_id",
//             foreignField: "_id",
//             as: "user"
//           }
//         },
//         {
//           $unwind: "$user"
//         },
//         {
//           $sort: { "lastMessage.timestamp": -1 }
//         }
//       ]);
  
//       res.json(conversations);
//     } catch (error) {
//       console.error('Error fetching conversations:', error);
//       res.status(500).json({ message: 'Error fetching conversations' });
//     }
//   });

// Add this to your chat.js routes
// Add this new route to get conversation partners
router.get('/conversation-partners', authenticate, async (req, res) => {
    try {
      // Find all unique users the current user has messaged with
      const partners = await Message.aggregate([
        {
          $match: {
            $or: [
              { sender: mongoose.Types.ObjectId(req.userId) },
              { recipient: mongoose.Types.ObjectId(req.userId) }
            ]
          }
        },
        {
          $project: {
            partnerId: {
              $cond: [
                { $eq: ["$sender", mongoose.Types.ObjectId(req.userId)] },
                "$recipient",
                "$sender"
              ]
            },
            lastMessage: {
              content: "$content",
              timestamp: "$timestamp"
            }
          }
        },
        {
          $group: {
            _id: "$partnerId",
            lastMessage: { $last: "$lastMessage" }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userDetails"
          }
        },
        {
          $unwind: "$userDetails"
        },
        {
          $project: {
            _id: "$userDetails._id",
            username: "$userDetails.username",
            email: "$userDetails.email",
            profileImage: "$userDetails.profileImage",
            status: "$userDetails.status",
            lastMessage: 1
          }
        },
        {
          $sort: { "lastMessage.timestamp": -1 }
        }
      ]);
  
      res.json(partners);
    } catch (error) {
      console.error('Error fetching conversation partners:', error);
      res.status(500).json({ message: 'Error fetching conversation history' });
    }
  });
module.exports = router;