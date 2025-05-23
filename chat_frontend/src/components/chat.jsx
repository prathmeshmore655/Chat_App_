import React, { useState, useRef, useEffect } from 'react';
import api from './api';
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
import AddContactDialog from './AddContactDialog'; // adjust path as needed
import { motion } from 'framer-motion';

export default function ChatApp() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [message, setMessage] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);


  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.name);
    }
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const fetchContacts = () => {
    setLoadingContacts(true);
    setError('');
    api.get('/contacts/')
      .then(res => {
        setContacts(res.data);
        setSelectedContact(res.data[0] || null);
      })
      .catch(() => setError('Failed to load contacts'))
      .finally(() => setLoadingContacts(false));
  };

  const fetchMessages = (contactName) => {
    setLoadingMessages(true);
    setError('');
    api.get(`/messages/?contact=${encodeURIComponent(contactName)}`)
      .then(res => setMessages(res.data))
      .catch(() => setError('Failed to load messages'))
      .finally(() => setLoadingMessages(false));
  };

  const handleSendMessage = async () => {
    if (!message.trim() || sending || !selectedContact) return;
    setSending(true);
    const newMsg = { from: 'me', text: message.trim() };
    setMessages(prev => [...prev, newMsg]);
    setMessage('');

    try {
      await api.post('/messages/', { to: selectedContact.name, text: newMsg.text });
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { from: selectedContact.name, text: 'Received: ' + newMsg.text },
        ]);
      }, 700);
    } catch {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter(c =>
    typeof c?.name === 'string' && c.name.toLowerCase().includes(search.toLowerCase())
  );

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
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#fff' }}>Chat App</Typography>
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
        <Slide direction="right" in mountOnEnter unmountOnExit>{Sidebar}</Slide>
      )}

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
              {selectedContact?.name || ''}
            </Typography>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', backgroundColor: '#181818' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
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
                    alignItems: 'flex-end',
                    gap: 1,
                    mb: 1,
                  }}
                >
                  {msg.from !== 'me' && (
                    <Avatar src={selectedContact?.avatar} sx={{ width: 28, height: 28 }} />
                  )}
                  <Paper
                    elevation={msg.from === 'me' ? 4 : 1}
                    sx={{
                      p: 1.5,
                      px: 2,
                      borderRadius: 3,
                      bgcolor: msg.from === 'me' ? '#ff1744' : '#2e2e2e',
                      color: '#fff',
                      maxWidth: '75%',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.text}
                  </Paper>
                  {msg.from === 'me' && (
                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#ff1744', color: '#fff' }}>M</Avatar>
                  )}
                </Box>
              </Fade>
            ))
          )}
          <div ref={messagesEndRef} />
        </Box>

        <Box sx={{ p: 2, borderTop: '1px solid #333', bgcolor: '#1c1c1c' }}>
          <TextField
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            size="medium"
            autoComplete="off"
            disabled={sending || !selectedContact}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={sending || !message.trim() || !selectedContact}
                    sx={{ color: '#ff1744' }}
                  >
                    {sending ? <CircularProgress size={22} /> : <SendIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ bgcolor: '#2c2c2c', borderRadius: 2, input: { color: '#fff' } }}
          />
        </Box>
      </Box>
    </Box>
    <AddContactDialog
      open={addDialogOpen}
      onClose={() => setAddDialogOpen(false)}
      onContactAdded={fetchContacts}
    />



    </>
  );
}
