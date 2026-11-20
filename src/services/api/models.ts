import type { ChatModel } from './types.js'

export const DEFAULT_MODEL = 'deepseek-flash' satisfies ChatModel

export const MODEL_NAMES = {
  'deepseek-flash': 'DeepSeek V4.1 Flash',
  'deepseek-v4-pro': 'DeepSeek V4 Pro',
} satisfies Record<ChatModel, string>

export const REASONING_LEVELS = ['off', 'low', 'high', 'max'] as const
export type ReasoningLevel = (typeof REASONING_LEVELS)[number]
