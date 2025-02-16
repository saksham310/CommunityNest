import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import JoditEditor from "jodit-react";
import Sidebar from "../Sidebar/sidebar.jsx";
import "./DocumentRepository.css";

const EditorPage = () => {
  const { id, department } = useParams();
  const [documentTitle, setDocumentTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const backendUrl = "http://localhost:5001/api/document";

  const editor = useRef(null); // Create a ref for JoditEditor
  const editorContentRef = useRef(""); // Ref to store the editor content

  useEffect(() => {
    if (id) {
      setLoading(true);
      setError("");
      axios
        .get(`${backendUrl}/getDocumentById/${id}`)
        .then((res) => {
          const doc = res.data.document;
          setDocumentTitle(doc.title);
          editorContentRef.current = doc.content; // Set editor content in ref
          setIsEditing(true);
        })
        .catch((err) => {
          console.error("Error fetching document:", err);
          setError("Failed to fetch document. Please try again later.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  // Handle saving document changes
  const saveDocument = () => {
    if (!documentTitle.trim() || !editorContentRef.current.trim()) {
      alert("Title and content cannot be empty!");
      return;
    }

    const method = isEditing ? "PUT" : "POST";
    const endpoint = isEditing ? "/editDocument" : "/createDocument";

    const payload = {
      title: documentTitle,
      content: editorContentRef.current, // Use content from ref
      userId: localStorage.getItem("userId"),
      department,
      ...(isEditing && { id }),
    };

    setLoading(true);
    setError("");

    axios({
      method,
      url: `${backendUrl}${endpoint}`,
      data: payload,
    })
      .then((res) => {
        if (res.data.success) {
          alert(res.data.message);
          navigate(`/department/${department}/documents`);
        }
      })
      .catch((err) => {
        console.error("Error saving document:", err);
        setError("An error occurred while saving the document.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const editorConfig = {
    readonly: false,
    height: 400,
    tabIndex: 0, // Ensure the editor is focusable
    autofocus: false,
  };

  return (
    <div className="document-repository-page">
      <Sidebar />
      <div className="document-repository-content">
        <h2>{isEditing ? "Edit Document" : "Create New Document"}</h2>

        {error && <div className="error-message">{error}</div>}

        <input
          type="text"
          className="title-input"
          placeholder="Enter document title"
          value={documentTitle}
          onChange={(e) => setDocumentTitle(e.target.value)}
        />

        <JoditEditor
          ref={editor}
          value={editorContentRef.current} // Use the ref value
          onChange={(newContent) => {
            editorContentRef.current = newContent; // Update content in ref
          }}
          config={editorConfig}
          onBlur={() => {
            // Optional: Save content to state when editor loses focus
            // setEditorContent(editorContentRef.current);
          }}
        />

        <button className="save-btn" onClick={saveDocument} disabled={loading}>
          {loading
            ? "Saving..."
            : isEditing
            ? "Save Changes"
            : "Create Document"}
        </button>

        <button
          className="cancel-btn"
          onClick={() => navigate(`/department/${department}/documents`)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default EditorPage;
