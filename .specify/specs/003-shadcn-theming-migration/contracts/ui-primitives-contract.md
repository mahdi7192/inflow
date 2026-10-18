# UI Primitives & Theming Contract

**Feature**: `003-shadcn-theming-migration`
**Date**: 2026-10-18

## 1. Export Interface Contract

All components in `src/components/ui/` must export consistent TypeScript interfaces:

```typescript
// Button Contract
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// Input Contract
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

// Card Contracts
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

// Brand Logo Contract
export interface BrandLogoProps {
  size?: "sm" | "default" | "lg";
  showText?: boolean;
  className?: string;
}
```

## 2. Page Migration Mapping

| Route | Old Raw Element / Class | New Primitive Contract |
| :--- | :--- | :--- |
| `/login` Header | Inline Instagram SVG + custom text | `<BrandLogo size="default" />` |
| `/login` Card | `<div className="w-full max-w-md bg-slate-900/90 border border-slate-800 ...">` | `<Card className="w-full max-w-md ...">` |
| `/login` Inputs | Raw `<input className="bg-slate-950/80 border-slate-700/80 ...">` | `<Input type="text" ... />` |
| `/login` Submit | Raw `<button className="bg-gradient-to-r from-purple-600 ...">` | `<Button variant="brand" size="lg" className="w-full">` |
| `/` Dashboard Header | `<svg viewBox="0 0 76 65"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />` | `<BrandLogo size="sm" />` |
| `/` Language Switcher | Raw `<button className="bg-white/15 ...">` | `<Button variant={active ? "default" : "ghost"} size="sm">` |
| `/backoffice` Header | Raw link with custom arrow | `<BrandLogo size="sm" />` with unified back-navigation |
