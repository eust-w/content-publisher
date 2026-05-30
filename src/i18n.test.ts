/* @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import {
  getInitialLanguage,
  languageStorageKey,
  modeText,
  platformText,
  saveLanguage,
  t,
} from './i18n'

afterEach(() => {
  window.localStorage.clear()
})

describe('i18n', () => {
  it('translates fixed dashboard messages', () => {
    expect(t('zh', 'nav.dashboard')).toBe('仪表盘')
    expect(t('en', 'nav.dashboard')).toBe('Dashboard')
  })

  it('interpolates counts in both languages', () => {
    expect(t('zh', 'pipeline.items', { count: 3 })).toBe('3 条')
    expect(t('en', 'pipeline.items', { count: 3 })).toBe('3 items')
  })

  it('provides localized platform and mode labels', () => {
    expect(platformText.en.xhs.label).toBe('Xiaohongshu')
    expect(platformText.zh.xhs.label).toBe('小红书')
    expect(modeText.en.manual_review).toBe('Manual review')
    expect(modeText.zh.manual_review).toBe('手动复核')
  })

  it('restores a saved language preference', () => {
    saveLanguage('zh')

    expect(window.localStorage.getItem(languageStorageKey)).toBe('zh')
    expect(getInitialLanguage()).toBe('zh')
  })
})
