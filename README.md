# Tarjiman Desktop

Floating, always-on-top live translation overlay for Windows.
Captures your PC's system audio automatically (any video/app playing) and
shows a translated live caption box that floats above other windows.

## Features
- Transparent, borderless caption box — same look as Tarjiman Live (web).
- Free drag anywhere on screen (including a second monitor).
- Stays visible even if you minimize other windows.
- Automatic system-audio capture (no manual source picking).
- Tray icon with Show/Hide (Ctrl+Alt+T) and click-through toggle (Ctrl+Alt+C).
- Uses the same translation server as Tarjiman Live (Groq Whisper + LLM).

## Run locally (development)
```
npm install
npm start
```

## Build the Windows installer (.exe) yourself
```
npm install
npm run dist
```
The installer will appear in `dist/*.exe`.

## Get a ready-made installer without a Windows machine
This repo includes a GitHub Actions workflow (`.github/workflows/build.yml`)
that automatically builds the Windows installer on every push to `main`.
1. Go to the repo's **Actions** tab.
2. Open the latest **Build Windows Installer** run.
3. Download the **TarjimanDesktop-Windows-Installer** artifact (zip containing the `.exe`).
4. Run the `.exe` to install on any Windows PC.

## Notes / limitations
- Windows only for now (macOS build can be added later).
- The overlay uses the strongest "always on top" level Electron/Windows allow;
  it may not appear above an app running in true exclusive fullscreen mode
  (rare, mostly some games). Fullscreen video in browsers/players works fine.
