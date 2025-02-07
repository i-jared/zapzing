import React from 'react';
import { FaFile } from 'react-icons/fa';

interface FileUploadModalProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onFileUpload: (file: File) => Promise<void>;
  onClose: () => void;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  selectedFile,
  onFileSelect,
  onFileUpload,
  onClose
}) => {
  return (
    <dialog id="file-upload-modal" className="modal">
      <div className="modal-box bg-base-100">
        <h3 className="font-bold text-lg text-base-content mb-4">Upload File</h3>
        <div className="form-control">
          {selectedFile ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-base-content">
                <FaFile className="w-8 h-8" />
                <div>
                  <div className="font-medium">{selectedFile.name}</div>
                  <div className="text-sm text-base-content/70">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
              <button 
                className="btn btn-primary w-full text-primary-content"
                onClick={() => onFileUpload(selectedFile)}
              >
                Send File
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <label className="w-full cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileSelect(file);
                  }}
                />
                <div className="border-2 border-dashed border-base-content/20 rounded-lg p-8 text-center hover:border-base-content/40 transition-colors">
                  <FaFile className="w-12 h-12 mx-auto mb-4 text-base-content/50" />
                  <div className="font-medium text-base-content">Click to select a file</div>
                  <div className="text-sm text-base-content/70">or drag and drop</div>
                </div>
              </label>
            </div>
          )}
        </div>
        <div className="modal-action">
          <form method="dialog">
            <button 
              className="btn btn-ghost text-base-content" 
              onClick={onClose}
            >
              Cancel
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