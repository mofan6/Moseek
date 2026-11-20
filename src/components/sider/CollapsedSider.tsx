import type { MouseEventHandler } from 'react'
import { IconPanelLeftOutline16, NewChatIcon } from '../base/icons.js'
import { useTranslate } from '../../i18n/index.js'
import { newChat } from '../../services/chat/store.js'
import { IconButton } from '../base/IconButton.js'
import { DESKTOP_SIDER_ID } from './Sider.js'
import styles from './Sider.module.css'

/** 收起后左上角的按钮组 */
export const CollapsedSider = ({
  visible,
  onExpand,
}: {
  visible: boolean
  onExpand: MouseEventHandler<HTMLButtonElement>
}) => {
  const t = useTranslate()
  return (
    <div
      className={styles.collapsed}
      data-visible={visible || undefined}
      {...(visible ? {} : { inert: '' })}
    >
      <div className={styles.collapsedGroup}>
        <IconButton
          size="m"
          tone="primary"
          icon={<IconPanelLeftOutline16 />}
          tooltip={t('expandSiderbarButton')}
          aria-controls={DESKTOP_SIDER_ID}
          aria-expanded={false}
          onClick={onExpand}
        />
        <IconButton
          size="m"
          tone="primary"
          icon={<NewChatIcon />}
          tooltip={t('newChat')}
          onClick={newChat}
        />
      </div>
    </div>
  )
}
