import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OfflineModeContextType {
    isOffline: boolean;
    isOnline: boolean;
    offlineMessage: string | null;
    setOfflineMessage: (message: string | null) => void;
}

const OfflineModeContext = createContext<OfflineModeContextType | undefined>(undefined);

export const useOfflineMode = () => {
    const context = useContext(OfflineModeContext);
    if (!context) {
        throw new Error('useOfflineMode must be used within OfflineModeProvider');
    }
    return context;
};

export const OfflineModeProvider = ({ children }: { children: ReactNode }) => {
    const [isOffline, setIsOffline] = useState(false);
    const [offlineMessage, setOfflineMessage] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const offline = !state.isConnected || !state.isInternetReachable;
            setIsOffline(offline);

            if (offline) {
                console.log('📴 App is OFFLINE - Using cached data');
                setOfflineMessage('You are offline. Showing cached data.');
            } else {
                console.log('📶 App is ONLINE');
                setOfflineMessage(null);
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <OfflineModeContext.Provider
            value={{
                isOffline,
                isOnline: !isOffline,
                offlineMessage,
                setOfflineMessage,
            }}
        >
            {children}
        </OfflineModeContext.Provider>
    );
};
