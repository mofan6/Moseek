import { useEffect, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { MODEL_NAMES } from '../../services/api/models.js'
import type { ChatModel } from '../../services/api/types.js'
import { getVisibleMessages } from '../../services/chat/branches.js'
import { loadSession } from '../../services/chat/db.js'
import { getReplyText } from '../../services/chat/reply.js'
import { openHistoryMessage, useChatStore } from '../../services/chat/store.js'
import { addTokenCounts, totalTokens, type TokenCounts } from '../../services/chat/usage.js'
import {
  checkTokenBudget,
  loadUsage,
  readTokenBudget,
  writeTokenBudget,
  type UsageEntry,
} from '../../services/chat/usageHistory.js'
import { Button } from '../base/Button.js'
import { Modal } from '../base/Modal.js'
import { closeMobileSider } from '../sider/mobileSiderState.js'
import { closeWorkspace, openWorkspace, useWorkspace } from './workspaceState.js'
import styles from './Workspace.module.css'

export const WorkspaceDialogs = () => {
  const panel = useWorkspace((state) => state.panel)
  const t = useTranslate()
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        closeMobileSider()
        openWorkspace('search')
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])
  if (!panel) {
    return null
  }
  return (
    <Modal
      title={t(
        panel === 'search'
          ? 'historySearch'
          : panel === 'timeline'
            ? 'conversationOutline'
            : 'localUsage'
      )}
      className={styles.dialog}
      mainClassName={styles.body}
      closable
      onClose={closeWorkspace}
    >
      {panel === 'usage' ? (
        <UsageDashboard />
      ) : (
        <HistoryPicker key={panel} timeline={panel === 'timeline'} />
      )}
    </Modal>
  )
}

type Hit = { sessionId: string; title: string; messageId?: string; snippet?: string }
const LIMIT = 60

