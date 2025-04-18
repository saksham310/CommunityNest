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
  faUsers,
  faPlus,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import "./chat.css";
import Sidebar from "../Sidebar/sidebar";

const Chat = () => {
  // State variables
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const navigate = useNavigate();

  // Current user details
  const currentUserId = localStorage.getItem("userId");
  const currentUsername = localStorage.getItem("username");
  const currentUserProfileImage = localStorage.getItem("profileImage");
  const [conversationPartners, setConversationPartners] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Initialize socket connection
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
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    // Handle incoming private messages
    newSocket.on("private-message", (message) => {
      if (
        (selectedUser &&
          (message.sender._id === selectedUser._id ||
            message.recipient._id === selectedUser._id)) ||
        message.sender._id === currentUserId ||
        message.recipient._id === currentUserId
      ) {
        setMessages((prev) => [...prev, message]);
      }

      updateConversationPartners(message);
    });

    // Handle incoming group messages
    newSocket.on("group-message", (message) => {
      if (selectedGroup && message.group._id === selectedGroup._id) {
        setMessages((prev) => [...prev, message]);
      }

      updateGroupsList(message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [navigate, currentUserId]);

  useEffect(() => {
    if (!socket) return;
  
    // Handle incoming group messages
    socket.on('group-message', (message) => {
      console.log('Received group message:', message);
      
      if (selectedGroup && message.group._id === selectedGroup._id) {
        console.log('Adding message to current group chat');
        setMessages(prev => [...prev, message]);
      }
      
      // Update groups list
      setGroups(prev => prev.map(group => {
        if (group._id === message.group._id) {
          console.log('Updating last message for group:', group._id);
          return { ...group, lastMessage: message };
        }
        return group;
      }));
    });
  
    return () => {
      socket.off('group-message');
    };
  }, [socket, selectedGroup]);


  // Update conversation partners when receiving new message
  const updateConversationPartners = (message) => {
    setConversationPartners((prev) => {
      const updated = prev.map((partner) => {
        if (
          partner._id === message.sender._id ||
          partner._id === message.recipient._id
        ) {
          return { ...partner, lastMessage: message };
        }
        return partner;
      });

      // If this is a new conversation, add the partner
      const isNewConversation = !updated.some(
        (partner) =>
          partner._id === message.sender._id ||
          partner._id === message.recipient._id
      );

      if (isNewConversation) {
        const partnerId =
          message.sender._id === currentUserId
            ? message.recipient._id
            : message.sender._id;
        const partner = users.find((u) => u._id === partnerId);
        if (partner) {
          updated.push({ ...partner, lastMessage: message });
        }
      }

      return updated.sort(
        (a, b) =>
          new Date(b.lastMessage?.timestamp) -
          new Date(a.lastMessage?.timestamp)
      );
    });
  };

  // Update groups list when receiving new group message
  const updateGroupsList = (message) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group._id === message.group._id) {
          return { ...group, lastMessage: message };
        }
        return group;
      })
    );
  };

  // Fetch groups for the current user
  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5001/api/group",
        { 
          headers: { Authorization: `Bearer ${token}` },
          // Ensure the response includes _id and populates necessary fields
          params: { populate: "creator members admins lastMessage.sender" }
        }
      );
      
      // Debug: Check the structure of fetched groups
      console.log('Fetched groups data:', response.data.map(g => ({
        id: g._id || g.id,
        name: g.name,
        members: g.members.length
      })));
      
      setGroups(response.data);
    } catch (err) {
      console.error("Failed to fetch groups:", {
        status: err.response?.status,
        data: err.response?.data
      });
      setError("Could not load groups");
    }
  };

  // Fetch conversation partners
  const fetchConversationPartners = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5001/api/chat/conversation-partners",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { _: Date.now() },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        setConversationPartners(response.data);
      } else {
        console.error("Invalid response format:", response.data);
        setError("Received invalid data format from server");
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching conversation partners:", err);
      setError("Failed to load conversation history");
      setLoading(false);
      if (err.response?.status === 401) navigate("/login");
    }
  };

  // Fetch all users (except current user)
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5001/api/auth/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.filter((user) => user._id !== currentUserId));
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  // Initial data loading
  useEffect(() => {
    fetchUsers();
    fetchGroups();
    fetchConversationPartners();
  }, [currentUserId]);

  // Search functionality
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

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Join appropriate rooms when user or group is selected
  useEffect(() => {
    if (!socket) return;

    if (selectedUser) {
      // Join private chat room
      const roomId = [currentUserId, selectedUser._id].sort().join("-");
      socket.emit("join-private-chat", {
        userId1: currentUserId,
        userId2: selectedUser._id,
      });

      // Leave any group room if we were in one
      if (selectedGroup) {
        socket.emit("leave-group-chat", selectedGroup._id);
      }
    } else if (selectedGroup) {
      // Join group chat room
      socket.emit("join-group-chat", selectedGroup._id);

      // Leave any private chat room if we were in one
      if (selectedUser) {
        const roomId = [currentUserId, selectedUser._id].sort().join("-");
        socket.emit("leave-private-chat", {
          userId1: currentUserId,
          userId2: selectedUser._id,
        });
      }
    }
  }, [socket, selectedUser, selectedGroup, currentUserId]);

  // Group functions
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsersForGroup.length === 0) {
      alert("Group name and at least one member are required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5001/api/group",
        {
          name: groupName,
          members: selectedUsersForGroup.map((user) => user._id),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGroups((prev) => [response.data, ...prev]);
      setShowGroupModal(false);
      setGroupName("");
      setSelectedUsersForGroup([]);
    } catch (err) {
      console.error("Error creating group:", err);
      alert("Failed to create group");
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsersForGroup((prev) =>
      prev.some((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleSelectGroup = async (group) => {
  try {
    // Debug: Log the complete group object
    console.log('Full group object:', JSON.stringify(group, null, 2));
    
    // Get the ID whether it's _id or id
    const groupId = group._id || group.id;
    
    if (!groupId) {
      console.error('Group has no ID:', group);
      setError('Selected group is invalid - missing ID');
      return;
    }

    setSelectedGroup(group);
    setSelectedUser(null);
    setMessages([]);
    setError('');

    const token = localStorage.getItem("token");
    const response = await axios.get(
      `http://localhost:5001/api/group/${groupId}/messages`,
      { 
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    setMessages(response.data);
    
    if (socket) {
      socket.emit('join-group-chat', groupId);
      console.log(`Joined group chat room: ${groupId}`);
    }
  } catch (err) {
    console.error("Group selection failed:", {
      error: err.message,
      response: err.response?.data
    });
    setError("Failed to open group chat");
  }
};
  

  const handleViewGroupMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5001/api/group/${selectedGroup._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedGroup(response.data);
      setShowGroupMembers(true);
    } catch (err) {
      console.error("Error fetching group details:", err);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5001/api/group/${selectedGroup._id}/members`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { members: [memberId] },
        }
      );

      setSelectedGroup((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m._id !== memberId),
      }));
    } catch (err) {
      console.error("Error removing member:", err);
      alert("Failed to remove member");
    }
  };

  // Message functions
  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setSelectedGroup(null);
    setMessages([]);
    setSearchTerm("");
    setShowSearchResults(false);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5001/api/chat/messages/${user._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages(response.data);

      if (socket) {
        socket.emit("join-private-chat", {
          userId1: currentUserId,
          userId2: user._id,
        });
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !socket) return;

    // Optimistic update
    const tempId = Date.now().toString();
    const optimisticMessage = {
      _id: tempId,
      sender: {
        _id: currentUserId,
        username: currentUsername,
        profileImage: currentUserProfileImage,
      },
      recipient: selectedUser,
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: "private",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5001/api/chat/messages",
        {
          recipient: selectedUser._id,
          content: newMessage,
          type: "private",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Replace optimistic update with real message
      setMessages((prev) => [
        ...prev.filter((m) => m._id !== tempId),
        response.data,
      ]);

      // Emit via socket
      if (socket) {
        socket.emit("private-message", response.data);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      // Remove the optimistic update if failed
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      alert("Failed to send message");
    }
  };

  const handleSendGroupMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup || !socket) return;
  
    // Get the proper group ID
    const groupId = selectedGroup._id || selectedGroup.id;
    if (!groupId) {
      console.error('No group ID found in selectedGroup:', selectedGroup);
      setError('Invalid group selected');
      return;
    }
  
    // Optimistic update
    const tempId = Date.now().toString();
    const optimisticMessage = {
      _id: tempId,
      sender: {
        _id: currentUserId,
        username: currentUsername,
        profileImage: currentUserProfileImage
      },
      content: newMessage,
      timestamp: new Date().toISOString(),
      group: {
        _id: groupId,
        name: selectedGroup.name
      },
      type: 'group'
    };
  
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");
  
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        'http://localhost:5001/api/chat/messages',
        {
          content: newMessage,
          type: 'group',
          group: groupId  // Make sure this is the string ID, not the full object
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      // Replace optimistic update with real message
      setMessages(prev => [
        ...prev.filter(m => m._id !== tempId),
        response.data
      ]);
  
      // Emit via socket
      if (socket) {
        socket.emit('group-message', {
          groupId: groupId,
          message: response.data
        });
        console.log('Message emitted to group:', groupId);
      }
    } catch (err) {
      console.error('Error sending group message:', {
        error: err.response?.data || err.message,
        request: {
          groupId: groupId,
          content: newMessage
        }
      });
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setError(err.response?.data?.message || 'Failed to send message');
    }
  };

  // Helper functions
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return "";
    const now = new Date();
    const date = new Date(timestamp);

    if (now.toDateString() === date.toDateString()) {
      return formatTime(timestamp);
    } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  if (loading) return <div className="chat-loading">Loading chat...</div>;
  if (error) return <div className="chat-error">{error}</div>;

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
            onFocus={() =>
              searchTerm.trim() !== "" && setShowSearchResults(true)
            }
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

        <button
          className="create-group-btn"
          onClick={() => setShowGroupModal(true)}
        >
          <FontAwesomeIcon icon={faUsers} />
          <span>Create Group</span>
          <FontAwesomeIcon icon={faPlus} className="plus-icon" />
        </button>

        <div className="user-list">
          {conversationPartners.length > 0 ? (
            conversationPartners.map((user) => (
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
                  {user.lastMessage && (
                    <>
                      <p className="last-message-preview">
                        {user.lastMessage.sender._id === currentUserId
                          ? `You: ${user.lastMessage.content.substring(0, 30)}${
                              user.lastMessage.content.length > 30 ? "..." : ""
                            }`
                          : user.lastMessage.content.substring(0, 30) +
                            (user.lastMessage.content.length > 30 ? "..." : "")}
                      </p>
                      <div className="last-message-time">
                        <FontAwesomeIcon icon={faClock} />
                        <span>
                          {formatLastMessageTime(user.lastMessage.timestamp)}
                        </span>
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

        {/* Group conversations */}
        <div className="group-list">
          {groups.map((group) => (
            <div
              key={group._id}
              className={`user-item group-item ${
                selectedGroup?._id === group._id ? "active" : ""
              }`}
              onClick={() => handleSelectGroup(group)}
            >
              <div className="user-avatar group-avatar">
                <FontAwesomeIcon icon={faUsers} />
              </div>
              <div className="user-info">
                <h4>{group.name}</h4>
                {group.lastMessage && (
                  <>
                    <p className="last-message-preview">
                      {group.lastMessage.sender._id === currentUserId
                        ? `You: ${group.lastMessage.content.substring(0, 30)}${
                            group.lastMessage.content.length > 30 ? "..." : ""
                          }`
                        : `${
                            group.lastMessage.sender.username
                          }: ${group.lastMessage.content.substring(0, 30)}${
                            group.lastMessage.content.length > 30 ? "..." : ""
                          }`}
                    </p>
                    <div className="last-message-time">
                      <FontAwesomeIcon icon={faClock} />
                      <span>
                        {formatLastMessageTime(group.lastMessage.timestamp)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
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
                messages.map((message) => {
                  const isSent =
                    message.sender._id === currentUserId ||
                    message.sender === currentUserId;

                  return (
                    <div
                      key={message._id}
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
        ) : selectedGroup ? (
          <>
            <div className="chat-header">
              <div className="chat-partner">
                <div className="partner-avatar group-avatar">
                  <FontAwesomeIcon icon={faUsers} />
                </div>
                <div>
                  <h3>{selectedGroup.name}</h3>
                  <p>{selectedGroup.members.length} members</p>
                  <button
                    onClick={handleViewGroupMembers}
                    className="view-members-btn"
                  >
                    View Members
                  </button>
                </div>
              </div>
            </div>

            {showGroupMembers && (
              <div className="group-members-modal">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>Group Members</h3>
                    <button onClick={() => setShowGroupMembers(false)}>
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>

                  <div className="members-list">
                    {selectedGroup.members.map((member) => (
                      <div key={member._id} className="member-item">
                        <div className="member-avatar">
                          {member.profileImage ? (
                            <img
                              src={member.profileImage}
                              alt={member.username}
                            />
                          ) : (
                            <FontAwesomeIcon icon={faUser} />
                          )}
                        </div>
                        <div className="member-info">
                          <h4>{member.username}</h4>
                          {selectedGroup.creator._id === member._id && (
                            <span className="creator-badge">Creator</span>
                          )}
                        </div>
                        {selectedGroup.creator._id === currentUserId &&
                          member._id !== currentUserId && (
                            <button
                              onClick={() => handleRemoveMember(member._id)}
                              className="remove-member-btn"
                            >
                              Remove
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="chat-messages">
              {messages.map((message) => {
                const isSent =
                  message.sender._id === currentUserId ||
                  message.sender === currentUserId;

                return (
                  <div
                    key={message._id}
                    className={`message ${isSent ? "sent" : "received"}`}
                  >
                    {!isSent && (
                      <div className="message-sender">
                        {message.sender.profileImage ? (
                          <img
                            src={message.sender.profileImage}
                            alt={message.sender.username}
                          />
                        ) : (
                          <FontAwesomeIcon icon={faUser} />
                        )}
                        <span>{message.sender.username}</span>
                      </div>
                    )}
                    <div className="message-content">
                      <p>{message.content}</p>
                      <span className="message-time">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input" onSubmit={handleSendGroupMessage}>
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
              <h3>Select a user or group to start chatting</h3>
              <p>Choose from your conversations or create a new group</p>
            </div>
          </div>
        )}
      </div>

      {/* Group Creation Modal */}
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="group-creation-modal">
            <div className="modal-header">
              <h3>Create New Group</h3>
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setGroupName("");
                  setSelectedUsersForGroup([]);
                }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                />
              </div>

              <div className="form-group">
                <label>Select Members</label>
                <div className="member-selection">
                  {users.map((user) => (
                    <div
                      key={user._id}
                      className={`member-item ${
                        selectedUsersForGroup.some((u) => u._id === user._id)
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => toggleUserSelection(user)}
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
                </div>
              </div>

              <div className="selected-members-preview">
                <h4>Selected Members ({selectedUsersForGroup.length})</h4>
                <div className="selected-members-list">
                  {selectedUsersForGroup.map((user) => (
                    <div key={user._id} className="selected-member">
                      <div className="user-avatar">
                        {user.profileImage ? (
                          <img src={user.profileImage} alt={user.username} />
                        ) : (
                          <FontAwesomeIcon icon={faUser} />
                        )}
                      </div>
                      <span>{user.username}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowGroupModal(false);
                    setGroupName("");
                    setSelectedUsersForGroup([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="create-btn"
                  onClick={handleCreateGroup}
                  disabled={
                    !groupName.trim() || selectedUsersForGroup.length === 0
                  }
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
