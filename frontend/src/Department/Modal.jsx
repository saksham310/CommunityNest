import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./Modal.css";
import Sidebar from "../Sidebar/sidebar.jsx";
import { jsPDF } from "jspdf";

const Modal = () => {
  const { id } = useParams(); // Get document ID from URL
  const [docData, setDocData] = useState(null);
  const backendUrl = "http://localhost:5001/api/document";

  useEffect(() => {
    if (id) {
      axios
        .get(`${backendUrl}/getDocumentById/${id}`)
        .then((res) => {
          console.log("Fetched document:", res.data); // Debugging log
          setDocData(res.data.document || res.data); // Adjust based on API structure
        })
        .catch((err) => {
          console.error("Error fetching document:", err);
        });
    }
  }, [id]);

  const downloadFile = (type) => {
    if (!docData || !docData.content) return;

    const stripHtmlTags = (html) => {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      return tempDiv.textContent || tempDiv.innerText || "No content available";
    };

    const fileContent = stripHtmlTags(docData.content);

    if (type === "doc") {
      const file = new Blob([fileContent], { type: "application/msword" });
      const element = document.createElement("a");
      element.href = URL.createObjectURL(file);
      element.download = `${docData.title || "document"}.doc`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else if (type === "pdf") {
      const doc = new jsPDF();
      doc.text(fileContent, 10, 10);
      doc.save(`${docData.title || "document"}.pdf`);
    }
  };

  if (!docData) return <p>Loading document...</p>;

  return (
    <div className="document-view">
      <Sidebar />
      <h2>{docData.title}</h2>
      <div className="document-content">
        {docData.content ? (
          <div dangerouslySetInnerHTML={{ __html: docData.content }}></div>
        ) : (
          <p>No content available</p>
        )}
      </div>
      <div className="document-actions">
        <button onClick={() => downloadFile("doc")}>Download as DOC</button>
        <button onClick={() => downloadFile("pdf")}>Download as PDF</button>
      </div>
    </div>
  );
};

export default Modal;
