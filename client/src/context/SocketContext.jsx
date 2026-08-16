import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('sh_token');
    const socket = io({ auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    return () => socket.disconnect();
  }, []);

  const joinOrder = useCallback((orderId) => {
    socketRef.current?.emit('join-order', orderId);
  }, []);

  const leaveOrder = useCallback((orderId) => {
    socketRef.current?.emit('leave-order', orderId);
  }, []);

  const joinBranch = useCallback((branchId) => {
    socketRef.current?.emit('join-branch', branchId);
  }, []);

  const on = useCallback((event, cb) => {
    socketRef.current?.on(event, cb);
    return () => socketRef.current?.off(event, cb);
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, joinOrder, leaveOrder, joinBranch, on }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
