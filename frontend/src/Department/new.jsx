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
  const [files, setFiles] = useState([]); // State for uploaded files
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const backendUrl = "http://localhost:5001/api/document";
  const fileBackendUrl = "http://localhost:5001/api/file"; // File backend URL
  const navigate = useNavigate(); // Add this inside your component
  const [selectedFile, setSelectedFile] = useState(null); // State for file
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);


  // Get userId from localStorage
  const userId = localStorage.getItem("userId");


const openUploadModal = () => setIsUploadModalOpen(true);
const closeUploadModal = () => setIsUploadModalOpen(false);


  useEffect(() => {
    if (!userId) {
      setErrorMessage("User is not logged in.");
      navigate("/login"); // Redirect to login page if not logged in
      return;
    }
  
  //Fetch Documents by Department and User
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

// Fetch uploaded files by department and user
   axios
   .get(`${fileBackendUrl}/getFilesByDepartmentAndUser/${department}/${userId}`)
   .then((res) => {
     if (res.data.files.length === 0) {
       console.log("No files uploaded yet.");
       setFiles([]);
     } else {
       setFiles(res.data.files);
     }
   })
   .catch(() => {
     console.error("Error fetching files.");
     setFiles([]);
   });

  }, [department, userId]);

   

//delete document
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

  // Delete file
  const deleteFile = (id) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      axios
        .delete(`${fileBackendUrl}/deleteFile`, { data: { id } })
        .then((res) => {
          if (res.data.success) {
            alert(res.data.message);
            setFiles((prevFiles) => prevFiles.filter((file) => file._id !== id));
          } else {
            alert(res.data.message);
          }
        })
        .catch(() => {
          alert("Failed to delete file.");
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
 

  // Handle file selection
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  // Handle file upload
  const uploadFile = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }
  
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("filename", selectedFile.name); // Ensure filename is included
    formData.append("fileType", selectedFile.type); // Ensure fileType is included
    formData.append("department", department); // Ensure department is included
    formData.append("userId", userId); // Ensure userId is included
  
    // Debugging: Log what is being sent
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }
  
    try {
      const res = await axios.post("http://localhost:5001/api/file/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      alert(res.data.message);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file.");
    }
  };
  
  
  return (
    <div className="document-repository-page">
      <Sidebar />
      <div className="document-repository-content">
        <h2 className="document-repository-title">Document Repository</h2>
        <h4>Manage your documents: create, edit, or delete them easily.</h4>

        {/* Display error message if any */}
        {errorMessage && <p className="error-message">{errorMessage}</p>}

 {/* Container to align buttons horizontally */}
<div className="top-action-section">
  {/* Button to create a new document */}
  <Link to={`/department/${department}/documents/create`} className="create-new-btn">
    Create New Document
  </Link>

  {/* Upload File Button */}
  <button onClick={() => setShowUploadModal(true)}>Upload File</button>

</div>



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
      
             {/* Files Section */}
             <h3>Uploaded Files</h3>
        <div className="document-cards">
          {files.map((file) => (
            <div key={file._id} className="document-card">
              <div className="document-info">
                <h3>{file.filename}</h3>
                <p>Type: {file.fileType}</p>
                <p>Uploaded: {new Date(file.uploadedAt).toDateString()}</p>
              </div>
              <div className="button-container">
                <a href={`http://localhost:5001/${file.filePath}`} target="_blank" rel="noopener noreferrer" className="view-btn">
                  View
                </a>
              </div>
              <button className="delete-btn" onClick={() => deleteFile(file._id)}>
                Delete
              </button>
            </div>
          ))}
        </div>

      </div>


      {showUploadModal && (
  <div className="modal">
    <h2>Upload File</h2>
    <input 
      type="file" 
      onChange={(e) => setSelectedFile(e.target.files[0])}
    />
    <button onClick={() => alert(`File ${selectedFile?.name} selected!`)}>Upload</button>
    <button onClick={() => setShowUploadModal(false)}>Close</button>
  </div>
)}



    </div>
  );
};

export default DocumentRepositoryPage;