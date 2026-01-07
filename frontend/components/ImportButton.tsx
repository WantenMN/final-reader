'use client';

import { useRef, useState } from 'react';
import { API_URL } from "@/lib/constants";

interface ImportButtonProps {
  onBookImported: () => void;
}

export default function ImportButton({ onBookImported }: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      // Assuming the backend responds with success
      console.log('Upload successful');
      onBookImported(); // Refresh the book list
    } catch (error) {
      console.error('Error uploading file:', error);
      // Handle upload error (e.g., show a notification)
    } finally {
      setIsUploading(false);
      // Reset file input
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".epub"
        disabled={isUploading}
      />
      <button
        onClick={handleClick}
        disabled={isUploading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
      >
        {isUploading ? 'Uploading...' : 'Import Book'}
      </button>
    </>
  );
}
