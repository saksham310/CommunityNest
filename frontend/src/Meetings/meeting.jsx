import React, { useState, useEffect } from "react";
import Sidebar from "../Sidebar/sidebar.jsx"; // Import Sidebar
import "./meeting.css"; // Add styles specific to Meetings page

const ScheduleMeetingForm = () => {
    const [eventData, setEventData] = useState({
        summary: "",
        description: "",
        start: "",
        end: "",
        attendees: "",
    });

    const [authenticated, setAuthenticated] = useState(false);
    const [meetingLink, setMeetingLink] = useState("");

    // Check if user is authenticated when the component loads
    useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("auth") === "success") {
          setAuthenticated(true);
          alert("Successfully authenticated with Google!");
      }
  }, []);
  

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

        // Convert comma-separated emails to an array
        const attendeesList = eventData.attendees.split(",").map(email => email.trim());

        try {
          const response = await fetch("http://localhost:5001/api/meeting/schedule_meeting", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",  // Allow sending cookies/session
            body: JSON.stringify({ ...eventData, attendees: attendeesList }),
        });
        

            const result = await response.json();
            if (response.ok) {
                setMeetingLink(result.eventLink);
                alert(`Meeting Scheduled! Link: ${result.eventLink}`);
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error("Error scheduling meeting:", error);
            alert("Something went wrong. Please try again.");
        }
    };

    return (
        <div className="meeting">
            <Sidebar />
            <h2>Schedule a Meeting</h2>
            
            {!authenticated ? (
                <button onClick={handleGoogleAuth}>Sign in with Google</button>
            ) : (
                <form onSubmit={handleSubmit}>
                    <input type="text" name="summary" placeholder="Event Title" onChange={handleChange} required />
                    <textarea name="description" placeholder="Event Description" onChange={handleChange} required />
                    <input type="datetime-local" name="start" onChange={handleChange} required />
                    <input type="datetime-local" name="end" onChange={handleChange} required />
                    <input type="text" name="attendees" placeholder="Attendees (comma-separated emails)" onChange={handleChange} required />
                    <button type="submit">Schedule Meeting</button>
                </form>
            )}

            {meetingLink && (
                <div>
                    <h3>Meeting Scheduled Successfully!</h3>
                    <p><a href={meetingLink} target="_blank" rel="noopener noreferrer">{meetingLink}</a></p>
                </div>
            )}
        </div>
    );
};

export default ScheduleMeetingForm;
