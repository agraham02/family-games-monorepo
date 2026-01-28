# 🧠 GitHub Copilot Instructions

These instructions are meant to guide GitHub Copilot (and other AI pair programmers) to generate code that aligns with our design system and engineering standards for this Next.js project.

---

## 🛠️ Tech Stack Guidelines

- **Framework:** Next.js v15 (App Router)
- **Styling:** Tailwind CSS v4
- **UI Library:** [shadcn/ui](https://ui.shadcn.dev/)
- **Animation:** [Framer Motion](https://www.framer.com/motion/)
- **Dark Mode:** Must support dark/light toggle using Tailwind's `dark:` class system
- **Design Philosophy:** Clean, modern, minimalist UI with responsiveness in mind
- Whenever we implement or update a game UI, we can check it debug/game-ui

---

## 💡 Copilot Coding Rules

### ✅ Do

- Use **`shadcn/ui` components** whenever possible (`Button`, `Card`, `Dialog`, etc.).
- Use **Tailwind CSS v4 utility classes** for styling. Stick to `flex`, `grid`, `gap`, and `padding/margin` utilities.
- Default to **responsive design** with `flex`, `grid`, and `min/max width` utilities. Avoid pixel-perfect layouts that break on mobile.
- Use `dark:` variants to support dark mode — aim for a good experience on both themes.
- Use **Framer Motion** for subtle transitions, animations, and page/element transitions.
- Structure components in `/src/components`, and co-locate styles when needed.
- Use **server components** by default in `app/`, and client components (`'use client'`) only when necessary (e.g., interactivity, animations).
- Use **async/await** for asynchronous code — avoid `.then()` and callback nesting.
- Define components using the `function MyComponent() {}` syntax — avoid arrow functions (`const MyComponent = () => {}`) for components.
- Follow **DRY** principles — avoid duplicating logic, styles, or markup unnecessarily.
- Ensure each function or file does **only one thing**. Break large logic into **dedicated helper functions** or files.
- Use **semantic HTML** and accessible markup (`<nav>`, `<header>`, `aria-*`, etc.).
- When implementing or updating game logic or game UI, also ensure that debug/game-ui is updated too (for manual testing)

### ❌ Don’t

- Don’t use inline `style={{}}` unless absolutely necessary.
- Don’t hardcode pixel values for positioning/layout. Use Tailwind spacing and sizing instead.
- Don’t use absolute/relative positioning for general layout unless required (e.g., overlays, tooltips).
- Don’t suggest or use legacy Next.js pages (`pages/` directory). Use App Router only.
- Don’t generate overly complex animations — keep it minimal and elegant.
- Don’t duplicate shadcn components — import from the central `components/ui` unless customizing.
- Don’t use `.then()` or callbacks for async logic — always use `async/await`.
- Don’t define components as arrow functions if they can be standard functions.
- Don’t write large, unfocused files — **split logic and responsibilities** appropriately.
- Don't just be a yes man. Critique any flaws in my ideas and give me alternative solutions if necessary

---

## Dark Mode

Respect the user's system preference or manual toggle.

Use Tailwind’s dark: prefix. Avoid hardcoded color values unless using Tailwind tokens or shadcn/ui themes.
