// Client-side Google auth utilities
export const checkGoogleAuth = async () => {
    const response = await fetch("http://localhost:5001/api/auth/check-google-auth", {
      credentials: 'include' // For cookies
    });
    return await response.json();
  };
  
  export const initiateGoogleAuth = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = "http://localhost:5001/api/meeting/google"; 
  };
  
  export const fetchGoogleUserData = async () => {
    const response = await fetch("http://localhost:5001/api/meeting/fetch-email", {
      credentials: 'include'
    });
    return await response.json();
  };