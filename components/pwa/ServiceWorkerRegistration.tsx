"use client";

import { useEffect } from 'react';
import { initPWA } from '@/lib/pwa';
import { shouldRegisterServiceWorker } from '@/lib/pwa/shouldRegisterServiceWorker';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!shouldRegisterServiceWorker()) {
      return;
    }

    initPWA();
  }, []);

  return null;
}
