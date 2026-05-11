import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Segmented } from '@/components/create-league-v2/primitives'
import { ACCENTS } from '@/lib/create-league-v2/theme'

describe('Create League thumbnail fallbacks', () => {
  it('Segmented draft row tolerates empty thumbnailSrc with gradient strip', () => {
    render(
      <Segmented
        options={[{ value: 'snake', label: 'Snake', hint: 'Test', thumbnailSrc: '' }]}
        value="snake"
        onChange={() => {}}
        accent={ACCENTS.redraft}
        ariaLabel="Draft format"
      />,
    )
    expect(screen.getByRole('radio', { name: /Snake/i })).toBeInTheDocument()
  })
})
