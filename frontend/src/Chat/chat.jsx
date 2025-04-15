import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPaperPlane,
  faUser,
  faClock,
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
  const [conversationPartners, setConversationPartners] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);


// Replace your socket useEffect with this:
// Update the socket useEffect in chat.jsx
useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
  
    const newSocket = io("http://localhost:5001", {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket"],
    });
  
    // Connection handlers
    newSocket.on("connect", () => {
      console.log("Socket connected");
      setSocket(newSocket);
      setLoading(false);
    });
  
    // Enhanced message handler
    const handleNewMessage = (message) => {
      console.log("New message received:", message);
      
      // Ensure consistent ID format
      const normalizedMessage = {
        ...message,
        _id: message._id.toString(),
        sender: {
          ...message.sender,
          _id: message.sender._id.toString()
        },
        recipient: {
          ...message.recipient,
          _id: message.recipient._id.toString()
        }
      };
  
      // Update messages if in current chat
      setMessages(prev => {
        const isCurrentChat = selectedUser && 
          [normalizedMessage.sender._id, normalizedMessage.recipient._id].includes(selectedUser._id);
        
        const exists = prev.some(m => m._id === normalizedMessage._id);
        return isCurrentChat && !exists ? [...prev, normalizedMessage] : prev;
      });
  
      // Update conversation partners
      setConversationPartners(prev => {
        const partnerId = normalizedMessage.sender._id === currentUserId ? 
          normalizedMessage.recipient._id : normalizedMessage.sender._id;
        
        const existingIndex = prev.findIndex(p => 
          p._id === partnerId || p._id.toString() === partnerId
        );
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: normalizedMessage
          };
          return updated.sort((a, b) => 
            new Date(b.lastMessage?.timestamp || 0) - 
            new Date(a.lastMessage?.timestamp || 0)
          );
        }
        return prev;
      });
    };
  
    newSocket.on("new-message", handleNewMessage);
    
    // Handle conversation updates
    newSocket.on("conversation-update", (partners) => {
      setConversationPartners(partners.map(partner => ({
        ...partner,
        _id: partner._id.toString(),
        lastMessage: partner.lastMessage ? {
          ...partner.lastMessage,
          _id: partner.lastMessage._id.toString(),
          sender: {
            ...partner.lastMessage.sender,
            _id: partner.lastMessage.sender._id.toString()
          },
          recipient: {
            ...partner.lastMessage.recipient,
            _id: partner.lastMessage.recipient._id.toString()
          }
        } : null
      })));
    });
  
    // Error handling
    newSocket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setError("Connection failed - try refreshing");
      if (err.message.includes("auth")) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    });
  
    return () => {
      newSocket.off("new-message", handleNewMessage);
      newSocket.off("conversation-update");
      newSocket.disconnect();
    };
  }, [navigate, currentUserId, selectedUser?._id]);

  // Fetch conversation partners (users you've chatted with)
  const fetchConversationPartners = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5001/api/chat/conversation-partners',
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { _: Date.now() } // Avoid cache
        }
      );
      
      if (response.data && Array.isArray(response.data)) {
        setConversationPartners(response.data);
      } else {
        console.error('Invalid response format:', response.data);
        setError('Received invalid data format from server');
      }
      setLoading(false);
    } catch (err) {
      console.error('Detailed fetch error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      setError('Failed to load conversation history');
      setLoading(false);
      
      // If it's a 401 unauthorized, redirect to login
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    fetchConversationPartners();
  }, []);

  useEffect(() => {
    if (!socket) return;
  
    const handleUpdateConversations = (partners) => {
      setConversationPartners(partners);
    };
  
    socket.on('update-conversations', handleUpdateConversations);
    
    return () => {
      socket.off('update-conversations', handleUpdateConversations);
    };
  }, [socket]);

  // Fetch all users (except current user) - for search functionality
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
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchUsers();
  }, [currentUserId]);

  // Handle search functionality
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setShowSearchResults(false);
      setSearchResults([]);
    } else {
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered);
      setShowSearchResults(filtered.length > 0);
    }
  }, [searchTerm, users]);

  // Set up message listeners when socket is ready
  useEffect(() => {
    if (!socket) return;

    // Listen for incoming messages
    socket.on("private-message", (message) => {
      if (
        selectedUser &&
        (message.sender === selectedUser._id ||
          message.recipient === selectedUser._id)
      ) {
        setMessages((prev) => [...prev, message]);
        // Refresh conversation partners when new message arrives
        fetchConversationPartners();
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

  // Handle selecting a user to chat with
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setMessages([]);
    setSearchTerm("");
    setShowSearchResults(false);

    if (socket) {
      socket.emit("get-messages", {
        userId1: currentUserId,
        userId2: user._id,
      });
    }
  };

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !socket) return;
  
    const message = {
      sender: currentUserId,
      recipient: selectedUser._id,
      content: newMessage.trim()
    };
  
    // Optimistic update
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, {
      ...message,
      _id: tempId,
      timestamp: new Date().toISOString(),
      sender: {
        _id: currentUserId,
        username: currentUsername,
        profileImage: currentUserProfileImage
      },
      recipient: selectedUser
    }]);
    
    setNewMessage("");
  
    try {
      socket.emit('private-message', message, (response) => {
        if (!response?.success) {
          throw new Error(response?.error || 'Failed to send message');
        }
        
        // Replace optimistic message with server response
        setMessages(prev => [
          ...prev.filter(m => m._id !== tempId),
          response.message
        ]);
      });
    } catch (err) {
      console.error('Send message error:', err);
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setError(`Send failed: ${err.message}`);
    }
  };

  // Format message timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format last message timestamp
  const formatLastMessageTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    
    if (now.toDateString() === date.toDateString()) {
      return formatTime(timestamp);
    } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
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
      <div className="chat-sidebar">
        <div className="chat-search">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.trim() !== "" && setShowSearchResults(true)}
          />
          {showSearchResults && (
            <div className="search-results-dropdown">
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  className="search-result-item"
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
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && (
                <div className="no-search-results">No users found</div>
              )}
            </div>
          )}
        </div>

        <div className="user-list">
          {conversationPartners.length > 0 ? (
            conversationPartners.map((user) => (
              <div
                key={user._id}
                className={`user-item ${selectedUser?._id === user._id ? 'active' : ''}`}
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
                  {user.lastMessage && (
                    <>
                      <p className="last-message-preview">
                        {user.lastMessage.sender === currentUserId ? 
                          `You: ${user.lastMessage.content.substring(0, 30)}${user.lastMessage.content.length > 30 ? '...' : ''}` : 
                          user.lastMessage.content.substring(0, 30) + (user.lastMessage.content.length > 30 ? '...' : '')
                        }
                      </p>
                      <div className="last-message-time">
                        <FontAwesomeIcon icon={faClock} />
                        <span>{formatLastMessageTime(user.lastMessage.timestamp)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-users">No conversations yet</div>
          )}
        </div>
      </div>

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
                </div>
              </div>
            </div>

            <div className="chat-messages">
              {messages.length > 0 ? (
                messages.map((message, index) => {
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
              <p>Choose from your chat history or search for users</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
