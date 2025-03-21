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
    const checkAuth = async () => {
        try {
            const response = await fetch("http://localhost:5001/api/meeting/check-auth", {
                method: "GET",
                credentials: "include", // Ensure cookies are sent
            });

            if (response.ok) {
                setAuthenticated(true);
                fetchEvents();
            } else {
                setAuthenticated(false);
            }
        } catch (error) {
            console.error("Error checking authentication status:", error);
            setAuthenticated(false);
        }
    };

    checkAuth();
}, []);

  const fetchMemberEmails = async () => {
    try {
      const userId = localStorage.getItem("userId");

      if (!userId) {
        console.error("User ID is required");
        return;
      }

      const response = await fetch(
        `http://localhost:5001/api/meeting/community/members?userId=${userId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const result = await response.json();
      if (response.ok) {
        const emails = result.emails.join(", ");
        setMemberEmails(result.emails);
        setEventData((prev) => ({
          ...prev,
          attendees: emails,
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
        credentials: "include", // Ensure cookies are sent
      });
  
      if (!response.ok) {
        const errorText = await response.text(); // Read the response as text
        console.error("Error fetching events:", errorText);
        alert(`Error fetching events: ${errorText}`);
        return;
      }
  
      const result = await response.json();
      setEvents(result.events);
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

    console.log("Scheduling meeting with data:", { ...eventData, attendees: attendeesList });

    try {
        const response = await fetch(
            "http://localhost:5001/api/meeting/schedule_meeting",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // Ensure cookies are sent
                body: JSON.stringify({ ...eventData, attendees: attendeesList }),
            }
        );

        const result = await response.json();
        if (response.ok) {
            setMeetingLink(result.eventLink);
            alert(`Meeting Scheduled! Link: ${result.eventLink}`);
            fetchEvents();
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
    setMenuVisible(menuVisible === eventId ? null : eventId);
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link).then(() => {
      alert("Meeting link copied to clipboard!");
    });
  };

  const handleEdit = (eventId) => {
    const eventToEdit = events.find((event) => event.id === eventId);

    if (!eventToEdit) return;

    setCurrentEvent({
        ...eventToEdit,
        start: eventToEdit.start?.dateTime?.slice(0, 16) || "",
        end: eventToEdit.end?.dateTime?.slice(0, 16) || "",
        attendees: eventToEdit.attendees
            ? eventToEdit.attendees.map((attendee) => attendee.email).join(", ") // This converts the array to a string
            : "",
    });

    setEditModalVisible(true);
};

const handleEditSubmit = async (e) => {
  e.preventDefault();

  // Convert the attendees string back into an array
  const updatedEvent = {
      ...currentEvent,
      attendees: currentEvent.attendees
          .split(",")
          .map((email) => email.trim()), // Convert to array and trim whitespace
  };

  console.log("Editing event with data:", updatedEvent);

  try {
      const response = await fetch(
          `http://localhost:5001/api/meeting/edit_meeting/${currentEvent.id}`,
          {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include", // Ensure cookies are sent
              body: JSON.stringify(updatedEvent),
          }
      );

      const result = await response.json();
      if (response.ok) {
          alert("Event updated successfully!");
          setEditModalVisible(false);
          fetchEvents();
      } else {
          alert(`Error: ${result.error}`);
      }
  } catch (error) {
      console.error("Error updating event:", error);
      alert("Something went wrong. Please try again.");
  }
};

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setCurrentEvent((prev) => ({
      ...prev,
      [name]: value,
    }));
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

          {!authenticated && (
            <p>Sign in with Google to view scheduled meetings</p>
          )}

          {!authenticated ? (
            <button onClick={handleGoogleAuth}>Sign in with Google</button>
          ) : (
            <>
              <button
                onClick={async () => {
                  setScheduleModalVisible(true);
                  await fetchMemberEmails();
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
                        value={eventData.attendees}
                        placeholder="Attendees (comma-separated emails)"
                        onChange={(e) =>
                          setEventData((prev) => ({
                            ...prev,
                            attendees: e.target.value,
                          }))
                        }
                        required
                      />
                      <div className="button-group">
                        <button type="submit">Schedule</button>
                        <button
                          className="close-modal-button"
                          onClick={() => setScheduleModalVisible(false)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {editModalVisible && (
            <div className="modal">
              <div className="modal-content">
                <h2>Edit Event</h2>
                <form onSubmit={handleEditSubmit}>
                  <input
                    type="text"
                    name="summary"
                    placeholder="Event Title"
                    value={currentEvent?.summary || ""}
                    onChange={handleEditChange}
                    required
                  />
                  <textarea
                    name="description"
                    placeholder="Event Description"
                    value={currentEvent?.description || ""}
                    onChange={handleEditChange}
                    required
                  />
                  <input
                    type="datetime-local"
                    name="start"
                    value={currentEvent?.start || ""}
                    onChange={handleEditChange}
                    required
                  />
                  <input
                    type="datetime-local"
                    name="end"
                    value={currentEvent?.end || ""}
                    onChange={handleEditChange}
                    required
                  />
                  <input
                    type="text"
                    name="attendees"
                    value={currentEvent?.attendees || ""}
                    placeholder="Attendees (comma-separated emails)"
                    onChange={handleEditChange}
                    required
                  />
                  <div className="button-group">
                    <button type="submit">Save Changes</button>
                    <button
                      className="close-modal-button"
                      onClick={() => setEditModalVisible(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
                    &#x22EE;
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