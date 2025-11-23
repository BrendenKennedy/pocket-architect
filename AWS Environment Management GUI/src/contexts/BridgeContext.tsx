import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { bridgeClient, BridgeClient } from '../bridge';

interface BridgeContextType {
  bridge: BridgeClient | null;
  isReady: boolean;
}

const BridgeContext = createContext<BridgeContextType>({
  bridge: null,
  isReady: false,
});

export function BridgeProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if bridge is ready periodically
    const checkBridge = () => {
      if (bridgeClient.isReady()) {
        setIsReady(true);
      } else {
        setTimeout(checkBridge, 100);
      }
    };

    checkBridge();
  }, []);

  return (
    <BridgeContext.Provider value={{ bridge: bridgeClient, isReady }}>
      {children}
    </BridgeContext.Provider>
  );
}

export function useBridge() {
  const context = useContext(BridgeContext);
  if (!context) {
    throw new Error('useBridge must be used within BridgeProvider');
  }
  return context;
}

