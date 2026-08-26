import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const { socketReconnect } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('sh_token');
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }
    const s = io(import.meta.env.VITE_API_URL || undefined, { auth: { token } });
    socketRef.current = s;
    s.on('connect', () => { setConnected(true); setSocket(s); });
    s.on('disconnect', () => setConnected(false));
    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [socketReconnect]);

  const joinOrder = useCallback((orderId, customerId) => {
    socketRef.current?.emit('join-order', orderId, customerId);
  }, []);

  const leaveOrder = useCallback((orderId) => {
    socketRef.current?.emit('leave-order', orderId);
  }, []);

  const joinBranch = useCallback((branchId) => {
    socketRef.current?.emit('join-branch', branchId);
  }, []);

  const leaveBranch = useCallback((branchId) => {
    socketRef.current?.emit('leave-branch', branchId);
  }, []);

  const on = useCallback((event, cb) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, cb);
    return () => { socket.off(event, cb); };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, joinOrder, leaveOrder, joinBranch, leaveBranch, on }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
