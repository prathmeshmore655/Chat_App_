// import { IconButton, CircularProgress } from '@mui/material';
// import { styled } from '@mui/system';
// import AttachFileIcon from '@mui/icons-material/AttachFile';
// import { motion } from 'framer-motion';
// import { useRef, useState } from 'react';

// const HiddenInput = styled('input')({
//   display: 'none',
// });

// const FileUploadButton = ({ disabled, onFileUpload }) => {
//   const inputRef = useRef();
//   const [uploading, setUploading] = useState(false);

//   const handleFileChange = async (event) => {
//     const file = event.target.files[0];
//     if (file && onFileUpload) {
//       setUploading(true);
//       try {
//         await onFileUpload(file);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setUploading(false);
//       }
//     }
//   };

//   return (
//     <>
//       <HiddenInput
//         accept="*"
//         type="file"
//         ref={inputRef}
//         onChange={handleFileChange}
//       />
//       <motion.div
//         whileHover={{ scale: 1.1 }}
//         whileTap={{ scale: 0.95 }}
//         style={{ display: 'flex' }}
//       >
//         <IconButton
//           component="span"
//           disabled={disabled || uploading}
//           onClick={() => inputRef.current?.click()}
//           sx={{
//             color: '#fff',
//             bgcolor: '#555',
//             '&:hover': { bgcolor: '#777' },
//             flexShrink: 0,
//           }}
//         >
//           {uploading ? <CircularProgress size={20} color="inherit" /> : <AttachFileIcon />}
//         </IconButton>
//       </motion.div>
//     </>
//   );
// };

// export default FileUploadButton;
