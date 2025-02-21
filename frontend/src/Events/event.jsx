import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../Sidebar/sidebar.jsx";
import "./event.css";

const Events = () => {
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventData, setEventData] = useState({
    title: "",
    date: "",
    image: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/events");
      setEvents(res.data);
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

    if (!eventData.title || !eventData.date || !eventData.image) {
      alert("Please fill all fields and upload an image.");
      return;
    }

    const formData = new FormData();
    formData.append("title", eventData.title);
    formData.append("date", eventData.date);
    formData.append("image", eventData.image); // Send image here

    try {
      await axios.post("http://localhost:5001/api/events", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      fetchEvents();
      setShowModal(false);
      setEventData({ title: "", date: "", image: null });
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

  return (
    <div className="events-page">
      <Sidebar />
      <div className="events-content">
        <h1>Events Management</h1>
        <button className="create-event-btn" onClick={() => setShowModal(true)}>
          Create Event
        </button>

        <div className="event-list">
          {events.length === 0 ? (
            <p>No events scheduled yet.</p>
          ) : (
            events.map((event, index) => (
              <div className="event-card" key={index}>
                <img
                  src={event.image}
                  alt={event.title}
                  className="event-image"
                />
                <div className="event-info">
                  <h3>{event.title}</h3>
                  <p>{event.date}</p>
                  <button onClick={() => handleDelete(event._id)}>
                    Delete
                  </button>{" "}
                  {/* Delete button */}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
    </div>
  );
};

export default Events;