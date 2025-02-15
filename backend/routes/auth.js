const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto"); // To generate reset tokens
const nodemailer = require("nodemailer"); // To send emails
const router = express.Router();
const Community = require("../models/Community");
const authenticate = require("./authenticate"); 
const jwt = require('jsonwebtoken'); // Import jsonwebtoken here




// User model
const User = require("../models/User");

// Email configuration for sending reset links (You should replace these with your own credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'bristinaprajapati99@gmail.com', // Your email
    pass: 'wsaf appb angc opvt', // Your email password (use app password if 2FA enabled)
  },
});


// Signup Route
router.post("/signup", async (req, res) => {
  const { username, email, password, status } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      status,
      communities: [],
      managedCommunity: null,
    });

    // If the user is signing up as a community admin, create a community
    if (status === "community") {
      const newCommunity = new Community({ 
        name: `${username}'s Community`, 
        admin: newUser._id, 
        members: [] 
      });
      await newCommunity.save();
      newUser.managedCommunity = newCommunity._id; // Assign the community to the admin
    }

    await newUser.save();
    res.status(201).json({ message: "User created successfully!", user: newUser });
  } catch (err) {
    res.status(500).json({ message: "Error creating user", error: err });
  }
});

// Get user by ID
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Get user by Email
router.get("/user/email/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});


router.get("/data", authenticate, async (req, res) => {
  console.log("User ID from token:", req.userId);  // Debug log
  try {
    const user = await User.findById(req.userId).select("status managedCommunity communities");
    
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    res.status(200).json({
      status: user.status,
      managedCommunity: user.managedCommunity || null,
      communities: user.communities || [],  // Ensure it always returns an array
    });
  } catch (error) {
    console.error("Error:", error);  // Debug log
    res.status(500).json({ message: "Server error", error });
  }
});



router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Login attempt for Email:', email); // Log email for debugging

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found'); // Log when user is not found
      return res.status(400).json({ message: 'User not found' });
    }

    console.log('User found:', user); // Log user details for debugging

    // Compare provided password with stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid password'); // Log when password doesn't match
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Check if the email belongs to an admin
    const isAdmin = email === 'bristinaprajapati99@gmail.com'; 

    // Generate JWT token (use environment variable for secret key)
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '1h' });

    console.log('Login successful, token generated'); // Log token generation success

    // Send response with user details, token, and communities
    res.status(200).json({ 
      message: 'Login successful', 
      userId: user._id, 
      isAdmin, 
      token,
      username: user.username, // Return the username
      email: user.email, // Return the email
      communities: user.communities, // Return user communities (if needed)
    });
  } catch (err) {
    console.error('Login error:', err.message || err); // Log error details for debugging
    res.status(500).json({ message: 'Server error' });
  }
});



// Forgot Password route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

    // Store OTP and expiration time (optional)
    user.resetToken = otp;
    user.resetTokenExpiry = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

    await user.save();

    // Send OTP via email
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Password Reset OTP',
      text: `Here is your OTP for password reset: ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ message: 'Error sending OTP' });
      }
      res.status(200).json({ success: true, message: 'OTP sent to your email' });
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP route
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email, resetToken: otp });

    if (!user || user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    res.status(200).json({ success: true, message: 'OTP verified successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Reset Password route
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email, resetToken: otp });

    if (!user || user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    // Hash the new password and update it
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = undefined; // Clear the reset token
    user.resetTokenExpiry = undefined; // Clear the expiry time
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});




module.exports = router;
