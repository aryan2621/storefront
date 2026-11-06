import type { ProductContent } from './types';

const img = (f: string) => `/products/orbit-ide/${f}.webp`;

export const orbitIde: ProductContent = {
  features: [
    { title: 'An editor that knows Android', text: 'Kotlin, Java and XML completion, diagnostics, go to definition and rename. Templates for Compose, Views, multi-module, library and Hilt + Room.', image: img('editor'), imageAlt: 'Orbit editing a Kotlin file' },
    { title: 'See Compose without an emulator', text: 'The Preview panel renders your @Preview functions beside the code, straight from Gradle. No device to boot.', image: img('preview'), imageAlt: 'The Compose Preview panel under a Kotlin file' },
    { title: 'Build, run and debug', text: 'Run on an emulator or a phone, set breakpoints and step through them, and watch the build output as it happens.', image: img('run'), imageAlt: "Orbit's build console and code" },
    { title: 'Logcat you can click through', text: 'Filter by app, level or text, and jump from a stack frame straight to the line. Crashes land in Problems.', image: img('logcat'), imageAlt: 'Logcat with level filters and a search box' },
    { title: 'From debug build to Google Play', text: 'Signing, version numbers, icons, localization and a release checklist, then an .aab export and the upload, in one view.', image: img('release'), imageAlt: 'The Release view with its checklist' },
    { title: 'It asks before it touches anything', text: 'Fix a build error or rewrite a selection. Every file change, build and run waits for your approval, and it cannot run shell commands.', image: img('ai'), imageAlt: "Orbit's AI chat explaining a Kotlin file" },
  ],
  install: {
    requirements: [
      'macOS 13 Ventura or later, Apple silicon or Intel.',
      'The on-device AI needs Apple silicon (8 GB of memory runs the small model; 16 GB or more is recommended).',
      'A JDK and the Android SDK command-line tools. The setup wizard walks you through installing what is missing.',
    ],
    steps: [
      { title: 'Install', text: <>Download the <code>.dmg</code>, open it and drag Orbit into Applications, then open Orbit.</> },
      { title: 'If macOS cannot verify Orbit', text: 'If macOS says it cannot verify Orbit is free of malware: this build is not notarized by Apple yet, so macOS warns the first time. Click Done, open System Settings, Privacy & Security, scroll down, click Open Anyway next to Orbit and confirm.' },
      { title: 'If it says Orbit is damaged', text: <>If it says Orbit "is damaged and can't be opened", run this once in Terminal and open it again: <code>xattr -dr com.apple.quarantine /Applications/Orbit.app</code></> },
      { title: 'Run the setup wizard', text: 'The setup wizard checks for a JDK and the Android SDK command-line tools and walks you through installing what is missing. Open it again any time from the command palette.' },
      { title: 'Optional: choose an AI model', text: 'Choose a model in the AI panel. Models are 2 to 5 GB and download once from Hugging Face.' },
      { title: 'Open a project', text: 'Open a Gradle project, or create one with New Android App, then press Run. iOS is not available yet. Newer versions are published on the downloads page; Orbit does not update itself.' },
    ],
  },
  faq: [
    { q: 'Does my code leave my computer?', a: "No. The AI runs on your Mac and your code is never uploaded by Orbit. Orbit goes online only to download a model or toolchain, let Gradle fetch dependencies, upload a build you ask it to upload, and, if you turn them on, send questions to your own cloud AI (Pro). Nothing goes to Orbit's servers because there are none." },
    { q: 'Which platforms are supported?', a: 'macOS 13 Ventura or later, Apple silicon or Intel. The on-device AI needs Apple silicon. Orbit builds Android apps today; iOS support is planned but not available yet.' },
    { q: 'What does setup need?', a: 'A JDK and the Android SDK command-line tools. The setup wizard checks for them and walks you through installing what is missing.' },
    { q: 'Why does macOS warn me when I open it?', a: 'This build is not notarized by Apple yet, so macOS warns the first time. Open System Settings, Privacy & Security, and click Open Anyway.' },
    { q: 'Is there a free version?', a: 'Yes. Editing, building, running, debugging, Logcat, Git, tests and local AI chat are free. Pro adds AI edits, your own cloud AI and the Google Play shipping tools. There is no trial: Free is the full editor and local AI chat.' },
    { q: 'How does the Pro license work?', a: 'Pro is a one-time purchase with a year of updates. Paste the key in Settings, About, Manage license. It is activated online on up to two Macs and re-checked about every six hours; Orbit keeps working offline for up to 30 days after the last check (the key and a hashed Mac ID are sent). A version released after your updates end keeps working as Free until you renew. Builds from source have Pro unlocked.' },
    { q: 'Which cloud AI can I use?', a: 'Optional and Pro only, with your own key: OpenAI, Claude, Gemini or any OpenAI-compatible API. Your questions go to the provider you pick; nothing goes to Orbit.' },
  ],
  changelog: [
    {
      version: '1.0.6',
      date: 'November 2026',
      notes: [
        'Pro licenses now activate online on up to two Macs; a refunded key goes back to Free at the next check. Works offline for 30 days.',
        'Cloud AI: OpenAI, Claude, Gemini or any OpenAI-compatible API, and it now works on Intel Macs and Macs with less memory too.',
        'The 14-day trial is gone: Free is the full editor with local AI chat.',
      ],
    },
    {
      version: '1.0.2',
      date: 'October 2026',
      notes: [
        'Build, run and debug Android apps: Gradle, emulators and phones, breakpoints, Logcat with clickable stack frames, test results.',
        'Kotlin, Java and XML code intelligence; Git, search, split editor and terminal.',
        'On-device AI assistant (Apple silicon): chat, Fix with AI, edit a selection. It asks before every file change, build or run.',
        'Ship to Google Play: signing, version and build numbers, app icons, App Settings, localization, release checklist, .aab export and upload.',
        'Templates for Compose, Views, multi-module, library and Hilt + Room apps; Gradle sync and a dependencies view; Compose Preview.',
      ],
    },
  ],
};
