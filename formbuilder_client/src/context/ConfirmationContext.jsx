"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import ConfirmationModal from "@/components/common/ConfirmationModal";

const ConfirmationContext = createContext(null);

export const ConfirmationProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "warning",
    loading: false
  });
  
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    // If options is a string, treat it as message
    const customConfig = typeof options === "string" ? { message: options } : options;
    
    setConfig({
      title: "Confirm Action",
      confirmText: "Confirm",
      cancelText: "Cancel",
      type: "warning",
      loading: false,
      ...customConfig,
    });
    
    setIsOpen(true);
    
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolverRef.current) resolverRef.current(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolverRef.current) resolverRef.current(false);
  }, []);

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <ConfirmationModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        {...config}
      />
    </ConfirmationContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmationProvider");
  }
  return context;
};
