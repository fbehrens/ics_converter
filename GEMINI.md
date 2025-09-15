## Project Overview

This is a monorepo project managed with `pnpm` workspaces. It contains two main packages:

1.  **`packages/parser`**: A TypeScript library for parsing `.ics` (iCal) files.
2.  **`packages/web`**: A SvelteKit web application that likely uses the `parser` library to display calendar data.

The project is configured to use TypeScript, Svelte, and Tailwind CSS.

## Building and Running

The primary focus for running the application is the `web` package.

### Web Application (`packages/web`)

*   **Install dependencies:**
    ```bash
    pnpm install
    ```
*   **Run in development mode:**
    ```bash
    pnpm --filter web dev
    ```
*   **Build for production:**
    ```bash
    pnpm --filter web build
    ```
*   **Run tests:**
    ```bash
    pnpm --filter web test
    ```

## Development Conventions

*   **Package Manager**: `pnpm` is used for managing dependencies and workspaces.
*   **Linting**: ESLint is configured for code quality. Run `pnpm --filter web lint`.
*   **Formatting**: Prettier is used for code formatting. Run `pnpm --filter web format`.
*   **Testing**: Vitest is used for unit testing.
*   **Typing**: The project uses TypeScript.
