import React, { useState, useEffect } from "react";
import Sidebar from "../Sidebar/sidebar.jsx";
import "./meeting.css";

const ScheduleMeetingForm = () => {
  const [eventData, setEventData] = useState({
    summary: "",
    description: "",
    start: "",
    end: "",
    attendees: "",
  });

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [events, setEvents] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  const [memberEmails, setMemberEmails] = useState([]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("auth") === "success") {
      setAuthenticated(true);
      fetchEvents();
    }
  }, []);

  const fetchMemberEmails = async () => {
    try {
      const userId = localStorage.getItem("userId"); // Ensure userId is retrieved correctly

      if (!userId) {
        console.error("User ID is required");
        return;
      }

      const response = await fetch(
        `http://localhost:5001/api/meeting/community/members?userId=${userId}`, // Ensure correct backend route
        {
          method: "GET",
          credentials: "include",
        }
      );

      const result = await response.json();
      if (response.ok) {
        const emails = result.emails.join(", "); // Convert array to comma-separated string

        setMemberEmails(result.emails); // Save emails separately
        setEventData((prev) => ({
          ...prev,
          attendees: emails, // Update attendees field
        }));
      } else {
        console.error("Error fetching member emails:", result.error);
      }
    } catch (error) {
      console.error("Error fetching member emails:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/meeting/events", {
        method: "GET",
        credentials: "include",
      });

      const result = await response.json();
      if (response.ok) {
        setEvents(result.events);
      } else {
        alert(`Error fetching events: ${result.error}`);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      alert("Something went wrong while fetching events.");
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = "http://localhost:5001/api/meeting/google";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData({ ...eventData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!authenticated) {
      alert("Please sign in with Google before scheduling a meeting.");
      return;
    }

    const attendeesList = eventData.attendees
      .split(",")
      .map((email) => email.trim());

    try {
      const response = await fetch(
        "http://localhost:5001/api/meeting/schedule_meeting",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...eventData, attendees: attendeesList }),
        }
      );

      const result = await response.json();
      if (response.ok) {
        setMeetingLink(result.eventLink);
        alert(`Meeting Scheduled! Link: ${result.eventLink}`);
        fetchEvents();

        // Reset the form to its initial state
        setEventData({
          summary: "",
          description: "",
          start: "",
          end: "",
          attendees: "",
        });
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  const handleMenuToggle = (eventId) => {
    setMenuVisible(menuVisible === eventId ? null : eventId); // Toggle the menu visibility
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link).then(() => {
      alert("Meeting link copied to clipboard!");
    });
  };

  const handleEdit = (eventId) => {
    const eventToEdit = events.find((event) => event.id === eventId);
    setCurrentEvent(eventToEdit);
    setEditModalVisible(true);
  };

  const handleDelete = async (eventId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this meeting?"
    );
    if (confirmed) {
      try {
        const response = await fetch(
          `http://localhost:5001/api/meeting/delete_meeting/${eventId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );
        if (response.ok) {
          alert("Meeting deleted successfully!");
          fetchEvents();
        } else {
          alert("Error deleting the meeting.");
        }
      } catch (error) {
        console.error("Error deleting meeting:", error);
        alert("Something went wrong while deleting the meeting.");
      }
    }
  };

  return (
    <div className="meeting-container">
      <Sidebar />
      <div className="meeting-content">
        <div className="upcoming-meetings">
          <h2>Meetings</h2>

          {/* Message prompting user to sign in */}
          {!authenticated && (
            <p>Sign in with Google to view scheduled meetings</p>
          )}

          {/* Schedule Meeting Button (Appears after Meetings heading) */}
          {!authenticated ? (
            <button onClick={handleGoogleAuth}>Sign in with Google</button>
          ) : (
            <>
              <button
                onClick={async () => {
                  setScheduleModalVisible(true);
                  await fetchMemberEmails(); // Fetch emails before opening modal
                }}
                className="schedule-button"
              >
                Schedule Meeting
              </button>

              {scheduleModalVisible && (
                <div className="modal">
                  <div className="modal-content">
                    <h2>Schedule a Meeting</h2>
                    <form onSubmit={handleSubmit}>
                      <input
                        type="text"
                        name="summary"
                        placeholder="Event Title"
                        value={eventData.summary}
                        onChange={handleChange}
                        required
                      />
                      <textarea
                        name="description"
                        placeholder="Event Description"
                        value={eventData.description}
                        onChange={handleChange}
                        required
                      />
                      <input
                        type="datetime-local"
                        name="start"
                        value={eventData.start}
                        onChange={handleChange}
                        required
                      />
                      <input
                        type="datetime-local"
                        name="end"
                        value={eventData.end}
                        onChange={handleChange}
                        required
                      />
                      <input
                        type="text"
                        name="attendees"
                        value={eventData.attendees} // This should update when emails are fetched
                        placeholder="Attendees (comma-separated emails)"
                        onChange={(e) =>
                          setEventData((prev) => ({
                            ...prev,
                            attendees: e.target.value,
                          }))
                        } // Allow manual edits
                        required
                      />
                    </form>
                    <div className="button-group">
                      <button type="submit">Schedule Meeting</button>
                      <button
                        className="close-modal-button"
                        onClick={() => setScheduleModalVisible(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Meeting Cards List */}
          <ul>
            {events.length > 0 ? (
              events.map((event) => (
                <li key={event.id} className="meeting-card">
                  <div className="meeting-card-header">
                    <p>
                      <strong>Title:</strong> {event.summary}
                    </p>
                  </div>
                  <p>
                    <strong>Description:</strong> {event.description}
                  </p>
                  <p>
                    <strong>Start:</strong>{" "}
                    {new Date(event.start.dateTime).toLocaleString()}
                  </p>
                  <p>
                    <strong>End:</strong>{" "}
                    {new Date(event.end.dateTime).toLocaleString()}
                  </p>

                  <div
                    className="three-dots"
                    onClick={() => handleMenuToggle(event.id)}
                  >
                    &#x22EE; {/* Unicode for three dots */}
                  </div>
                  {menuVisible === event.id && (
                    <div className="options-menu">
                      <button onClick={() => handleEdit(event.id)}>Edit</button>
                      <button onClick={() => handleDelete(event.id)}>
                        Delete
                      </button>
                      {event.hangoutLink && (
                        <button
                          onClick={() => handleCopyLink(event.hangoutLink)}
                        >
                          Copy Meet Link
                        </button>
                      )}
                    </div>
                  )}
                  <a
                    href={event.hangoutLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join Meeting
                  </a>
                </li>
              ))
            ) : (
              <p>No upcoming meetings found.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScheduleMeetingForm;
