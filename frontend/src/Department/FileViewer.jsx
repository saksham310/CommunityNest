import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import Sidebar from "../Sidebar/sidebar.jsx";

const FileViewer = () => {
  const { filename, fileType } = useParams(); // Get filename and fileType from URL
  const [fileContent, setFileContent] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const fetchFileContent = async () => {
      try {
        // URL to fetch the file
        const fileUrl = `http://localhost:5001/api/file/view/${filename}`;

        // Check if the file is a PDF or DOCX
        if (fileType === "application/pdf") {
          // Set the fileUrl to display PDF directly
          setFileContent(fileUrl);
        } else if (
          fileType === "application/msword" ||
          fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          // Fetch DOCX content as text (if it's a DOCX file)
          const response = await axios.get(fileUrl);
          setFileContent(response.data.content); // Assuming 'content' is the text content extracted from the DOCX file
        } else {
          setErrorMessage("Unsupported file type");
        }
      } catch (error) {
        console.error("Error fetching file:", error);
        setErrorMessage("Error fetching file. Please try again later.");
      }
    };

    fetchFileContent();
  }, [filename, fileType]); // Dependency array to fetch data on file or type change

  return (
    <div className="file-viewer">
      <Sidebar />
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <h2>File Viewer</h2>
      {fileContent ? (
        <div className="file-content">
          {fileType === "application/pdf" ? (
            // Display PDF directly using the fileUrl
            <embed src={fileContent} type="application/pdf" width="100%" height="600px" />
          ) : (
            <pre>{fileContent}</pre> // Display DOCX content as raw text
          )}
        </div>
      ) : (
        <p>Loading file...</p>
      )}
    </div>
  );
};

export default FileViewer;
