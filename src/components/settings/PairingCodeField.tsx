import { useState } from 'react'
import { IconEditOutline16 } from '../base/icons.js'
import { useSettings } from '../../services/settings.js'
import { useIsMobile } from '../../app/viewport.js'
import { IconButton } from '../base/IconButton.js'
import { usePairingCodeForm } from './usePairingCodeForm.js'
import { useTranslate } from '../../i18n/index.js'
import styles from './Settings.module.css'

/** 本机配对码 的编辑状态：输入框与移动端底部的「确定」按钮共用 */
export const usePairingCodeEditor = () => {
  const pairingCode = useSettings((state) => state.pairingCode)
  const [editing, setEditing] = useState(false)
  const form = usePairingCodeForm(() => setEditing(false))
  return { pairingCode, editing, setEditing, form, showInput: !pairingCode || editing }
}

type PairingCodeEditor = ReturnType<typeof usePairingCodeEditor>

/** 本机配对码：保存后只显示掩码，点编辑按钮才能重新输入 */
export const PairingCodeField = ({ editor }: { editor: PairingCodeEditor }) => {
  const t = useTranslate()
  const isMobile = useIsMobile()
  const { pairingCode, editing, setEditing, form, showInput } = editor

  return (
    <div className={styles.cell}>
      <div className={styles.pairingCode}>
        <div className={styles.label}>{t('pairingCodeStart')}</div>
        <div id="pairing-code-help" className={styles.description}>{t('pairingCodeHelp')}</div>
        {pairingCode && !editing ? (
          <div className={styles.pairingCodeSaved}>
            <span className={styles.pairingCodeMask}>{'•'.repeat(12)}</span>
            <IconButton
              tone="primary"
              icon={<IconEditOutline16 />}
              tooltip={t('pairingCodeEdit')}
              onClick={() => setEditing(true)}
            />
          </div>
        ) : (
          <div className={styles.pairingCodeInput}>
            <input
              type="password"
              aria-label={t('pairingCodeStart')}
              aria-describedby="pairing-code-help"
              placeholder={t('pairingCodePlaceholder')}
              autoComplete="off"
              spellCheck={false}
              // 移动端打开设置时不弹键盘，点编辑后才聚焦
              autoFocus={!isMobile || editing}
              value={form.value}
              onChange={(event) => form.setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  void form.submit()
                }
              }}
              onBlur={() => {
                // 修改时没输入就离开，回到已保存的状态
                if (pairingCode && !form.value.trim()) {
                  setEditing(false)
                }
              }}
            />
            {!isMobile && form.value.trim() ? (
              <>
                <span className={styles.divider} />
                <button
                  type="button"
                  className={styles.confirm}
                  disabled={form.verifying}
                  // 保持输入框焦点
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void form.submit()}
                >
                  {form.verifying ? t('pairingCodeVerifying') : t('confirm')}
                </button>
              </>
            ) : null}
          </div>
        )}
        {showInput && form.error ? <div className={styles.error} role="alert">{form.error}</div> : null}
      </div>
    </div>
  )
}

/** 移动端：输入 本机配对码 时在选项下方显示整行「确定」 */
export const PairingCodeConfirm = ({ editor: { showInput, form } }: { editor: PairingCodeEditor }) => {
  const t = useTranslate()
  return showInput && form.value.trim() ? (
    <button
      type="button"
      className={styles.mobileConfirm}
      disabled={form.verifying}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => void form.submit()}
    >
      {form.verifying ? t('pairingCodeVerifying') : t('confirm')}
    </button>
  ) : null
}
