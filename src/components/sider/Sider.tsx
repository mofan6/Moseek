import clsx from 'clsx'
import { useEffect, useMemo, useState, type MouseEventHandler } from 'react'
import { useTranslate } from '../../i18n/index.js'
import {
  IconPanelLeftOutline16,
  IconSearchOutline16,
  IconSettingsOutline16,
  NewChatIcon,
} from '../base/icons.js'
import { groupSessions } from '../../services/chat/sessionGroups.js'
import { newChat, removeSession, useChatStore } from '../../services/chat/store.js'
import type { SessionSummary } from '../../services/chat/types.js'
import { Button } from '../base/Button.js'
import { IconButton } from '../base/IconButton.js'
import { ThemeToggle } from '../base/ThemeToggle.js'
import { Modal } from '../base/Modal.js'
import { showToast } from '../base/toastState.js'
import { openSettings } from '../settings/settingsDialogState.js'
import { closeMobileSider, useMobileSider } from './mobileSiderState.js'
import { SessionItem } from './SessionItem.js'
import { openWorkspace } from '../workspace/workspaceState.js'
import styles from './Sider.module.css'

export const DESKTOP_SIDER_ID = 'moseek-desktop-sidebar'

/** 展开的侧边栏：名称与收起按钮、开启新对话、按时间分组的会话列表、底部设置；移动端放在抽屉里，收起按钮关闭抽屉 */
export const Sider = ({
  mobile = false,
  collapsed = false,
  onCollapse = closeMobileSider,
}: {
  mobile?: boolean
  collapsed?: boolean
  onCollapse?: MouseEventHandler<HTMLButtonElement>
}) => {
  const t = useTranslate()
  const sessions = useChatStore((state) => state.sessions)
  const activeId = useChatStore((state) => state.activeId)
  const [now, setNow] = useState(Date.now)
  const groups = useMemo(() => {
    const pinned = sessions.filter((session) => session.pinned)
    const dated = groupSessions(
      sessions.filter((session) => !session.pinned),
      now,
      t
    )
    return pinned.length
      ? [{ key: 'pinned', label: t('pinnedChats'), sessions: pinned }, ...dated]
      : dated
  }, [sessions, now, t])
  const [deleting, setDeleting] = useState<SessionSummary | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      const time = Date.now()
      setNow(time)
      const midnight = new Date(time).setHours(24, 0, 0, 0)
      timer = setTimeout(refresh, midnight - time)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }
    refresh()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return (
    <div
      id={mobile ? undefined : DESKTOP_SIDER_ID}
      className={clsx(styles.sider, mobile && styles.mobile)}
      data-collapsed={collapsed || undefined}
      {...(collapsed ? { inert: '' } : {})}
    >
      <div className={styles.top}>
        <div className={styles.appName}>
          {mobile ? <img src="./favicon.svg" alt="" width={28} height={28} /> : null}
          {t('appName')}
        </div>
        <IconButton
          icon={<IconSearchOutline16 />}
          size="m"
          tooltip={t('historySearch')}
          tooltipPlacement="bottom"
          onClick={() => {
            closeMobileSider()
            openWorkspace('search')
          }}
        />
        <IconButton
          size="m"
          icon={<IconPanelLeftOutline16 />}
          tooltip={t('collapseSiderbarButton')}
          tooltipPlacement="bottom"
          aria-controls={mobile ? undefined : DESKTOP_SIDER_ID}
          aria-expanded={mobile ? undefined : true}
          onClick={onCollapse}
        />
      </div>
      <button
        type="button"
        className={styles.newChat}
        onClick={() => {
          newChat()
          closeMobileSider()
        }}
      >
        <span className={styles.newChatIcon}>
          <NewChatIcon />
        </span>
        {t('newChat')}
      </button>
      <div className={styles.listWrap}>
        <div className={styles.list}>
          {groups.map((group) => (
            <div key={group.key} className={styles.section}>
              <div className={styles.sectionHeader}>{group.label}</div>
              {group.sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  active={session.id === activeId}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {mobile ? (
        <div className={styles.bottom}>
          <ThemeToggle />
          <button type="button" className={styles.settings} onClick={() => openSettings('general')}>
            <span className={styles.settingsIcon}>
              <IconSettingsOutline16 />
            </span>
            <span className={styles.settingsLabel}>{t('settings')}</span>
          </button>
        </div>
      ) : null}
      {deleting ? (
        <Modal
          title={t('deleteSessionModalContentTitle')}
          onClose={() => {
            if (!deletePending) {
              setDeleting(null)
            }
          }}
          footer={
            <>
              <Button variant="outlined" disabled={deletePending} onClick={() => setDeleting(null)}>
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                disabled={deletePending}
                onClick={async () => {
                  setDeletePending(true)
                  try {
                    if (await removeSession(deleting.id)) {
                      setDeleting(null)
                    } else {
                      showToast({ key: 'sessionDeleteFailed', type: 'error' })
                    }
                  } finally {
                    setDeletePending(false)
                  }
                }}
              >
                {t('delete')}
              </Button>
            </>
          }
        >
          {t('deleteSessionWithFilesDescription')}
        </Modal>
      ) : null}
    </div>
  )
}

/** 移动端抽屉：浮在页面上方，点空白区域关闭。 */
export const MobileSider = () => {
  const open = useMobileSider((state) => state.open)
  return (
    <>
      <div className={styles.drawerMask} data-open={open || undefined} onClick={closeMobileSider} />
      <div className={styles.drawer} data-open={open || undefined} {...(open ? {} : { inert: '' })}>
        <Sider mobile />
      </div>
    </>
  )
}
