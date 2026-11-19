import { useIsMobile } from '../../app/viewport.js'
import { useTranslate } from '../../i18n/index.js'
import { useSettings } from '../../services/settings.js'
import { IconLinkOutline16 } from '../base/icons.js'
import { ChatInput } from '../chatInput/ChatInput.js'
import { openSettings } from '../settings/settingsDialogState.js'
import { MobileHeader } from './MobileHeader.js'
import styles from './Welcome.module.css'

/** 新对话：问候语 + 输入框。桌面端居中；移动端输入框吸底 */
export const Welcome = () => {
  const t = useTranslate()
  const isMobile = useIsMobile()
  const hasApiKey = useSettings((state) => state.apiKey !== null)
  return (
    <div className={styles.container}>
      {isMobile ? <MobileHeader /> : null}
      <div className={styles.welcome}>
        <h1 className={styles.greeting}>{t('welcomeMessageChat250808')}</h1>
        <ChatInput sessionId={null} />
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.connection}
            onClick={() => openSettings('api')}
          >
            <IconLinkOutline16 />
            {t(hasApiKey ? 'apiKeySaved' : 'setUpApiKey')}
          </button>
        </div>
      </div>
    </div>
  )
}
