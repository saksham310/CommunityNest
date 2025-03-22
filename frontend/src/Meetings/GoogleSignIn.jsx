import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const GoogleSignIn = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get("auth");
    const googleAuthToken = urlParams.get("googleAuthToken");
    const userEmail = urlParams.get("email"); // Assuming the backend sends the user's email

    if (authStatus === "success" && googleAuthToken && userEmail) {
      // Store the token and email in localStorage
      localStorage.setItem("googleAuthToken", googleAuthToken);
      localStorage.setItem("userEmail", userEmail);
      localStorage.setItem("authenticated", "true");

      // Redirect back to the meeting page
      navigate("/meeting");
    } else if (authStatus === "failure") {
      alert("Google authentication failed. Please try again.");
      navigate("/meeting");
    }
  }, [navigate]);

  const handleSignIn = () => {
    // Redirect to the backend Google OAuth endpoint
    window.location.href = "http://localhost:5001/api/meeting/google";
  };

  return (
    <div className="google-signin-container">
      <h2>Google Sign In</h2>
      <p>Please sign in to view scheduled meetings.</p>
      <button onClick={handleSignIn}>Sign in with Google</button>
    </div>
  );
};

export default GoogleSignIn;