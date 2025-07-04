import React, { useState, useRef, useEffect } from 'react';
import api from './api';
import {
  AppBar, Avatar, Box, Divider, IconButton, InputAdornment, List, ListItem,
  ListItemAvatar, ListItemText, TextField, Toolbar, Typography, Paper, Slide,
  Drawer, Fade, Grow, Button, useTheme, useMediaQuery, CircularProgress, Alert, Stack
} from '@mui/material';
import {
  Menu as MenuIcon, Add as AddIcon, Search as SearchIcon,
  Send as SendIcon, Close as CloseIcon,
} from '@mui/icons-material';
import AddContactDialog from './AddContactDialog';
import { motion } from 'framer-motion';
import ChatInputBar from './ChatInputBar';
import { useSnackbar } from 'notistack';
import FileUploadDialog from './FileUploadDialog';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { Chip } from '@mui/material';


const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL;
const BACKEND_HOST = process.env.REACT_APP_BACKEND_HOST


console.log("checking !!!!!!!" , BACKEND_BASE_URL , BACKEND_HOST)


// Avatar fallback
function getInitials(name) {
  if (!name) return '';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ChatApp() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);

  // Handler for file upload
 const handleFileUpload = async ({ file, type, message }) => {
  console.log("Checking xxxxxxxxxx", file, type, message);
  if (!selectedContact) return;

  const formData = new FormData();
  formData.append('receiver', selectedContact.name);
  formData.append('room_name', getRoomName(selectedContact.name, user.username));
  formData.append('sender', user.username);

  if (file) {
    formData.append('file', file);
    console.log("File MIME type:", file);
  }

  const formType = file ? "file_message" : "chat_message";
  formData.append('type', formType);
  formData.append('file_type' , file.type);
  formData.append('file_name' , file.name);
  formData.append('size' , file.size)
  if (message) formData.append('message', message);

  console.log("Final formData", formData);

  try {
    const response = await api.post('/upload-file/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

      console.log("main responsessee" , response.data.file);

      const new_file_url = `${BACKEND_BASE_URL}${response.data.file}`;



      console.log("newwwww" , new_file_url);


      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          console.log("JSON STRINIFY SENDING" , file.name);
          wsRef.current.send(JSON.stringify({  type: "file_message", message: message, sender: user.username, receiver: selectedContact.name , file_type : file.type , file_url : new_file_url , file_name : file.name , size : file.size }));
        } catch {
          setError('Failed to send message over WebSocket');
        }
      }


    
    
  } catch (err) {
    console.error("Upload failed", err);
    // Show error to user
  }
};

  function getRoomName ( sender , receiver ) {
    const sorted = [sender, receiver].sort();
    return `${encodeURIComponent(sorted[0])}and${encodeURIComponent(sorted[1])}`;

  }

  // Fetch logged-in user info once on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/get-user/');
        if (mounted) setUser(res.data);
      } catch {
        setError('Failed to fetch user');
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Fetch contacts on mount and after adding a contact
  const fetchContacts = async () => {
    setLoadingContacts(true);
    setError('');
    try {
      const res = await api.get('/contacts/');
      setContacts(res.data);
      setSelectedContact(sel => sel || res.data[0] || null);
    } catch {
      setError('Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  };
  useEffect(() => { fetchContacts(); }, []);

  // Refetch messages when selected contact changes
  useEffect(() => {
    if (selectedContact && user) fetchMessages(selectedContact.name);
    else setMessages([]);
  }, [selectedContact, user]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update sidebar open state on screen size change
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Setup and cleanup WebSocket connection per selected contact
  useEffect(() => {
    if (!selectedContact || !user) return;

    let socket;
    let reconnectAttempts = 0;
    let closedByUser = false;

    function connectWS() {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${BACKEND_HOST}/ws/chat/${getRoomName(selectedContact.name, user.username)}/`;
      socket = new window.WebSocket(wsUrl);
      wsRef.current = socket;

      console.log('[WebSocket] Connecting to:', wsUrl);

      socket.onopen = () => {
        reconnectAttempts = 0;
        setError('');
        console.log('[WebSocket] Connected');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data);

          // Handle file messages
          if (data.type === "file") {

            console.log("handling file messages",data);
            setMessages(prev => [
              ...prev,
              {
                from: data.sender === user.username ? 'me' : data.sender,
                type: 'file',
                file: data.file_url,
                fileType: data.file_type,
                fileName: data.file_name, // or use a separate field if you have it
                timestamp: data.timestamp || new Date().toISOString(),
                text: data.message, // fallback for display
                size: data.size

              }
            ]);
          }
          // Handle text messages
          else if (data.message && data.sender !== user.username) {

            console.log("Handling text messages");

            setMessages(prev => [
              ...prev,
              {
                from: data.sender === user.username ? 'me' : data.sender,
                type : 'text',
                text: data.message,
                timestamp: data.timestamp || new Date().toISOString(),
              }
            ]);
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', event.data, err);
        }
      };

      socket.onclose = (event) => {
        wsRef.current = null;
        console.warn('[WebSocket] Closed', event);
        if (!closedByUser && reconnectAttempts < 5) {
          reconnectAttempts += 1;
          console.log(`[WebSocket] Attempting reconnect #${reconnectAttempts} in ${1000 * reconnectAttempts}ms`);
          reconnectTimeout.current = setTimeout(connectWS, 1000 * reconnectAttempts);
        }
      };

      socket.onerror = (err) => {
        setError('WebSocket connection error');
        console.error('[WebSocket] Error:', err);
        socket.close();
      };
    }

    connectWS();



    

    return () => {
      closedByUser = true;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
      wsRef.current = null;
    };
  }, [selectedContact, user]);

 

  // Fetch messages for a contact
  const fetchMessages = async (contactName) => {
    setLoadingMessages(true);
    setError('');
    try {

      const res = await api.get(`messages/${getRoomName(contactName, user.username)}`);

      console.log('Fetched messages:', res.data);
      if (!Array.isArray(res.data)) throw new Error('Invalid messages format');
      let arr = res.data;
      if (arr.length && arr[0].timestamp) arr.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      else if (arr.length && arr[0].index) arr.sort((a, b) => a.index - b.index);
      const formatted = arr.map(msg => {
        // Determine sender name (number or string)
        let senderName = typeof msg.sender === 'string'
          ? msg.sender
          : (contacts.find(c => c.id === msg.sender)?.name || msg.sender);

        // Compare senderName to user.id to set 'from'
        const isMe = senderName === user.id;

        if (msg.file) {
          return {
            from: isMe ? 'me' : senderName,
            type: 'file',
            file: `${BACKEND_BASE_URL}${msg.file}`,
            fileType: msg.file_type || '',
            fileName: msg.file_name || 'File',
            timestamp: msg.timestamps || msg.timestamp || new Date().toISOString(),
            text: msg.message ,
            size : msg.size
          };
        } else {
          return {
            from: isMe ? 'me' : senderName,
            type: 'text',
            text: msg.message,
            timestamp: msg.timestamps || msg.timestamp || new Date().toISOString(),
          };
        }
      });
      
        console.log('Formatted messages:', formatted);
        console.log('logged in user', user , "selected contact", selectedContact);
      setMessages(formatted);
    } catch {
      setError('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send message function (via WS or fallback API)
  const handleSendMessage = async () => {
    if (!message.trim() || sending || !selectedContact) return;
    setSending(true);
    const trimmedMsg = message.trim();
    setMessages(prev => [...prev, { from: "me", text: trimmedMsg }]);
    setMessage('');
    let sent = false;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({  type: "chat_message", message: trimmedMsg, sender: user.username, receiver: selectedContact.name }));
        sent = true;
      } catch {
        setError('Failed to send message over WebSocket');
      }
    }
    if (!sent) {
      try {
        await api.post('/messages/', { to: selectedContact.name, text: trimmedMsg });
      } catch {
        setError('Failed to send message');
      }
    }
    setSending(false);
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter(
    (c) => typeof c?.name === 'string' && c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Error auto-clear
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Sidebar component (UI unchanged, but avatar fallback added)
  const Sidebar = (
    <Box
      sx={{
        width: { xs: '100vw', md: 320 },
        bgcolor: '#0f0f0f',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #2a2a2a',
        boxShadow: '6px 0 10px rgba(255,0,0,0.2)',
        zIndex: 1201,
      }}
    >
      <AppBar position="static" sx={{ bgcolor: '#1a1a1a', boxShadow: '0 2px 4px rgba(255,0,0,0.4)' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#fff' }}>
            Chat App
          </Typography>
          {isMobile && (
            <IconButton onClick={() => setSidebarOpen(false)} sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search contacts"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#fff' }} />
              </InputAdornment>
            ),
          }}
          sx={{ bgcolor: '#222', borderRadius: 2, input: { color: '#fff' } }}
        />
      </Box>

      <Divider sx={{ borderColor: '#333' }} />

      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
        {loadingContacts ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : filteredContacts.length === 0 ? (
          <Typography variant="body2" sx={{ p: 2, color: '#888' }}>
            No contacts found.
          </Typography>
        ) : (
          <List>
            {filteredContacts.map((contact, index) => (
              <Grow in key={contact.name} timeout={400 + index * 80}>
                <ListItem
                  button
                  selected={selectedContact?.name === contact.name}
                  onClick={() => setSelectedContact(contact)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    bgcolor: selectedContact?.name === contact.name ? '#2a2a2a' : 'transparent',
                    '&:hover': { bgcolor: '#333' },
                    color: '#fff',
                  }}
                >
                  <ListItemAvatar>
                    {contact.avatar ? (
                      <Avatar src={`${BACKEND_BASE_URL}/${contact.avatar}`} alt={contact.name[0]} />
                    ) : (
                      <Avatar>{getInitials(contact.name)}</Avatar>
                    )}
                  </ListItemAvatar>
                  <ListItemText
                    primary={contact.name}
                    secondary={contact.message}
                    primaryTypographyProps={{ fontWeight: 500, color: '#fff' }}
                    secondaryTypographyProps={{ color: '#bbb' }}
                  />
                </ListItem>
              </Grow>
            ))}
          </List>
        )}
      </Box>

      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: '#1e1e1e',
          borderRadius: 2,
          boxShadow: 3,
          width: '100%',
        }}
      >
        {/* Profile Box */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            alt={user?.username}
            src={`${BACKEND_BASE_URL}/${user?.avatar}`}
            sx={{ width: 40, height: 40 }}
          />
          <Typography
            variant="subtitle1"
            sx={{
              color: '#fff',
              fontWeight: 500,
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              maxWidth: { xs: '120px', sm: '200px' },
            }}
          >
            { user?.username || 'User' }
          </Typography>
        </Stack>

        {/* Add Button */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="medium"
          onClick={() => setAddDialogOpen(true)}
          sx={{
            bgcolor: '#ff1744',
            '&:hover': { bgcolor: '#f01440' },
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          Add
        </Button>
      </Box>


    </Box>
  );

  return (
    <>
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#121212', overflow: 'hidden' }}>
        {isMobile ? (
          <Drawer
            anchor="left"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            PaperProps={{ sx: { width: 320, bgcolor: '#0f0f0f', color: '#fff' } }}
          >
            {Sidebar}
          </Drawer>
        ) : (
          Sidebar
        )}

        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#121212',
            height: '100vh',
            overflow: 'hidden',
          }}
        >
          <AppBar
            position="static"
            sx={{
              bgcolor: '#1a1a1a',
              boxShadow: '0 2px 4px rgba(255,0,0,0.4)',
            }}
          >
            <Toolbar>
              {isMobile && (
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={() => setSidebarOpen(true)}
                  sx={{ mr: 2 }}
                  aria-label="open drawer"
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {selectedContact ? selectedContact.name : 'Select a contact'}
              </Typography>
            </Toolbar>
          </AppBar>

          {/* Scrollable messages area */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              px: 2,
              py: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {loadingMessages ? (
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <CircularProgress size={36} />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : messages.length === 0 ? (
              <Typography sx={{ mt: 3, textAlign: 'center', color: '#666' }}>
                No messages yet. Start chatting!
              </Typography>
    ) : (
      <>
        {messages.map((msg, i) => {
          const isMine = msg.from === 'me';
          const alignment = isMine ? 'flex-end' : 'flex-start';
          const bubbleColor = isMine ? theme.palette.primary.main : '#f5f5f5';
          const textColor = isMine ? '#fff' : '#333';

          const commonBoxStyles = {
            display: 'flex',
            flexDirection: 'column',
            alignSelf: alignment,
            maxWidth: isMobile ? '90%' : '60%',
          };

          const bubbleStyles = {
            padding: '10px 14px',
            borderRadius: '12px',
            backgroundColor: bubbleColor,
            color: textColor,
            wordBreak: 'break-word',
            boxShadow: theme.shadows[2],
          };

          // File Message
          if (!msg.fileName == '') {
            return (
              <Box
                key={i}
                component={motion.div}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                sx={commonBoxStyles}
              >
<Paper elevation={3} sx={{ ...bubbleStyles, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
  <InsertDriveFileIcon fontSize="medium" sx={{ mt: 0.5 }} />
  <Box sx={{ flex: 1 }}>
    {msg.fileType?.startsWith('audio/') ? (
      <>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{msg.fileName }</Typography>
        <audio controls src={msg.file} style={{ width: '100%' }} />
      </>
    ) : msg.fileType == 'video/mp4' || msg.fileType == 'video/webm' ? (
      <>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{msg.fileName || 'Unnamed File'}</Typography>
        <video controls src={msg.file} style={{ width: '100%' }} />
      </>
    ) : (
      <Typography
        variant="body2"
        component="a"
        href={msg.file}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: isMine ? '#fff' : '#1976d2', textDecoration: 'underline', wordBreak: 'break-word', fontWeight: 500 }}
      >
        {msg.fileName || 'Unnamed File'}
      </Typography>
    )}
    {msg.size && (
<Chip
  size="small"
  label={
    msg.size >= 1024 * 1024
      ? `${(msg.size / (1024 * 1024)).toFixed(2)} MB`
      : `${(msg.size / 1024).toFixed(2)} KB`
  }
  sx={{
    m: 1,
    backgroundColor: isMine ? '#d81b60' : '#e0e0e0',
    color: isMine ? '#fff' : '#333',
    fontSize: '0.7rem',
  }}
/>    )}
    {msg.text && (
      <Typography variant="body2" sx={{ mt: 1 }}>{msg.text}</Typography>
    )}
  </Box>
</Paper>
                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.5,
                    color: '#888',
                    fontSize: '0.7rem',
                    alignSelf: 'flex-end',
                  }}
                >
                  {new Date(msg.timestamp).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  })}
                </Typography>
              </Box>
            );
          }

          // Text Message
          if (!msg.file ) {
            return (
              <Box
                key={i}
                component={motion.div}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                sx={commonBoxStyles}
              >
                <Paper elevation={3} sx={bubbleStyles}>
                  {msg.text}
                </Paper>
                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.5,
                    color: '#888',
                    fontSize: '0.7rem',
                    alignSelf: 'flex-end',
                  }}
                >
                  {new Date(msg.timestamp).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  })}
                </Typography>
              </Box>
            );
          }

          return null;
        })}
        <div ref={messagesEndRef} />
      </>
    )}
  </Box>

          {/* Chat input at bottom */}
          <ChatInputBar
            message={message}
            setMessage={setMessage}
            sending={sending}
            handleSendMessage={handleSendMessage}
            selectedContact={selectedContact}
            user={user}
            socketRef={wsRef}
            onFileUpload={() => setUploadDialogOpen(true)}
          />
          <FileUploadDialog
            open={uploadDialogOpen}
            onClose={() => setUploadDialogOpen(false)}
            onUpload={async (data) => {
              setUploadDialogOpen(false);
              await handleFileUpload(data);
            }}
          />
        </Box>

      </Box>

      <AddContactDialog
        open={addDialogOpen}
        onClose={(added) => {
          setAddDialogOpen(false);
          if (added) fetchContacts();
        }}
      />
    </>
  );
}