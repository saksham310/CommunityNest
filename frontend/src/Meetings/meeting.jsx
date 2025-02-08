import React from 'react';
import Sidebar from '../Sidebar/sidebar.jsx'; // Import Sidebar
import './meeting.css'; // Optional: Add specific styles for Meetings
import { useState } from "react";

const Meeting = ({ onSchedule }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    attendees: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Convert attendees input to an array
    const attendeesArray = formData.attendees.split(",").map(email => email.trim());

    const meetingData = {
      ...formData,
      attendees: attendeesArray,
    };

    // Send data to backend
    const response = await fetch("http://localhost:3000/schedule-meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meetingData),
    });

    const data = await response.json();
    alert(`Meeting Scheduled! Meet Link: ${data.meetLink}`);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "400px", margin: "auto" }}>
      <h2>Schedule Google Meet</h2>

      <label>Meeting Title:</label>
      <input type="text" name="title" value={formData.title} onChange={handleChange} required />

      <label>Description:</label>
      <textarea name="description" value={formData.description} onChange={handleChange} required />

      <label>Attendees (comma-separated emails):</label>
      <input type="text" name="attendees" value={formData.attendees} onChange={handleChange} required />

      <label>Date:</label>
      <input type="date" name="date" value={formData.date} onChange={handleChange} required />

      <label>Start Time:</label>
      <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required />

      <label>End Time:</label>
      <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required />

      <button type="submit">Schedule Meeting</button>
    </form>
  );
};

export default Meeting;
