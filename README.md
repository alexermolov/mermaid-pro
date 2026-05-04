# Mermaid Pro

Mermaid Pro is a desktop visual editor for building Mermaid diagrams. It combines a drag-and-drop canvas, an editable Mermaid source panel, and a live preview in one Electron app.

The project is in early development and currently focuses on flowchart-style visual editing while still supporting Mermaid code import, preview, and export workflows.

## Features

- Visual canvas for creating, moving, connecting, duplicating, and deleting diagram nodes.
- Inline node labels, edge labels, node shapes, colors, and line styles.
- Mermaid code generation with optional manual editing.
- Live Mermaid preview with dark and light app themes.
- Project save/load using the `.mpro` format.
- Mermaid file import/export using `.mmd`, `.mermaid`, and `.txt`.
- draw.io import support for `.drawio` and `.xml` files.
- SVG and PNG export from the rendered preview.
- Undo and redo for diagram editing.

## Tech Stack

- Electron for the desktop shell.
- React and TypeScript for the renderer UI.
- Vite and electron-vite for development and builds.
- Mermaid for diagram rendering.
- React Flow for the visual diagram canvas.
- Monaco Editor for Mermaid source editing.

## Getting Started

### Prerequisites

- Node.js 20 or newer.
- npm.

### Install

```bash
npm install
```

### Run In Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Package The Desktop App

```bash
npm run dist
```

Packaged artifacts are written to `release/`.

### Release A Version Tag

Use the release script to update `package.json` and `package-lock.json`, create a release commit, tag it, and push the branch plus tag:

```bash
npm run release -- 0.2.0
```

The script accepts `0.2.0` or `v0.2.0` and creates a `v0.2.0` tag. By default it requires a clean working tree; pass `--include-worktree` if you intentionally want to include current changes in the release commit, or `--no-push` to keep the commit and tag local.

When passing flags through `npm run`, put an extra `--` before the flags:

```bash
npm run release -- 0.2.0 -- --include-worktree --no-push
```

## GitHub Windows Builds

The repository includes a GitHub Actions workflow that packages the Windows desktop app with electron-builder.

- Run `Windows Build` manually from the GitHub Actions tab to create a downloadable artifact.
- Push a version tag such as `v0.1.0` to run the same packaging workflow for a release tag.
- The workflow uploads the Windows installer files from `release/` as the `mermaid-pro-windows` artifact.

## Project Structure

```text
src/main/        Electron main process and native file dialogs
src/preload/     Preload bridge exposed to the renderer
src/renderer/    React application, editor UI, and styles
src/shared/      Shared TypeScript types
```

## Supported Formats

- `.mpro`: Mermaid Pro project files with visual layout and app state.
- `.mmd`, `.mermaid`, `.txt`: Mermaid source files.
- `.drawio`, `.xml`: draw.io diagrams imported into the visual editor when possible.
- `.svg`, `.png`: export formats for rendered diagrams.

## Roadmap

- Improve the `.mpro` project format and editing history.
- Add deeper Mermaid parsing for flowcharts.
- Add diagram templates and automatic layout.

## Contributing

Contributions are welcome. Please read `CONTRIBUTING.md` before opening a pull request.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
