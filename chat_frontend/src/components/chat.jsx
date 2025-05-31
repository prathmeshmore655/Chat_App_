import React, { useState, useRef, useEffect } from 'react';
import api from './api';
import {
  AppBar, Avatar, Box, Divider, IconButton, InputAdornment, List, ListItem,
  ListItemAvatar, ListItemText, TextField, Toolbar, Typography, Paper, Slide,
  Drawer, Fade, Grow, Button, useTheme, useMediaQuery, CircularProgress, Alert,
} from '@mui/material';
import {
  Menu as MenuIcon, Add as AddIcon, Search as SearchIcon,
  Send as SendIcon, Close as CloseIcon,
} from '@mui/icons-material';
import AddContactDialog from './AddContactDialog';
import { motion } from 'framer-motion';

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

  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);



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
      const wsUrl = `${protocol}://127.0.0.1:8000/ws/chat/${getRoomName(selectedContact.name, user.username)}/`;
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
          if (data.message && data.sender !== user.username) {
            setMessages(prev => [...prev, { from: selectedContact.name, text: data.message }]);
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
      if (!Array.isArray(res.data)) throw new Error('Invalid messages format');
      let arr = res.data;
      if (arr.length && arr[0].timestamp) arr.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      else if (arr.length && arr[0].index) arr.sort((a, b) => a.index - b.index);
      const formatted = arr
        .filter(msg => msg.message)
        .map(msg => ({
          from: msg.sender === user.username ? 'me' : msg.sender,
          text: msg.message,
          timestamp: msg.timestamp || new Date().toISOString(),
        }));
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
        wsRef.current.send(JSON.stringify({ message: trimmedMsg, sender: user.username, receiver: selectedContact.name }));
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
                      <Avatar src={`http://127.0.0.1:8000${contact.avatar}`} alt={contact.name[0]} />
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
          <AppBar position="static" sx={{ bgcolor: '#1a1a1a', boxShadow: '0 2px 4px rgba(255,0,0,0.4)' }}>
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
                  alignSelf: msg.from === 'me' ? 'flex-end' : 'flex-start',
                  maxWidth: '70%',
                }}
              >
                <Box
                  sx={{
                    padding: '8px 12px',
                    borderRadius: 2,
                    backgroundColor: msg.from === 'me' ? '#e91e63' : '#444',
                    color: '#fff',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.text}
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



          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            sx={{
              p: 1,
              borderTop: '1px solid #333',
              bgcolor: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <TextField
              fullWidth
              placeholder="Type a message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!selectedContact}
              size="small"
              InputProps={{
                sx: {
                  bgcolor: '#222',
                  borderRadius: 2,
                  input: { color: '#fff' },
                },
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <IconButton
              color="primary"
              disabled={!message.trim() || sending || !selectedContact}
              onClick={handleSendMessage}
              sx={{ bgcolor: '#e91e63', '&:hover': { bgcolor: '#c2185b' }, color: '#fff' }}
              aria-label="send message"
            >
              <SendIcon />
            </IconButton>
          </Box>
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