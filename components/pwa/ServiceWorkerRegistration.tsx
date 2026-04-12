"use client";

import { useEffect } from 'react';
import { initPWA } from '@/lib/pwa';

function shouldRegisterServiceWorker(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  const flag = process.env.NEXT_PUBLIC_ENABLE_PWA_SW;
  return flag === '1' || flag === 'true';
}

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
