import React, { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, ToggleButton, ToggleButtonGroup, Stack, Typography, Paper, Box, IconButton, Avatar, LinearProgress, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';

export default function FileUploadDialog({ open, onClose, onUpload }) {
  const [type, setType] = useState('file');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState('');
  const [recordingProgress, setRecordingProgress] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleTypeChange = (_, newType) => {
    if (newType) setType(newType);
    setFile(null);
    setAudioBlob(null);
    setAudioURL('');
    setRecording(false);
    setRecordingProgress(0);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // --- Audio Recording Logic ---
  const handleStartRecording = async () => {
    setAudioBlob(null);
    setAudioURL('');
    setRecordingProgress(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new window.MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
      };
      mediaRecorderRef.current.start();
      setRecording(true);

      // Optional: show a progress bar for up to 60 seconds
      let seconds = 0;
      const interval = setInterval(() => {
        seconds += 1;
        setRecordingProgress((seconds / 60) * 100);
        if (seconds >= 60) {
          handleStopRecording();
          clearInterval(interval);
        }
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
          clearInterval(interval);
        }
      }, 1000);
    } catch (err) {
      alert('Microphone access denied or not available.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setRecordingProgress(0);
    }
  };

  const handleUpload = () => {
    if (type === 'audio' && audioBlob) {
      const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type });
      onUpload({ file: audioFile, type, message });
    } else if (type === 'file' && file) {
      onUpload({ file, type, message });
    }
    setFile(null);
    setMessage('');
    setType('file');
    setAudioBlob(null);
    setAudioURL('');
    setRecording(false);
    setRecordingProgress(0);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#181a20',
          borderRadius: 3,
          color: '#fff',
          border: '2.5px solid #e91e63',
          boxShadow: '0 0 32px #e91e6355',
          m: isMobile ? 1 : 3,
        }
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: '#23242b',
          color: '#e91e63',
          fontWeight: 700,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          borderBottom: '1.5px solid #e91e63',
          px: isMobile ? 2 : 4,
          py: isMobile ? 1.5 : 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <InsertDriveFileIcon sx={{ color: '#e91e63' }} />
          <span>Upload File or Audio</span>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          px: isMobile ? 1 : 3,
          py: isMobile ? 2 : 3,
        }}
      >
        <Stack spacing={3}>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={handleTypeChange}
            aria-label="file type"
            fullWidth
            sx={{
              bgcolor: '#23242b',
              borderRadius: 2,
              '& .Mui-selected': { bgcolor: '#e91e63', color: '#fff' },
              '& .MuiToggleButton-root': {
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: isMobile ? 14 : 16,
                px: isMobile ? 1 : 3,
                py: isMobile ? 1 : 1.5,
              }
            }}
          >
            <ToggleButton value="file">
              <InsertDriveFileIcon sx={{ mr: 1 }} /> File
            </ToggleButton>
            <ToggleButton value="audio">
              <AudiotrackIcon sx={{ mr: 1 }} /> Audio
            </ToggleButton>
          </ToggleButtonGroup>

          {type === 'file' && (
            <Paper
              elevation={2}
              sx={{
                bgcolor: '#23242b',
                p: isMobile ? 1.5 : 2.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                border: '1.5px solid #e91e63',
              }}
            >
              <Avatar sx={{ bgcolor: '#e91e63', width: 40, height: 40 }}>
                <InsertDriveFileIcon />
              </Avatar>
              <Button
                variant="contained"
                component="label"
                sx={{
                  bgcolor: '#e91e63',
                  color: '#fff',
                  '&:hover': { bgcolor: '#c2185b' },
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: isMobile ? 13 : 15,
                  px: isMobile ? 2 : 3,
                  py: isMobile ? 1 : 1.5,
                  minWidth: 110,
                }}
              >
                Select File
                <input
                  type="file"
                  accept="*"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              {file && (
                <Typography sx={{ color: '#fff', ml: 2, wordBreak: 'break-all', fontSize: isMobile ? 12 : 14 }}>
                  {file.name}
                </Typography>
              )}
            </Paper>
          )}

          {type === 'audio' && (
            <Paper
              elevation={2}
              sx={{
                bgcolor: '#23242b',
                p: isMobile ? 1.5 : 2.5,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                border: '1.5px solid #e91e63',
              }}
            >
              <Box>
                <IconButton
                  onClick={recording ? handleStopRecording : handleStartRecording}
                  sx={{
                    bgcolor: recording ? '#e91e63' : '#444',
                    color: '#fff',
                    '&:hover': { bgcolor: '#c2185b' },
                    borderRadius: 2,
                    width: 56,
                    height: 56,
                    border: '2px solid #e91e63',
                  }}
                >
                  {recording ? <StopIcon fontSize="large" /> : <MicIcon fontSize="large" />}
                </IconButton>
              </Box>
              {recording && (
                <Box width="100%" mt={1}>
                  <LinearProgress
                    variant="determinate"
                    value={recordingProgress}
                    sx={{
                      height: 8,
                      borderRadius: 5,
                      bgcolor: '#181a20',
                      '& .MuiLinearProgress-bar': { bgcolor: '#e91e63' }
                    }}
                  />
                  <Typography sx={{ color: '#e91e63', fontSize: 12, mt: 1, textAlign: 'center' }}>
                    Recording... (max 60s)
                  </Typography>
                </Box>
              )}
              {audioURL && (
                <audio controls src={audioURL} style={{ marginTop: 16, width: '100%' }} />
              )}
              {audioBlob && (
                <Typography sx={{ color: '#fff', fontSize: 14 }}>
                  Audio ready to upload
                </Typography>
              )}
            </Paper>
          )}

          <TextField
            label="Optional message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            sx={{
              bgcolor: '#23242b',
              borderRadius: 2,
              input: { color: '#fff' },
              label: { color: '#e91e63' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#e91e63' },
                '&:hover fieldset': { borderColor: '#e91e63' },
                '&.Mui-focused fieldset': { borderColor: '#e91e63' },
              },
              fontSize: isMobile ? 13 : 15,
            }}
            InputLabelProps={{
              style: { color: '#e91e63' }
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          bgcolor: '#23242b',
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
          borderTop: '1.5px solid #e91e63',
          px: isMobile ? 1 : 3,
          py: isMobile ? 1 : 2,
        }}
      >
        <Button onClick={onClose} sx={{ color: '#fff', fontWeight: 600, fontSize: isMobile ? 13 : 15 }}>Cancel</Button>
        <Button
          onClick={handleUpload}
          disabled={type === 'file' ? !file : !audioBlob}
          variant="contained"
          sx={{
            bgcolor: '#e91e63',
            color: '#fff',
            fontWeight: 600,
            borderRadius: 2,
            fontSize: isMobile ? 13 : 15,
            px: isMobile ? 2 : 4,
            py: isMobile ? 1 : 1.5,
            boxShadow: '0 0 8px #e91e6355',
            '&:hover': { bgcolor: '#c2185b' }
          }}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}