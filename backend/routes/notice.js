const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const Notification = require('../models/Notification');
const Community = require('../models/Community');
const User = require('../models/User');
const authenticate = require('./authenticate');

// Update only the sendNoticeNotifications function
const sendNoticeNotifications = async (io, notice, userId, communityId) => {
    try {
      const community = await Community.findById(communityId)
        .populate('members', '_id');
      
      if (!community) return;
  
      const sender = await User.findById(userId, 'username name');
      const membersToNotify = community.members
        .filter(member => member._id.toString() !== userId.toString())
        .map(member => member._id.toString()); // Ensure string IDs
  
      if (membersToNotify.length === 0) return;
  
      const notifications = await Promise.all(membersToNotify.map(async memberId => {
        const notification = new Notification({
          recipient: memberId,
          sender: userId,
          message: `New notice: ${notice.content.substring(0, 50)}${notice.content.length > 50 ? '...' : ''}`,
          type: 'notice',
          relatedEntity: notice._id
        });
        await notification.save();
        
        // Prepare the complete notification data
        const notificationData = {
          ...notification.toObject(),
          sender: {
            _id: sender._id,
            username: sender.username,
            name: sender.name
          },
          // Ensure createdAt is properly formatted
          createdAt: notification.createdAt.toISOString()
        };
        
        // Emit to the user's specific room with consistent naming
        io.to(`user_${memberId}`).emit('new-notification', notificationData);
        
        return notification;
      }));
  
      console.log(`Sent ${notifications.length} notifications`);
    } catch (error) {
      console.error('Notification error:', error);
    }
};
  
// Get all notices for community
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('communityDetails.communityId', 'members admin');

    let communityId;
    if (user.status === 'community') {
      communityId = user.managedCommunity;
    } else if (user.communityDetails?.length > 0) {
      communityId = user.communityDetails[0].communityId;
    }

    if (!communityId) {
      return res.json({ success: true, notices: [] });
    }

    const notices = await Notice.find({ communityId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username');

    res.json({ success: true, notices });
  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching notices',
      error: error.message 
    });
  }
});

// Create new notice
router.post('/', authenticate, async (req, res) => {
    try {
      const { content } = req.body;
      const io = req.app.get('io');
      const user = await User.findById(req.userId);
      
      if (!content) {
        return res.status(400).json({ 
          success: false, 
          message: "Notice content is required" 
        });
      }
  
      if (!user || user.status !== 'community') {
        return res.status(403).json({ 
          success: false, 
          message: "Only community admins can publish notices" 
        });
      }
  
      if (!user.managedCommunity) {
        return res.status(400).json({ 
          success: false, 
          message: "You don't manage any community" 
        });
      }
  
      const notice = new Notice({
        content,
        createdBy: req.userId,
        communityId: user.managedCommunity
      });
  
      await notice.save();
      
      // Get populated notice for response
      const populatedNotice = await Notice.findById(notice._id)
        .populate('createdBy', 'username');
  
      // Send notifications to community members
      await sendNoticeNotifications(io, notice, req.userId, user.managedCommunity);
      
      res.json({ 
        success: true, 
        notice: populatedNotice 
      });
    } catch (error) {
      console.error('Error creating notice:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error creating notice',
        error: error.message 
      });
    }
  });

// Update notice
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    const { id } = req.params;
    
    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: "Notice content is required" 
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user || user.status !== 'community') {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized" 
      });
    }

    const notice = await Notice.findOneAndUpdate(
      { 
        _id: id,
        communityId: user.managedCommunity,
        createdBy: req.userId 
      },
      { content },
      { new: true }
    ).populate('createdBy', 'username');

    if (!notice) {
      return res.status(404).json({ 
        success: false, 
        message: "Notice not found or unauthorized" 
      });
    }

    res.json({ success: true, notice });
  } catch (error) {
    console.error('Error updating notice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating notice',
      error: error.message 
    });
  }
});

// Delete notice
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.userId);
    
    if (!user || user.status !== 'community') {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized" 
      });
    }

    const notice = await Notice.findOneAndDelete({
      _id: id,
      communityId: user.managedCommunity,
      createdBy: req.userId
    });

    if (!notice) {
      return res.status(404).json({ 
        success: false, 
        message: "Notice not found or unauthorized" 
      });
    }

    res.json({ 
      success: true, 
      message: "Notice deleted successfully" 
    });
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting notice',
      error: error.message 
    });
  }
});

module.exports = router;