const HistoryPicker = ({ timeline }: { timeline: boolean }) => {
  const t = useTranslate()
  const sessions = useChatStore((state) => state.sessions)
  const current = useChatStore((state) =>
    state.activeId ? state.sessionCache[state.activeId] : undefined
  )
  const [search, setSearch] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [status, setStatus] = useState<'pending' | 'done' | 'error'>('done')
  const needle = search.trim().toLocaleLowerCase()

  useEffect(() => {
    if (timeline || !needle) {
      return
    }
    const controller = new AbortController()
    setStatus('pending')
    const timer = window.setTimeout(() => {
      void (async () => {
        const found: Hit[] = []
        for (const summary of sessions) {
          controller.signal.throwIfAborted()
          const base = { sessionId: summary.id, title: summary.title }
          if (summary.title.toLocaleLowerCase().includes(needle)) {
            found.push(base)
          }
          const session =
            useChatStore.getState().sessionCache[summary.id] ?? (await loadSession(summary.id))
          for (const message of session?.messages.toReversed() ?? []) {
            if (found.length >= LIMIT) {
              break
            }
            const text = message.role === 'user' ? message.content : getReplyText(message)
            const start = text.toLocaleLowerCase().indexOf(needle)
            if (start >= 0) {
              const excerpt = text.slice(Math.max(0, start - 26), start + needle.length + 50)
              found.push({ ...base, messageId: message.id, snippet: excerpt })
            }
          }
          if (found.length >= LIMIT) {
            break
          }
        }
        if (!controller.signal.aborted) {
          setHits(found)
          setStatus('done')
        }
      })().catch(() => {
        if (!controller.signal.aborted) {
          setStatus('error')
        }
      })
    }, 130)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [needle, sessions, timeline])

  const items =
    timeline && current
      ? getVisibleMessages(current).flatMap((message, index) =>
          message.role === 'user'
            ? [
                {
                  sessionId: current.id,
                  title: `${Math.floor(index / 2) + 1}. ${message.content || message.files.map((file) => file.name).join(', ')}`,
                  messageId: message.id,
                },
              ]
            : []
        )
      : needle
        ? hits
        : sessions
            .toSorted((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
            .slice(0, LIMIT)
            .map((summary) => ({ sessionId: summary.id, title: summary.title }))

  const open = (hit: Hit) => {
    closeWorkspace()
    void openHistoryMessage(hit.sessionId, hit.messageId)
  }

  return (
    <>
      {timeline ? null : (
        <input
          className={styles.field}
          type="search"
          aria-label={t('historySearch')}
          autoFocus
          placeholder={t('historySearchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.nativeEvent.isComposing &&
              items[0] &&
              (!needle || status === 'done')
            ) {
              open(items[0])
            }
          }}
        />
      )}
      {!timeline && needle && status !== 'done' ? (
        <p role="status">{t(status === 'pending' ? 'workspaceLoading' : 'workspaceLoadError')}</p>
      ) : items.length ? (
        <ul className={styles.results}>
          {items.map((hit: Hit) => (
            <li key={hit.sessionId + '/' + (hit.messageId ?? '')}>
              <button type="button" onClick={() => open(hit)}>
                <strong>{hit.title || t('untitledChat')}</strong>
                {hit.snippet ? <span>{hit.snippet}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status">{t('historySearchEmpty')}</p>
      )}
    </>
  )
}

const EMPTY_COUNTS: TokenCounts = { cacheHit: 0, cacheMiss: 0, output: 0 }

const UsageDashboard = () => {
  const t = useTranslate()
  const [entries, setEntries] = useState<UsageEntry[] | null>(null)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState('today')
  const [group, setGroup] = useState('model')
  const [budget, setBudget] = useState(() => String(readTokenBudget() || ''))
  const [notice, setNotice] = useState<'saved' | 'error' | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void loadUsage(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setEntries(data)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true)
        }
      })
    return () => controller.abort()
  }, [])
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  }
  const labels = new Map<string, { title: string; counts: TokenCounts }>()
  let total = EMPTY_COUNTS
  for (const entry of entries ?? []) {
    if (period !== 'all' && entry.at < +start) {
      continue
    }
    const key = group === 'model' ? (entry.model ?? '') : entry.sessionId
    const title =
      group === 'model'
        ? entry.model
          ? (MODEL_NAMES[entry.model as ChatModel] ?? entry.model)
          : t('usageUnknownModel')
        : entry.title || t('untitledChat')
    labels.set(key, { title, counts: addTokenCounts(labels.get(key)?.counts, entry.counts) })
    total = addTokenCounts(total, entry.counts)
  }
  const cells = (counts: TokenCounts) =>
    [counts.cacheHit, counts.cacheMiss, counts.output, totalTokens(counts)].map((value, index) => (
      <td key={index}>{value.toLocaleString()}</td>
    ))
  return (
    <>
      <p className={styles.hint}>{t('usageLocalHint')}</p>
      <div className={styles.controls}>
        <label>
          {t('usagePeriod')}{' '}
          <select aria-label={t('usagePeriod')} value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="today">{t('usageToday')}</option>
            <option value="week">{t('usageWeek')}</option>
            <option value="all">{t('usageAll')}</option>
          </select>
        </label>
        <label>
          {t('usageGroup')}{' '}
          <select aria-label={t('usageGroup')} value={group} onChange={(event) => setGroup(event.target.value)}>
            <option value="model">{t('chatModel')}</option>
            <option value="session">{t('usageSession')}</option>
          </select>
        </label>
      </div>
      {entries && !error ? (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th scope="col">{t(group === 'model' ? 'chatModel' : 'usageSession')}</th>
                <th scope="col">{t('usageCached')}</th>
                <th scope="col">{t('usageUncached')}</th>
                <th scope="col">{t('usageOutput')}</th>
                <th scope="col">{t('usageTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(labels.values())
                .sort((a, b) => totalTokens(b.counts) - totalTokens(a.counts))
                .map((row, index) => (
                  <tr key={index}>
                    <th scope="row">{row.title}</th>
                    {cells(row.counts)}
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t('usageTotal')}</th>
                {cells(total)}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p role="status">{t(error ? 'workspaceLoadError' : 'workspaceLoading')}</p>
      )}
      <form
        className={styles.controls}
        onSubmit={(event) => {
          event.preventDefault()
          const value = Number(budget)
          const saved = Number.isSafeInteger(value) && value >= 0 && writeTokenBudget(value)
          setNotice(saved ? 'saved' : 'error')
          if (saved) {
            void checkTokenBudget()
          }
        }}
      >
        <label>
          {t('tokenBudget')}{' '}
          <input
            type="number"
            min="0"
            step="1"
            value={budget}
            placeholder="0"
            onChange={(event) => setBudget(event.target.value)}
          />
        </label>
        <Button size="s" variant="outlined" type="submit">
          {t('confirm')}
        </Button>
      </form>
      <p className={styles.hint} role="status">
        {t(
          notice === 'saved'
            ? 'tokenBudgetSaved'
            : notice === 'error'
              ? 'tokenBudgetError'
              : 'tokenBudgetHint'
        )}
      </p>
    </>
  )
}
