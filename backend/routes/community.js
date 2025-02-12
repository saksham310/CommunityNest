const express = require("express");
const Community = require("../models/Community");
const User = require("../models/User");
const authenticate = require("./authenticate"); // Assuming authenticate middleware is correctly set up

const router = express.Router();

// Add a member to a community (only for community accounts)
router.post("/add-member", authenticate, async (req, res) => {
    const { communityId, memberEmail } = req.body;
    const userId = req.userId; // Extract user ID from token
  
    try {
      const community = await Community.findById(communityId);
      if (!community) return res.status(404).json({ message: "Community not found" });
  
      if (String(community.admin) !== String(userId)) {
        return res.status(403).json({ message: "You do not have permission to add members to this community!" });
      }
  
      const userToAdd = await User.findOne({ email: memberEmail });
      if (!userToAdd) {
        return res.status(404).json({ message: "Email not registered" });
      }
  
      // Check if the user has a status of "member"
      if (userToAdd.status !== "member") {
        return res.status(400).json({ message: "The user must have registered as member to be added to the community." });
      }
  
      if (community.members.includes(userToAdd._id)) {
        return res.status(400).json({ message: "User is already a member" });
      }
  
      community.members.push(userToAdd._id);
      await community.save();
  
      res.json({ message: "Member added successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error", error });
    }
  });
  
// Remove a member from a community (only for community admins)
router.delete("/:communityId/remove-member/:memberId", authenticate, async (req, res) => {
    const { communityId, memberId } = req.params;
    const userId = req.userId; // Extract user ID from token
  
    try {
      const community = await Community.findById(communityId);
      if (!community) return res.status(404).json({ message: "Community not found" });
  
      if (String(community.admin) !== String(userId)) {
        return res.status(403).json({ message: "You do not have permission to remove members from this community!" });
      }
  
      // Remove the member's ID from the community's members array
      const memberIndex = community.members.indexOf(memberId);
      if (memberIndex === -1) {
        return res.status(404).json({ message: "Member not found in the community" });
      }
  
      community.members.splice(memberIndex, 1);
      await community.save();
  
    //   res.json({ message: "Member removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error", error });
    }
  });
  
  
// Get all members of a community (for both community managers and normal members)
router.get("/:communityId/members", authenticate, async (req, res) => {
  const userId = req.userId; // Use req.userId consistently
  const { communityId } = req.params;
  
  try {
    // Find the community
    const community = await Community.findById(communityId).populate("members", "username email");

    if (!community) {
      return res.status(404).json({ message: "Community not found!" });
    }

    const currentUser = await User.findById(userId);

    // Check if the user is part of the community
    if (currentUser.status === "member" && !currentUser.communities.includes(communityId)) {
      return res.status(403).json({ message: "You are not a member of this community!" });
    }

    res.status(200).json({ members: community.members });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
