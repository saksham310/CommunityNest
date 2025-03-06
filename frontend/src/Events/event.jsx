import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../Sidebar/sidebar.jsx";
import "./event.css";
import { useNavigate } from "react-router-dom";

const Events = () => {
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [editModal, setEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [eventData, setEventData] = useState({
    title: "",
    date: "",
    time: "",
    image: null,
  });
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  
  const handleEventClick = (eventId) => {
    navigate(`/event/${eventId}`);
  };
  

  const [userStatus, setUserStatus] = useState(null); // Track user status

  useEffect(() => {
    fetchEvents();
    fetchUserStatus(); // Fetch user status on component mount
  }, []);

  const fetchUserStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5001/api/auth/data", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setUserStatus(response.data.status); // Set the user status to "member" or "community"
    } catch (error) {
      console.error("Error fetching user status:", error);
    }
  };

  const openEditModal = (event, e) => {
    e.stopPropagation();  // Prevents the click event from propagating and triggering navigation
    setSelectedEvent(event);
    setEditModal(true);
  };

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get("http://localhost:5001/api/events", {
        headers: { Authorization: `Bearer ${token}` }, // Send token
      });

      setEvents(res.data.events); // Update state with events
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleChange = (e) => {
    setEventData({ ...eventData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    setEventData({ ...eventData, image: file }); // Just store the file
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !eventData.title ||
      !eventData.date ||
      !eventData.time ||
      !eventData.image
    ) {
      alert("Please fill all fields and upload an image.");
      return;
    }

    const formData = new FormData();
    formData.append("title", eventData.title);
    formData.append("date", eventData.date);
    formData.append("time", eventData.time); // Include time
    formData.append("image", eventData.image);

    try {
      const token = localStorage.getItem("token");

      await axios.post("http://localhost:5001/api/events", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      fetchEvents();
      setShowModal(false);
      setEventData({ title: "", date: "", time: "", image: null });
    } catch (error) {
      console.error("Error creating event:", error);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this event?"
    );

    if (!confirmDelete) return; // If user cancels, exit the function

    try {
      await axios.delete(`http://localhost:5001/api/events/${id}`);
      fetchEvents(); // Refresh the event list
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5001/api/events/${selectedEvent._id}`,
        selectedEvent,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      fetchEvents(); // Refresh event list
      setEditModal(false);
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  return (
    <div className="events-page">
      <Sidebar />
      <div className="events-content">
        <h1>Events</h1>
        {/* Conditionally render the "Create Event" button */}
        {userStatus === "community" && (
          <button className="create-event-btn" onClick={() => setShowModal(true)}>
            Create Event
          </button>
        )}

        <div className="event-list">
          {events.length === 0 ? (
            <p>No events scheduled yet.</p>
          ) : (
            events.map((event, index) => (
              <div className="event-card" key={event._id} onClick={() => handleEventClick(event._id)}>
                <img
                  src={event.image}
                  alt={event.title}
                  className="event-image"
                />
          
                <div className="event-info">
                  <h3>{event.title}</h3>
                  <p>Date: {event.date}</p>
                  <p>Time: {event.time}</p>

                  {/* Button container with conditional rendering for edit and delete */}
                  <div className="event-actions">
                    {userStatus === "community" && (
                      <>
                        <button
                          className="edit-btn"
                          onClick={(e) => openEditModal(event, e)}  // Pass the click event
                        >
                          Edit
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(event._id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for creating event */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Create Event</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="title"
                placeholder="Event Title"
                value={eventData.title}
                onChange={handleChange}
                required
              />
              <input
                type="date"
                name="date"
                value={eventData.date}
                onChange={handleChange}
                required
              />
              <input
                type="time"
                name="time"
                value={eventData.time}
                onChange={handleChange}
                required
              />

              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={handleImageUpload}
                required
              />
              <div className="modal-buttons">
                <button type="submit" disabled={loading}>
                  {loading ? "Uploading Image..." : "Post Event"}
                </button>
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModal && selectedEvent && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edit Event</h2>
            <form onSubmit={handleEditSubmit}>
              <input
                type="text"
                name="title"
                placeholder="Event Title"
                value={selectedEvent.title}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, title: e.target.value })
                }
                required
              />
              <input
                type="date"
                name="date"
                value={selectedEvent.date}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, date: e.target.value })
                }
                required
              />
              <input
                type="time"
                name="time"
                value={selectedEvent.time}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, time: e.target.value })
                }
                required
              />
              <div className="modal-buttons">
                <button type="submit">Save Changes</button>
                <button type="button" onClick={() => setEditModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
