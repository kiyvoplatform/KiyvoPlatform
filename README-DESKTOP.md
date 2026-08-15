# Kiyvo Desktop testing setup

## Requirements

- Windows 10/11
- Node.js 18 or 20 LTS
- Kiyvo running at `http://localhost/`
- Apache and MySQL started

## Run in development

```bat
cd desktop
npm install
start-kiyvo-local.bat
```

For developer tools:

```bat
start-kiyvo-dev.bat
```

## Use another Kiyvo server

```bat
set KIYVO_URL=https://kiyvo.example.com/
npm start
```

## Build Windows installers

Run:

```bat
build-windows.bat
```

Outputs are written to `desktop/dist/` and include an NSIS installer and portable executable.

## Desktop security

The client uses context isolation, disabled Node.js integration, a sandboxed renderer, restricted permissions, persistent Kiyvo sessions, and opens non-Kiyvo URLs in the system browser.

## Camera and screen preview

Camera and microphone permission is allowed for Kiyvo. Screen selection uses Electron's display-media support. The preview remains local unless a streaming media server is connected to Kiyvo.
