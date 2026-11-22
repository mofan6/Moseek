import { useEffect, useLayoutEffect, useRef, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { useTranslate } from '../i18n/index.js'
import { setSiderCollapsed, useSettings } from '../services/settings.js'
import { useIsMobile, useMobileViewport, usePreventPageScroll } from './viewport.js'
import {
  bindChatPersistence,
  initChat,
  retrySaveSessions,
  selectSession,
  useChatStore,
} from '../services/chat/store.js'
import { SearchPanel } from '../components/search/SearchPanel.js'
import { closeSearchPanel } from '../components/search/searchPanelState.js'
import { SessionView } from '../components/session/SessionView.js'
import { MobileHeader } from '../components/session/MobileHeader.js'
import { Welcome } from '../components/session/Welcome.js'
import { SettingsDialog } from '../components/settings/SettingsDialog.js'
import { Toast } from '../components/base/Toast.js'
import { WorkspaceDialogs } from '../components/workspace/WorkspaceDialogs.js'
import { ThemeToggle } from '../components/base/ThemeToggle.js'
import { showToast } from '../components/base/toastState.js'
import { onUploadNotice } from '../services/attachments.js'
import { Button } from '../components/base/Button.js'
import { stopReadAloud } from '../services/speech/readAloud.js'
import { CollapsedSider } from '../components/sider/CollapsedSider.js'
import { closeMobileSider } from '../components/sider/mobileSiderState.js'
import { DESKTOP_SIDER_ID, MobileSider, Sider } from '../components/sider/Sider.js'
import styles from './App.module.css'

export const App = () => {
  const t = useTranslate()
  const isMobile = useIsMobile()
  const locale = useSettings((state) => state.locale)
  // 移动端侧边栏以独立抽屉管理开合状态
  const siderCollapsed = useSettings((state) => state.siderCollapsed) && !isMobile
  const ready = useChatStore((state) => state.ready)
  const initError = useChatStore((state) => state.initError)
  const saveError = useChatStore((state) => Object.values(state.sessionSaveErrors).some(Boolean))
  const importingHistory = useChatStore((state) => state.importingHistory)
  const session = useChatStore((state) =>
    state.activeId !== null && Object.hasOwn(state.sessionCache, state.activeId)
      ? state.sessionCache[state.activeId]
      : undefined
  )
  const sessionLoadError = useChatStore((state) =>
    state.activeId === null ? false : state.sessionLoadErrors[state.activeId] === true
  )
  const frameRef = useMobileViewport(isMobile)
  const restoreSidebarFocus = useRef(false)
  const sidebarAnimations = useRef<Animation[]>([])
  const streaming = useChatStore((state) =>
    state.activeId === null ? false : Object.hasOwn(state.streaming, state.activeId)
  )
  const activeId = useChatStore((state) => state.activeId)

  usePreventPageScroll(isMobile)

  const toggleSidebar = (event: MouseEvent<HTMLButtonElement>) => {
    restoreSidebarFocus.current = event.detail === 0
    const frame = frameRef.current
    if (!frame || matchMedia('(prefers-reduced-motion: reduce)').matches || !frame.animate) {
      sidebarAnimations.current.forEach((animation) => animation.cancel())
      setSiderCollapsed(!siderCollapsed)
      return
    }

    // Settle the layout once, then slide the visible columns from their previous positions.
    const targets = Array.from(frame.querySelectorAll<HTMLElement>('[data-sidebar-motion]'))
    const horizontalAnchor = (element: HTMLElement) => {
      const { left, width } = element.getBoundingClientRect()
      return element.dataset.sidebarMotion === 'center' ? left + width / 2 : left
    }
    const before = targets.map(horizontalAnchor)
    sidebarAnimations.current.forEach((animation) => animation.cancel())
    flushSync(() => setSiderCollapsed(!siderCollapsed))
    const after = targets.map(horizontalAnchor)
    const style = getComputedStyle(frame)
    const animations = targets.flatMap((target, index) => {
      const delta = before[index] - after[index]
      return Math.abs(delta) < 0.5
        ? []
        : [
            target.animate([{ translate: `${delta}px` }, { translate: '0px' }], {
              duration: Number(style.getPropertyValue('--moseek-sidebar-duration-ms')),
              easing: style.getPropertyValue('--ds-ease-in-out').trim(),
            }),
          ]
    })
    sidebarAnimations.current = animations
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (sidebarAnimations.current === animations) {
        sidebarAnimations.current = []
      }
    })
  }

  useLayoutEffect(() => {
    if (restoreSidebarFocus.current) {
      restoreSidebarFocus.current = false
      frameRef.current
        ?.querySelector<HTMLButtonElement>(
          `button[aria-controls="${DESKTOP_SIDER_ID}"][aria-expanded="${!siderCollapsed}"]`
        )
        ?.focus({ preventScroll: true })
    }
  }, [frameRef, siderCollapsed])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  // 文件数、存储空间达到上限时，附件上只显示「上传失败」，原因用 toast 说明
  useEffect(() => onUploadNotice(showToast), [])
  useEffect(bindChatPersistence, [])

  // 搜索结果面板只属于当前会话
  useEffect(closeSearchPanel, [activeId])
  // 切换会话时停止朗读
  useEffect(stopReadAloud, [activeId])
  // 移动端选中会话、切换布局后收起抽屉
  useEffect(closeMobileSider, [activeId, isMobile])

  useEffect(() => {
    void initChat()
  }, [])

  return (
    <>
      <div
        ref={frameRef}
        className={styles.frame}
        data-chat-active={activeId !== null || undefined}
      >
        <div className={styles.atmosphere} aria-hidden="true" />
        {isMobile ? (
          <MobileSider />
        ) : (
          <Sider collapsed={siderCollapsed} onCollapse={toggleSidebar} />
        )}
        <main
          className={styles.main}
          data-sidebar-expanded={!isMobile && !siderCollapsed ? true : undefined}
          data-sidebar-collapsed={siderCollapsed || undefined}
        >
          {saveError ? (
            <div className={styles.saveError} role="alert">
              <span>{t('sessionSaveFailed')}</span>
              <Button
                variant="outlined"
                size="s"
                disabled={importingHistory}
                onClick={retrySaveSessions}
              >
                {t('retry')}
              </Button>
            </div>
          ) : null}
          <div className={styles.content}>
            {isMobile ? null : <CollapsedSider visible={siderCollapsed} onExpand={toggleSidebar} />}
            {!ready || (activeId !== null && !session) ? (
              <div className={styles.loadingView}>
                {isMobile ? <MobileHeader /> : null}
                <div className={styles.loadingState} role="status" aria-live="polite">
                  <span>
                    {(!ready ? initError : sessionLoadError)
                      ? t(!ready ? 'sessionListLoadFailed' : 'sessionLoadFailed')
                      : t('sessionLoading')}
                  </span>
                  {(!ready ? initError : sessionLoadError) ? (
                    <Button
                      variant="outlined"
                      size="m"
                      onClick={() => {
                        if (!ready) {
                          void initChat()
                        } else if (activeId !== null) {
                          selectSession(activeId)
                        }
                      }}
                    >
                      {t('retry')}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : session ? (
              <SessionView session={session} streaming={streaming} />
            ) : (
              <Welcome />
            )}
          </div>
        </main>
        <SearchPanel />
        {isMobile ? null : <ThemeToggle className={styles.themeShortcut} />}
      </div>
      <SettingsDialog />
      <WorkspaceDialogs />
      <Toast />
    </>
  )
}
