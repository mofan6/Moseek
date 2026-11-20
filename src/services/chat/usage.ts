import type { MessageUsage } from '../api/types.js'
import type { AssistantMessage } from './types.js'

export type TokenCounts = {
  cacheHit: number
  cacheMiss: number
  output: number
  thinking?: number
  safety?: number
  searches?: number
  fetches?: number
}

const reportedCount = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined

export const toTokenCounts = (usage: MessageUsage): TokenCounts => ({
  cacheHit: usage.cache_read_input_tokens,
  cacheMiss: usage.input_tokens + usage.cache_creation_input_tokens,
  output: usage.output_tokens,
  thinking: reportedCount(usage.output_tokens_details?.thinking_tokens),
  safety: reportedCount(usage.output_tokens_details?.safety_tokens),
  searches: reportedCount(usage.server_tool_use?.web_search_requests),
  fetches: reportedCount(usage.server_tool_use?.tool_fetch),
})

export const totalTokens = ({ cacheHit, cacheMiss, output }: TokenCounts) =>
  cacheHit + cacheMiss + output

const sumReported = (previous: number | undefined, next: number | undefined) =>
  previous === undefined && next === undefined ? undefined : (previous ?? 0) + (next ?? 0)

export const addTokenCounts = (previous: TokenCounts | undefined, next: TokenCounts): TokenCounts =>
  previous
    ? {
        cacheHit: previous.cacheHit + next.cacheHit,
        cacheMiss: previous.cacheMiss + next.cacheMiss,
        output: previous.output + next.output,
        thinking: sumReported(previous.thinking, next.thinking),
        safety: sumReported(previous.safety, next.safety),
        searches: sumReported(previous.searches, next.searches),
        fetches: sumReported(previous.fetches, next.fetches),
      }
    : next

export const getReplyTokenCounts = (reply: AssistantMessage): TokenCounts | undefined => {
  if (reply.tokenCounts) {
    return reply.tokenCounts
  }
  // 旧版也保存过起始用量，只有结束且记录了输出的旧回复能确认有最终统计。
  if (reply.status === 'done' && reply.usage && reply.usage.output_tokens > 0) {
    return toTokenCounts(reply.usage)
  }
  return undefined
}
