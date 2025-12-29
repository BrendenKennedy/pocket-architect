import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

// Mock Tauri invoke before importing App
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}))

import { invoke } from '@tauri-apps/api/tauri'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Pocket Architect title', () => {
    render(<App />)
    expect(screen.getByText('Pocket Architect')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<App />)
    expect(screen.getByText('Loading accounts...')).toBeInTheDocument()
  })

  it('renders create account button after loading', async () => {
    // Mock successful account loading
    invoke.mockResolvedValueOnce({
      success: true,
      data: []
    })

    render(<App />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading accounts...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Add AWS Account')).toBeInTheDocument()
  })

  it('opens create account form when button is clicked', async () => {
    // Mock successful account loading
    invoke.mockResolvedValueOnce({
      success: true,
      data: []
    })

    render(<App />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading accounts...')).not.toBeInTheDocument()
    })

    const addButton = screen.getByText('Add AWS Account')
    fireEvent.click(addButton)

    expect(screen.getByText('Create New AWS Account')).toBeInTheDocument()
  })
})