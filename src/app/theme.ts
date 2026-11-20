import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import type { InterfaceFont, Palette } from '../services/appearance.js'
import { setThemePreference, useSettings, type ThemePreference } from '../services/settings.js'

export type Theme = 'light' | 'dark'

const query = window.matchMedia('(prefers-color-scheme: dark)')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

const subscribeOsTheme = (listener: () => void) => {
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

const getOsTheme = (): Theme => (query.matches ? 'dark' : 'light')

const resolveTheme = (preference: ThemePreference, osTheme: Theme): Theme =>
  preference === 'system' ? osTheme : preference

/** 当前实际生效的深浅色：手动选择优先，「跟随系统」时取系统设置 */
export const useTheme = (): Theme => {
  const preference = useSettings((state) => state.themePreference)
  const osTheme = useSyncExternalStore(subscribeOsTheme, getOsTheme)
  return resolveTheme(preference, osTheme)
}

let reveal: { target: ThemePreference; transition: ViewTransition; finish: () => void } | undefined

/** Capture the two color modes and reveal the new one from the selected control. */
export const changeTheme = (target: ThemePreference, source: HTMLElement) => {
  if (reveal) {
    const { transition, finish } = reveal
    finish()
    transition.skipTransition()
    setThemePreference(target)
    return
  }
  const osTheme = getOsTheme()
  if (
    resolveTheme(target, osTheme) ===
      resolveTheme(useSettings.getState().themePreference, osTheme) ||
    typeof document.startViewTransition !== 'function' ||
    !CSS.supports('clip-path', 'circle(1px at 0px 0px)') ||
    reducedMotion.matches ||
    document.hidden
  ) {
    setThemePreference(target)
    return
  }

  const root = document.documentElement
  const bounds = source.getBoundingClientRect()
  const x = bounds.left + bounds.width / 2
  const y = bounds.top + bounds.height / 2
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 2
  root.style.setProperty('--moseek-reveal-x', `${x}px`)
  root.style.setProperty('--moseek-reveal-y', `${y}px`)
  root.style.setProperty('--moseek-reveal-radius', `${radius}px`)
  root.dataset.moseekThemeReveal = ''

  const reset = () => {
    delete root.dataset.moseekThemeReveal
    root.style.removeProperty('--moseek-reveal-x')
    root.style.removeProperty('--moseek-reveal-y')
    root.style.removeProperty('--moseek-reveal-radius')
  }

  try {
    const transition = document.startViewTransition(() => {
      if (reveal?.transition === transition) {
        flushSync(() => setThemePreference(target))
      }
    })
    const skip = () => transition.skipTransition()
    const finish = () => {
      window.removeEventListener('resize', skip)
      document.removeEventListener('visibilitychange', skip)
      reducedMotion.removeEventListener('change', skip)
      if (reveal?.transition === transition) {
        reveal = undefined
        reset()
      }
    }
    reveal = { target, transition, finish }
    window.addEventListener('resize', skip)
    document.addEventListener('visibilitychange', skip)
    reducedMotion.addEventListener('change', skip)
    void transition.ready.catch(() => {})
    void transition.finished.then(finish, () => {
      if (reveal?.transition === transition) {
        setThemePreference(target)
      }
      finish()
    })
  } catch {
    reset()
    setThemePreference(target)
  }
}

export const toggleTheme = (source: HTMLElement) => {
  const current = resolveTheme(
    reveal?.target ?? useSettings.getState().themePreference,
    getOsTheme()
  )
  changeTheme(current === 'dark' ? 'light' : 'dark', source)
}

const syncPageBackground = () => {
  const backgroundColor = getComputedStyle(document.body).backgroundColor
  document.documentElement.style.backgroundColor = backgroundColor
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', backgroundColor)
}

/** 同步页面主题、根画布背景和支持 theme-color 的浏览器栏。 */
const applyTheme = (theme: Theme, palette: Palette) => {
  const body = document.body
  // 主题切换帧禁用过渡，使页面颜色同步更新
  body.classList.add('change-theme')
  body.classList.toggle('dark', theme === 'dark')
  body.classList.toggle('light', theme === 'light')
  body.dataset.moseekPalette = palette
  if (theme === 'dark') {
    body.setAttribute('data-ds-dark-theme', 'dark')
  } else {
    body.removeAttribute('data-ds-dark-theme')
  }
  document.documentElement.style.colorScheme = theme
  // 首次背景色同步在样式表加载完成后执行，适配 WebKit 的 defer 脚本执行顺序。
  if (document.readyState === 'complete') {
    syncPageBackground()
  }
  setTimeout(() => {
    body.classList.remove('change-theme')
  }, 0)
}

let appliedTheme: Theme | null = null
let appliedPalette: Palette | null = null
let appliedFont: InterfaceFont | null = null

const syncTheme = () => {
  const { themePreference, palette, interfaceFont } = useSettings.getState()
  const theme = resolveTheme(themePreference, getOsTheme())
  if (theme !== appliedTheme || palette !== appliedPalette) {
    appliedTheme = theme
    appliedPalette = palette
    applyTheme(theme, palette)
  }
  if (interfaceFont !== appliedFont) {
    appliedFont = interfaceFont
    document.documentElement.dataset.moseekFont = interfaceFont
  }
}

/** 首屏渲染前同步应用一次，之后随主题设置与系统深浅色变化更新 */
export const setupTheme = () => {
  syncTheme()
  if (document.readyState !== 'complete') {
    window.addEventListener('load', syncPageBackground, { once: true })
  }
  query.addEventListener('change', syncTheme)
  useSettings.subscribe(syncTheme)
}
