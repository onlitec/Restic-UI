import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [connected, setConnected] = useState(false);

    const connect = useCallback(() => {
        if (!user) return;

        // Determine WS URL based on current host
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('✅ WebSocket connected');
            setConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('📩 Received WebSocket message:', message);
                setMessages((prev) => [...prev, message]);
            } catch (err) {
                console.error('❌ Failed to parse WebSocket message:', err);
            }
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            setConnected(false);
            // Reconnect after 3 seconds
            setTimeout(connect, 3000);
        };

        setSocket(ws);
    }, [user]);

    useEffect(() => {
        if (user) {
            connect();
        } else if (socket) {
            socket.close();
        }
        
        return () => {
            if (socket) socket.close();
        };
    }, [user, connect]);

    const value = {
        socket,
        connected,
        messages,
        clearMessages: () => setMessages([]),
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within WebSocketProvider');
    }
    return context;
}
