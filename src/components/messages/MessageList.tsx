import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import {
  buildMessageVersions,
  getVisibleMessages,
  type MessageVersions,
} from '../../services/chat/branches.js'
import {
  consumeMessageJump,
  selectMessageVersion,
  useChatStore,
} from '../../services/chat/store.js'
import type { Session } from '../../services/chat/types.js'
import { closeSearchPanel } from '../search/searchPanelState.js'
import { AssistantMessage } from './AssistantMessage.js'
import { MessageScrollContext } from './scrollContext.js'
import { UserMessage } from './UserMessage.js'
import { Button } from '../base/Button.js'
import type { Message } from '../../services/chat/types.js'
import styles from './MessageList.module.css'

/**
 * 会话共用可重试的附件上传失败入口，覆盖当前提问与历史消息中的附件。
 * 点击后按失败的回答重新补传附件并请求。
 */
const getUploadRetryId = (messages: Message[], streaming: boolean) => {
  const last = messages.at(-1)
  return !streaming &&
    last?.role === 'assistant' &&
    last.status === 'error' &&
    last.error?.kind === 'upload' &&
    last.error.retryable
    ? last.id
    : null
}
const STICKY_THRESHOLD = 40
const ANSWER_TOP_GAP = 12
const EMPTY_VERSIONS: MessageVersions = { ids: [], index: -1 }
const MESSAGE_PAGE = 60

