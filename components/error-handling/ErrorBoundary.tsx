'use client'

import React from 'react'
import { captureException } from '@/lib/error-tracking'
import { ErrorFallback } from './ErrorFallback'

export type ErrorBoundaryProps = {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, info: React.ErrorInfo) => void
  onReset?: () => void
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureException(error, { context: 'ErrorBoundary', componentStack: info.componentStack })
    this.props.onError?.(error, info)
  }

  reset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <ErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.reset}
        />
      )
    }
    return this.props.children
  }
}
