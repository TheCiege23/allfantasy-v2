"use client";

import { useEffect } from 'react';
import { initPWA } from '@/lib/pwa';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    initPWA();
  }, []);

  return null;
}
