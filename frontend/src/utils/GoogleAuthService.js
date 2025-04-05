// // Client-side Google auth utilities
// export const checkGoogleAuth = async () => {
//     try {
//       const response = await fetch("http://localhost:5001/api/auth/check-google-auth", {
//         credentials: 'include'
//       });
//       const data = await response.json();
      
//       return {
//         isGoogleAuthed: data.isGoogleAuthed || false,
//         email: data.email || '',
//         expiresAt: data.expiresAt || Date.now() + 3600000 // Default 1 hour
//       };
//     } catch (error) {
//       console.error("Google auth check failed:", error);
//       return { isGoogleAuthed: false, email: '', expiresAt: 0 };
//     }
//   };
  
//   export const initiateGoogleAuth = () => {
//     // Clear existing auth state before starting new flow
//     localStorage.removeItem('googleAuth');
//     window.location.href = "http://localhost:5001/api/meeting/google"; 
//   };
  
//   export const fetchGoogleUserData = async () => {
//     const response = await fetch("http://localhost:5001/api/meeting/fetch-email", {
//       credentials: 'include'
//     });
//     const data = await response.json();
//     return data.email || '';
//   };
  
//   export const validateGoogleToken = async (token) => {
//     if (!token) return false;
    
//     try {
//       const response = await fetch(
//         `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`
//       );
//       return response.ok;
//     } catch {
//       return false;
//     }
//   };
  
//   // New function to handle token refresh
//   export const refreshGoogleToken = async (refreshToken) => {
//     try {
//       const response = await fetch('http://localhost:5001/api/auth/refresh-google-token', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ refreshToken }),
//         credentials: 'include'
//       });
//       return await response.json();
//     } catch (error) {
//       console.error("Token refresh failed:", error);
//       return null;
//     }
//   };

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