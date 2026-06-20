import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import WaiverPlayerRow from '@/components/waiver-wire/WaiverPlayerRow'

const basePlayer = {
  id: 'player-1',
  name: 'Brock Bowers',
  position: 'TE',
  team: 'LV',
  projectedPoints: 12.4,
  adp: 30,
}

describe('WaiverPlayerRow add/drop CTA (Step 3B)', () => {
  it('renders an Add button in addMode and calls onAdd (not the claim drawer)', () => {
    const onAdd = vi.fn()
    const onAddClick = vi.fn()
    render(<WaiverPlayerRow player={basePlayer} sport="NFL" addMode onAdd={onAdd} onAddClick={onAddClick} />)
    const addBtn = screen.getByTestId('waiver-add-player-1')
    expect(addBtn).toHaveTextContent('Add')
    fireEvent.click(addBtn)
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAddClick).not.toHaveBeenCalled()
  })

  it('renders a Claim button when not in addMode', () => {
    const onAddClick = vi.fn()
    render(<WaiverPlayerRow player={basePlayer} sport="NFL" onAddClick={onAddClick} />)
    const claimBtn = screen.getByTestId('waiver-claim-open-player-1')
    expect(claimBtn).toHaveTextContent('Claim')
    fireEvent.click(claimBtn)
    expect(onAddClick).toHaveBeenCalledTimes(1)
  })

  it('disables the action button while an action is loading', () => {
    const onAdd = vi.fn()
    render(<WaiverPlayerRow player={basePlayer} sport="NFL" addMode onAdd={onAdd} onAddClick={vi.fn()} actionLoading />)
    const addBtn = screen.getByTestId('waiver-add-player-1') as HTMLButtonElement
    expect(addBtn.disabled).toBe(true)
    fireEvent.click(addBtn)
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('shows Pending instead of an action when already claimed', () => {
    render(<WaiverPlayerRow player={basePlayer} sport="NFL" addMode onAdd={vi.fn()} onAddClick={vi.fn()} alreadyClaimed />)
    expect(screen.queryByTestId('waiver-add-player-1')).toBeNull()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('is sport-neutral — renders cleanly for NCAAF', () => {
    render(<WaiverPlayerRow player={{ ...basePlayer, team: null }} sport="NCAAF" addMode onAdd={vi.fn()} onAddClick={vi.fn()} />)
    expect(screen.getByTestId('waiver-add-player-1')).toHaveTextContent('Add')
  })
})
