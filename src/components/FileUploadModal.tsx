import React, { useRef, useState } from 'react';
import { FaUpload, FaFile } from 'react-icons/fa';

interface FileUploadModalProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onFileUpload: (file: File) => Promise<void>;
  onClose: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  selectedFile,
  onFileSelect,
  onFileUpload,
  onClose,
  isUploading = false,
  uploadProgress = 0,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <dialog id="file-upload-modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-base-content">Upload File</h3>
        <div className="py-4">
          {selectedFile ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-base-content">
                <FaFile className="w-8 h-8" />
                <div>
                  <div className="font-medium">{selectedFile.name}</div>
                  <div className="text-sm text-base-content/70">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
              <button
                className="btn btn-primary w-full text-primary-content"
                onClick={() => onFileUpload(selectedFile)}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Send File'}
              </button>
            </div>
          ) : (
            <form
              className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-colors ${
                dragActive
                  ? "border-primary bg-primary/10"
                  : "border-base-content/20 hover:border-primary"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={handleChange}
              />
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FaUpload className="w-10 h-10 mb-3 text-base-content/70" />
                <p className="mb-2 text-sm text-base-content">
                  <span className="font-semibold">Click to upload</span> or drag and
                  drop
                </p>
                <p className="text-xs text-base-content/70">
                  Any file type up to 50MB
                </p>
              </div>
            </form>
          )}

          {isUploading && (
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-base-content">
                  Uploading...
                </span>
                <span className="text-sm font-medium text-base-content">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-base-200 rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-action">
          <form method="dialog">
            <button 
              className="btn" 
              onClick={onClose}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Close'}
            </button>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};

export default FileUploadModal; 