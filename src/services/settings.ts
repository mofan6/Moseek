import { create } from 'zustand'
import { DEFAULT_MODEL, type ReasoningLevel } from './api/models.js'
import type { TtsVoice } from './api/speech.js'
import type { ChatModel } from './api/types.js'
import { normalizeLocation, type UserLocation } from './location.js'
import { INTERFACE_FONTS, PALETTES, type InterfaceFont, type Palette } from './appearance.js'

export type Locale = 'zh-CN' | 'en-US'

/** 主题偏好；默认跟随系统 */
export type ThemePreference = 'light' | 'dark' | 'system'
export const CONTEXT_MODES = ['recent', 'single', 'full'] as const
export type ContextMode = (typeof CONTEXT_MODES)[number]
export const REPLY_STYLES = [
  'concise',
  'guided',
  'structured',
  'precise',
  'conversational',
  'socratic',
  'creative',
] as const
export type ReplyStyle = (typeof REPLY_STYLES)[number]

/** 本机设置保存在 localStorage。 */
type Settings = {
  apiKey: string | null
  locale: Locale
  themePreference: ThemePreference
  palette: Palette
  interfaceFont: InterfaceFont
  location: UserLocation | null
  ttsVoice: TtsVoice
  model: ChatModel
  reasoning: ReasoningLevel
  search: boolean
  contextMode: ContextMode
  replyStyle: ReplyStyle
  siderCollapsed: boolean
}

export type ConversationOptions = Pick<
  Settings,
  'model' | 'reasoning' | 'search' | 'contextMode' | 'replyStyle'
>

export const getConversationDefaults = (): ConversationOptions => {
  const { model, reasoning, search, contextMode, replyStyle } = useSettings.getState()
  return { model, reasoning, search, contextMode, replyStyle }
}

const KEYS = {
  apiKey: 'moseek:api-key',
  locale: 'moseek:locale',
  location: 'moseek:location',
  themePreference: 'moseek:theme-preference',
  palette: 'moseek:palette',
  interfaceFont: 'moseek:interface-font',
  ttsVoice: 'moseek:tts-voice',
  thinking: 'moseek:thinking',
  model: 'moseek:model',
  reasoning: 'moseek:reasoning',
  search: 'moseek:search',
  contextMode: 'moseek:context-mode',
  replyStyle: 'moseek:reply-style',
  siderCollapsed: 'moseek:sider-collapsed',
} as const

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const readChoice = <T extends string>(key: string, choices: readonly [T, ...T[]]): T => {
  const saved = read(key)
  return choices.find((value) => value === saved) ?? choices[0]
}

const write = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
    return true
  } catch {
    return false
  }
}

/** 位置选择模式跟随浏览器语言，与应用内选择的界面语言无关。 */
export const isChineseBrowser = (): boolean =>
  (typeof navigator === 'undefined' ? 'zh' : navigator.language).toLowerCase().startsWith('zh')

const initialLocale = (): Locale => {
  const saved = read(KEYS.locale)
  if (saved === 'zh-CN' || saved === 'en-US') {
    return saved
  }
  return isChineseBrowser() ? 'zh-CN' : 'en-US'
}

const initialLocation = (): UserLocation | null => {
  try {
    const location = normalizeLocation(JSON.parse(read(KEYS.location) ?? 'null'))
    if (!location) {
      return null
    }
    return isChineseBrowser()
      ? location.region === 'CN' && location.province
        ? location
        : null
      : { region: location.region }
  } catch {
    return null
  }
}

/** 未保存过时跟随系统 */
const initialThemePreference = (): ThemePreference => {
  const saved = read(KEYS.themePreference)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

/** 未保存过时使用服务端默认音色 stella（海星） */
const initialTtsVoice = (): TtsVoice => (read(KEYS.ttsVoice) === 'tide' ? 'tide' : 'stella')

const initialReasoning = (): ReasoningLevel => {
  const saved = read(KEYS.reasoning)
  if (saved === 'off' || saved === 'low' || saved === 'high' || saved === 'max') {
    return saved
  }
  return read(KEYS.thinking) === 'true' ? 'high' : 'off'
}

export const useSettings = create<Settings>(() => ({
  apiKey: read(KEYS.apiKey),
  locale: initialLocale(),
  location: initialLocation(),
  themePreference: initialThemePreference(),
  palette: readChoice(KEYS.palette, PALETTES),
  interfaceFont: readChoice(KEYS.interfaceFont, INTERFACE_FONTS),
  ttsVoice: initialTtsVoice(),
  model: read(KEYS.model) === 'deepseek-v4-pro' ? 'deepseek-v4-pro' : DEFAULT_MODEL,
  reasoning: initialReasoning(),
  search: read(KEYS.search) === 'true',
  contextMode: readChoice(KEYS.contextMode, CONTEXT_MODES),
  replyStyle: readChoice(KEYS.replyStyle, REPLY_STYLES),
  siderCollapsed: read(KEYS.siderCollapsed) === 'true',
}))

export const setLocale = (locale: Locale) => {
  write(KEYS.locale, locale)
  useSettings.setState({ locale })
}

export const setLocation = (value: UserLocation | null) => {
  const location = normalizeLocation(value)
  write(KEYS.location, location ? JSON.stringify(location) : null)
  useSettings.setState({ location })
}

export const setThemePreference = (themePreference: ThemePreference) => {
  write(KEYS.themePreference, themePreference)
  useSettings.setState({ themePreference })
}

export const setPalette = (palette: Palette) => {
  write(KEYS.palette, palette)
  useSettings.setState({ palette })
}

export const setInterfaceFont = (interfaceFont: InterfaceFont) => {
  write(KEYS.interfaceFont, interfaceFont)
  useSettings.setState({ interfaceFont })
}

export const setTtsVoice = (ttsVoice: TtsVoice) => {
  write(KEYS.ttsVoice, ttsVoice)
  useSettings.setState({ ttsVoice })
}

export const setApiKey = (apiKey: string) => {
  if (!write(KEYS.apiKey, apiKey)) {
    return false
  }
  useSettings.setState({ apiKey })
  return true
}

export const setModel = (model: ChatModel) => {
  write(KEYS.model, model)
  useSettings.setState({ model })
}

export const setReasoning = (reasoning: ReasoningLevel) => {
  write(KEYS.reasoning, reasoning)
  useSettings.setState({ reasoning })
}

export const setSearch = (search: boolean) => {
  write(KEYS.search, String(search))
  useSettings.setState({ search })
}

export const setContextMode = (contextMode: ContextMode) => {
  write(KEYS.contextMode, contextMode)
  useSettings.setState({ contextMode })
}

export const setReplyStyle = (replyStyle: ReplyStyle) => {
  write(KEYS.replyStyle, replyStyle)
  useSettings.setState({ replyStyle })
}

export const setSiderCollapsed = (siderCollapsed: boolean) => {
  write(KEYS.siderCollapsed, String(siderCollapsed))
  useSettings.setState({ siderCollapsed })
}
