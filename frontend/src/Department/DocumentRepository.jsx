import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Sidebar from "../Sidebar/sidebar.jsx";
import Modal from "./Modal.jsx";
import "./DocumentRepository.css";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom"; // Import useNavigate at the top

const DocumentRepositoryPage = () => {
  const { department } = useParams();
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const backendUrl = "http://localhost:5001/api/document";
  const navigate = useNavigate(); // Add this inside your component

  // Get userId from localStorage
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) {
      setErrorMessage("User is not logged in.");
      navigate("/login"); // Redirect to login page if not logged in
      return;
    }
  
  
    axios
      .get(`${backendUrl}/getDocumentsByDepartmentAndUser/${department}/${userId}`)
      .then((res) => {
        console.log("Documents fetched:", res.data);
        
        if (res.data.documents.length === 0) {
          setErrorMessage("Repository empty.");
          setDocuments([]); // Ensure documents array is empty
        } else {
          setDocuments(res.data.documents);
          setErrorMessage(null); // Clear error message if documents exist
        }
      })
      .catch((err) => {
        console.error("Error fetching documents:", err);
        setErrorMessage("Failed to load documents. Please try again later.");
        setDocuments([]); // Clear state on error
      });
  }, [department, userId]);

  

  const deleteDocument = (id) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      axios
        .delete(`${backendUrl}/deleteDocument`, { data: { id } })
        .then((res) => {
          const data = res.data;
          if (data.success) {
            alert(data.message);
            setDocuments((prevDocs) => prevDocs.filter((doc) => doc._id !== id));
          } else {
            alert(data.message);
          }
        })
        .catch((err) => {
          console.error("Error deleting document:", err);
          alert("Failed to delete document.");
        });
    }
  };

  const viewDocument = (id) => {
    console.log("Fetching document with ID:", id);
    axios
      .get(`${backendUrl}/getDocumentById/${id}`)
      .then((res) => {
        console.log("Document fetched:", res.data);
        setSelectedDocument(res.data); // Store the fetched document
        setIsModalOpen(true); // Open modal
      })
      .catch((err) => {
        console.error("Error fetching document details:", err);
        alert("Failed to load document.");
      });
  };
  
  

  return (
    <div className="document-repository-page">
      <Sidebar />
      <div className="document-repository-content">
        <h2 className="document-repository-title">Document Repository</h2>
        <h4>Manage your documents: create, edit, or delete them easily.</h4>

        {/* Display error message if any */}
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {/* Button to create a new document */}
        <Link to={`/department/${department}/documents/create`} className="create-new-btn">
          Create New Document
        </Link>

        {/* Display message if no documents are available */}
        {/* {documents.length === 0 ? (
          <p>No documents available for this department.</p>
        ) : ( */}
          <div className="document-cards">
            {documents.map((doc) => (
              <div key={doc._id} className="document-card">
                <div className="document-info">
                  <h3>{doc.title}</h3>
                  <p>Last updated: {new Date(doc.updatedAt).toDateString()}</p>
                </div>

                <div className="button-container">
                  {/* <button
                    className="view-btn"
                    onClick={() => viewDocument(doc._id)}
                  >
                    View
                  </button> */}
                  <Link to={`/department/${department}/documents/view/${doc._id}`} className="view-btn">
                  View
                  </Link>

                  <Link to={`/department/${department}/documents/edit/${doc._id}`} className="edit-btn">
                    Edit
                  </Link>
                </div>

                <button
                  className="delete-btn"
                  onClick={() => deleteDocument(doc._id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
      
      </div>

    {/* Modal component for viewing document */}
    {isModalOpen && selectedDocument && (
      <Modal document={selectedDocument} closeModal={() => setIsModalOpen(false)} />
    )}

    </div>
  );
};

export default DocumentRepositoryPage;
