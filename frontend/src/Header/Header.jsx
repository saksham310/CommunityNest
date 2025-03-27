import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle, faBell, faSignOutAlt, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useNotifications } from "../contexts/NotificationContext.js";
import logo from "../logo.png";
import "./Header.css";

const Header = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  
  // Enhanced notification context usage
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    fetchNotifications,
    isConnected 
  } = useNotifications();

  // User info state
  const [user, setUser] = useState({
    username: localStorage.getItem("username") || "Guest",
    email: localStorage.getItem("email") || "Not Available"
  });

  useEffect(() => {
    // Initial fetch of notifications
    fetchNotifications();

    const handleStorageChange = () => {
      setUser({
        username: localStorage.getItem("username") || "Guest",
        email: localStorage.getItem("email") || "Not Available"
      });
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Handle click outside dropdown to close it
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowDropdown(false);
        setShowNotifications(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [fetchNotifications]);

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/auth/logout", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        localStorage.clear();
        setUser({ username: "Guest", email: "Not Available" });
        navigate("/login");
        setShowDropdown(false);
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Play sound when new notification arrives
  useEffect(() => {
    if (unreadCount > 0 && showNotifications) {
      // Refresh notifications when dropdown is open
      fetchNotifications();
    }
  }, [unreadCount, showNotifications, fetchNotifications]);

  return (
    <header className="App-header">
      <img src={logo} className="App-logo" alt="logo" />

      <div className="Header-right">
        {/* Notification Icon with connection status */}
        <div className="Notification-container" ref={notificationRef}>
          <div 
            className={`Notification-icon-wrapper ${!isConnected ? 'disconnected' : ''}`}
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) {
                fetchNotifications();
              }
            }}
            title={isConnected ? "Notifications" : "Connection lost - notifications disabled"}
          >
            <FontAwesomeIcon icon={faBell} className="Icon" />
            {unreadCount > 0 && <span className="Notification-badge">{unreadCount}</span>}
            {!isConnected && <span className="Connection-dot"></span>}
          </div>
          
          {showNotifications && (
            <div className="Notification-dropdown">
              <div className="Notification-header">
                <h4>Notifications</h4>
                {/* <button 
                  className="Refresh-btn"
                  onClick={() => fetchNotifications()}
                >
                  Refresh
                </button> */}
              </div>
              <div className="Notification-list">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div 
                      key={notification._id} 
                      className={`Notification-item ${!notification.read ? 'unread' : ''}`}
                      onClick={() => {
                        markAsRead(notification._id);
                        // Optional: navigate to relevant page
                      }}
                    >
                      <p className="Notification-message">{notification.message}</p>
                      <div className="Notification-meta">
                        {/* <span className="Notification-sender">
                          {notification.sender?.name || 'System'}
                        </span> */}
                        <span className="Notification-time">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="Notification-empty">No notifications</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rest of your header code remains the same */}
        <div className="User-info">
          <span className="Username">{user.username}</span>
          <span className="Email">{user.email}</span>
        </div>

        <div className="Dropdown-container" ref={dropdownRef}>
          <button className="Dropdown-btn" onClick={() => setShowDropdown(!showDropdown)}>
            <FontAwesomeIcon icon={faChevronDown} className="Arrow-icon" />
          </button>

          {showDropdown && (
            <div className="Dropdown-menu">
              <button className="Dropdown-item" onClick={handleLogout}>
                <FontAwesomeIcon icon={faSignOutAlt} className="Logout-icon" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;