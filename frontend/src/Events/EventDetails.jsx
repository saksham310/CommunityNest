import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Sidebar from "../Sidebar/sidebar.jsx";
import "./EventDetails.css";
import { FaPlus } from "react-icons/fa"; // Import the plus icon from react-icons
import { useRef } from "react";
import { FaFolder } from "react-icons/fa"; // Import folder icon

const EventDetails = () => {
  const { eventId } = useParams();
  const [eventTitle, setEventTitle] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [googleSheetUrl, setGoogleSheetUrl] = useState(""); // For storing Google Sheet URL
  const [activeTab, setActiveTab] = useState("registration");
  const [loading, setLoading] = useState(true);
  const [columnHeaders, setColumnHeaders] = useState([]); // To store the column headers
  const baseUrl = "http://localhost:5001/api"; // Base URL for API requests
  const [googleSheets, setGoogleSheets] = useState([]); // Array to store multiple Google Sheets
  const [uploading, setUploading] = useState(false); // Loading state for upload
  const [activeSheetTitle, setActiveSheetTitle] = useState("");
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null); // Track which dropdown is open
  const [showUploadPopup, setShowUploadPopup] = useState(false); // Control popup visibility
  const [editableField, setEditableField] = useState(null); // Track which field is editable

  // Add a ref to the dropdown container
  const dropdownRef = useRef(null);
  // Fetch the event title and Google Sheet information on page load

  useEffect(() => {
    const fetchEventTitle = async () => {
      try {
        const response = await axios.get(`${baseUrl}/events/${eventId}/title`);
        setEventTitle(response.data.title);
      } catch (error) {
        console.error("Error fetching event title:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchGoogleSheets = async () => {
      try {
        const response = await axios.get(
          `${baseUrl}/google-sheets/${eventId}/sheet-info`
        );
        const { googleSheets } = response.data;

        if (googleSheets && googleSheets.length > 0) {
          setGoogleSheets(googleSheets); // Set the array of Google Sheets
        }
      } catch (error) {
        console.error("Error fetching Google Sheets information:", error);
      }
    };

    fetchEventTitle();
    fetchGoogleSheets();
  }, [eventId]);
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownIndex(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Function to handle the Google Sheets file upload
  const handleFileUpload = async (sheetUrl) => {
    if (!sheetUrl) {
      alert("Please provide a Google Sheets URL.");
      return;
    }

    // Check if the sheet URL already exists
    if (googleSheets.some((sheet) => sheet.url === sheetUrl)) {
      alert("This Google Sheet has already been uploaded.");
      return;
    }

    setUploading(true); // Set loading state

    try {
      const response = await fetch(`${baseUrl}/google-sheets/fetch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sheetUrl }),
      });

      const data = await response.json();
      console.log("Fetched Google Sheet Data:", data);

      if (data && Array.isArray(data.headers) && Array.isArray(data.data)) {
        // Save Google Sheet information to the backend
        await axios.post(`${baseUrl}/google-sheets/${eventId}/save-sheet`, {
          sheetUrl,
          sheetTitle: data.sheetTitle,
        });

        // Add the new Google Sheet to the state
        setGoogleSheets((prevSheets) => [
          ...prevSheets,
          { url: sheetUrl, title: data.sheetTitle },
        ]);

        // Clear the input field
        setGoogleSheetUrl("");
      } else {
        console.error("Invalid data format.");
      }
    } catch (error) {
      console.error("Error fetching Google Sheets data:", error);
    } finally {
      setUploading(false); // Reset loading state
      setShowUploadPopup(false); // Close the popup after upload
    }
  };

  // Function to handle editing attendee data
  const handleEdit = (attendeeId, columnName, newValue) => {
    setAttendees((prevAttendees) =>
      prevAttendees.map((attendee, index) =>
        index === attendeeId
          ? { ...attendee, [columnName]: newValue }
          : attendee
      )
    );
  };

  // Function to handle field click
  const handleFieldClick = (rowIndex, columnName) => {
    setEditableField({ rowIndex, columnName }); // Set the clicked field as editable
  };

  // Function to save changes to Google Sheets
  const handleSaveChanges = async (attendeeId, columnName, newValue) => {
    const columnIndex = columnHeaders.indexOf(columnName);
    if (columnIndex === -1) {
      console.error(
        `Column "${columnName}" not found in headers:`,
        columnHeaders
      );
      return; // Stop execution if column doesn't exist
    }

    console.log("Sending update:", {
      sheetUrl: googleSheetUrl,
      rowIndex: attendeeId + 1, // Adjusted for Google Sheets' 1-based indexing
      columnIndex, // Corrected column index
      newValue,
    });

    try {
      const response = await axios.put(`${baseUrl}/google-sheets/update`, {
        sheetUrl: googleSheetUrl,
        rowIndex: attendeeId + 1, // Adjusted for Google Sheets' 1-based indexing
        columnIndex, // Corrected column index
        newValue,
      });

      console.log("Successfully updated:", response.data);
    } catch (error) {
      console.error("Error updating Google Sheets:", error);
    }
  };

  const handleSheetClick = async (sheetUrl, sheetTitle) => {
    try {
      // Set the current Google Sheet URL and title
      setGoogleSheetUrl(sheetUrl);
      setActiveSheetTitle(sheetTitle);

      const response = await fetch(`${baseUrl}/google-sheets/fetch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sheetUrl }),
      });

      const data = await response.json();
      console.log("Fetched Google Sheet Data:", data);

      if (data && Array.isArray(data.headers) && Array.isArray(data.data)) {
        // Set column headers and data for the clicked sheet
        setColumnHeaders(data.headers);
        setAttendees(data.data);
      } else {
        console.error("Invalid data format.");
      }
    } catch (error) {
      console.error("Error fetching Google Sheets data:", error);
    }
  };

  const handleDeleteSheet = async (sheetUrl) => {
    if (window.confirm("Are you sure you want to delete this sheet?")) {
      try {
        // Send the sheetUrl as a query parameter or in the request body
        await axios.delete(`${baseUrl}/google-sheets/${eventId}/delete-sheet`, {
          data: { sheetUrl }, // Send sheetUrl in the request body
        });

        // Remove the sheet from the state
        setGoogleSheets((prevSheets) =>
          prevSheets.filter((sheet) => sheet.url !== sheetUrl)
        );

        // Clear the active sheet if it was deleted
        if (googleSheetUrl === sheetUrl) {
          setGoogleSheetUrl("");
          setActiveSheetTitle("");
          setColumnHeaders([]);
          setAttendees([]);
        }

        alert("Sheet deleted successfully!");
      } catch (error) {
        console.error("Error deleting Google Sheet:", error);
        alert("Failed to delete the sheet. Please try again.");
      }
    }
  };

  const handleCopySheetLink = (sheetUrl) => {
    navigator.clipboard.writeText(sheetUrl).then(() => {
      alert("Sheet link copied to clipboard!");
    });
  };

  // Function to handle adding a new row
  const handleAddRow = () => {
    const newRow = {};
    columnHeaders.forEach((header) => {
      newRow[header] = ""; // Initialize all fields as empty
    });
    newRow.status = "absent"; // Default status

    setAttendees((prevAttendees) => [...prevAttendees, newRow]);
  };

  const UploadPopup = ({ onClose, onUpload }) => {
    const [sheetUrl, setSheetUrl] = useState("");

    const handleUpload = () => {
      onUpload(sheetUrl); // Pass the sheet URL to the parent component
      onClose(); // Close the popup
    };

    return (
      <div className="upload-popup-overlay">
        <div className="upload-popup">
          <h3>Upload Google Sheet Link</h3>
          <input
            type="text"
            placeholder="Google Sheets URL"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
          />
          <div className="popup-buttons">
            <button onClick={onClose}>Cancel</button>
            <button onClick={handleUpload} disabled={!sheetUrl}>
              Upload
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="event-details-container">
      <h1 className="event-title">
        {loading ? "Loading..." : eventTitle || "Event Not Found"}
      </h1>

      <nav className="event-nav">
        <button
          className={activeTab === "registration" ? "active" : ""}
          onClick={() => setActiveTab("registration")}
        >
          Attendee Registration
        </button>
        <button
          className={activeTab === "feedback" ? "active" : ""}
          onClick={() => setActiveTab("feedback")}
        >
          Feedback Process
        </button>
      </nav>

      <div className="event-content">
        <div className="event-main">
          {activeTab === "registration" && (
            <div className="registration-section">
              <h3>
                Attendees Registration
                <div className="upload-button-container">
                  <button
                    onClick={() => setShowUploadPopup(true)}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload Google Sheet Link"}
                  </button>
                </div>
              </h3>

              {/* Display cards for all uploaded Google Sheets */}
              {googleSheets.length > 0 && (
                <div className="sheet-cards-container">
                  {googleSheets.map((sheet, index) => (
                    <div key={index} className="sheet-card">
                      <span className="folder-icon">
                        <FaFolder />
                      </span>
                      <span
                        className="sheet-title"
                        onClick={() => handleSheetClick(sheet.url, sheet.title)}
                      >
                        {sheet.title}
                      </span>
                      <div className="ellipsis-menu" ref={dropdownRef}>
                        <button
                          className="ellipsis-icon"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent event bubbling
                            setOpenDropdownIndex(
                              openDropdownIndex === index ? null : index
                            );
                          }}
                        >
                          ⋮
                        </button>
                        {openDropdownIndex === index && (
                          <div className="dropdown-content">
                            <button
                              onClick={() => handleCopySheetLink(sheet.url)}
                            >
                              Copy Sheet Link
                            </button>
                            <button
                              onClick={() => handleDeleteSheet(sheet.url)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Row Button and Sheet Title */}
              {googleSheetUrl && (
                <div className="sheet-title-container">
                  <h3 className="sheet-title">
                    {
                      googleSheets.find((sheet) => sheet.url === googleSheetUrl)
                        ?.title
                    }
                  </h3>
                  <button className="add-row-button" onClick={handleAddRow}>
                    <FaPlus /> Add 
                  </button>
                </div>
              )}

              {/* Attendees Table */}
              {columnHeaders.length > 0 && (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        {columnHeaders.map((header, index) => (
                          <th key={index}>{header}</th>
                        ))}
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.map((attendee, rowIndex) => (
                        <tr key={rowIndex}>
                          {columnHeaders.map((header, columnIndex) => (
                            <td key={columnIndex}>
                              <input
                                type="text"
                                value={attendee[header]}
                                readOnly={
                                  !editableField ||
                                  editableField.rowIndex !== rowIndex ||
                                  editableField.columnName !== header
                                }
                                onClick={() =>
                                  handleFieldClick(rowIndex, header)
                                }
                                onChange={(e) =>
                                  handleEdit(rowIndex, header, e.target.value)
                                }
                                onBlur={(e) =>
                                  handleSaveChanges(
                                    rowIndex,
                                    header,
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                          ))}
                          <td>
                            <select
                              value={attendee.status}
                              onChange={(e) =>
                                handleSaveChanges(
                                  rowIndex,
                                  "Status",
                                  e.target.value
                                )
                              }
                            >
                              <option value="absent">Absent</option>
                              <option value="attended">Present</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "feedback" && (
            <div className="feedback-section">
              <h2>Feedback Section</h2>
              <p>Feedback form and responses will be displayed here.</p>
            </div>
          )}
        </div>

        <div className="sidebar">
          <Sidebar />
        </div>
      </div>

      {/* Upload Popup */}
      {showUploadPopup && (
        <UploadPopup
          onClose={() => setShowUploadPopup(false)}
          onUpload={handleFileUpload}
        />
      )}
    </div>
  );
};

export default EventDetails;
