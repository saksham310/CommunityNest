// // components/CreateGroupModal.jsx
// import React, { useState } from "react";
// import axios from "axios";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faTimes, faUsers, faSearch, faCheck } from "@fortawesome/free-solid-svg-icons";
// import "./chat.css";

// const CreateGroupModal = ({ onClose, onCreate }) => {
//   const [name, setName] = useState("");
//   const [description, setDescription] = useState("");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchResults, setSearchResults] = useState([]);
//   const [selectedMembers, setSelectedMembers] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const currentUserId = localStorage.getItem("userId");

//   const handleSearch = async (term) => {
//     if (!term.trim()) {
//       setSearchResults([]);
//       return;
//     }

//     try {
//       const token = localStorage.getItem("token");
//       const response = await axios.get(
//         `http://localhost:5001/api/auth/users?search=${term}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       // Filter out current user and already selected members
//       const filtered = response.data.filter(
//         user => user._id !== currentUserId && 
//                !selectedMembers.some(m => m._id === user._id)
//       );
//       setSearchResults(filtered);
//     } catch (err) {
//       console.error("Error searching users:", err);
//       setSearchResults([]);
//     }
//   };

//   const handleAddMember = (user) => {
//     setSelectedMembers(prev => [...prev, user]);
//     setSearchTerm("");
//     setSearchResults([]);
//   };

//   const handleRemoveMember = (userId) => {
//     setSelectedMembers(prev => prev.filter(m => m._id !== userId));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!name.trim() || selectedMembers.length === 0) {
//       setError("Group name and at least one member are required");
//       return;
//     }

//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const response = await axios.post(
//         "http://localhost:5001/api/group",
//         {
//           name,
//           description,
//           members: selectedMembers.map(m => m._id)
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       onCreate(response.data);
//     } catch (err) {
//       console.error("Error creating group:", err);
//       setError("Failed to create group");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="modal-overlay">
//       <div className="create-group-modal">
//         <div className="modal-header">
//           <h2>Create New Group</h2>
//           <button className="close-modal" onClick={onClose}>
//             <FontAwesomeIcon icon={faTimes} />
//           </button>
//         </div>

//         <form onSubmit={handleSubmit}>
//           <div className="form-group">
//             <label>Group Name</label>
//             <input
//               type="text"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               placeholder="Enter group name"
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label>Description (Optional)</label>
//             <textarea
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               placeholder="Enter group description"
//               rows="3"
//             />
//           </div>

//           <div className="form-group">
//             <label>Add Members</label>
//             <div className="member-search">
//               <div className="search-input">
//                 <FontAwesomeIcon icon={faSearch} className="search-icon" />
//                 <input
//                   type="text"
//                   value={searchTerm}
//                   onChange={(e) => {
//                     setSearchTerm(e.target.value);
//                     handleSearch(e.target.value);
//                   }}
//                   placeholder="Search users..."
//                 />
//               </div>
//               {searchResults.length > 0 && (
//                 <div className="search-results">
//                   {searchResults.map(user => (
//                     <div 
//                       key={user._id} 
//                       className="search-result"
//                       onClick={() => handleAddMember(user)}
//                     >
//                       <div className="user-avatar">
//                         {user.profileImage ? (
//                           <img src={user.profileImage} alt={user.username} />
//                         ) : (
//                           <FontAwesomeIcon icon={faUsers} />
//                         )}
//                       </div>
//                       <div className="user-info">
//                         <span>{user.username}</span>
//                         <span>{user.email}</span>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>

//             <div className="selected-members">
//               {selectedMembers.map(member => (
//                 <div key={member._id} className="member-tag">
//                   <div className="member-avatar">
//                     {member.profileImage ? (
//                       <img src={member.profileImage} alt={member.username} />
//                     ) : (
//                       <FontAwesomeIcon icon={faUsers} />
//                     )}
//                   </div>
//                   <span>{member.username}</span>
//                   <button 
//                     type="button"
//                     className="remove-member"
//                     onClick={() => handleRemoveMember(member._id)}
//                   >
//                     ×
//                   </button>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {error && <div className="error-message">{error}</div>}

//           <div className="modal-actions">
//             <button 
//               type="button" 
//               className="cancel-btn"
//               onClick={onClose}
//               disabled={loading}
//             >
//               Cancel
//             </button>
//             <button 
//               type="submit" 
//               className="create-btn"
//               disabled={loading || !name.trim() || selectedMembers.length === 0}
//             >
//               {loading ? "Creating..." : "Create Group"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default CreateGroupModal;