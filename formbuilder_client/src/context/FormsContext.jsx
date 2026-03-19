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
    } catch (e) {
      console.warn("[FormsContext] Failed to load forms from localStorage:", e);
    }
  }, []);

  const persistForms = useCallback((updateFn) => {
    setForms((prevForms) => {
      const updatedForms = typeof updateFn === "function" ? updateFn(prevForms) : updateFn;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedForms));
      } catch (e) {
        console.warn("[FormsContext] Failed to persist forms to localStorage:", e);
      }
      return updatedForms;
    });
  }, []);

  const addForm = useCallback(
    (form) => {
      persistForms((prevForms) => [
        { ...form, localCreatedAt: new Date().toISOString() },
        ...prevForms,
      ]);
    },
    [persistForms]
  );

  const updateForm = useCallback(
    (formId, updates) => {
      persistForms((prevForms) =>
        prevForms.map((f) => (f.id === formId ? { ...f, ...updates } : f))
      );
    },
    [persistForms]
  );

  const getForm = useCallback(
    (formId) => forms.find((f) => f.id === Number(formId) || f.id === formId),
    [forms]
  );

  const setFormFromServer = useCallback(
    (serverForm) => {
      persistForms((prevForms) => {
        const existing = prevForms.find((f) => f.id === serverForm.id);

        const formWithMeta = {
          ...serverForm,
          localCreatedAt:
            existing?.localCreatedAt || new Date().toISOString(),
        };

        return existing
          ? prevForms.map((f) => (f.id === serverForm.id ? formWithMeta : f))
          : [formWithMeta, ...prevForms];
      });
    },
    [persistForms]
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