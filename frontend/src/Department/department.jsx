import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./department.css";
import Sidebar from "../Sidebar/sidebar.jsx";
import dotsIcon from "../dots.png"; // Ensure the correct path

const Department = () => {
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [departmentToRename, setDepartmentToRename] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [activeMenu, setActiveMenu] = useState(null); // Track which menu is open
  const navigate = useNavigate(); // Initialize navigate hook
  const [userStatus, setUserStatus] = useState(null); // Track user status 

  useEffect(() => {
    // Call fetchUserStatus to update userStatus
    fetchUserStatus();

    const userId = localStorage.getItem("userId");
    if (userId) {
      axios
        .get(
          `http://localhost:5001/api/department/getDepartments?userId=${userId}`
        )
        .then((response) => {
          setDepartments(response.data.data);
        })
        .catch((error) => {
          console.error(error);
          alert("Error fetching departments");
        });
    } else {
      alert("You must be logged in to view your departments");
    }
  }, []);

  const fetchUserStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5001/api/auth/data", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      // Set the user status based on the response
      setUserStatus(response.data.status); // This will set the userStatus to "member" or "community"
    } catch (error) {
      console.error("Error fetching user status:", error);
    }
  };

  const addDepartment = async () => {
    if (newDepartment.trim()) {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("You must be logged in to create a department");
        return;
      }

      try {
        const response = await axios.post(
          "http://localhost:5001/api/department/createDepartment",
          {
            name: newDepartment,
            userId,
          }
        );

        setDepartments([...departments, response.data.data]);
        setNewDepartment("");
        setShowModal(false);
      } catch (error) {
        console.error(error);
        alert("Error creating department");
      }
    }
  };

  const handleDeleteDepartment = (id) => {
    if (!window.confirm("Are you sure you want to delete this department?"))
      return;

    axios
      .delete(`http://localhost:5001/api/department/deleteDepartment/${id}`)
      .then(() => {
        setDepartments(departments.filter((dept) => dept._id !== id));
        alert("Department deleted successfully.");
      })
      .catch((err) => {
        console.error(
          "Error deleting department:",
          err.response ? err.response.data : err
        );
        alert("Error deleting department, please try again.");
      });
  };

  const handleRenameDepartment = (department) => {
    setDepartmentToRename(department);
    setRenameValue(department.name);
    setRenameModal(true);
  };

  const handleSaveRename = async () => {
    const userId = localStorage.getItem("userId");

    if (!renameValue.trim() || !userId) {
      alert("Enter a valid department name.");
      return;
    }

    try {
      const response = await axios.put(
        `http://localhost:5001/api/department/renameDepartment/${departmentToRename._id}`,
        { name: renameValue, userId }
      );

      setDepartments(
        departments.map((dept) =>
          dept._id === departmentToRename._id ? response.data.data : dept
        )
      );

      setRenameModal(false);
      alert("Department renamed successfully.");
    } catch (error) {
      console.error(error);
      alert("Error renaming department.");
    }
  };

  // Function to handle department click and navigate to documents page
  const handleDepartmentClick = (dept) => {
    navigate(`/department/${dept._id}/documents`); // Navigate to the department's document page
  };

  return (
    <div>
      <Sidebar />
      <div className="header-container">
        <h1>Departments</h1>
        {/* Conditionally render the "Create Department" button */}
        {userStatus !== "member" && (
          <button onClick={() => setShowModal(true)}>Create Department</button>
        )}
      </div>

      {/* Grid Layout for Departments */}
      <div className="department-container">
        {departments.length === 0 ? (
          <p>No departments found</p>
        ) : (
          departments.map((dept) => (
            <div key={dept._id} className="department-card">
              <span
                className="department-name"
                onClick={() => handleDepartmentClick(dept)} // Navigate only when clicking the name
              >
                {dept.name}
              </span>
              <img
                src={dotsIcon}
                alt="Options"
                className="dots-icon"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click when clicking on dots
                  setActiveMenu(activeMenu === dept._id ? null : dept._id);
                }}
              />

              {activeMenu === dept._id && (
                <div className="dropdown-menu">
                  <button onClick={() => handleRenameDepartment(dept)}>
                    Rename
                  </button>
                  <button onClick={() => handleDeleteDepartment(dept._id)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal for creating department */}
      {showModal && (
        <div className="modal">
          <h2>Create Department</h2>
          <input
            type="text"
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            placeholder="Department Name"
          />
          <button onClick={addDepartment}>Create</button>
          <button onClick={() => setShowModal(false)}>Close</button>
        </div>
      )}

      {/* Modal for renaming department */}
      {renameModal && (
        <div className="modal">
          <h2>Rename Department</h2>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="New Department Name"
          />
          <button onClick={handleSaveRename}>Save</button>
          <button onClick={() => setRenameModal(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default Department;
