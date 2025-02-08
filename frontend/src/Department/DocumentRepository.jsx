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
  const [, setIsUploadModalOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileContent, setFileContent] = useState(null); // New state for file content
  // Get userId from localStorage
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) {
      setErrorMessage("User is not logged in.");
      navigate("/login"); // Redirect to login page if not logged in
      return;
    }

    //Fetch Documents by Department and User
    axios
      .get(
        `${backendUrl}/getDocumentsByDepartmentAndUser/${department}/${userId}`
      )
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
    console.log("Fetched files:", res.data.files); // Debugging line
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
        .delete(`${fileBackendUrl}/deleteFile/${id}`)
        .then((res) => {
          const data = res.data;
          if (data.success) {
            alert(data.message);
            setDocuments((prevDocs) =>
              prevDocs.filter((doc) => doc._id !== id)
            );
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

  //delete file
  const deleteFile = (id) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      axios
        .delete(`${fileBackendUrl}/deleteFile/${id}`) // Send ID in URL
        .then((res) => {
          if (res.data.success) {
            alert(res.data.message);
            // Refresh file list after deletion
            axios
              .get(
                `${fileBackendUrl}/getFilesByDepartmentAndUser/${department}/${userId}`
              )
              .then((res) => {
                setFiles(res.data.files); // Update the state with new file list
              })
              .catch(() => {
                console.error("Error fetching files.");
                setFiles([]);
              });
          } else {
            alert(res.data.message);
          }
        })
        .catch(() => {
          alert("Failed to delete file.");
        });
    }
  };

  // Handle viewing the file in the modal
  //  const handleViewClick = (file) => {
  //   setFileContent({
  //     filename: file.filename,
  //     fileType: file.fileType,
  //     filePath: file.filePath,
  //   });
  //   setIsModalOpen(true);
  // };
  const handleViewClick = (file) => {
    if (!file || !file._id) {
      console.error("Invalid file object:", file);
      return;
    }
    const pdfUrl = `http://localhost:5001/api/file/view/${file._id}`;
    console.log("Opening file:", pdfUrl);
    window.open(pdfUrl, "_blank");
  };
  
  
  
  
  // Handle file selection

  // Handle file upload
  const uploadFile = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    const allowedExtensions = ["doc", "docx", "pdf"];
    const fileExtension = selectedFile.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      alert("Only .doc, .docx, and .pdf files are allowed.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("filename", selectedFile.name);
    formData.append("fileType", selectedFile.type);
    formData.append("department", department);
    formData.append("userId", userId);

    try {
      const res = await axios.post(
        "http://localhost:5001/api/file/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      alert(res.data.message);

      const fileRes = await axios.get(
        `${fileBackendUrl}/getFilesByDepartmentAndUser/${department}/${userId}`
      );
      setFiles(fileRes.data.files);

      setShowUploadModal(false);
      setSelectedFile(null);
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

        {/* Display error message if any */}
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {/* Container to align buttons horizontally */}
        <div className="top-action-section">
          {/* Button to create a new document */}
          <Link
            to={`/department/${department}/documents/create`}
            className="create-new-btn"
          >
            Create
          </Link>

          {/* Upload File Button */}
          <button onClick={() => setShowUploadModal(true)}>Upload</button>
        </div>

        <h3>Created Files</h3>
        <div className="document-cards">
          {documents.map((doc) => (
            <div key={doc._id} className="document-card">
              <div className="document-info">
                <h4>{doc.title}</h4>
                <p>Last updated: {new Date(doc.updatedAt).toDateString()}</p>
              </div>

              <div className="button-container">
                {/* <button
                    className="view-btn"
                    onClick={() => viewDocument(doc._id)}
                  >
                    View
                  </button> */}
                <Link
                  to={`/department/${department}/documents/view/${doc._id}`}
                  className="view-btn"
                >
                  View
                </Link>

                <Link
                  to={`/department/${department}/documents/edit/${doc._id}`}
                  className="edit-btn"
                >
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
                <h4>{file.filename}</h4>
                {/* <p>Type: {file.fileType}</p> */}
                <p>Uploaded: {new Date(file.uploadedAt).toDateString()}</p>
              </div>
              <div className="button-container">
              <button
                  className="view-btn"
                  onClick={() => handleViewClick(file)}
                >
                  View
                </button>
              </div>
              <button
                className="delete-btn"
                onClick={() => deleteFile(file._id)}
              >
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
            accept=".pdf"
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />

          {/* <button onClick={() => alert(`File ${selectedFile?.name} selected!`)}>Upload</button> */}
          <button className="upload-btn" onClick={uploadFile}>
            Upload File
          </button>

          <button onClick={() => setShowUploadModal(false)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default DocumentRepositoryPage;
