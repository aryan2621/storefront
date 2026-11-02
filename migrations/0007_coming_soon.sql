-- Products that are not built yet show "Coming soon" and cannot be bought.
ALTER TABLE products ADD COLUMN coming_soon INTEGER NOT NULL DEFAULT 0;

UPDATE products SET coming_soon = 1 WHERE id <> 'capturita';

-- Capturita's description now says what is free and what is Pro (same text as seed/products.sql).
UPDATE products SET description_md = 'Record a screen, window or area with mic, system audio and a camera bubble, then edit with click-following auto-zoom, a smoothed cursor, backgrounds and exports up to 4K at 60 fps, or GIF. Recording and core editing are free; Pro adds on-device captions, AI editing, animated titles and Studio motion graphics. Recordings stay on your Mac unless you choose to share them. Needs macOS 15+ on Apple silicon.' WHERE id = 'capturita';
