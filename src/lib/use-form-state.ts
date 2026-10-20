"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useWorkspace } from "@/components/layout/workspace-context";

export interface UseFormStateOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<boolean | void>;
}

export function useFormState<T extends Record<string, unknown>>({
  initialValues,
  onSubmit,
}: UseFormStateOptions<T>) {
  const workspace = useWorkspace();
  const [initial, setInitial] = useState<T>(initialValues);
  const [values, setValuesState] = useState<T>(initialValues);
  const [isSaving, setIsSaving] = useState(false);

  // Sync initialValues if prop updates
  useEffect(() => {
    setInitial(initialValues);
    setValuesState(initialValues);
  }, [initialValues]);

  const isDirty = useMemo(() => {
    const keys = Array.from(
      new Set([...Object.keys(values), ...Object.keys(initial)])
    );
    for (const key of keys) {
      if (values[key] !== initial[key]) {
        return true;
      }
    }
    return false;
  }, [values, initial]);

  // Sync isDirty with Workspace Context
  useEffect(() => {
    if (workspace) {
      workspace.setIsDirty(isDirty);
    }
  }, [isDirty, workspace]);

  // Intercept browser window closure or hard reload when form is dirty
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }

    if (isDirty) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  const setValue = useCallback(<K extends keyof T>(key: K, val: T[K]) => {
    setValuesState((prev) => ({
      ...prev,
      [key]: val,
    }));
  }, []);

  const setValues = useCallback((patch: Partial<T>) => {
    setValuesState((prev) => ({
      ...prev,
      ...patch,
    }));
  }, []);

  const reset = useCallback(() => {
    setValuesState(initial);
    if (workspace) {
      workspace.setIsDirty(false);
    }
  }, [initial, workspace]);

  const submit = useCallback(async () => {
    setIsSaving(true);
    try {
      const result = await onSubmit(values);
      if (result !== false) {
        setInitial(values);
        if (workspace) {
          workspace.setIsDirty(false);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Form submit error:", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [onSubmit, values, workspace]);

  return {
    values,
    setValue,
    setValues,
    isDirty,
    isSaving,
    reset,
    submit,
  };
}
