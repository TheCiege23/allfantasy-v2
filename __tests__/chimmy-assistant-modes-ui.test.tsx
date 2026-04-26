import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ChimmyAssistantModeSelector from '@/components/chimmy/ChimmyAssistantModeSelector'

describe('ChimmyAssistantModeSelector', () => {
  it('renders selector when enabled', () => {
    render(
      React.createElement(ChimmyAssistantModeSelector, {
        enabled: true,
        value: 'fast_take',
        onChange: () => undefined,
      })
    )

    expect(screen.getByTestId('chimmy-assistant-mode-select')).toBeInTheDocument()
  })

  it('hides selector when disabled', () => {
    render(
      React.createElement(ChimmyAssistantModeSelector, {
        enabled: false,
        value: 'fast_take',
        onChange: () => undefined,
      })
    )

    expect(screen.queryByTestId('chimmy-assistant-mode-select')).not.toBeInTheDocument()
  })

  it('emits selected mode value on change', () => {
    let selected = 'fast_take'

    render(
      React.createElement(ChimmyAssistantModeSelector, {
        enabled: true,
        value: 'fast_take',
        onChange: (next: any) => {
          selected = next
        },
      })
    )

    fireEvent.change(screen.getByTestId('chimmy-assistant-mode-select'), {
      target: { value: 'deep_analysis' },
    })

    expect(selected).toBe('deep_analysis')
  })
})
