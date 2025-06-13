import { Box, TextField, IconButton, useMediaQuery, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import api from './api';

const ChatInputBar = ({
  message,
  setMessage,
  handleSendMessage,
  sending,
  selectedContact,
  user,
  socketRef,
  onFileUpload // This will open FileUploadDialog
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  function getRoomName(sender, receiver) {
    const sorted = [sender, receiver].sort();
    return `${encodeURIComponent(sorted[0])}and${encodeURIComponent(sorted[1])}`;
  }

  return (
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
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <TextField
        placeholder="Type a message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={!selectedContact}
        size="small"
        fullWidth
        sx={{
          flex: 1,
          minWidth: 0,
          '& .MuiInputBase-root': {
            bgcolor: '#222',
            borderRadius: 2,
            px: 1,
          },
          '& input': {
            color: '#fff',
          },
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
      />

      <Tooltip title="Attach file or audio" arrow>
        <span>
          <IconButton
            disabled={!selectedContact}
            onClick={onFileUpload}
            sx={{
              bgcolor: '#444',
              '&:hover': { bgcolor: '#666' },
              color: '#fff',
              flexShrink: 0,
            }}
            aria-label="attach file"
          >
            <AttachFileIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Send message" arrow>
        <span>
          <IconButton
            type="submit"
            color="primary"
            disabled={!message.trim() || sending || !selectedContact}
            sx={{
              bgcolor: '#e91e63',
              '&:hover': { bgcolor: '#c2185b' },
              color: '#fff',
              flexShrink: 0,
            }}
            aria-label="send message"
          >
            <SendIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export default ChatInputBar;
