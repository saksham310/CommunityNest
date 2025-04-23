import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPaperPlane,
  faUser,
  faUsers,
  faPlus,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import "./chat.css";
import Sidebar from "../Sidebar/sidebar";
import { io } from "socket.io-client";

const Chat = () => {
  // State variables
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
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
  const [unreadCounts, setUnreadCounts] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Current user details
  const currentUserId = localStorage.getItem("userId");
  const currentUsername = localStorage.getItem("username");
  const currentUserProfileImage = localStorage.getItem("profileImage");
  const [conversationPartners, setConversationPartners] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [activeConversations, setActiveConversations] = useState([]);

  const socketRef = useRef(null);

//   useEffect(() => {

//     // Connect to socket server
//     socketRef.current = io("http://localhost:5001");

//     // Setup event listeners
//     const onConnect = () => {
//       console.log("Connected to socket server");
//     };

//     const onRefetch = (data) => {
//       const { messageData } = data;
//       const condition =
//         currentUserId === messageData.recipient._id &&
//         selectedUser?._id === messageData.sender._id;
//       console.log("condition", condition);
//       if(!condition) {
//           socketRef.current.off("refetch");
//       }
//       if (condition) {
//           console.log('triggerring')
//         setMessages((prev) => [...prev, messageData]);
//       }
//     };

//     // Add event listeners
//     socketRef.current.on("connect", onConnect);
//     socketRef.current.on("refetch", onRefetch);

//     // Cleanup function
//     return () => {
//       if (socketRef.current) {
//         socketRef.current.off("connect", onConnect);
//         socketRef.current.off("refetch", onRefetch);
//         socketRef.current.disconnect();
//       }
//     };
//   }, [currentUserId, selectedUser]);

  // Fetch groups for the current user
  useEffect(() => {
    // Connect to socket server
    socketRef.current = io("http://localhost:5001");

    // Setup event listeners
    const onConnect = () => {
      console.log("Connected to socket server");
    };

    const onRefetch = (data) => {
      const { messageData } = data;
      const condition = 
        currentUserId === messageData.recipient._id && 
        selectedUser?._id === messageData.sender._id;
      
      console.log("Message received:", {
        currentUserId,
        selectedUserId: selectedUser?._id,
        messageRecipientId: messageData.recipient._id,
        messageSenderId: messageData.sender._id,
        condition
      });

      // Only add message if condition is true
      if (condition) {
        console.log("Adding message to conversation");
        setMessages(prev => [...prev, messageData]);
      }
    };

    // Add event listeners
    socketRef.current.on("connect", onConnect);
    socketRef.current.on("refetch", onRefetch);

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect", onConnect);
        socketRef.current.off("refetch", onRefetch);
        socketRef.current.disconnect();
      }
    };
}, [currentUserId, selectedUser]);
  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5001/api/group", {
        headers: { Authorization: `Bearer ${token}` },
        params: { populate: "creator members admins lastMessage.sender" },
      });
      setGroups(response.data);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      setError("Could not load groups");
    }
  };

  // Fetch conversation partners with unread counts
  const fetchConversationPartners = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5001/api/chat/conversation-partners",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        const sortedPartners = response.data.sort((a, b) => {
          const aTime = a.lastMessage?.timestamp || 0;
          const bTime = b.lastMessage?.timestamp || 0;
          return new Date(bTime) - new Date(aTime);
        });

        // Initialize unread counts only for unread messages
        const initialUnreadCounts = {};
        sortedPartners.forEach((partner) => {
          if (partner.unreadCount > 0) {
            initialUnreadCounts[partner._id] = partner.unreadCount;
          }
        });

        setUnreadCounts((prev) => ({ ...prev, ...initialUnreadCounts }));
        setConversationPartners(sortedPartners);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching conversation partners:", err);
      setError("Failed to load conversation history");
      setLoading(false);
      if (err.response?.status === 401) navigate("/login");
    }
  };

  // Add this function to mark messages as read
  const markMessagesAsRead = async (conversationId, type) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:5001/api/chat/mark-as-read`,
        { conversationId, type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  const handleSelectUser = async (user) => {
    if (!user) return;
    try {
      // Clear previous selections
      setSelectedGroup(null);
      setSelectedUser(user);
      setMessages([]);
      setError("");

      // Clear unread count
      setUnreadCounts((prev) => {
        const newCounts = { ...prev };
        delete newCounts[user._id];
        return newCounts;
      });

      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      // Mark messages as read
      await axios.post(
        "http://localhost:5001/api/chat/mark-as-read",
        { conversationId: user._id, type: "private" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Fetch messages
      const response = await axios.get(
        `http://localhost:5001/api/chat/messages/${user._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(response.data);

      // Mark messages as read
      await markMessagesAsRead(user._id, "private");
    } catch (err) {
      console.error("Error selecting user:", err);
      setError("Failed to open chat");
    }
  };

  const handleSelectGroup = async (group) => {
    try {
      // Clear previous selections
      setSelectedUser(null);
      setSelectedGroup(group);
      setMessages([]);
      setError("");

      // Clear unread count
      setUnreadCounts((prev) => {
        const newCounts = { ...prev };
        delete newCounts[group._id];
        return newCounts;
      });

      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      // Mark messages as read
      await axios.post(
        "http://localhost:5001/api/chat/mark-as-read",
        { conversationId: group._id, type: "group" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Fetch messages
      const response = await axios.get(
        `http://localhost:5001/api/group/${group._id}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(response.data);
    } catch (err) {
      console.error("Error selecting group:", err);
      setError("Failed to open group chat");
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

    // Simulate some online users for UI demonstration
    setOnlineUsers([
      // Add some random user IDs here that would be in your users array
      // This is just for UI demonstration since we removed socket functionality
    ]);
  }, [currentUserId]);

  // Search functionality
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setShowSearchResults(false);
      setSearchResults([]);
    } else {
      const filtered = users.filter(
        (user) =>
          user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered);
      setShowSearchResults(filtered.length > 0);
    }
  }, [searchTerm, users]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // combined conversation list useEffect
  useEffect(() => {
    const combined = [
      ...conversationPartners.map((partner) => ({
        ...partner,
        type: "private",
        _id: partner._id,
        name: partner.username,
        avatar: partner.profileImage,
        isOnline: onlineUsers.includes(partner._id),
        lastMessage: partner.lastMessage,
        createdAt: partner.lastMessage?.timestamp || new Date(0),
      })),
      ...groups.map((group) => ({
        ...group,
        type: "group",
        _id: group._id,
        name: group.name,
        avatar: group.image,
        isOnline: false,
        lastMessage: group.lastMessage,
        createdAt:
          group.lastMessage?.timestamp || group.createdAt || new Date(0),
      })),
    ].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    setActiveConversations(combined);
  }, [conversationPartners, groups, onlineUsers]);

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

  const handleViewGroupMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5001/api/group/${selectedGroup._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSelectedGroup(response.data);
      setShowGroupMembers(true);
    } catch (err) {
      console.error("Error fetching group details:", err);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;

    const groupId = selectedGroup?._id;
    if (!groupId) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5001/api/group/${groupId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { members: [memberId] },
      });

      setSelectedGroup((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m._id !== memberId),
      }));
    } catch (err) {
      console.error("Error removing member:", err);
      setError(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages((prev) => [
        ...prev.filter((m) => m._id !== tempId),
        response.data,
      ]);
      socketRef.current.emit("private-message", response.data);

      // Update conversation partners
      setConversationPartners((prev) => {
        return prev
          .map((partner) => {
            if (partner._id === selectedUser._id) {
              return { ...partner, lastMessage: response.data };
            }
            return partner;
          })
          .sort((a, b) => {
            const aTime = a.lastMessage?.timestamp || a.createdAt;
            const bTime = b.lastMessage?.timestamp || b.createdAt;
            return new Date(bTime) - new Date(aTime);
          });
      });
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      alert("Failed to send message");
    }
  };

  const handleSendGroupMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;

    const groupId = selectedGroup._id;
    if (!groupId) return;

    const tempId = Date.now().toString();
    const optimisticMessage = {
      _id: tempId,
      sender: {
        _id: currentUserId,
        username: currentUsername,
        profileImage: currentUserProfileImage,
      },
      content: newMessage,
      timestamp: new Date().toISOString(),
      group: {
        _id: groupId,
        name: selectedGroup.name,
      },
      type: "group",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5001/api/chat/messages",
        {
          content: newMessage,
          type: "group",
          group: groupId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages((prev) => [
        ...prev.filter((m) => m._id !== tempId),
        response.data,
      ]);

      // Update groups
      setGroups((prev) => {
        return prev
          .map((group) => {
            if (group._id === groupId) {
              return { ...group, lastMessage: response.data };
            }
            return group;
          })
          .sort((a, b) => {
            const aTime = a.lastMessage?.timestamp || a.createdAt;
            const bTime = b.lastMessage?.timestamp || b.createdAt;
            return new Date(bTime) - new Date(aTime);
          });
      });
    } catch (err) {
      console.error("Error sending group message:", err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setError(err.response?.data?.message || "Failed to send message");
    }
  };

  // Helper functions
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();

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
                      <img
                        src={user.profileImage || "/placeholder.svg"}
                        alt={user.username}
                      />
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

        <div className="conversation-list">
          {activeConversations.map((conversation) => (
            <div
              key={`${conversation.type}-${conversation._id}`}
              className={`conversation-item ${
                selectedUser?._id === conversation._id ||
                selectedGroup?._id === conversation._id
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                conversation.type === "private"
                  ? handleSelectUser(conversation)
                  : handleSelectGroup(conversation)
              }
            >
              <div className="conversation-avatar">
                {conversation.type === "private" ? (
                  conversation.profileImage ? (
                    <img
                      src={conversation.profileImage || "/placeholder.svg"}
                      alt={conversation.username}
                    />
                  ) : (
                    <FontAwesomeIcon icon={faUser} />
                  )
                ) : (
                  <FontAwesomeIcon icon={faUsers} />
                )}
                {conversation.type === "private" &&
                  onlineUsers.includes(conversation._id) && (
                    <span className="online-indicator"></span>
                  )}
              </div>
              <div className="conversation-details">
                <div className="conversation-header">
                  <h4>{conversation.name}</h4>
                  {conversation.lastMessage && (
                    <span className="message-time">
                      {formatLastMessageTime(
                        conversation.lastMessage.timestamp
                      )}
                    </span>
                  )}
                </div>
                {conversation.lastMessage && (
                  <div className="message-preview-container">
                    <p className="message-preview">
                      {conversation.lastMessage.sender?._id === currentUserId
                        ? `You: ${conversation.lastMessage.content.substring(
                            0,
                            25
                          )}`
                        : conversation.type === "private"
                        ? conversation.lastMessage.content.substring(0, 25)
                        : `${
                            conversation.lastMessage.sender?.username
                          }: ${conversation.lastMessage.content.substring(
                            0,
                            25
                          )}`}
                      {conversation.lastMessage.content.length > 25
                        ? "..."
                        : ""}
                    </p>
                    {unreadCounts[conversation._id] > 0 && (
                      <span className="unread-count">
                        {unreadCounts[conversation._id]}
                      </span>
                    )}
                  </div>
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
                      src={selectedUser.profileImage || "/placeholder.svg"}
                      alt={selectedUser.username}
                    />
                  ) : (
                    <FontAwesomeIcon icon={faUser} />
                  )}
                </div>
                <span>{selectedUser.username}</span>
              </div>
            </div>

            <div className="chat-messages">
  {messages.map((message) => {
    const isCorrectRecipient = message.recipient._id === currentUserId;
    const isCorrectSender = message.sender._id === selectedUser?._id;
    const isOwnMessage = message.sender._id === currentUserId;

    if (isOwnMessage || (isCorrectRecipient && isCorrectSender)) {
      return (
        <div key={message._id} className="message">
          {message.content}
        </div>
      );
    } else {
      return null; // Or render nothing
    }
  })}
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
                <div className="partner-info">
                  <h3>{selectedGroup.name}</h3>
                  <p>{selectedGroup.members?.length || 0} members</p>
                </div>
                <button
                  onClick={handleViewGroupMembers}
                  className="view-members-btn"
                >
                  View Members
                </button>
              </div>
            </div>

            {showGroupMembers && (
              <div className="group-members-modal1">
                <div className="modal-content1">
                  <div className="modal-header">
                    <h3>Group Members</h3>
                    <button onClick={() => setShowGroupMembers(false)}>
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>

                  <div className="members-list">
                    {selectedGroup.members?.map((member) => (
                      <div key={member._id} className="member-item">
                        <div className="member-avatar">
                          {member.profileImage ? (
                            <img
                              src={member.profileImage || "/placeholder.svg"}
                              alt={member.username}
                            />
                          ) : (
                            <FontAwesomeIcon icon={faUser} />
                          )}
                        </div>
                        <div className="member-info">
                          <h4>{member.username}</h4>
                          {selectedGroup.creator?._id === member._id && (
                            <span className="creator-badge">Creator</span>
                          )}
                        </div>
                        {selectedGroup.creator?._id === currentUserId &&
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
                const isSent = message.sender._id === currentUserId;
                return (
                  <div
                    key={message._id}
                    className={`message ${isSent ? "sent" : "received"}`}
                  >
                    {!isSent && (
                      <div className="message-sender">
                        {message.sender.profileImage ? (
                          <img
                            src={
                              message.sender.profileImage || "/placeholder.svg"
                            }
                            alt={message.sender.username}
                          />
                        ) : (
                          <FontAwesomeIcon icon={faUser} />
                        )}
                      </div>
                    )}
                    <div className="message-sender-info">
                      <span className="sender-username">
                        {message.sender.username}
                      </span>
                      <div className="message-content">
                        <p>{message.content}</p>
                        <span className="message-time">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
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

      {showGroupModal && (
        <div className="modal-overlay1">
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
                          <img
                            src={user.profileImage || "/placeholder.svg"}
                            alt={user.username}
                          />
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
                          <img
                            src={user.profileImage || "/placeholder.svg"}
                            alt={user.username}
                          />
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
