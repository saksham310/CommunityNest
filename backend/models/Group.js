const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  members: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    validate: {
      validator: async function(v) {
        return await mongoose.model('User').exists({ _id: v });
      },
      message: props => `User ${props.value} does not exist`
    }
  }],
  admin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    validate: {
      validator: async function(v) {
        return await mongoose.model('User').exists({ _id: v });
      },
      message: props => `Admin user ${props.value} does not exist`
    }
  },
  createdAt: { type: Date, default: Date.now }
});

// Add index for members array
GroupSchema.index({ members: 1 });

module.exports = mongoose.model('Group', GroupSchema);