export const MessageList = ({
  session,
  streaming,
  footer,
}: {
  session: Session
  streaming: boolean
  footer: React.ReactNode
}) => {
  const t = useTranslate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const scrollMode = useRef<'tail' | 'paused' | 'manual' | 'answer'>('tail')
  const scrollTopRef = useRef(0)
  const streamHadAnswer = useRef<boolean | null>(null)
  const answerAnchor = useRef<{ element: HTMLElement; initialScrollTop: number } | null>(null)
  const restoreScrollRef = useRef<{ messageId: string; top: number } | null>(null)
  const previousPath = useRef<{ sessionId: string; endId?: string } | null>(null)
  const messages = getVisibleMessages(session)
  const jump = useChatStore((state) =>
    state.messageJump?.sessionId === session.id ? state.messageJump : undefined
  )
  const [olderPage, setOlderPage] = useState<number | null>(null)
  const [lastStreaming, setLastStreaming] = useState(streaming)
  if (streaming !== lastStreaming) {
    setLastStreaming(streaming)
    if (streaming) {
      setOlderPage(null)
    }
  }
  const latestStart = Math.max(0, messages.length - MESSAGE_PAGE)
  const jumpIndex = jump ? messages.findIndex((message) => message.id === jump.messageId) : -1
  const restoreIndex = restoreScrollRef.current
    ? messages.findIndex((message) => message.id === restoreScrollRef.current?.messageId)
    : -1
  const currentStart = Math.min(olderPage ?? latestStart, latestStart)
  const position =
    jumpIndex >= 0
      ? jumpIndex
      : restoreIndex < currentStart || restoreIndex >= currentStart + MESSAGE_PAGE
        ? restoreIndex
        : -1
  const start = position >= 0 ? Math.max(0, Math.min(position - 5, latestStart)) : currentStart
  const end = Math.min(start + MESSAGE_PAGE, messages.length)
  const viewed = messages.slice(start, end)
  const [previousVersions, setPreviousVersions] = useState(() =>
    buildMessageVersions(session, new Map())
  )
  const versions = useMemo(
    () => buildMessageVersions(session, previousVersions),
    [session, previousVersions]
  )
  if (versions !== previousVersions) {
    setPreviousVersions(versions)
  }
  const lastMessage = messages.at(-1)
  const lastMessageId = lastMessage?.id
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el && scrollMode.current === 'tail') {
      el.scrollTop = el.scrollHeight
      scrollTopRef.current = el.scrollTop
    }
  }, [])

  const turnPage = (page: number | null, bottom = false) => {
    clearAnswerAnchor()
    scrollMode.current = page === null ? 'tail' : 'manual'
    setOlderPage(page)
    requestAnimationFrame(() => {
      const scroll = scrollRef.current
      if (scroll) {
        scroll.scrollTop = page === null || bottom ? scroll.scrollHeight : 0
        scrollTopRef.current = scroll.scrollTop
      }
    })
  }

  const pauseFollowing = useCallback(() => {
    if (scrollMode.current === 'tail') {
      scrollMode.current = 'paused'
    }
  }, [])
  const scrollControls = useMemo(
    () => ({ followLatest: scrollToBottom, pauseFollowing }),
    [pauseFollowing, scrollToBottom]
  )

  const clearAnswerAnchor = useCallback(() => {
    answerAnchor.current = null
    contentRef.current?.style.removeProperty('min-height')
  }, [])

  // 预留末尾空间，让刚出现的短正文也能定位到滚动区顶部。
  const reserveAnswerSpace = useCallback(() => {
    const content = contentRef.current
    const scroll = scrollRef.current
    const anchor = answerAnchor.current
    if (!content || !scroll || !anchor?.element.isConnected) {
      return
    }
    const offset = anchor.element.getBoundingClientRect().top - content.getBoundingClientRect().top
    const visibleHeight = scroll.clientHeight - (footerRef.current?.offsetHeight ?? 0)
    const minHeight = Math.max(0, Math.ceil(offset + visibleHeight - ANSWER_TOP_GAP))
    content.style.minHeight = `${minHeight}px`
  }, [])

  useLayoutEffect(() => {
    const content = contentRef.current
    const scroll = scrollRef.current
    const footerElement = footerRef.current
    if (!content || !scroll || !footerElement) {
      return
    }
    const sync = () => {
      // 遮住的区域仍可滚动，到底时把最后一条消息留在输入框上方。
      scroll.style.setProperty('--message-footer-space', `${footerElement.offsetHeight}px`)
      reserveAnswerSpace()
      scrollToBottom()
    }
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(content)
    observer.observe(scroll)
    observer.observe(footerElement)
    return () => observer.disconnect()
  }, [reserveAnswerSpace, scrollToBottom])

  // 切换版本后将选择器留在原位置，避免回答长短变化导致操作区跳出视口。
  useLayoutEffect(() => {
    if (previousPath.current?.sessionId === session.id && previousPath.current.endId === lastMessageId) {
      return
    }
    previousPath.current = { sessionId: session.id, endId: lastMessageId }
    const anchor = restoreScrollRef.current
    const scroll = scrollRef.current
    clearAnswerAnchor()
    streamHadAnswer.current = null
    if (anchor && scroll) {
      const switcher = scroll.querySelector<HTMLElement>(
        `[data-message-version="${CSS.escape(anchor.messageId)}"]`
      )
      if (switcher) {
        scroll.scrollTop += switcher.getBoundingClientRect().top - anchor.top
      }
      setOlderPage(start === latestStart ? null : start)
      scrollTopRef.current = scroll.scrollTop
      restoreScrollRef.current = null
      return
    }
    scrollMode.current = 'tail'
    scrollToBottom()
  }, [session.id, lastMessageId, clearAnswerAnchor, scrollToBottom, start, latestStart])

  useLayoutEffect(() => {
    const scroll = scrollRef.current
    if (
      !scroll ||
      lastMessage?.role !== 'assistant' ||
      (!streaming && streamHadAnswer.current === null)
    ) {
      return
    }
    const answer = scroll.querySelector<HTMLElement>(
      `[data-reply-answer="${CSS.escape(lastMessage.id)}"]`
    )
    if (answer && streamHadAnswer.current === false) {
      const shouldAlign = scrollMode.current === 'tail' || scrollMode.current === 'paused'
      scrollMode.current = 'answer'
      if (shouldAlign) {
        answerAnchor.current = { element: answer, initialScrollTop: 0 }
        reserveAnswerSpace()
        scroll.scrollTop +=
          answer.getBoundingClientRect().top - scroll.getBoundingClientRect().top - ANSWER_TOP_GAP
        answerAnchor.current.initialScrollTop = scroll.scrollTop
        scrollTopRef.current = scroll.scrollTop
      }
    } else if (answer && streamHadAnswer.current === null) {
      // 续写开始时正文已经可见，保留当前阅读位置。
      scrollMode.current = 'answer'
    } else if (!answer && streamHadAnswer.current) {
      // 工具调用前的文字会移入思考框，随后出现的正式正文仍可定位。
      const anchor = answerAnchor.current
      const atAnchor = anchor && Math.abs(scrollTopRef.current - anchor.initialScrollTop) < 2
      clearAnswerAnchor()
      scrollMode.current = atAnchor ? 'tail' : 'manual'
      scrollToBottom()
    }
    streamHadAnswer.current = streaming ? answer !== null : null
  }, [lastMessage, streaming, clearAnswerAnchor, reserveAnswerSpace, scrollToBottom])

  useEffect(closeSearchPanel, [session.id, lastMessageId])

  useLayoutEffect(() => {
    if (jump) {
      const scroll = scrollRef.current
      const node = scroll?.querySelector<HTMLElement>(
        `[data-history-message="${CSS.escape(jump.messageId)}"]`
      )
      if (scroll && node) {
        clearAnswerAnchor()
        scrollMode.current = 'manual'
        scroll.scrollTop +=
          node.getBoundingClientRect().top - scroll.getBoundingClientRect().top - ANSWER_TOP_GAP
        scrollTopRef.current = scroll.scrollTop
        setOlderPage(start === latestStart ? null : start)
        node.focus({ preventScroll: true })
      }
      consumeMessageJump(jump)
    }
  }, [jump, start, latestStart, clearAnswerAnchor])

  const selectVersion = useCallback(
    (messageId: string, anchorTop: number) => {
      if (streaming) {
        return
      }
      restoreScrollRef.current = { messageId, top: anchorTop }
      scrollMode.current = 'manual'
      closeSearchPanel()
      selectMessageVersion(session.id, messageId)
    },
    [session.id, streaming]
  )

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const onScroll = () => {
      if (scrollMode.current !== 'answer' && el.scrollTop !== scrollTopRef.current) {
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < STICKY_THRESHOLD
        if (nearBottom && el.scrollTop > scrollTopRef.current) {
          scrollMode.current = 'tail'
        } else if (!nearBottom && el.scrollTop < scrollTopRef.current) {
          scrollMode.current = 'manual'
        }
      }
      scrollTopRef.current = el.scrollTop
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const lastIndex = messages.length - 1
  const uploadRetryId = getUploadRetryId(messages, streaming)
  return (
    <MessageScrollContext.Provider value={scrollControls}>
      <div className={styles.container}>
        <div
          ref={scrollRef}
          className={styles.scroll}
          role="region"
          aria-label={t('conversationMessages')}
        >
          <div ref={contentRef} className={styles.column}>
            {start > 0 ? (
              <Button
                size="s"
                variant="outlined"
                onClick={() => turnPage(Math.max(0, start - MESSAGE_PAGE), true)}
              >
                {t('olderMessages')}
              </Button>
            ) : null}
            {viewed.map((message, offset) => {
              const index = start + offset
              return (
                <div key={message.id} data-history-message={message.id} tabIndex={-1}>
                  {message.role === 'user' ? (
                    <UserMessage
                      key={message.id}
                      sessionId={session.id}
                      message={message}
                      retryUploadId={uploadRetryId}
                      isFirst={index === 0}
                      isLast={index === lastIndex || index === lastIndex - 1}
                      busy={streaming}
                      versions={versions.get(message.id) ?? EMPTY_VERSIONS}
                      onSelectVersion={selectVersion}
                    />
                  ) : (
                    <AssistantMessage
                      key={message.id}
                      sessionId={session.id}
                      message={message}
                      isLast={index === lastIndex}
                      streaming={streaming && index === lastIndex}
                      busy={streaming}
                      versions={versions.get(message.id) ?? EMPTY_VERSIONS}
                      onSelectVersion={selectVersion}
                    />
                  )}
                </div>
              )
            })}
            {end < messages.length ? (
              <div className={styles.historyPages}>
                <Button
                  size="s"
                  variant="outlined"
                  onClick={() => turnPage(Math.min(end, latestStart))}
                >
                  {t('newerMessages')}
                </Button>
                <Button size="s" variant="outlined" onClick={() => turnPage(null)}>
                  {t('latestMessages')}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        <div className={styles.footer} ref={footerRef}>
          {footer}
        </div>
      </div>
    </MessageScrollContext.Provider>
  )
}
