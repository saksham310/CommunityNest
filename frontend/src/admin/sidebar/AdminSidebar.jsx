import React from "react";
import { NavLink } from "react-router-dom";
import { FiGrid, FiUsers, FiBriefcase, FiCalendar } from "react-icons/fi"; // Importing React Icons
import "./AdminSidebar.css";

const Sidebar = () => {
  const menuItems = [
    { name: "Dashboard", icon: <FiGrid />, path: "/admin-dashboard" },
    { name: "Members", icon: <FiUsers />, path: "/members" },
    { name: "Departments", icon: <FiBriefcase />, path: "/departments" },
    { name: "Events", icon: <FiCalendar />, path: "/events" },
    { name: "Meetings", icon: <FiCalendar />, path: "/meetings" },
  ];

  return (
    <div className="Sidebar">
      <div className="Sidebar-title">Admin Panel</div>
      <ul className="Sidebar-menu">
        {menuItems.map((item) => (
          <li key={item.name} className="Sidebar-item">
            <NavLink
              to={item.path}
              className={({ isActive }) => `Sidebar-link ${isActive ? "active" : ""}`}
            >
              <span className="Sidebar-icon">{item.icon}</span>
              <span className="Sidebar-text">{item.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
