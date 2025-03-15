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
  const [openDropdownUrl, setOpenDropdownUrl] = useState(null); // Track which dropdown is open by URL
  const [showUploadPopup, setShowUploadPopup] = useState(false); // Control popup visibility
  const [editableField, setEditableField] = useState(null); // Track which field is editable
  const [activeSheetUrl, setActiveSheetUrl] = useState(""); // Track the active sheet URL

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
        // Add "Status" column only if it doesn't exist
        if (!data.headers.includes("Status")) {
          data.headers.push("Status");
          data.data.forEach((row) => (row.Status = "absent")); // Initialize status as "absent"
        }

        // Save Google Sheet information to the backend
        await axios.post(`${baseUrl}/google-sheets/${eventId}/save-sheet`, {
          sheetUrl,
          sheetTitle: data.sheetTitle,
          headers: data.headers,
          data: data.data,
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

  const handleSaveChanges = async (attendeeId, columnName, newValue) => {
    const columnIndex = columnHeaders.indexOf(columnName);
    if (columnIndex === -1) {
      console.error(
        `Column "${columnName}" not found in headers:`,
        columnHeaders
      );
      return; // Stop execution if column doesn't exist
    }

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
    setActiveSheetUrl(sheetUrl);
    setGoogleSheetUrl(sheetUrl);
    setActiveSheetTitle(sheetTitle);

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
        // Ensure "Status" column exists
        if (!data.headers.includes("Status")) {
          data.headers.push("Status");
          data.data.forEach((row) => (row.Status = "absent")); // Initialize status as "absent"
        }

        setColumnHeaders(data.headers);
        setAttendees(data.data); // Set the attendees for the selected sheet
      } else {
        console.error("Invalid data format.");
      }
    } catch (error) {
      console.error("Error fetching Google Sheets data:", error);
    }
  };

  const getPresentAttendees = () => {
    if (!activeSheetUrl) return []; // No sheet selected

    const activeSheet = googleSheets.find(
      (sheet) => sheet.url === activeSheetUrl
    );
    if (!activeSheet) return []; // Selected sheet not found

    // Filter attendees marked as "Present"
    const sheetAttendees = attendees.filter(
      (attendee) => attendee.Status === "attended" // Ensure "Status" column is used
    );

    return sheetAttendees;
  };

  const handleSheetSelect = async (sheetUrl) => {
    setActiveSheetUrl(sheetUrl); // Set the active sheet URL
    setOpenDropdownIndex(null); // Close any open dropdowns

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
        setColumnHeaders(data.headers);
        setAttendees(data.data); // Set the attendees for the selected sheet
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
        // Send the sheetUrl to the backend for deletion
        await axios.delete(`${baseUrl}/google-sheets/${eventId}/delete-sheet`, {
          data: { sheetUrl },
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
    setOpenDropdownIndex(null); // Close the dropdown after deletion
  };

  const handleCopySheetLink = (sheetUrl) => {
    navigator.clipboard
      .writeText(sheetUrl)
      .then(() => {
        alert("Sheet link copied to clipboard!");
      })
      .catch((error) => {
        console.error("Failed to copy sheet link:", error);
        alert("Failed to copy sheet link. Please try again.");
      });
    setOpenDropdownIndex(null); // Close the dropdown after copying
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
                  {googleSheets.map((sheet) => (
                    <div key={sheet.url} className="sheet-card">
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
                            setOpenDropdownUrl(
                              openDropdownUrl === sheet.url ? null : sheet.url
                            ); // Toggle dropdown
                          }}
                        >
                          ⋮
                        </button>
                        {openDropdownUrl === sheet.url && (
                          <div className="dropdown-content">
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent event bubbling
                                handleCopySheetLink(sheet.url);
                              }}
                            >
                              Copy Sheet Link
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent event bubbling
                                handleDeleteSheet(sheet.url);
                              }}
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
              {columnHeaders.length > 0 && (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        {columnHeaders.map((header, index) => (
                          <th key={index}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.map((attendee, rowIndex) => (
                        <tr key={rowIndex}>
                          {columnHeaders.map((header, columnIndex) => (
                            <td key={columnIndex}>
                              {header === "Status" ? ( // Render dropdown for "Status" column
                                <select
                                  value={attendee[header]}
                                  onChange={(e) => {
                                    handleEdit(
                                      rowIndex,
                                      header,
                                      e.target.value
                                    ); // Update local state
                                    handleSaveChanges(
                                      rowIndex,
                                      header,
                                      e.target.value
                                    ); // Save to backend
                                  }}
                                >
                                  <option value="absent">Absent</option>
                                  <option value="attended">Present</option>
                                </select>
                              ) : (
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
                              )}
                            </td>
                          ))}
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
              <p>Send feedback emails to attendees who attended the event.</p>

              {/* Dropdown to select a sheet */}
              <div className="sheet-selector">
                <label htmlFor="sheet-select">Select Sheet:</label>
                <select
                  id="sheet-select"
                  onChange={(e) => handleSheetSelect(e.target.value)}
                  value={activeSheetUrl}
                >
                  <option value="">-- Select a sheet --</option>
                  {googleSheets.map((sheet) => (
                    <option key={sheet.url} value={sheet.url}>
                      {sheet.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Display active sheet title */}
              {activeSheetUrl && (
                <h3>
                  Active Sheet:{" "}
                  {
                    googleSheets.find((sheet) => sheet.url === activeSheetUrl)
                      ?.title
                  }
                </h3>
              )}

              {/* Display emails of attendees marked as "Present" */}
              <div className="attendee-emails">
                <h4>Attendees Marked as Present:</h4>
                {getPresentAttendees().length > 0 ? (
                  <ul>
                    {getPresentAttendees().map((attendee, index) => (
                      <li key={index}>{attendee.Email}</li> // Replace "email" with the actual column name for emails
                    ))}
                  </ul>
                ) : (
                  <p>No attendees marked as "Present".</p>
                )}
              </div>

              {/* Feedback Form */}
              <div className="feedback-form">
                <h3>Send Feedback Emails</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();

                    // Get emails of attendees marked as "Present"
                    const presentAttendees = getPresentAttendees();
                    const emails = presentAttendees.map(
                      (attendee) => attendee.Email
                    ); // Replace "email" with the actual column name for emails

                    if (emails.length === 0) {
                      alert("No attendees marked as 'Present'.");
                      return;
                    }

                    // Get subject and message from the form
                    const subject = e.target.subject.value;
                    const message = e.target.message.value;

                    try {
                      // Send feedback emails
                      const response = await axios.post(
                        `${baseUrl}/send-feedback-emails`,
                        {
                          emails,
                          subject,
                          message,
                        }
                      );

                      alert(response.data.message); // Show success message
                    } catch (error) {
                      console.error("Error sending feedback emails:", error);
                      alert("Failed to send feedback emails.");
                    }
                  }}
                >
                  <div className="form-group">
                    <label htmlFor="subject">Subject:</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      placeholder="Enter email subject"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="message">Message:</label>
                    <textarea
                      id="message"
                      name="message"
                      placeholder="Enter email message"
                      required
                    />
                  </div>
                  <button type="submit">Send Feedback Emails</button>
                </form>
              </div>
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
