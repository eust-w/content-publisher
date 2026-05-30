/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
})

describe('App', () => {
  it('renders the content operations dashboard with queue summary', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Content Publisher' })).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('platform packages')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export package/i })).toBeInTheDocument()
  })

  it('switches the selected draft from the pipeline', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AI 工具选型备忘/i }))

    expect(screen.getByRole('heading', { name: 'AI 工具选型备忘' })).toBeInTheDocument()
    const inspector = screen.getByLabelText('Selected publish package')
    expect(within(inspector).getByText('小红书')).toBeInTheDocument()
    expect(within(inspector).getByText('手动复核')).toBeInTheDocument()
  })
})
