import { useRef, useEffect, useState, useCallback } from 'react';

const WS_BASE_URL_DOMAIN = '127.0.0.1:8000'; // Ensure this is defined or imported

function getRoomName(sender, receiver) {
  if (!sender || !receiver) return null;
  const sorted = [sender, receiver].sort();
  return `${encodeURIComponent(sorted[0])}and${encodeURIComponent(sorted[1])}`;
}

export default function useChatWebSocket(selectedContact, user, onMessageReceived) {
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);
  const [wsError, setWsError] = useState('');
  const [isWsConnected, setIsWsConnected] = useState(false);

  const connectWS = useCallback(() => {
    if (!selectedContact || !user || !user.username) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsWsConnected(false);
      return;
    }

    const roomName = getRoomName(selectedContact.name, user.username);
    if (!roomName) {
        setIsWsConnected(false);
        return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${WS_BASE_URL_DOMAIN}/ws/chat/${roomName}/`;

    if (wsRef.current && wsRef.current.url === wsUrl && wsRef.current.readyState === WebSocket.OPEN) {
        // Already connected to the correct room
        setIsWsConnected(true);
        return;
    }
    
    // If there's an existing socket, close it before creating a new one
    if (wsRef.current) {
        wsRef.current.close();
    }

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    let reconnectAttempts = 0;
    let closedByUser = false; // To prevent reconnect if user navigates away or explicitly closes

    // console.log('[WebSocket] Connecting to:', wsUrl);

    socket.onopen = () => {
      reconnectAttempts = 0;
      setWsError('');
      setIsWsConnected(true);
      // console.log('[WebSocket] Connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // console.log('[WebSocket] Message received:', data);
        if (onMessageReceived) {
          onMessageReceived(data);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', event.data, err);
        setWsError('Failed to parse incoming message.');
      }
    };

    socket.onclose = (event) => {
      wsRef.current = null;
      setIsWsConnected(false);
      // console.warn('[WebSocket] Closed', event);
      if (!closedByUser && reconnectAttempts < 5) {
        reconnectAttempts += 1;
        // console.log(`[WebSocket] Attempting reconnect #${reconnectAttempts} in ${1000 * reconnectAttempts}ms`);
        reconnectTimeout.current = setTimeout(connectWS, 1000 * reconnectAttempts);
      } else if (reconnectAttempts >= 5) {
        setWsError('WebSocket disconnected. Max reconnect attempts reached.');
      }
    };

    socket.onerror = (err) => {
      setWsError('WebSocket connection error.');
      console.error('[WebSocket] Error:', err);
      // socket.close(); // onclose will be called automatically
    };

    return () => { // Cleanup function
      closedByUser = true;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
      wsRef.current = null;
      setIsWsConnected(false);
    };
  }, [selectedContact, user, onMessageReceived]);

  useEffect(() => {
    const cleanup = connectWS();
    return cleanup;
  }, [connectWS]);

  const sendMessageOverWebSocket = useCallback((messageData) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(messageData));
        return true;
      } catch (err) {
        console.error('[WebSocket] Failed to send message:', err);
        setWsError('Failed to send message over WebSocket.');
        return false;
      }
    }
    setWsError('WebSocket not connected. Cannot send message.');
    return false;
  }, []);

  return { wsRef, wsError, isWsConnected, sendMessageOverWebSocket, connectWS };
}