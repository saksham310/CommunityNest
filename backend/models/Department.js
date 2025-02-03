// models/Department.js
const mongoose = require('mongoose');

// Define the schema for the department
const departmentSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, // Reference to the User model
        ref: 'users',
        required: true 
    },
    // No description field anymore
}, { timestamps: true });

// Create and export the model
const Department = mongoose.model('Department', departmentSchema);
module.exports = Department;
