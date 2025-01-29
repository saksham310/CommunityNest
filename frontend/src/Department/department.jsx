
import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlusCircle, faTimes, faEllipsisH } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import "./department.css";
import Sidebar from "../Sidebar/sidebar.jsx"; 
import axios from "axios";

const Department = () => {
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(null); // To manage dropdown visibility
  const [renameModal, setRenameModal] = useState(false); // For showing the rename popup
  const [renameValue, setRenameValue] = useState(""); // For storing new department name
  const [departmentToRename, setDepartmentToRename] = useState(null); // The department being renamed
  const navigate = useNavigate();

  // Retrieve departments from localStorage when the component mounts
  useEffect(() => {
    const savedDepartments = JSON.parse(localStorage.getItem("departments"));
    if (savedDepartments) {
      setDepartments(savedDepartments);
    }
  }, []);

  // Save departments to localStorage whenever they change
  useEffect(() => {
    if (departments.length > 0) {
      localStorage.setItem("departments", JSON.stringify(departments));
    }
  }, [departments]);

  const addDepartment = () => {
    if (newDepartment.trim()) {
      const newDept = {
        name: newDepartment,
        id: (departments.length + 1).toString(), // Generate a unique ID
        documents: [], // Add an empty document array to store documents for this department
      };
      setDepartments([...departments, newDept]); // Add new department
      setNewDepartment("");
      setShowModal(false);
    }
  };

  const handleDepartmentClick = (dept) => {
    navigate(`/department/${dept.id}/documents`); // Navigate to department-specific repository
  };

  const handleDeleteDepartment = (id) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      // First, check if the department has documents
      axios
        .get(`http://localhost:5001/api/document/getDocumentsByDepartment/${id}`)
        .then((response) => {
          if (response.data.length > 0) {
            // If documents exist, show a warning
            alert("The department's document repository is not empty. Please empty the repository before deleting the department.");
          } else {
            // If no documents exist, proceed with deletion
            axios
              .delete(`http://localhost:5001/api/document/deleteByDepartment/${id}`)
              .then(() => {
                const updatedDepartments = departments.filter((dept) => dept.id !== id);
                localStorage.setItem("departments", JSON.stringify(updatedDepartments));
                setDepartments(updatedDepartments);
                alert("Department deleted successfully.");
              })
              .catch((err) => {
                console.error("Error deleting department:", err);
                alert("Error deleting department, please try again.");
              });
          }
        })
        .catch((err) => {
          console.error("Error checking documents:", err);
          alert("Error checking the department's documents, please try again.");
        });
    }
  };
  

  const handleRenameDepartment = (id) => {
    const dept = departments.find((dept) => dept.id === id);
    setDepartmentToRename(dept);
    setRenameValue(dept.name);
    setRenameModal(true); // Open the rename popup
  };

  const handleSaveRename = () => {
    const updatedDepartments = departments.map((dept) => {
      if (dept.id === departmentToRename.id) {
        return { ...dept, name: renameValue };
      }
      return dept;
    });
    setDepartments(updatedDepartments);
    setRenameModal(false); // Close the rename modal
    setDepartmentToRename(null);
    setRenameValue("");
  };

  return (
    <div className="Department-section">
      <Sidebar />
      <div className="Department-header">
        <h2>Departments</h2>

        {/* Add Department Button */}
        <button
          className="Add-department-button"
          onClick={() => setShowModal(true)}
        >
          <FontAwesomeIcon icon={faPlusCircle} className="Add-department-icon" />
          Add New Department
        </button>
      </div>

      {/* Department Cards */}
      <div className="Department-cards">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="Department-card"
            onClick={() => handleDepartmentClick(dept)}
          >
            <div className="Department-card-header">
              <h3>{dept.name}</h3>
              {/* 3 Horizontal Dots icon */}
              <FontAwesomeIcon
                icon={faEllipsisH}
                className="Options-icon"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click from triggering
                  setShowDropdown(dept.id === showDropdown ? null : dept.id); // Toggle dropdown visibility
                }}
              />
            </div>

            {/* Dropdown for options */}
            {showDropdown === dept.id && (
              <div className="Dropdown-menu" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleRenameDepartment(dept.id)}>Rename</button>
                <button onClick={() => handleDeleteDepartment(dept.id)}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="Modal">
          <div className="Modal-content">
            <FontAwesomeIcon
              icon={faTimes}
              className="Close-icon"
              onClick={() => setShowModal(false)}
            />
            <h3>Add New Department</h3>
            <input
              type="text"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="Department Name"
              className="Add-department-input"
            />
            <button onClick={addDepartment} className="Add-department-button">
              Create Department
            </button>
          </div>
        </div>
      )}

      {/* Rename Department Modal */}
      {renameModal && (
        <div className="Modal">
          <div className="Modal-content">
            <FontAwesomeIcon
              icon={faTimes}
              className="Close-icon"
              onClick={() => setRenameModal(false)}
            />
            <h3>Rename Department</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="New Department Name"
              className="Rename-department-input"
            />
            <button onClick={handleSaveRename} className="Rename-department-button">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Department;