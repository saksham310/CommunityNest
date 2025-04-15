const express = require('express');
const router = express.Router();
const authenticate = require('./authenticate');
const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// Get messages between current user and another user
router.get('/messages/:userId', authenticate, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.userId, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.userId },
      ],
    })
    .sort({ timestamp: 1 })
    .populate('sender recipient', 'username profileImage');

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
      _id: { $ne: req.userId } // Exclude current user
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
    const { recipient, content } = req.body;

    const message = new Message({
      sender: req.userId,
      recipient,
      content,
      timestamp: new Date(),
    });

    await message.save();
    
    // Populate sender and recipient details
    const populatedMessage = await Message.populate(message, [
      { path: 'sender', select: 'username profileImage' },
      { path: 'recipient', select: 'username profileImage' }
    ]);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ message: 'Error saving message' });
  }
});

// Get conversation partners
router.get('/conversation-partners', authenticate, async (req, res) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);
  
      // Get the most recent message for each conversation partner
      const partners = await Message.aggregate([
        {
          $match: {
            $or: [
              { sender: userId },
              { recipient: userId }
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
                { $eq: ["$sender", userId] },
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
  
      console.log('Conversation partners found:', partners.length); // Debug log
      res.json(partners);
    } catch (error) {
      console.error('Detailed error:', {
        message: error.message,
        stack: error.stack,
        fullError: error
      });
      res.status(500).json({ 
        message: 'Error fetching conversation history',
        error: error.message 
      });
    }
  });

module.exports = router;