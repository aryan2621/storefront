import type { ProductContent } from './types';

export const capturita: ProductContent = {
  features: [
    { title: 'Make every recording clear and polished', text: 'Trim, split and cut. Smooth cursor movement, springy click zooms, custom backgrounds and clean exports.', image: '/products/capturita/editor-hero.jpg', imageAlt: 'Capturita editor playing a recording on a gradient background, with the timeline and zoom track below' },
    { title: 'Choose what to capture', text: 'Capture a display, window, or custom area, with microphone, system audio, or camera when you need them.', image: '/products/capturita/recordings-library.jpg', imageAlt: 'Capturita recordings library with saved Studio projects' },
    { title: 'Turn speech into finished captions', text: 'Transcribe speech on your Mac, then use AI to tighten a demo or cut a pause. Build motion-graphic scenes in Studio and review every suggested edit before applying it.', image: '/products/capturita/captions-settings.jpg', imageAlt: 'Capturita captions settings showing on-device speech models' },
  ],
  install: {
    steps: [], // install and troubleshooting live on the product site
    requirements: ['macOS 15 or later', 'Apple silicon (M1 or newer)', 'Capturita is macOS-only'],
  },
  faq: [
    { q: 'How is my key checked?', a: 'The signature is checked on your Mac. Official builds also activate the key online, which records your Mac (a hashed device ID and its name) and checks whether the key has been refunded. If the service is unreachable, the app allows up to 30 days since its last successful check for offline use.' },
  ],
};
