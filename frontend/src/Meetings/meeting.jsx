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

  const [editModalVisible, setEditModalVisible] = useState(false); // For toggling the edit modal
  const [currentEvent, setCurrentEvent] = useState(null); // To store the event being edited

  const [authenticated, setAuthenticated] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [events, setEvents] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null); // Track visibility of the menu for each event

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("auth") === "success") {
      setAuthenticated(true);
      // alert("Successfully authenticated with Google!");
      fetchEvents();
    }
  }, []);

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

  //edit event
  const handleEdit = (eventId) => {
    console.log("Edit meeting with ID:", eventId);
    // Find the event from the list using eventId
    const eventToEdit = events.find((event) => event.id === eventId);
    setCurrentEvent(eventToEdit); // Set the event data for the modal
    setEditModalVisible(true); // Show the modal
  };

  // Function to handle saving the edited event
  const handleSaveEdit = async (editedEventData) => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/meeting/edit_meeting/${currentEvent.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(editedEventData),
        }
      );

      const result = await response.json();
      if (response.ok) {
        alert("Event updated successfully!");
        fetchEvents(); // Re-fetch the updated events list
        setEditModalVisible(false); // Close the modal
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Something went wrong. Please try again.");
    }
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
          <h2>Upcoming Meetings</h2>
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

                  {/* Edit Modal */}
                  {editModalVisible && currentEvent && (
                    <div className="edit-modal">
                      <div className="modal-content">
                        <h2>Edit Event</h2>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const editedEventData = {
                              summary: e.target.summary.value,
                              description: e.target.description.value,
                              start: e.target.start.value,
                              end: e.target.end.value,
                              attendees: e.target.attendees.value
                                .split(",")
                                .map((email) => email.trim()),
                            };
                            handleSaveEdit(editedEventData);
                          }}
                        >
                          <div className="form-group">
                            <label htmlFor="summary">Title</label>
                            <input
                              type="text"
                              id="summary"
                              name="summary"
                              defaultValue={currentEvent.summary}
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea
                              id="description"
                              name="description"
                              defaultValue={currentEvent.description}
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="start">Start</label>
                            <input
                              type="datetime-local"
                              id="start"
                              name="start"
                              defaultValue={new Date(
                                currentEvent.start.dateTime
                              )
                                .toISOString()
                                .slice(0, -8)} // Format the date for the input
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="end">End </label>
                            <input
                              type="datetime-local"
                              id="end"
                              name="end"
                              defaultValue={new Date(currentEvent.end.dateTime)
                                .toISOString()
                                .slice(0, -8)} // Format the date for the input
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="attendees">
                              Attendees (comma-separated emails)
                            </label>
                            <input
                              type="text"
                              id="attendees"
                              name="attendees"
                              defaultValue={currentEvent.attendees
                                .map((attendee) => attendee.email)
                                .join(", ")}
                              required
                            />
                          </div>

                          <div className="button-container">
                            <button type="submit" className="save-button">
                              Save Changes
                            </button>
                            <button
                              type="button"
                              className="cancel-button"
                              onClick={() => setEditModalVisible(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
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
        <div className="schedule-meeting-form">
          <h2>Schedule a Meeting</h2>
          {!authenticated ? (
            <button onClick={handleGoogleAuth}>Sign in with Google</button>
          ) : (
            <>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="summary"
                  placeholder="Event Title"
                  value={eventData.summary} // Controlled input
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
                  value={eventData.attendees} // Controlled input
                  placeholder="Attendees (comma-separated emails)"
                  onChange={handleChange}
                  required
                />
                <button type="submit">Schedule Meeting</button>
              </form>

              {meetingLink && (
                <div className="meeting-link">
                  <h3>Meeting Scheduled Successfully!</h3>
                  <p>
                    <a
                      href={meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {meetingLink}
                    </a>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleMeetingForm;
