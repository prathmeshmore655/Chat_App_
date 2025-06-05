import { useState } from 'react';
import api from './api'; // Assuming api.js is in the same directory
import { useSnackbar } from 'notistack';

export default function useFileUpload({ selectedContact, onUploadSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const handleFileUpload = async (file) => {
    if (!selectedContact) {
      enqueueSnackbar('Please select a contact to send a file.', { variant: 'warning' });
      return;
    }
    if (!file) {
      enqueueSnackbar('No file selected.', { variant: 'warning' });
      return;
    }

    // Basic file validations
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'video/mp4', 'audio/mpeg'];
    const maxSizeMB = 25; // Increased max size
    if (!allowedTypes.includes(file.type)) {
      enqueueSnackbar(`Unsupported file type: ${file.type}. Allowed: PNG, JPEG, GIF, PDF, MP4, MP3.`, { variant: 'warning' });
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      enqueueSnackbar(`File must be under ${maxSizeMB}MB. Current size: ${(file.size / (1024*1024)).toFixed(2)}MB`, { variant: 'warning' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    // formData.append('receiver', selectedContact.id); // Assuming your backend needs receiver ID

    setIsUploading(true);
    setUploadError('');
    try {
      // Adjust the endpoint as per your API structure
      const response = await api.post(`/messages/${selectedContact.id}/files/`, formData);

      if (response && response.data && response.data.success) { // Check nested data for success
        enqueueSnackbar('File sent successfully!', { variant: 'success' });
        if (onUploadSuccess) {
          // The backend should return enough info to construct the message
          onUploadSuccess({
            id: response.data.messageId || Date.now(), // Prefer server ID
            from: 'me', // Or get current user from a context/prop
            type: 'file',
            fileUrl: response.data.fileUrl,
            fileName: file.name,
            fileType: file.type,
            timestamp: response.data.timestamp || new Date().toISOString(),
            text: `📎 ${file.name}` // Fallback text
          });
        }
      } else {
        // Use a more specific error message if available from backend
        const errorMessage = response?.data?.message || response?.message || 'File upload failed on server.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      const message = error.response?.data?.detail || error.message || 'Failed to send file.';
      setUploadError(message);
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, uploadError, handleFileUpload };
}