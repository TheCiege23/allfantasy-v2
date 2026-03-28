'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { gtagEvent } from '@/lib/gtag'

/**
 * Lightweight Core Web Vitals reporting.
 * Sends LCP, INP, CLS, FCP, and TTFB to analytics for ongoing tuning.
 */
export default function WebVitalsTracker() {
  useReportWebVitals((metric) => {
    const roundedValue =
      metric.name === 'CLS' ? Number(metric.value.toFixed(4)) : Math.round(metric.value)

    gtagEvent('web_vitals', {
      metric_name: metric.name,
      metric_id: metric.id,
      metric_value: roundedValue,
      metric_rating: metric.rating,
      metric_delta:
        metric.name === 'CLS' ? Number(metric.delta.toFixed(4)) : Math.round(metric.delta),
    })
  })

  return null
}
