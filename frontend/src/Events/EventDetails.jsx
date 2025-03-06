import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Sidebar from "../Sidebar/sidebar.jsx";
import "./EventDetails.css";

const EventDetails = () => {
  const { eventId } = useParams();
  const [eventTitle, setEventTitle] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [googleSheetUrl, setGoogleSheetUrl] = useState(""); // For storing Google Sheet URL
  const [activeTab, setActiveTab] = useState("registration");
  const [loading, setLoading] = useState(true);
  const [columnHeaders, setColumnHeaders] = useState([]); // To store the column headers
  const googleAuthToken = localStorage.getItem("googleAuthToken"); // Get Google token from localStorage
  const baseUrl = "http://localhost:5001/api"; // Base URL for API requests

  useEffect(() => {
    if (googleSheetUrl) {
      handleFileUpload();
    }
  }, [googleSheetUrl]);

  // Fetch the event title from the backend
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

    fetchEventTitle();
  }, [eventId]);

  // Function to handle the Google Sheets file upload
  const handleFileUpload = async () => {
    try {
      const response = await fetch(
        `${baseUrl}/google-sheets/fetch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sheetUrl: googleSheetUrl }),
        }
      );

      const data = await response.json();
      console.log("Fetched Google Sheet Data:", data); // Log the fetched data

      if (data && Array.isArray(data.headers) && Array.isArray(data.data)) {
        // Log attendees to check their structure
        console.log("Attendees Data:", data.data); // Inspect attendees data

        // Set column headers and data
        setColumnHeaders(data.headers);
        setAttendees(data.data);
      } else {
        console.error("Invalid data format.");
      }
    } catch (error) {
      console.error("Error fetching Google Sheets data:", error);
    }
  };

  // Function to handle editing attendee data
  const handleEdit = (attendeeId, columnName, newValue) => {
    setAttendees(prevAttendees =>
      prevAttendees.map((attendee, index) =>
        index === attendeeId
          ? { ...attendee, [columnName]: newValue }
          : attendee
      )
    );
  };

  const handleSaveChanges = async (attendeeId, columnName, newValue) => {
    const columnIndex = columnHeaders.indexOf(columnName);
    if (columnIndex === -1) {
        console.error(`Column "${columnName}" not found in headers:`, columnHeaders);
        return; // Stop execution if column doesn't exist
    }

    console.log('Sending update:', {
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
              <h3>Provide Google Sheets Link</h3>
              <input
                type="text"
                placeholder="Google Sheets URL"
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
              />
              <button onClick={handleFileUpload}>
                Upload Google Sheet Data
              </button>

              <h3>Attendees List</h3>
              {columnHeaders.length > 0 ? (
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
                      {attendees.length > 0 ? (
                        attendees.map((attendee, index) => (
                          <tr key={index}>
                            {columnHeaders.map((header, idx) => (
                              <td key={idx}>
                                <input
                                  type="text"
                                  value={attendee[header]}
                                  onChange={(e) =>
                                    handleEdit(index, header, e.target.value)
                                  }
                                  onBlur={() =>
                                    handleSaveChanges(index, header, attendee[header])
                                  }
                                />
                              </td>
                            ))}
                            <td>
                              <select
                                value={attendee.status} // Ensure 'status' is a valid property on each attendee
                                onChange={(e) =>
                                  handleSaveChanges(index, "Status", e.target.value)
                                }
                              >
                                <option value="absent">Absent</option>
                                <option value="attended">Present</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columnHeaders.length + 1}>
                            No attendees registered yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>Loading column headers...</p>
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
    </div>
  );
};

export default EventDetails;
