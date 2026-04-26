import React from 'react'
import {
  CHIMMY_ASSISTANT_MODE_LABELS,
  CHIMMY_ASSISTANT_MODE_VALUES,
  type ChimmyAssistantMode,
} from '@/lib/chimmy-chat/assistant-mode'

type ChimmyAssistantModeSelectorProps = {
  enabled: boolean
  value: ChimmyAssistantMode
  onChange: (nextMode: ChimmyAssistantMode) => void
}

export default function ChimmyAssistantModeSelector(props: ChimmyAssistantModeSelectorProps) {
  if (!props.enabled) return null

  return React.createElement(
    'label',
    {
      className: 'flex flex-col gap-1 min-w-[180px] flex-1 sm:flex-none',
      'data-testid': 'chimmy-assistant-mode-wrap',
    },
    React.createElement(
      'span',
      { className: 'text-[10px] uppercase tracking-wide text-white/45' },
      'Assistant mode',
    ),
    React.createElement(
      'select',
      {
        'data-testid': 'chimmy-assistant-mode-select',
        className:
          'rounded-lg border border-white/15 bg-[#040915] px-2 py-1.5 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-cyan-500/40',
        value: props.value,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
          props.onChange(e.target.value as ChimmyAssistantMode),
      },
      ...CHIMMY_ASSISTANT_MODE_VALUES.map((mode) =>
        React.createElement('option', { key: mode, value: mode }, CHIMMY_ASSISTANT_MODE_LABELS[mode]),
      ),
    ),
  )
}
