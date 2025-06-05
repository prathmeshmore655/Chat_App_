import { useState, useEffect, useCallback } from 'react';
import api from './api';

const API_BASE_URL = 'http://127.0.0.1:8000';

function getRoomName(sender, receiver) {
  if (!sender || !receiver) return null;
  const sorted = [sender, receiver].sort();
  return `${encodeURIComponent(sorted[0])}and${encodeURIComponent(sorted[1])}`;
}

export default function useMessages(selectedContact, user, contacts) {
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState('');

  const fetchMessages = useCallback(async () => {
    if (!selectedContact || !user || !user.username) {
      setMessages([]);
      return;
    }

    const roomName = getRoomName(selectedContact.name, user.username);
    if (!roomName) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    setMessagesError('');
    try {
      const res = await api.get(`messages/${roomName}`);
      if (!Array.isArray(res.data)) throw new Error('Invalid messages format');

      let arr = res.data;
      if (arr.length && arr[0].timestamp) {
        arr.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      } else if (arr.length && arr[0].index) {
        arr.sort((a, b) => a.index - b.index);
      }

      const formatted = arr.map(msg => {
        let senderName = typeof msg.sender === 'string'
          ? msg.sender
          : (contacts.find(c => c.id === msg.sender)?.name || msg.sender.toString());

        if (msg.type === 'file' && msg.file) {
          return {
            from: senderName === user.username ? 'me' : senderName,
            type: 'file',
            file: `${API_BASE_URL}${msg.file}`,
            fileType: msg.file_type || '',
            fileName: msg.message || 'File',
            timestamp: msg.timestamps || msg.timestamp || new Date().toISOString(),
            text: msg.message || '📎 File',
          };
        } else {
          return {
            from: senderName === user.username ? 'me' : senderName,
            type: 'text',
            text: msg.message,
            timestamp: msg.timestamps || msg.timestamp || new Date().toISOString(),
          };
        }
      });
      setMessages(formatted);
    } catch (err) {
      setMessagesError('Failed to load messages');
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedContact, user, contacts]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { messages, setMessages, loadingMessages, messagesError, fetchMessages };
}