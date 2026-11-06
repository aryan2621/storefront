import type { ProductContent } from './types';

export const murmur: ProductContent = {
  features: [
    { title: 'Dictation, anywhere', text: 'Hold Fn, speak, let go. Your words are typed wherever your cursor is. Double-tap Fn for hands-free dictation.', image: '/products/murmur/dictation.png', imageAlt: 'Murmur dictating into a text field' },
    { title: 'A voice assistant (Pro)', text: 'Hold Right Option and ask. Jarvis answers out loud, or does it for you: searches the web, reads your screen, opens apps, sets timers, plays music.', image: '/products/murmur/assistant.png', imageAlt: 'Murmur assistant screen' },
    { title: 'Private by default', text: 'Whisper for speech, a built-in Qwen3 AI and the system voice all run on your computer. No account, no tracking.', image: '/products/murmur/settings.png', imageAlt: 'Murmur settings screen' },
    { title: 'Talk instead of type', text: 'Private voice dictation and a voice assistant for your Mac and Windows PC. Your voice is transcribed on your computer.', image: '/products/murmur/history.png', imageAlt: 'Murmur history screen' },
  ],
  install: {
    requirements: ['macOS 11 or later, Apple silicon recommended', 'Windows (beta)'],
    steps: [
      { title: 'macOS: install', text: 'Download the .dmg, open it and drag Murmur into Applications, then open Murmur. A mic icon appears in the menu bar.' },
      { title: 'macOS: if Apple could not verify Murmur', text: 'If macOS says "Apple could not verify Murmur is free of malware": Murmur is not notarized (it isn\'t signed with a paid Apple Developer certificate), so macOS warns the first time. Click Done, open System Settings, Privacy & Security, scroll down, click Open Anyway next to Murmur and confirm.' },
      { title: 'macOS: if it is "damaged"', text: <>If it says Murmur "is damaged and can't be opened", run this once in Terminal and open it again: <code>xattr -dr com.apple.quarantine /Applications/Murmur.app</code></> },
      { title: 'macOS: permissions', text: 'Grant Accessibility (to own the Fn key and to paste text) and Microphone (prompted the first time you dictate) in System Settings, Privacy & Security, then quit and reopen Murmur. Screen reading (Pro) also asks for Screen Recording the first time you use it.' },
      { title: 'macOS: first-run setup', text: "First-run setup downloads the speech model (about 550 MB, once) and, optionally, the assistant's AI (4.8 GB, or 2.4 GB for smaller Macs). Run setup again any time from Settings, About, Run setup again." },
      { title: 'Windows (beta): install', text: <>Download the <code>x64-setup.exe</code> installer and run it. If Windows shows "Windows protected your PC", click More info, Run anyway.</> },
      { title: 'Windows (beta): keys', text: <>Keys on Windows: <code>right_ctrl</code> for dictation and <code>right_alt</code> for the assistant by default (<code>caps_lock</code> also works). The beta has dictation and the assistant, but not: reading the screen, reminders and the calendar, music control, browser tab control; turning the volume down while it listens, echo cancellation, the Parakeet speech engine, and the Fn key. Audio file transcription is WAV only; "volume to 30" is approximate.</> },
    ],
  },
  faq: [
    { q: 'Does my voice leave my computer?', a: 'No. Speech recognition runs on your computer. Web searches and the license check use the internet (the license check sends your key and a hashed computer ID, and Murmur then works offline for up to 30 days); optional Cloud AI sends text, not audio, to the provider you choose.' },
    { q: 'What is free and what is Pro?', a: 'Dictation is free. Pro adds the voice assistant, AI polish, command mode, the local API and MCP, and cloud AI with your own key. A Pro key works on up to two computers and includes a year of updates.' },
    { q: 'Which platforms are supported?', a: 'macOS 11+ (Apple silicon recommended) and a Windows beta. The Windows version has the assistant too, but not screen reading, reminders, calendar, music or tab control.' },
    { q: 'What does the first launch download?', a: "A speech model (about 550 MB, once) and, optionally, the assistant's AI (4.8 GB, or 2.4 GB for smaller Macs)." },
    { q: 'Why does macOS warn me when I open it?', a: 'Murmur is not signed with a paid Apple certificate. Open System Settings, Privacy & Security, and click Open Anyway. The install steps explain it.' },
    { q: 'Fn does nothing', a: 'Check Murmur is on under System Settings, Privacy & Security, Accessibility, then quit and reopen it.' },
    { q: 'Stopped working after an update', a: 'macOS can forget permissions for unsigned apps. Remove Murmur from Accessibility and Microphone, add it back, and reopen.' },
    { q: "Text didn't appear", a: 'Menu bar, Copy Last Dictation, then paste.' },
    { q: 'The assistant cuts you off', a: 'Raise Pause before answering in Settings.' },
    { q: 'It hears background noise as speech', a: 'Raise the speech threshold (speech_threshold).' },
    { q: 'Where are the logs?', a: 'Menu bar, Open Log (~/Library/Application Support/Murmur/murmur.log). On Windows: system tray, Open Log (%APPDATA%\\Murmur\\murmur.log).' },
  ],
  changelog: [
    {
      version: '0.1.0',
      date: 'October 2026',
      notes: [
        'Dictation: hold Fn, speak, release; double-tap Fn for hands-free; Esc cancels.',
        'Voice assistant (Jarvis, Pro): searches the web, reads your screen, opens apps, sets timers, plays music; answers out loud.',
        'Runs on your computer: Whisper speech recognition, a built-in Qwen3 AI and the system voice.',
        'AI polish, command mode, local HTTP API and MCP, and cloud AI with your own key (Pro).',
        'Audio file transcription, history with export, per-app styles.',
        'Windows beta with dictation and the assistant (no screen reading, reminders, calendar, music or tab control).',
      ],
    },
  ],
};
