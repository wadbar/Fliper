import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type KernelAction = 'open_window' | 'trigger_download' | 'system_alert' | 'update_settings';

interface KernelCommand {
    id: string;
    action: KernelAction;
    payload: any;
    timestamp: number;
}

interface KernelContextType {
    dispatch: (action: KernelAction, payload: any) => void;
    lastCommand: KernelCommand | null;
}

const KernelContext = createContext<KernelContextType | undefined>(undefined);

export const KernelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [lastCommand, setLastCommand] = useState<KernelCommand | null>(null);

    const dispatch = useCallback((action: KernelAction, payload: any) => {
        const cmd: KernelCommand = {
            id: Math.random().toString(36).substring(7),
            action,
            payload,
            timestamp: Date.now()
        };
        console.log(`[KERNEL_BUS] Dispatched: ${action}`, payload);
        setLastCommand(cmd);
    }, []);

    return (
        <KernelContext.Provider value={{ dispatch, lastCommand }}>
            {children}
        </KernelContext.Provider>
    );
};

export const useKernel = () => {
    const context = useContext(KernelContext);
    if (!context) throw new Error('useKernel must be used within KernelProvider');
    return context;
};
