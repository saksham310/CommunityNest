import React, { useEffect, useState } from "react";
import axios from "axios";
import "./dashboard.css";
import Sidebar from "../Sidebar/sidebar";
import {
  FaCalendarAlt,
  FaUserCheck,
  FaSitemap,
  FaBullhorn,
  FaEdit,
  FaTrash,
  FaPlus,
} from "react-icons/fa";
import Modal from "react-modal";
import { FiChevronRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
// import { format } from 'date-fns';

Modal.setAppElement("#root");

const Dashboard = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ departments: 0, members: 0, events: 0 });
  const [currentNotice, setCurrentNotice] = useState(null);
  const [noticeContent, setNoticeContent] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:5001/api/dashboard",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const noticesResponse = await axios.get(
          "http://localhost:5001/api/notice",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setAnnouncements(response.data.announcements);
        setNotices(noticesResponse.data.notices || []);
        setIsAdmin(response.data.isAdmin);

        if (response.data.stats) {
          setStats(response.data.stats);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleSaveNotice = async () => {
    try {
      const token = localStorage.getItem("token");
      let response;

      if (currentNotice) {
        // Update existing notice
        response = await axios.put(
          `http://localhost:5001/api/notice/${currentNotice._id}`,
          { content: noticeContent },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new notice
        response = await axios.post(
          "http://localhost:5001/api/notice",
          { content: noticeContent },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      if (response.data.success) {
        // Refresh notices
        const noticesResponse = await axios.get(
          "http://localhost:5001/api/notice",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setNotices(noticesResponse.data.notices);

        setCurrentNotice(null);
        setModalIsOpen(false);
        setNoticeContent("");
      } else {
        alert(response.data.message || "Failed to save notice");
      }
    } catch (error) {
      console.error("Error saving notice:", error);
      alert(error.response?.data?.message || "An error occurred");
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (window.confirm("Are you sure you want to delete this notice?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`http://localhost:5001/api/notice/${noticeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Refresh notices
        const noticesResponse = await axios.get(
          "http://localhost:5001/api/notice",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setNotices(noticesResponse.data.notices);
      } catch (error) {
        console.error("Error deleting notice:", error);
        alert(error.response?.data?.message || "An error occurred");
      }
    }
  };

  const openAddNoticeModal = () => {
    setCurrentNotice(null);
    setNoticeContent("");
    setModalIsOpen(true);
  };

  const openEditNoticeModal = (notice) => {
    setCurrentNotice(notice);
    setNoticeContent(notice.content);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setCurrentNotice(null);
    setNoticeContent("");
  };

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Dashboard</h1>
          {/* <div className="breadcrumb">
            Home <FiChevronRight /> Dashboard
          </div> */}
        </div>

        {/* Stats Section */}
        <div className="stats-container">
          <div className="stats-card">
            <div className="stats-info">
              <h2>{stats.events}</h2>
              <p>Upcoming Events</p>
            </div>
            <div className="icon-container blue">
              <FaCalendarAlt className="icon" size={24} />
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-info">
              <h2>{stats.members}</h2>
              <p>Community Members</p>
            </div>
            <div className="icon-container green">
              <FaUserCheck className="icon" size={24} />
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-info">
              <h2>{stats.departments}</h2>
              <p>Departments</p>
            </div>
            <div className="icon-container yellow">
              <FaSitemap className="icon" size={24} />
            </div>
          </div>
        </div>

        {/* Combined Notice and Events Section */}
        <div className="combined-section">
          {/* Notice Section */}
          <div className="notice-section">
            <div className="notice-header">
              <div className="notice-title-container">
                <div className="icon-container yellow2">
                  <FaBullhorn className="icon" size={20}/>
                </div>
                <h4>Announcement</h4>
              </div>
              {isAdmin && (
                <button
                  onClick={openAddNoticeModal}
                  className="add-notice-button"
                >
                  <FaPlus /> Add 
                </button>
              )}
            </div>

            {loading ? (
              <div className="loading-container">
                <p>Loading notices...</p>
              </div>
            ) : notices.length > 0 ? (
              <div className="notices-list">
                {notices.map((notice) => (
                  <div key={notice._id} className="notice-item">
                    {/* Buttons at top right */}
                    {isAdmin && (
                      <div className="notice-actions">
                        <button
                          onClick={() => openEditNoticeModal(notice)}
                          className="icon-button"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteNotice(notice._id)}
                          className="icon-button"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    )}

                    {/* Notice content - will expand vertically */}
                    <div className="notice-content">
                      <p>{notice.content}</p>

                      <p className="notice-meta">
                      {formatDate(notice.createdAt)}
                    </p>
                    </div>

                    {/* Date at bottom left */}
                   
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-notice">
                <p>No current notices</p>
              </div>
            )}
          </div>

          {/* Events Section (75%) */}
          <div className="events-section">
            <div className="events-header">
              <h5 className="event-title1">Upcoming Events</h5>
            </div>
            {loading ? (
              <div className="loading-container">
                <p>Loading announcements...</p>
              </div>
            ) : announcements.length > 0 ? (
              <div className="events-grid">
                {" "}
                {/* Changed from horizontal-scroll-container */}
                {announcements.map((announcement) => (
                  <div key={announcement._id} className="announcement-card">
                    <div className="card-image-container">
                      <img
                        src={
                          announcement.image ||
                          "https://via.placeholder.com/350x150?text=Event"
                        }
                        alt={announcement.title}
                        className="card-image"
                        loading="lazy"
                      />
                    </div>
                    <div className="card-details">
                      <h4 className="event-title2">{announcement.title}</h4>
                      <p className="event-date">
                        {announcement.date} • {announcement.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-events">
                <p>No upcoming events currently</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notice Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        className="notice-modal"
        overlayClassName="notice-modal-overlay"
        closeTimeoutMS={200}
      >
        <h2>{currentNotice ? "Edit Notice" : "Add New Notice"}</h2>
        <textarea
          value={noticeContent}
          onChange={(e) => setNoticeContent(e.target.value)}
          placeholder="Enter notice content..."
          className="notice-textarea"
          rows={5}
        />
        <div className="modal-buttons">
          <button onClick={closeModal} className="cancel-button">
            Cancel
          </button>
          <button onClick={handleSaveNotice} className="publish-button">
            {currentNotice ? "Update Notice" : "Publish Notice"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
