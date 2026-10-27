import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api/http';

const ChatContext = createContext(null);
export const useChat = () => useContext(ChatContext);

// One authenticated socket per signed-in student/TA. REST stays the source of truth;
// the socket only delivers `message:new` live and tells threads when to catch up.
export function ChatProvider({ children }) {
  const [status, setStatus] = useState('connecting'); // connecting | connected | reconnecting
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const listeners = useRef({ message: new Set(), connect: new Set() });

  useEffect(() => {
    let everConnected = false;
    const socket = io(API_URL, { withCredentials: true, transports: ['polling', 'websocket'] });
    const down = () => setStatus(everConnected ? 'reconnecting' : 'connecting');

    socket.on('connect', () => {
      everConnected = true;
      setStatus('connected');
      listeners.current.connect.forEach((fn) => fn()); // threads re-sync anything missed
    });
    socket.on('disconnect', down);
    socket.on('connect_error', down);
    socket.io.on('reconnect_attempt', down);
    socket.on('message:new', (m) => listeners.current.message.forEach((fn) => fn(m)));

    const goOnline = () => { setOnline(true); if (!socket.connected) socket.connect(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      socket.close();
    };
  }, []);

  const onMessage = useCallback((fn) => { listeners.current.message.add(fn); return () => listeners.current.message.delete(fn); }, []);
  const onConnect = useCallback((fn) => { listeners.current.connect.add(fn); return () => listeners.current.connect.delete(fn); }, []);
  const value = useMemo(() => ({ status, online, onMessage, onConnect }), [status, online, onMessage, onConnect]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
