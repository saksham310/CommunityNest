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
  // Get userId and role from localStorage
  const userId = localStorage.getItem("userId");
  const userRole = localStorage.getItem("status"); // "community" or "member"

  const [adminId, setAdminId] = useState(null);
  useEffect(() => {
    if (!userId) {
      setErrorMessage("User is not logged in.");
      navigate("/login");
      return;
    }

    // If the user is a "member", fetch adminId first
    if (userRole === "member") {
      axios
        .get(`http://localhost:5001/api/users/getCommunityDetails/${userId}`)
        .then((res) => {
          if (res.data && res.data.communityDetails.length > 0) {
            const adminIdFromDB = res.data.communityDetails[0].adminId;
            setAdminId(adminIdFromDB);
            console.log("Fetched adminId for member:", adminIdFromDB);

            // Fetch documents and files after adminId is set
            fetchDocumentsAndFiles(department, adminIdFromDB);
          } else {
            setErrorMessage("Failed to retrieve admin details.");
          }
        })
        .catch((err) => {
          console.error("Error fetching adminId:", err);
          setErrorMessage("Failed to load community details.");
        });
    } else {
      // Fetch documents and files for community/admin role
      fetchDocumentsAndFiles(department, userId);
    }
  }, [department, userId, userRole]);

  

  // Function to fetch both documents and files
  const fetchDocumentsAndFiles = (dept, fetchUserId) => {
    let noDocuments = false;
    let noFiles = false;

    console.log("Fetching documents for user:", fetchUserId); // Debugging

    // Fetch documents
    axios
      .get(
        `${backendUrl}/getDocumentsByDepartmentAndUser/${dept}/${fetchUserId}`
      )
      .then((res) => {
        if (res.data.documents.length === 0) {
          noDocuments = true;
        }
        setDocuments(res.data.documents);
        console.log("Documents fetched:", res.data.documents); // Debugging
      })
      .catch((err) => {
        noDocuments = true;
        console.error("Error fetching documents:", err);
      });

  // Fetch files
axios
.get(`${fileBackendUrl}/getFilesByDepartmentAndUser/${dept}/${fetchUserId}`)
.then((res) => {
  if (res.data.success) {
    setFiles(
      res.data.files.map((file) => ({
        ...file,
        filePath: `http://localhost:5001/uploads/${file.filePath}`, // Adjust file path
      }))
    );
    console.log("Files fetched:", res.data.files);
  } else {
    console.error("No files found or error in response", res.data.message);
  }
})
.catch((err) => {
  console.error("Error fetching files:", err.response ? err.response.data : err.message);
});


// Handle empty repository
if (noDocuments && noFiles) {
  setErrorMessage("Repository empty.");
} else {
  setErrorMessage(null);
}
};
  const deleteDocument = (id) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      axios
        .delete(`${backendUrl}/deleteDocument/${id}`) // <-- Fix: Pass id in URL
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
        .delete(`${fileBackendUrl}/deleteFile/${id}`)
        .then((res) => {
          if (res.data.success) {
            setFiles(files.filter((file) => file._id !== id)); // Remove from state
          }
        })
        .catch((err) => {
          console.error("Error deleting file:", err);
        });
    }
  };
  

  const handleViewClick = (file) => {
    if (!file?._id) {
      alert("Invalid file selected.");
      return;
    }
    window.open(`http://localhost:5001/api/file/view/${file._id}`, "_blank");
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
