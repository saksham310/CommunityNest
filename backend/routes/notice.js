const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const User = require('../models/User');
const authenticate = require('./authenticate');

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
    
    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: "Notice content is required" 
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (user.status !== 'community') {
      return res.status(403).json({ 
        success: false, 
        message: "Only community accounts can publish notices" 
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
    
    res.json({ 
      success: true, 
      notice: await notice.populate('createdBy', 'username') 
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