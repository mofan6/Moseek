import { showToast } from '../../components/base/toastState.js'
import { loadSession, loadSessionSummaries } from './db.js'
import { getReplyTokenCounts, totalTokens, type TokenCounts } from './usage.js'

const BUDGET_KEY = 'moseek:daily-token-budget'
const NOTICE_KEY = 'moseek:daily-token-budget-notice'

export const readTokenBudget = () => {
  try {
    const saved = Number(localStorage.getItem(BUDGET_KEY))
    return Number.isSafeInteger(saved) && saved > 0 ? saved : 0
  } catch {
    return 0
  }
}

export const writeTokenBudget = (budget: number) => {
  try {
    if (readTokenBudget() !== budget) {
      localStorage.setItem(BUDGET_KEY, String(budget))
      localStorage.removeItem(NOTICE_KEY)
    }
    return true
  } catch {
    return false
  }
}

export type UsageEntry = {
  at: number
  counts: TokenCounts
  sessionId: string
  title: string
  model: string | null
}

export const loadUsage = async (signal?: AbortSignal, since = 0): Promise<UsageEntry[]> => {
  const summaries = await loadSessionSummaries()
  const result: UsageEntry[] = []
  const seen = new Set<string>()
  for (const summary of summaries) {
    signal?.throwIfAborted()
    if (summary.updatedAt < since) {
      continue
    }
    const session = await loadSession(summary.id)
    for (const message of session?.messages ?? []) {
      if (message.role === 'assistant') {
        const counts = getReplyTokenCounts(message)
        const entries = message.usageEntries ?? (counts ? [{ at: message.createdAt, counts }] : [])
        for (const [index, entry] of entries.entries()) {
          // 冲突副本带有共同的历史消息；同一请求只统计一次。
          const id = `${message.id}:${message.createdAt}:${entry.at}:${index}`
          if (entry.at >= since && !seen.has(id)) {
            seen.add(id)
            result.push({
              ...entry,
              title: summary.title,
              sessionId: summary.id,
              model: message.model,
            })
          }
        }
      }
    }
  }
  return result
}

export const checkTokenBudget = async () => {
  const budget = readTokenBudget()
  if (!budget) {
    return
  }
  const today = new Date().setHours(0, 0, 0, 0)
  const key = `${today}:${budget}`
  try {
    if (localStorage.getItem(NOTICE_KEY) !== key) {
      const entries = await loadUsage(undefined, today)
      const total = entries.reduce((sum, entry) => sum + totalTokens(entry.counts), 0)
      if (total >= budget && localStorage.getItem(NOTICE_KEY) !== key) {
        localStorage.setItem(NOTICE_KEY, key)
        showToast({ key: 'tokenBudgetReached', params: { total, budget } })
      }
    }
  } catch {
    // 用量提醒出现储存故障时，已经保存的回复仍然可用。
  }
}
