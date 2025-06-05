import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from './api';

import {
  AppBar, Avatar, Box, Divider, IconButton, InputAdornment, List, ListItem,
  ListItemAvatar, ListItemText, TextField, Toolbar, Typography,
  Drawer, Grow, Button, useTheme, useMediaQuery, CircularProgress, Alert, Stack
} from '@mui/material';
import {
  Menu as MenuIcon, Add as AddIcon, Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import AddContactDialog from './AddContactDialog';
import { motion } from 'framer-motion';
import ChatInputBar from './ChatInputBar';
import { useSnackbar } from 'notistack';
import useUser from './useUser';
import useContacts from './useContacts';
import useMessages from './useMessages';
import useChatWebSocket from './useChatWebSocket';
import useFileUpload from './useFileUpload';

const API_BASE_URL = 'http://127.0.0.1:8000';
// const WS_BASE_URL_DOMAIN = 'http://127.0.0.1:8000'; // This line was already correctly commented or removed

// Avatar fallback
function getInitials(name) {
  if (!name) return '';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ChatApp() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const { contacts, loadingContacts, contactsError, fetchContacts: refetchContacts } = useContacts();
  const [selectedContact, setSelectedContact] = useState(null);
  const { user, userError, loadingUser } = useUser();
  const { messages, setMessages, loadingMessages, messagesError } = useMessages(selectedContact, user, contacts);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(''); // General component/UI error, specific data errors handled by hooks
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const messagesEndRef = useRef(null);

  const handleIncomingMessage = useCallback((data) => {
    // console.log('[ChatApp] Incoming WS Message:', data);
    if (data.file_url) {
      setMessages(prev => [
        ...prev,
        {
          from: data.sender === user?.username ? 'me' : data.sender,
          type: 'file',
          file: data.file_url, // Assuming API_BASE_URL is prepended by useMessages or handled by backend
          fileType: data.file_type,
          fileName: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          text: data.message,
        }
      ]);
    } else if (data.message && data.sender !== user?.username) {
      setMessages(prev => [
        ...prev,
        {
          from: data.sender === user?.username ? 'me' : data.sender,
          text: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
        }
      ]);
    }
  }, [setMessages, user]);

  const { wsError, isWsConnected, sendMessageOverWebSocket } = useChatWebSocket(selectedContact, user, handleIncomingMessage);
  
  const handleUploadSuccess = useCallback((fileMessage) => {
    setMessages(prev => [...prev, fileMessage]);
    // Optionally, trigger WebSocket message if file uploads don't go through WS automatically
    // For example, by sending a text message indicating a file was uploaded.
    // This depends on whether your backend's file upload also triggers a WS broadcast.
  }, [setMessages]);

  const { isUploading, uploadError, handleFileUpload } = useFileUpload({
    selectedContact,
    onUploadSuccess: handleUploadSuccess
  });
  // const reconnectTimeout = useRef(null); // Removed, handled by useChatWebSocket




  // Old handleFileUpload logic is now in useFileUpload hook.




  

  // Set initial selected contact when contacts load
  useEffect(() => {
    if (!selectedContact && contacts && contacts.length > 0) {
      setSelectedContact(contacts[0]);
    }
  }, [contacts, selectedContact]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update sidebar open state on screen size change
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // WebSocket logic is now handled by useChatWebSocket hook.

 

  // Old fetchMessages function removed as logic is in useMessages hook.

  // Send message function (via WS or fallback API)
  const handleSendMessage = async () => {
    if (!message.trim() || (sending || isUploading) || !selectedContact || !user || !user.username) { // Check isUploading
      enqueueSnackbar('Cannot send message. Ensure you are logged in, a contact is selected, and no operation is in progress.', { variant: 'warning'});
      return;
    }
    setSending(true); // This state is for text messages
    const trimmedMsg = message.trim();
    
    // Optimistic update
    const optimisticMessage = { 
      from: "me", 
      text: trimmedMsg, 
      timestamp: new Date().toISOString(),
      id: `temp-${Date.now()}` // Temporary ID for optimistic update
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setMessage('');

    const messagePayload = { 
      type: "chat_message", 
      message: trimmedMsg, 
      sender: user.username, 
      receiver: selectedContact.name 
    };

    const sentOverWS = sendMessageOverWebSocket(messagePayload);

    if (!sentOverWS) {
      // Fallback to API if WebSocket send failed or not connected
      try {
        await api.post('/messages/', { to: selectedContact.name, text: trimmedMsg });
        // If API success, message is already optimistically updated.
        // enqueueSnackbar('Message sent (fallback API).', { variant: 'info' }); // Optional: notify user of fallback
      } catch (apiError) {
        setError('Failed to send message via API');
        console.error('API send message error:', apiError);
        // Revert optimistic update
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id)); 
        enqueueSnackbar('Failed to send message.', { variant: 'error' });
      }
    }
    setSending(false);
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter(
    (c) => typeof c?.name === 'string' && c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Error auto-clear for general errors, WebSocket errors, and Upload errors
  useEffect(() => {
    const currentError = error || wsError || uploadError;
    if (currentError) {
      const t = setTimeout(() => {
        setError('');
        // Errors from hooks (wsError, uploadError) are managed by their respective hooks
        // but can be cleared here if a unified display timeout is desired.
        // For now, let them manage their own state, ChatApp only clears its 'error'.
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [error, wsError, uploadError]);


   console.log("messages tototo" ,messages);

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
                      <Avatar src={`${API_BASE_URL}${contact.avatar}`} alt={contact.name[0]} />
                    ) : (
                      <Avatar>{getInitials(contact.name)}</Avatar>
                    )}
                  </ListItemAvatar>
                  <ListItemText
                    primary={contact.name}
                    secondary={contact.message}
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: '#fff',
                      style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
                    }}
                    secondaryTypographyProps={{
                      color: '#bbb',
                      style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
                    }}
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
            src={`${API_BASE_URL}${user?.avatar}`}
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
            ) : error || userError || contactsError || messagesError || wsError || uploadError ? (
              <Alert severity="error">{error || userError || contactsError || messagesError || wsError || uploadError}</Alert>
            ) : loadingUser ? (
              <Box sx={{ mt: 3, textAlign: 'center' }}><CircularProgress size={36} /></Box>
            ) : messages.length === 0 ? (
              <Typography sx={{ mt: 3, textAlign: 'center', color: '#666' }}>
                No messages yet. Start chatting!
              </Typography>
            ) : (

             

              messages.map((msg, i) => (
                <Box
                  key={i}
                  component={motion.div}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: msg.from === "me" ? 'flex-end' : 'flex-start', // Use user.username for clarity
                    maxWidth: '70%',
                  }}
                >
                  <Box
                    sx={{
                      padding: '8px 12px',
                      borderRadius: 2,
                      backgroundColor: msg.from === user?.username ? theme.palette.grey[700] : // User messages: grey
                                       (selectedContact && msg.from === selectedContact.name ? theme.palette.error.main : '#444'), // Receiver: red, Others: dark grey
                      color: '#fff',
                      wordBreak: 'break-word',
                    }}
                  >
                    {/* Render file message or text */}
                    {msg.type === 'file' ? (
  msg.fileType?.startsWith('image/') ? (
    <img
      src={msg.file}
      alt={msg.fileName || 'file preview'}
      style={{
        width: '200px',       // Enforce uniform size
        height: '200px',      // Enforce uniform size
        objectFit: 'cover',   // Maintain aspect ratio nicely
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    />
  ) : (
    <a
      href={msg.file}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#fff', textDecoration: 'underline' }}
    >
      {msg.fileName || 'Download File'}
    </a>
  )
) : (
  msg.text
)}

                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.5,
                      color: '#bbb',
                      fontSize: '0.75rem',
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
              ))
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Chat input at bottom */}
          <ChatInputBar
            message={message}
            setMessage={setMessage}
            sending={sending}
            handleSendMessage={handleSendMessage}
            selectedContact={selectedContact}
            user={user}
            onFileUpload={handleFileUpload}
            sendMessageOverWebSocket={sendMessageOverWebSocket} // <-- pass this
            isWsConnected={isWsConnected}
          />
        </Box>

      </Box>

      <AddContactDialog
        open={addDialogOpen}
        onClose={(added) => {
          setAddDialogOpen(false);
          if (added) refetchContacts(); // Ensure this calls the hook's refetchContacts
        }}
      />
    </>
  );
}