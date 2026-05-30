/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { languageStorageKey } from './i18n'

beforeEach(() => {
  window.localStorage.setItem(languageStorageKey, 'en')
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.unstubAllGlobals()
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
    expect(within(inspector).getByText('Xiaohongshu')).toBeInTheDocument()
    expect(within(inspector).getByText('Manual review')).toBeInTheDocument()
  })

  it('switches dashboard chrome to Chinese', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '中文' }))

    expect(screen.getByRole('heading', { name: '内容发布中台' })).toBeInTheDocument()
    expect(screen.getByText('发布包')).toBeInTheDocument()
    expect(screen.getByLabelText('队列概览')).toBeInTheDocument()
  })

  it('saves OAuth app credentials from the account connection panel', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          providers: [
            {
              platform: 'x',
              label: 'X',
              configured: true,
              missing: [],
              callbackUrl: 'http://127.0.0.1:4788/auth/x/callback',
              scopes: [],
              clientId: 'x-cl...ient',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    const connections = screen.getByLabelText('Account connections')
    await user.type(within(connections).getAllByLabelText('Client ID')[0], 'x-client-id')
    await user.type(within(connections).getAllByLabelText('Client Secret')[0], 'x-secret')
    await user.click(within(connections).getAllByRole('button', { name: /save app/i })[0])

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4788/api/provider-configs/x',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          clientId: 'x-client-id',
          clientSecret: 'x-secret',
        }),
      }),
    )
    expect(await screen.findByText('Saved to local MongoDB.')).toBeInTheDocument()
  })
})
