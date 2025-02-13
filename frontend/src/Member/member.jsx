import React, { useEffect, useState } from "react";
import axios from "axios";
import "./member.css";
import Sidebar from "../Sidebar/sidebar.jsx"; // Import Sidebar

const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(""); // State for new member email
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [userStatus, setUserStatus] = useState(""); // User's status: community or member
  const [communityId, setCommunityId] = useState(""); // Community ID

  useEffect(() => {
    fetchUserStatus();
  }, []);

  useEffect(() => {
    console.log("useEffect triggered. Community ID:", communityId);
    if (communityId) {
      fetchMembers(communityId); // Ensure community ID is passed
    }
  }, [communityId]);

  // Runs when communityId updates

  // Fetch user status to determine if they can add members
  const fetchUserStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5001/api/auth/data", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      setUserStatus(response.data.status);

      // If user is a member, fetch the community ID they belong to
      if (response.data.status === "member") {
        const firstCommunity = response.data.communities[0];
        setCommunityId(firstCommunity);
        fetchMembers(firstCommunity); // Fetch members immediately
      } else if (response.data.status === "community") {
        setCommunityId(response.data.managedCommunity); // If user manages a community, get the community ID
      }
    } catch (error) {
      console.error("Error fetching user status:", error);
    }
  };

  // Fetch members for the current community
  const fetchMembers = async (communityId) => {
    if (!communityId) {
      console.error("Community ID is missing.");
      setMessage("Community ID is missing.");
      return;
    }
    console.log("Fetching members for community:", communityId);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5001/api/community/${communityId}/members`,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );

      console.log("Fetched members:", response.data.members);
      setMembers(response.data.members);
    } catch (error) {
      console.error("Error fetching members:", error);
      setMessage("Error fetching members. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to add a new member
  const addMember = async () => {
    if (!email) {
      setMessage("Please enter a valid email.");
      return;
    }
  
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("You need to be logged in to add members.");
      return;
    }
  
    if (!communityId) {
      console.error("Community ID is missing, cannot add members.");
      setMessage("Community ID is missing, cannot add members.");
      return;
    }
  
    try {
      setAdding(true);
      const response = await axios.post(
        "http://localhost:5001/api/community/add-member",
        { communityId, memberEmail: email },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
  
      setMessage(response.data.message);
      setEmail(""); // Clear input field
  
      // Pass communityId explicitly
      fetchMembers(communityId);
    } catch (error) {
      console.error("Add member error:", error.response?.data || error);
      setMessage(error.response?.data?.message || "Error adding member.");
    } finally {
      setAdding(false);
    }
  };
  
  const removeMember = async (memberId) => {
    const confirmed = window.confirm("Are you sure you want to remove this member?");
    if (!confirmed) return;
  
    if (!communityId) {
      console.error("Community ID is missing, cannot remove members.");
      setMessage("Community ID is missing, cannot remove members.");
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("You need to be logged in to remove members.");
        return;
      }
  
      const response = await axios.delete(
        `http://localhost:5001/api/community/${communityId}/remove-member/${memberId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
  
      setMessage(response.data.message);
  
      // Pass communityId explicitly
      fetchMembers(communityId);
    } catch (error) {
      console.error("Error removing member:", error.response?.data || error);
      setMessage("Error removing member. Please try again.");
    }
  };
  

  return (
    <div className="p-4">
      <Sidebar />
      <div className="content">
        <h2 className="text-2xl font-bold mb-4">Community Members</h2>

        {/* Conditionally render Add Member Form based on user's status */}
        {userStatus === "community" && (
          <div className="add-member-form">
            <input
              type="email"
              placeholder="Enter member email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-box"
            />
            <button
              onClick={addMember}
              disabled={adding}
              className="add-button"
            >
              {adding ? "Adding..." : "Add Member"}
            </button>
          </div>
        )}

        {message && <p className="message">{message}</p>}

        {/* Members List */}
        {loading ? (
          <p>Loading members...</p>
        ) : members.length > 0 ? (
          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Username</th>
                <th className="border px-4 py-2">Email</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member._id} className="border">
                  <td className="border px-4 py-2">{member.username}</td>
                  <td className="border px-4 py-2">{member.email}</td>
                  <td className="border px-4 py-2">
                    {/* Remove member button */}
                    <button
                      onClick={() => removeMember(member._id)}
                      className={`remove-button ${
                        userStatus !== "community" ? "disabled" : ""
                      }`}
                      disabled={userStatus !== "community"}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No members found.</p>
        )}
      </div>
    </div>
  );
};

export default MembersPage;
