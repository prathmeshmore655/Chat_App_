import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
  DialogContentText,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import api from './api';
import { QRCodeCanvas } from 'qrcode.react';
import jsQR from 'jsqr';

export default function AddContactDialog({ open, onClose, onContactAdded }) {
  const [submitting, setSubmitting] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [manualPrivateKey, setManualPrivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanAnimationRef = useRef(null);

  // Fetch logged-in user private key when dialog opens
  useEffect(() => {
    if (open) {
      (async () => {
        try {
          const res = await api.get('/user/private-key/');
          if (res.data && res.data.privateKey) {
            console.log('Fetched private key:', res);
            setPrivateKey(res.data.privateKey);
          } else {
            setPrivateKey('demo-private-key');
          }
        } catch {
          setPrivateKey('demo-private-key');
        }
      })();
    } else {
      // Reset when dialog closes
      setManualPrivateKey('');
      setScanning(false);
      stopScan();
    }
  }, [open]);

  // Start scanning QR via camera
  const startScan = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera API not supported in this browser');
      return;
    }
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', true); // iOS support
        videoRef.current.play();
        scanAnimationRef.current = requestAnimationFrame(tick);
      }
    } catch (err) {
      alert('Could not access camera: ' + err.message);
      setScanning(false);
    }
  };

  // Stop camera scanning
  const stopScan = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (scanAnimationRef.current) {
      cancelAnimationFrame(scanAnimationRef.current);
    }
    setScanning(false);
  };

  // Scan QR from video frame
  const tick = () => {
    if (!videoRef.current || !canvasRef.current) {
      scanAnimationRef.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        setManualPrivateKey(code.data);
        stopScan();
        return; // stop scanning after detection
      }
    }
    scanAnimationRef.current = requestAnimationFrame(tick);
  };

  // Handle QR image upload (static image)
  const handleQRUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          setManualPrivateKey(code.data);
        } else {
          alert('No QR code detected.');
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!manualPrivateKey.trim()) {
      alert('Please enter or scan a private key.');
      return;
    }

    const formData = new FormData();
    formData.append('privateKey', manualPrivateKey.trim());

    setSubmitting(true);
    try {
      await api.post('/contacts/', formData);
      onContactAdded();
      onClose();
    } catch (error) {
      alert('Failed to add contact');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => { stopScan(); onClose(); }} fullWidth>
      <DialogTitle>Add New Contact</DialogTitle>

      <DialogContent>

        <Box mt={1}>
          <TextField
            label="Enter Other's Private Key"
            fullWidth
            value={manualPrivateKey}
            onChange={(e) => setManualPrivateKey(e.target.value)}
          />
        </Box>

        <Box mt={2} display="flex" gap={2} flexWrap="wrap">
          <Button variant="outlined" component="label" disabled={scanning}>
            Upload QR
            <input hidden type="file" accept="image/*" onChange={handleQRUpload} />
          </Button>

          {!scanning ? (
            <Button variant="outlined" onClick={startScan}>
              Scan QR via Camera
            </Button>
          ) : (
            <Button variant="outlined" color="error" onClick={stopScan}>
              Stop Scanning
            </Button>
          )}
        </Box>

        {scanning && (
          <Box mt={2} textAlign="center">
            <video
              ref={videoRef}
              style={{ width: '100%', maxHeight: 300, borderRadius: 8 }}
              muted
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <DialogContentText mt={1}>Point your camera to a QR code</DialogContentText>
          </Box>
        )}

        <Box mt={3} display="flex" alignItems="center">
          <Typography variant="subtitle1" mr={1}>Your Private Key & QR</Typography>
          <Tooltip title={showKey ? 'Hide Key' : 'Show Key'}>
            <IconButton onClick={() => setShowKey(!showKey)}>
              {showKey ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </Tooltip>
        </Box>

        <Collapse in={showKey} timeout={300}>
          <Box mt={1}>
            <Typography
              sx={{
                wordBreak: 'break-word',
                bgcolor: '#f5f5f5',
                px: 2,
                py: 1,
                borderRadius: 1,
                fontSize: '0.9rem',
                mb: 1,
              }}
            >
              {privateKey}
            </Typography>
            <Box sx={{ p: 2, border: '1px dashed grey', width: 'fit-content', transition: 'all 0.3s ease' }}>
              <QRCodeCanvas value={privateKey} size={128} />
            </Box>
          </Box>
        </Collapse>

      </DialogContent>

      <DialogActions>
        <Button onClick={() => { stopScan(); onClose(); }} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
