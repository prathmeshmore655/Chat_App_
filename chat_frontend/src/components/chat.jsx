import React, { useState, useRef, useEffect } from 'react';
import api from './api'; // Your configured axios instance or API wrapper
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
  Paper,
  Slide,
  Drawer,
  Fade,
  Grow,
  Button,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Send as SendIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import AddContactDialog from './AddContactDialog'; // adjust import path
import { motion } from 'framer-motion';

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

  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Fetch logged-in user info once on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/get-user/');
        setUser(res.data);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    fetchUser();
  }, []);

  // Fetch contacts on mount
  useEffect(() => {
    fetchContacts();
  }, []);

  // Refetch messages when selected contact changes
  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.name);
    } else {
      setMessages([]);
    }
  }, [selectedContact]);

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
    if (!selectedContact) return;

    // Close previous WS if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://127.0.0.1:8000/ws/chat/${encodeURIComponent(selectedContact.name)}/`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
      setError('');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message) {
          // Append message from other user
          setMessages((prev) => [...prev, { from: selectedContact.name, text: data.message }]);
        }
      } catch (err) {
        console.error('Invalid WebSocket message:', event.data);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('WebSocket connection error');
    };

    // Cleanup on unmount or selectedContact change
    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      wsRef.current = null;
    };
  }, [selectedContact]);

  // Fetch contacts from API
  const fetchContacts = async () => {
    setLoadingContacts(true);
    setError('');
    try {
      const res = await api.get('/contacts/');
      setContacts(res.data);
      setSelectedContact(res.data[0] || null);
    } catch (err) {
      setError('Failed to load contacts');
      console.error(err);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Fetch messages for a contact
  const fetchMessages = async (contactName) => {
    setLoadingMessages(true);
    setError('');
    try {
      const res = await api.get(`/messages/?contact=${encodeURIComponent(contactName)}`);
      setMessages(res.data);
    } catch (err) {
      setError('Failed to load messages');
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send message function (via WS or fallback API)
  const handleSendMessage = async () => {
    if (!message.trim() || sending || !selectedContact) return;

    setSending(true);
    const trimmedMsg = message.trim();

    // Optimistically add message locally as from 'me'
    setMessages((prev) => [...prev, { from: "me", text: trimmedMsg ,}]);
    setMessage('');

    // If WebSocket ready, send through WS
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ message: trimmedMsg , sender : user.username , receiver: selectedContact.username }));
      } catch (err) {
        console.error('WS send error:', err);
        setError('Failed to send message over WebSocket');
      } finally {
        setSending(false);
      }
    } else {
      // Fallback: send via API POST
      try {
        await api.post('/messages/', { to: selectedContact.name, text: trimmedMsg });
      } catch (err) {
        setError('Failed to send message');
        console.error(err);
      } finally {
        setSending(false);
      }
    }
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter(
    (c) => typeof c?.name === 'string' && c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Sidebar component
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
                    <Avatar src={`http://127.0.0.1:8000${contact.avatar}`} alt={contact.name[0]} />
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

      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => setAddDialogOpen(true)}
          sx={{ bgcolor: '#ff1744', '&:hover': { bgcolor: '#f01440' } }}
        >
          Add
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#121212', overflow: 'hidden' }}>
        {/* Sidebar */}
        {isMobile ? (
          <Drawer
            anchor="left"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            transitionDuration={350}
            ModalProps={{ keepMounted: true }}
            PaperProps={{ sx: { width: '100vw', maxWidth: 360 } }}
          >
            {Sidebar}
          </Drawer>
        ) : (
          <Slide direction="right" in mountOnEnter unmountOnExit>
            {Sidebar}
          </Slide>
        )}

        {/* Chat area */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppBar position="static" sx={{ bgcolor: '#1a1a1a', boxShadow: '0 2px 4px rgba(255,0,0,0.4)' }}>
            <Toolbar>
              {isMobile && (
                <IconButton edge="start" onClick={() => setSidebarOpen(true)} sx={{ mr: 1, color: '#fff' }}>
                  <MenuIcon />
                </IconButton>
              )}
              <Avatar src={selectedContact?.avatar} />
              <Typography variant="h6" sx={{ ml: 2, color: '#fff' }}>
                {selectedContact?.name || 'Select a contact'}
              </Typography>
            </Toolbar>
          </AppBar>

          <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', backgroundColor: '#181818' }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {loadingMessages ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <CircularProgress size={28} />
              </Box>
            ) : messages.length === 0 ? (
              <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: '#aaa' }}>
                No messages yet.
              </Typography>
            ) : (
              messages.map((msg, idx) => (
                <Fade in key={idx} timeout={400 + idx * 60}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Paper
                      elevation={2}
                      sx={{
                        bgcolor: msg.from === 'me' ? '#ff1744' : '#333',
                        color: '#fff',
                        px: 2,
                        py: 1,
                        maxWidth: '75%',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="body1">{msg.text}</Typography>
                    </Paper>
                  </Box>
                </Fade>
              ))
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input box */}
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            sx={{
              display: 'flex',
              p: 1,
              bgcolor: '#0f0f0f',
              borderTop: '1px solid #2a2a2a',
              alignItems: 'center',
            }}
          >
            <TextField
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              fullWidth
              multiline
              maxRows={4}
              size="small"
              sx={{
                bgcolor: '#222',
                borderRadius: 2,
                input: { color: '#fff' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
              }}
              disabled={!selectedContact || sending}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      color="primary"
                      onClick={handleSendMessage}
                      disabled={sending || !message.trim() || !selectedContact}
                      sx={{ color: '#ff1744' }}
                    >
                      <SendIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Add Contact Dialog */}
      <AddContactDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdded={() => {
          setAddDialogOpen(false);
          fetchContacts();
        }}
      />
    </>
  );
}
