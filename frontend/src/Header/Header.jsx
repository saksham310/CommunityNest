import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle, faBell, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import logo from "../logo.png";
import "./Header.css";

const Header = () => {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [notifications, setNotifications] = useState(3); // Example count

  // State for user information
  const [user, setUser] = useState({
    username: localStorage.getItem("username") || "Guest",
    email: localStorage.getItem("email") || "Not Available"
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setUser({
        username: localStorage.getItem("username") || "Guest",
        email: localStorage.getItem("email") || "Not Available"
      });
    };

    // Listen for storage updates
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    setUser({ username: "Guest", email: "Not Available" }); // Reset UI
    navigate("/login");
  };

  return (
    <header className="App-header">
      <img src={logo} className="App-logo" alt="logo" />

      <div className="Header-right">
        {/* Display Username and Email */}
        <div className="User-info">
          <span className="Username">{user.username}</span>
          <span className="Email">{user.email}</span>
        </div>

        {/* Profile Icon */}
        <FontAwesomeIcon icon={faUserCircle} className="Icon" title="Profile" />

        {/* Notification Icon with Badge */}
        <div className="Notification-container">
          <FontAwesomeIcon icon={faBell} className="Icon" title="Notifications" />
          {notifications > 0 && <span className="Notification-badge">{notifications}</span>}
        </div>

        {/* Register Button */}
        {!localStorage.getItem("userToken") && (
          <Link to="/login" className="Register-btn">Register</Link>
        )}

        {/* Logout Button */}
        {localStorage.getItem("userToken") && (
          <button className="Logout-btn" onClick={() => setShowConfirm(true)}>
            <FontAwesomeIcon icon={faSignOutAlt} className="Logout-icon" /> Logout
          </button>
        )}
      </div>

      {/* Logout Confirmation Popup */}
      {showConfirm && (
        <div className="Logout-popup">
          <p>Are you sure you want to logout?</p>
          <button className="Confirm-btn" onClick={handleLogout}>Yes</button>
          <button className="Cancel-btn" onClick={() => setShowConfirm(false)}>Cancel</button>
        </div>
      )}
    </header>
  );
};

export default Header;
