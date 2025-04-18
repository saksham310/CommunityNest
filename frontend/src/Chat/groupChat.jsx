// // components/GroupChat.jsx
// import React, { useState, useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import { io } from "socket.io-client";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faSearch,
//   faPaperPlane,
//   faUsers,
//   faPlus,
//   faClock,
//   faEllipsisV
// } from "@fortawesome/free-solid-svg-icons";
// import "./chat.css";

// const GroupChat = ({ group, onClose }) => {
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [socket, setSocket] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const messagesEndRef = useRef(null);
//   const navigate = useNavigate();
//   const currentUserId = localStorage.getItem("userId");

//   // Initialize socket connection
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       navigate("/login");
//       return;
//     }

//     const newSocket = io("http://localhost:5001", {
//       auth: { token },
//       reconnection: true,
//       reconnectionAttempts: 5,
//       reconnectionDelay: 1000,
//     });

//     newSocket.on("connect", () => {
//       console.log("Socket connected for group chat");
//       setSocket(newSocket);
//     });

//     newSocket.on("group-message", (message) => {
//       if (message.group._id === group._id) {
//         setMessages(prev => [...prev, message]);
//       }
//     });

//     return () => {
//       newSocket.off("group-message");
//       newSocket.disconnect();
//     };
//   }, [navigate, group._id]);

//   // Fetch group messages
//   useEffect(() => {
//     const fetchMessages = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const response = await axios.get(
//           `http://localhost:5001/api/group/${group._id}/messages`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         setMessages(response.data);
//         setLoading(false);
//       } catch (err) {
//         console.error("Error fetching group messages:", err);
//         setError("Failed to load messages");
//         setLoading(false);
//       }
//     };

//     fetchMessages();
//   }, [group._id]);

//   // Scroll to bottom of messages
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // Handle sending a new message
//   const handleSendMessage = async (e) => {
//     e.preventDefault();
//     if (!newMessage.trim() || !socket) return;

//     const message = {
//       group: group._id,
//       content: newMessage,
//     };

//     // Optimistically update the UI
//     const tempId = Date.now();
//     const optimisticMessage = {
//       _id: tempId,
//       sender: currentUserId,
//       group: group._id,
//       content: newMessage,
//       timestamp: new Date().toISOString(),
//       type: 'group'
//     };

//     setMessages(prev => [...prev, optimisticMessage]);
//     setNewMessage("");

//     try {
//       socket.emit('group-message', message);
//     } catch (err) {
//       console.error('Error sending message:', err);
//       setMessages(prev => prev.filter(m => m._id !== tempId));
//     }
//   };

//   // Format message timestamp
//   const formatTime = (timestamp) => {
//     const date = new Date(timestamp);
//     return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//   };

//   if (loading) {
//     return <div className="chat-loading">Loading group chat...</div>;
//   }

//   if (error) {
//     return <div className="chat-error">{error}</div>;
//   }

//   return (
//     <div className="group-chat-container">
//       <div className="group-chat-header">
//         <div className="group-info">
//           <div className="group-avatar">
//             {group.image ? (
//               <img src={group.image} alt={group.name} />
//             ) : (
//               <FontAwesomeIcon icon={faUsers} size="lg" />
//             )}
//           </div>
//           <div>
//             <h3>{group.name}</h3>
//             <p>{group.members.length} members</p>
//           </div>
//         </div>
//         <button className="close-chat" onClick={onClose}>
//           ×
//         </button>
//       </div>

//       <div className="group-chat-messages">
//         {messages.length > 0 ? (
//           messages.map((message, index) => {
//             const isSent = message.sender === currentUserId || 
//                          (message.sender._id && message.sender._id === currentUserId);

//             return (
//               <div
//                 key={index}
//                 className={`message ${isSent ? "sent" : "received"}`}
//               >
//                 {!isSent && (
//                   <div className="message-sender">
//                     {message.sender.profileImage ? (
//                       <img src={message.sender.profileImage} alt={message.sender.username} />
//                     ) : (
//                       <FontAwesomeIcon icon={faUser} />
//                     )}
//                     <span>{message.sender.username}</span>
//                   </div>
//                 )}
//                 <div className="message-content">
//                   <p>{message.content}</p>
//                   <span className="message-time">
//                     {formatTime(message.timestamp)}
//                   </span>
//                 </div>
//               </div>
//             );
//           })
//         ) : (
//           <div className="no-messages">
//             No messages yet. Start the conversation!
//           </div>
//         )}
//         <div ref={messagesEndRef} />
//       </div>

//       <form className="group-chat-input" onSubmit={handleSendMessage}>
//         <input
//           type="text"
//           placeholder="Type a message..."
//           value={newMessage}
//           onChange={(e) => setNewMessage(e.target.value)}
//         />
//         <button type="submit" disabled={!newMessage.trim()}>
//           <FontAwesomeIcon icon={faPaperPlane} />
//         </button>
//       </form>
//     </div>
//   );
// };

// export default GroupChat;