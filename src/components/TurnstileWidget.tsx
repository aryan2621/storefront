import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  siteKey: string | null;
  onToken: (token: string) => void;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ siteKey, onToken }) => {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !ref.current) {
      onToken('dev-bypass');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      if (ref.current && window.turnstile) {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: 'dark',
          callback: (token: string) => onToken(token),
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [siteKey, onToken]);

  if (!siteKey) {
    return null;
  }

  return <div ref={ref} className="mt-2" />;
};
