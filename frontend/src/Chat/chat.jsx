import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPaperPlane,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import "./chat.css";
import Sidebar from "../Sidebar/sidebar";

const Chat = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Get current user details from localStorage
  const currentUserId = localStorage.getItem("userId");
  const currentUsername = localStorage.getItem("username");
  const currentUserProfileImage = localStorage.getItem("profileImage");
  const [conversations, setConversations] = useState([]);
  const [conversationPartners, setConversationPartners] = useState([]);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const newSocket = io("http://localhost:5001", {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("Connected to socket server");
      setSocket(newSocket);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setError("Failed to connect to chat server");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

  // Add this useEffect to fetch conversations
useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5001/api/chat/conversations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConversations(response.data);
      } catch (err) {
        console.error('Error fetching conversations:', err);
      }
    };
  
    fetchConversations();
  }, [messages]); // Refresh when messages change

  useEffect(() => {
    const fetchConversationPartners = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          'http://localhost:5001/api/chat/conversation-partners',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setConversationPartners(response.data);
      } catch (err) {
        console.error('Error fetching conversation partners:', err);
      }
    };
  
    fetchConversationPartners();
  }, [messages]); // Refresh when messages change
  

  // Fetch all users (except current user)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:5001/api/auth/users",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Filter out current user
        const otherUsers = response.data.filter(
          (user) => user._id !== currentUserId
        );
        setUsers(otherUsers);
        setFilteredUsers(otherUsers);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users");
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUserId]);

  // Set up message listeners when socket is ready
  useEffect(() => {
    if (!socket) return;

    // Listen for incoming messages
    socket.on("private-message", (message) => {
      // Only add the message if it's in the current chat
      if (
        selectedUser &&
        (message.sender === selectedUser._id ||
          message.recipient === selectedUser._id)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    });

    // Listen for previous messages when joining a chat
    socket.on("previous-messages", (messageHistory) => {
      setMessages(messageHistory);
    });

    return () => {
      socket.off("private-message");
      socket.off("previous-messages");
    };
  }, [socket, selectedUser]);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Handle selecting a user to chat with
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setMessages([]);

    // Request message history from server
    if (socket) {
      socket.emit("get-messages", {
        userId1: currentUserId,
        userId2: user._id,
      });
    }
  };

  // Handle sending a new message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !socket) return;

    const message = {
      sender: currentUserId,
      recipient: selectedUser._id,
      content: newMessage,
      timestamp: new Date().toISOString(),
    };

    // Send message via socket
    socket.emit("private-message", message);

    // Add message to local state immediately
    setMessages((prev) => [...prev, message]);
    setNewMessage("");
  };

  // Format message timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return <div className="chat-loading">Loading chat...</div>;
  }

  if (error) {
    return <div className="chat-error">{error}</div>;
  }

  return (
    <div className="chat-container">
      <Sidebar />
      {/* Sidebar with user list */}
      <div className="chat-sidebar">
        <div className="chat-search">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="user-list">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user._id}
                className={`user-item ${
                  selectedUser?._id === user._id ? "active" : ""
                }`}
                onClick={() => handleSelectUser(user)}
              >
                <div className="user-avatar">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.username} />
                  ) : (
                    <FontAwesomeIcon icon={faUser} />
                  )}
                </div>
                <div className="user-info">
                  <h4>{user.username}</h4>
                  <p>{user.email}</p>
                  <span className="user-status">{user.status}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-users">No users found</div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="chat-main">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <div className="chat-partner">
                <div className="partner-avatar">
                  {selectedUser.profileImage ? (
                    <img
                      src={selectedUser.profileImage}
                      alt={selectedUser.username}
                    />
                  ) : (
                    <FontAwesomeIcon icon={faUser} />
                  )}
                </div>
                <div>
                  <h3>{selectedUser.username}</h3>
                  <p>{selectedUser.status}</p>
                </div>
              </div>
            </div>

            <div className="chat-messages">
              {messages.length > 0 ? (
                messages.map((message, index) => {
                  // Determine if the message was sent by the current user
                  const isSent =
                    message.sender._id === currentUserId ||
                    (typeof message.sender === "string" &&
                      message.sender === currentUserId);

                  return (
                    <div
                      key={index}
                      className={`message ${isSent ? "sent" : "received"}`}
                    >
                      <div className="message-content">
                        <p>{message.content}</p>
                        <span className="message-time">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-messages">
                  No messages yet. Start the conversation!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" disabled={!newMessage.trim()}>
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </form>
          </>
        ) : (
          <div className="chat-placeholder">
            <div className="placeholder-content">
              <FontAwesomeIcon icon={faUser} size="3x" />
              <h3>Select a user to start chatting</h3>
              <p>Choose from the list on the left to begin your conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
