"use client";

/**
 * FormsContext
 *
 * Changes from original:
 * 1. Removed localStorage persistence — the server is the source of truth.
 *    Persisting server data in localStorage caused stale-data bugs (e.g. a
 *    form deleted on the server still appeared after a page refresh).
 * 2. Removed showToast / dismissToast / toasts — the app uses react-hot-toast
 *    everywhere. Having a second toast system caused duplicate notifications
 *    and confused which one to call. All toast calls now go through
 *    `import { toast } from "react-hot-toast"`.
 */

import { createContext, useContext, useState, useCallback } from "react";

const FormsContext = createContext(null);

export function FormsProvider({ children }) {
  const [forms, setForms] = useState([]);

  /** Add a newly created form to local state (avoids a full re-fetch). */
  const addForm = useCallback((form) => {
    setForms((prev) => [
      { ...form, localCreatedAt: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  /** Patch a specific form in local state. */
  const updateForm = useCallback((formId, updates) => {
    setForms((prev) =>
      prev.map((f) => (f.id === formId ? { ...f, ...updates } : f))
    );
  }, []);

  /** Look up a form by id (accepts string or number). */
  const getForm = useCallback(
    (formId) =>
      forms.find((f) => f.id === Number(formId) || f.id === formId),
    [forms]
  );

  /**
   * Upsert a form received from the server into local state.
   * Used by the form builder after fetching the latest form data.
   */
  const setFormFromServer = useCallback((serverForm) => {
    setForms((prev) => {
      const existing = prev.find((f) => f.id === serverForm.id);
      const formWithMeta = {
        ...serverForm,
        localCreatedAt: existing?.localCreatedAt ?? new Date().toISOString(),
      };
      return existing
        ? prev.map((f) => (f.id === serverForm.id ? formWithMeta : f))
        : [formWithMeta, ...prev];
    });
  }, []);

  return (
    <FormsContext.Provider
      value={{ forms, addForm, updateForm, getForm, setFormFromServer }}
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