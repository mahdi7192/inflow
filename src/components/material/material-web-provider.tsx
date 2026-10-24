"use client";

import React, { useEffect } from "react";

export function MaterialWebProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Dynamically register Material 3 Web Components in browser only.
    // Keep in sync with the JSX typings in `src/types/material-web.d.ts`.
    Promise.all([
      // Buttons & FAB
      import("@material/web/button/filled-button.js"),
      import("@material/web/button/filled-tonal-button.js"),
      import("@material/web/button/outlined-button.js"),
      import("@material/web/button/text-button.js"),
      import("@material/web/button/elevated-button.js"),
      import("@material/web/iconbutton/icon-button.js"),
      import("@material/web/iconbutton/filled-icon-button.js"),
      import("@material/web/iconbutton/filled-tonal-icon-button.js"),
      import("@material/web/fab/fab.js"),
      // Inputs & selection
      import("@material/web/textfield/outlined-text-field.js"),
      import("@material/web/textfield/filled-text-field.js"),
      import("@material/web/switch/switch.js"),
      import("@material/web/checkbox/checkbox.js"),
      // Chips
      import("@material/web/chips/chip-set.js"),
      import("@material/web/chips/filter-chip.js"),
      import("@material/web/chips/assist-chip.js"),
      import("@material/web/chips/input-chip.js"),
      import("@material/web/chips/suggestion-chip.js"),
      // Containment & feedback
      import("@material/web/ripple/ripple.js"),
      import("@material/web/elevation/elevation.js"),
      import("@material/web/focus/md-focus-ring.js"),
      import("@material/web/dialog/dialog.js"),
      import("@material/web/divider/divider.js"),
      import("@material/web/progress/circular-progress.js"),
      import("@material/web/progress/linear-progress.js"),
      // Navigation
      import("@material/web/tabs/tabs.js"),
      import("@material/web/tabs/primary-tab.js"),
      import("@material/web/tabs/secondary-tab.js"),
    ]).catch((err) => {
      console.warn("Failed to load @material/web components:", err);
    });
  }, []);

  return <>{children}</>;
}
