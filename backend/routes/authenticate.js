// const jwt = require('jsonwebtoken');

// // Middleware to authenticate and add userId to the request
// const authenticate = (req, res, next) => {
//   const token = req.headers['authorization']?.split(' ')[1]; // Get token from Authorization header

//   if (!token) {
//     return res.status(401).json({ success: false, message: "No token provided" });
//   }

//   try {
//     // Verify the token
//     const decoded = jwt.verify(token, 'your_secret_key'); // Use your secret key

//     // Attach the userId to the request object
//     req.userId = decoded.userId;

//     // Proceed to the next middleware or route handler
//     next();
//   } catch (error) {
//     return res.status(401).json({ success: false, message: "Invalid or expired token" });
//   }
// };

// module.exports = authenticate;
// authenticate.js
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    // Use the same secret as in your login route
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: "Invalid or expired token",
      error: error.message 
    });
  }
};

module.exports = authenticate;