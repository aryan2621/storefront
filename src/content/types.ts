import type { ReactNode } from 'react';

export interface Feature {
  title: string;
  text: string;
  /** Path under /public, e.g. /products/capturita/editor.jpg */
  image?: string;
  imageAlt?: string;
}

export interface InstallStep {
  title: string;
  text: ReactNode;
}

export interface FaqItem {
  q: string;
  a: ReactNode;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  notes: string[];
}

/** Marketing content for one product page. Price, devices and refund window come from the API, not from here. */
export interface ProductContent {
  features: Feature[];
  install?: { steps: InstallStep[]; requirements?: string[] };
  faq?: FaqItem[];
  changelog?: ChangelogEntry[];
}
