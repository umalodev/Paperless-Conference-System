// src/contexts/ScreenShareContext.jsx
import React, { createContext, useContext, useState } from "react";

const ScreenShareContext = createContext(null);

export function ScreenShareProvider({ children }) {
  const [sharingUser, setSharingUser] = useState(null);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);

  const [isSharing, setIsSharing] = useState(false);

  return (
    <ScreenShareContext.Provider
      value={{
        sharingUser,
        setSharingUser,
        screenShareOn,
        setScreenShareOn,
        isAnnotating,
        setIsAnnotating,
        isSharing,
        setIsSharing
      }}
    >
      {children}
    </ScreenShareContext.Provider>
  );
}

export function useScreenShare() {
  return useContext(ScreenShareContext);
}
