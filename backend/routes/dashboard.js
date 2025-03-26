const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Community = require('../models/Community');
const User = require('../models/User');
const Department = require('../models/Department');
const Notice = require('../models/Notice');
const authenticate = require('./authenticate');

router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('communityDetails.communityId', 'members admin');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Get community ID based on user status
    let communityId;
    if (user.status === 'community') {
      communityId = user.managedCommunity;
    } else if (user.communityDetails && user.communityDetails.length > 0) {
      communityId = user.communityDetails[0].communityId;
    }

    // Fetch all data in parallel for better performance
    const [announcements, notices, community] = await Promise.all([
      Event.find({ status: 'Announcement' })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name'),
      Notice.find({ communityId })  // Changed from findOne to find to get all notices
        .sort({ createdAt: -1 })
        .populate('createdBy', 'username'),
      communityId ? Community.findById(communityId) : Promise.resolve(null)
    ]);

    // Calculate statistics
    let membersCount = 0;
    let departmentsCount = 0;
    let adminId = null;

    if (community) {
      adminId = community.admin;
      membersCount = Math.max(0, community.members.length - 1); // Subtract admin from count
      
      // Get department count based on admin ID
      if (adminId) {
        departmentsCount = await Department.countDocuments({ userId: adminId });
      }
    }

    res.json({ 
      success: true, 
      announcements,
      notices, // Changed from notice to notices (array)
      stats: {
        events: announcements.length,
        members: membersCount,
        departments: departmentsCount
      },
      isAdmin: user.status === 'community' // Add flag for admin status
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error loading dashboard',
      error: error.message // Include error message for debugging
    });
  }
});

module.exports = router;