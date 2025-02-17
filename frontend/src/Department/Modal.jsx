import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./Modal.css";
import Sidebar from "../Sidebar/sidebar.jsx";
import html2pdf from "html2pdf.js";

const Modal = () => {
  const { id } = useParams(); // Get document ID from URL
  const [docData, setDocData] = useState(null);
  const contentRef = useRef(null); // Reference for content to convert to PDF
  const backendUrl = "http://localhost:5001/api/document";

  useEffect(() => {
    if (id) {
      axios
        .get(`${backendUrl}/getDocumentById/${id}`)
        .then((res) => {
          console.log("Fetched document:", res.data);
          setDocData(res.data.document || res.data); // Adjust based on API structure
        })
        .catch((err) => {
          console.error("Error fetching document:", err);
        });
    }
  }, [id]);

  const downloadFile = (type) => {
    if (!docData || !docData.content) return;

    if (type === "pdf") {
      const element = contentRef.current; // Get the content to download as PDF
      const opt = {
        margin: 1,
        filename: `${docData.title || "document"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
      };

      html2pdf().from(element).set(opt).save(); // Convert and download as PDF
    } else if (type === "doc") {
      const fileContent = `<!DOCTYPE html>
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='UTF-8'></head>
      <body>${docData.content}</body>
      </html>`;

      const blob = new Blob(["\ufeff", fileContent], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${docData.title || "document"}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!docData) return <p>Loading document...</p>;

  return (
    <div className="document-view">
      <Sidebar />
      <h2>{docData.title}</h2>
      <div className="document-content" ref={contentRef}>
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
