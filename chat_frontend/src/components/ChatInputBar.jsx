import { Box, TextField, IconButton, useMediaQuery, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import FileUploadButton from './FileUploadButton';
import api from './api';

const ChatInputBar = ({
  message,
  setMessage,
  handleSendMessage,
  sending,
  selectedContact,
  user,
  socketRef
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  function getRoomName(sender, receiver) {
    const sorted = [sender, receiver].sort();
    return `${encodeURIComponent(sorted[0])}and${encodeURIComponent(sorted[1])}`;
  }

  const sendFileMessageAPI = async (contactId, file) => {
    const room_name = getRoomName(user.username, selectedContact.name);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sender', user.username);
    formData.append('receiver', selectedContact.name);
    formData.append('room_name', room_name);

    console.log("formData:", formData);
    console.log("contact:", selectedContact.name);

    try {
      const response = await api.post(`upload-file/`, formData);
      return response.data;
    } catch (error) {
      console.error('File upload API error:', error);
      return { success: false, message: 'File upload failed' };
    }
  };

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

      <Tooltip title="Attach file" arrow>
        <FileUploadButton
          disabled={!selectedContact}
          onFileUpload={async (file) => {
            try {
              const response = await sendFileMessageAPI(selectedContact.id, file);

              console.log("File upload response:", response);

              console.log("contact", selectedContact);

              const fileMessage = {
                type: "file_message",
                message: "📎 File sent",
                file_url: `http://localhost:8000${response.file}`,
                sender: user.username,
                receiver: selectedContact.name,
                room_name: getRoomName(user.username, selectedContact),
                timestamp: new Date().toISOString(),
                file_type: file.type,
              };

              if (socketRef && socketRef.current && socketRef.current.readyState === 1) {
                socketRef.current.send(JSON.stringify(fileMessage));
              } else {
                console.error('WebSocket is not connected');
              }
            } catch (error) {
              console.error('File upload failed:', error);
            }
          }}
        />
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
