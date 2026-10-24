/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * JSX typings for the @material/web custom elements registered in
 * `src/components/material/material-web-provider.tsx`. Keep both lists in sync.
 * Prefer the controlled wrappers in `src/components/material/m3.tsx` for
 * stateful elements (switch, text field, filter chip, tabs).
 */
declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      // Buttons & FAB
      "md-filled-button": any;
      "md-filled-tonal-button": any;
      "md-outlined-button": any;
      "md-text-button": any;
      "md-elevated-button": any;
      "md-icon-button": any;
      "md-filled-icon-button": any;
      "md-filled-tonal-icon-button": any;
      "md-fab": any;
      // Inputs & selection
      "md-outlined-text-field": any;
      "md-filled-text-field": any;
      "md-switch": any;
      "md-checkbox": any;
      // Chips
      "md-chip-set": any;
      "md-filter-chip": any;
      "md-assist-chip": any;
      "md-input-chip": any;
      "md-suggestion-chip": any;
      // Containment & feedback
      "md-ripple": any;
      "md-elevation": any;
      "md-focus-ring": any;
      "md-dialog": any;
      "md-divider": any;
      "md-circular-progress": any;
      "md-linear-progress": any;
      // Navigation
      "md-tabs": any;
      "md-primary-tab": any;
      "md-secondary-tab": any;
    }
  }
}
