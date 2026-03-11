"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const FormsContext = createContext(null);

const STORAGE_KEY = "formbuilder_forms";

export function FormsProvider({ children }) {
  const [forms, setForms] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setForms(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const persistForms = useCallback((updatedForms) => {
    setForms(updatedForms);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedForms));
    } catch {
      // ignore
    }
  }, []);

  const addForm = useCallback(
    (form) => {
      persistForms([
        { ...form, localCreatedAt: new Date().toISOString() },
        ...forms,
      ]);
    },
    [forms, persistForms]
  );

  const updateForm = useCallback(
    (formId, updates) => {
      persistForms(
        forms.map((f) => (f.id === formId ? { ...f, ...updates } : f))
      );
    },
    [forms, persistForms]
  );



  const getForm = useCallback(
    (formId) => forms.find((f) => f.id === Number(formId) || f.id === formId),
    [forms]
  );

  const setFormFromServer = useCallback(
    (serverForm) => {
      const existing = forms.find((f) => f.id === serverForm.id);

      const formWithMeta = {
        ...serverForm,
        localCreatedAt:
          existing?.localCreatedAt || new Date().toISOString(),
      };

      const updatedForms = existing
        ? forms.map((f) => (f.id === serverForm.id ? formWithMeta : f))
        : [formWithMeta, ...forms];

      persistForms(updatedForms);
    },
    [forms, persistForms]
  );

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <FormsContext.Provider
      value={{
        forms,
        addForm,
        updateForm,

        getForm,
        setFormFromServer,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </FormsContext.Provider>
  );
}

export function useForms() {
  const ctx = useContext(FormsContext);
  if (!ctx) throw new Error("useForms must be used within FormsProvider");
  return ctx;
}
