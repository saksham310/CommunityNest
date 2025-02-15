const express = require('express');
const Department = require('../models/Department');
const User = require('../models/User');

const router = express.Router();

// Middleware to parse JSON body (Ensure this is in your main `server.js` or `app.js`)
router.use(express.json());

// POST route to create a new department
router.post('/createDepartment', async (req, res) => {
    try {
        const { name, userId } = req.body;

        if (!name || !userId) {
            return res.status(400).json({ message: 'Name and userId are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newDepartment = new Department({ name, userId });
        await newDepartment.save();

        res.status(201).json({ message: 'Department created successfully', data: newDepartment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create department' });
    }
});


// Fetch departments based on user status (community or member)
router.get('/getDepartments', async (req, res) => {
    try {
      const { userId } = req.query;
  
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
  
      // Get user by ID
      const user = await User.findById(userId).populate('communityDetails.communityId');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      let departments;
  
      if (user.status === 'community') {
        // If the user is an admin, fetch departments for their community
        departments = await Department.find({ userId });  // The userId is the adminId
      } else if (user.status === 'member') {
        // If the user is a member, fetch departments based on the community's adminId
        const adminId = user.communityDetails[0]?.adminId; // Assuming the member is in one community
        if (!adminId) {
          return res.status(400).json({ message: 'Admin ID not found for the member' });
        }
  
        departments = await Department.find({ userId: adminId }); // AdminId is used to fetch departments
      }
  
      res.status(200).json({ data: departments });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to fetch departments' });
    }
  });
  

// PUT route to rename a department
router.put('/renameDepartment/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, userId } = req.body;  // Get userId from request body for validation

        if (!name || !userId) {
            return res.status(400).json({ message: 'New name and userId are required' });
        }

        const department = await Department.findById(id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        // Ensure only the owner can rename the department
        if (department.userId.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        department.name = name;
        const updatedDepartment = await department.save();

        res.status(200).json({ message: 'Department renamed successfully', data: updatedDepartment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to rename department' });
    }
});

// DELETE route to delete a department
router.delete("/deleteDepartment/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Deleting department with ID:", id); // Debugging log
  
      const deletedDepartment = await Department.findByIdAndDelete(id);
  
      if (!deletedDepartment) {
        return res.status(404).json({ message: "Department not found." });
      }
  
      res.status(200).json({ message: "Department deleted successfully." });
    } catch (error) {
      console.error("Server error:", error);
      res.status(500).json({ message: "Error deleting department", error });
    }
  });
  

module.exports = router;
