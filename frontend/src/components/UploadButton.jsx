import { useRef, useState } from "react";
import "../assets/css/UploadButton.css";

const MAX_SIZE_BYTES = 1024 * 1024;

function UploadButton() {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError] = useState("");

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imagenes.");
      setFileInfo(null);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("El archivo supera 1MB.");
      setFileInfo(null);
      return;
    }
    setError("");
    setFileInfo({
      name: file.name,
      sizeKb: Math.round(file.size / 1024),
    });
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`upload-dropzone ${isDragging ? "is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          inputRef.current?.click();
        }
      }}
    >
      <div className="upload-dropzone-title">Subir imagen</div>
      <div className="upload-dropzone-subtitle">
        Arrastra y soltá una imagen o hacé click (máx 1MB)
      </div>
      {fileInfo ? (
        <div className="upload-dropzone-info">
          {fileInfo.name} · {fileInfo.sizeKb} KB
        </div>
      ) : null}
      {error ? <div className="upload-dropzone-error">{error}</div> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

export default UploadButton;
