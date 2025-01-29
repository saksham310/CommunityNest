import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserCircle, faBell, faSignOutAlt
} from "@fortawesome/free-solid-svg-icons";
import logo from "../logo.png";
import "./Header.css";

const Header = () => {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [notifications, setNotifications] = useState(3); // Example count

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    navigate("/login");
  };

  return (
    <header className="App-header">
      <img src={logo} className="App-logo" alt="logo" />

      <div className="Header-right">
        {/* Profile Icon */}
        <FontAwesomeIcon icon={faUserCircle} className="Icon" title="Profile" />

        {/* Notification Icon with Badge */}
        <div className="Notification-container">
          <FontAwesomeIcon icon={faBell} className="Icon" title="Notifications" />
          {notifications > 0 && <span className="Notification-badge">{notifications}</span>}
        </div>

        {/* Register Button */}
        <Link to="/login" className="Register-btn">Register</Link>

        {/* Logout Button */}
        <button className="Logout-btn" onClick={() => setShowConfirm(true)}>
          <FontAwesomeIcon icon={faSignOutAlt} className="Logout-icon" /> Logout
        </button>
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
