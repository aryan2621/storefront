import type { ProductContent } from './types';
import { capturita } from './capturita';
import { murmur } from './murmur';
import { orbitIde } from './orbit-ide';

/** Keyed by product id (the /p/:slug value). Add one file per product and register it here. */
export const productContent: Record<string, ProductContent> = {
  capturita,
  murmur,
  'orbit-ide': orbitIde,
};
