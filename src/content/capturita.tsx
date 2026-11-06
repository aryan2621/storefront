import type { ProductContent } from './types';

export const capturita: ProductContent = {
  features: [
    { title: 'Make every recording clear and polished', text: 'Trim, split and cut. Smooth cursor movement, springy click zooms, custom backgrounds and clean exports.', image: '/products/capturita/editor-hero.jpg', imageAlt: 'Capturita editor playing a recording on a gradient background, with the timeline and zoom track below' },
    { title: 'Choose what to capture', text: 'Capture a display, window, or custom area, with microphone, system audio, or camera when you need them.', image: '/products/capturita/recordings-library.jpg', imageAlt: 'Capturita recordings library with saved Studio projects' },
    { title: 'Turn speech into finished captions', text: 'Transcribe speech on your Mac, then use AI to tighten a demo or cut a pause. Build motion-graphic scenes in Studio and review every suggested edit before applying it.', image: '/products/capturita/captions-settings.jpg', imageAlt: 'Capturita captions settings showing on-device speech models' },
  ],
  install: {
    steps: [
      { title: 'Download', text: 'Get the .dmg from the Capturita download page (the link on this page), open it and drag Capturita into Applications.' },
      { title: 'If macOS does not trust it', text: <>Capturita is not signed with a paid Apple certificate. If macOS says it cannot verify the app, open System Settings, Privacy & Security and choose Open Anyway. If it says the app is damaged, run <code>xattr -dr com.apple.quarantine /Applications/Capturita.app</code> once and open it again.</> },
      { title: 'Permissions', text: 'Grant Screen Recording on first launch. Microphone and Camera are optional.' },
      { title: 'Activate Pro', text: 'Open Settings, License, paste your key and choose Activate. The first activation needs the internet.' },
    ],
    requirements: ['macOS 15 or later', 'Apple silicon (M1 or newer)', 'Capturita is macOS-only', 'Captions: a speech model of 547 MB by default; the local AI editor: a model of 2.4 GB on 8 GB Macs, 6.4 GB or more on 16 GB and up'],
  },
  faq: [
    { q: 'What is free and what is Pro?', a: 'Free: recording (screen, window, area, mic, system audio, camera), trimming, splitting, cutting, speed, auto-zoom, cursor smoothing, backgrounds, hiding private areas, MP4 and GIF export, and uploads. Pro: on-device captions, AI editing, text and animated titles, and Studio motion graphics.' },
    { q: 'Does anything leave my Mac?', a: 'Recordings, captions and the default AI editor stay on your Mac. Cloud AI is opt-in: it sends your transcript (and, for Studio drafts, the text you provide and still images of scenes) to the provider whose key you enter. YouTube and Drive uploads are opt-in and use your own Google Cloud project. Models download from Hugging Face.' },
    { q: 'Does it update itself?', a: 'No. Download newer installers from the Capturita download page. A key includes updates for builds released within its update period.' },
    { q: 'Do I need a key if I build from source?', a: 'No. Source builds from the MIT repository have Pro unlocked. The key is for official builds.' },
    { q: 'How is my key checked?', a: 'The signature is checked on your Mac. Official builds also activate the key online, which records your Mac (a hashed device ID and its name) and checks whether the key has been refunded. If the service is unreachable, the app allows up to 30 days since its last successful check for offline use.' },
  ],
};
