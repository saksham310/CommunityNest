// const express = require('express');
// const router = express.Router();
// const Event = require('../models/Event');
// const Community = require('../models/Community');
// const User = require('../models/User');
// const Department = require('../models/Department');
// const authenticate = require('./authenticate');

// router.get('/', authenticate, async (req, res) => {
//   try {
//     const user = await User.findById(req.userId)
//       .populate({
//         path: 'communityDetails.communityId',
//         select: 'members admin name',
//         populate: { path: 'members', select: 'username email status' }
//       })
//       .populate('managedCommunity', 'name members');

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     let communityId;
//     let communityDetails = null;

//     if (user.status === 'community') {
//       communityId = user.managedCommunity?._id;
//       communityDetails = user.managedCommunity;
//     } else if (user.communityDetails?.length > 0) {
//       communityId = user.communityDetails[0].communityId?._id;
//       communityDetails = user.communityDetails[0].communityId;
//     }

//     // Fetch data in parallel
//     const [announcements] = await Promise.all([
//       Event.find({ status: 'Announcement' })
//         .sort({ createdAt: -1 })
//         .populate('createdBy', 'name')
//     ]);

//     // Calculate statistics
//     let membersCount = 0;
//     let departmentsCount = 0;

//     if (communityDetails) {
//       const isAdmin = user.status === 'community' && 
//                      communityDetails.admin?.toString() === user._id.toString();
      
//       membersCount = isAdmin 
//         ? Math.max(0, communityDetails.members.length - 1)
//         : communityDetails.members.length;

//       if (communityDetails.admin) {
//         departmentsCount = await Department.countDocuments({ 
//           userId: communityDetails.admin 
//         });
//       }
//     }

//     res.json({ 
//       success: true, 
//       announcements,
//       userStatus: user.status,
//       community: communityDetails ? {
//         id: communityDetails._id,
//         name: communityDetails.name,
//         memberCount: membersCount
//       } : null,
//       stats: {
//         events: announcements.length,
//         members: membersCount,
//         departments: departmentsCount
//       },
//       isAdmin: user.status === 'community'
//     });
//   } catch (error) {
//     console.error('Dashboard error:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Error loading dashboard',
//       error: error.message
//     });
//   }
// });

// module.exports = router;



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
      .populate({
        path: 'communityDetails.communityId',
        select: 'members admin name',
        populate: { path: 'members', select: 'username email status' }
      })
      .populate({
        path: 'managedCommunity',
        select: 'name members admin',
        populate: { path: 'members', select: 'username email status' }
      });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let communityId;
    let community = null;

    if (user.status === 'community') {
      community = user.managedCommunity;
      communityId = community?._id;
    } else if (user.communityDetails?.length > 0) {
      community = user.communityDetails[0].communityId;
      communityId = community?._id;
    }

    if (!community) {
      return res.json({ 
        success: true,
        announcements: [],
        notices: [],
        stats: { events: 0, members: 0, departments: 0 },
        isAdmin: false
      });
    }

    const [announcements, notices] = await Promise.all([
      Event.find({ status: 'Announcement' })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name'),
      Notice.find({ communityId })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'username')
    ]);

    // Calculate members count properly
    let membersCount = community.members.length;

    // Only subtract 1 if admin is included in members list
    if (user.status === 'community' && 
        community.admin && 
        community.admin.toString() === user._id.toString()) {
      
      const adminInMembers = community.members.some(
        member => member._id.toString() === user._id.toString()
      );
      
      if (adminInMembers) {
        membersCount = Math.max(0, community.members.length - 1);
      }
    }

    const departmentsCount = community.admin 
      ? await Department.countDocuments({ userId: community.admin })
      : 0;

    res.json({ 
      success: true, 
      announcements,
      notices,
      stats: {
        events: announcements.length,
        members: membersCount,
        departments: departmentsCount
      },
      isAdmin: user.status === 'community'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error loading dashboard',
      error: error.message 
    });
  }
});

module.exports = router;