import { useRef, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { setConversationOptions, setSessionNotes, useChatStore } from '../../services/chat/store.js'
import type { Session } from '../../services/chat/types.js'
import { CONTEXT_MODES, getConversationDefaults, REPLY_STYLES } from '../../services/settings.js'
import { Button } from '../base/Button.js'
import { IconMenuOutline20, IconSettingsOutline16 } from '../base/icons.js'
import { IconButton } from '../base/IconButton.js'
import { Modal } from '../base/Modal.js'
import { replyStyleText } from '../settings/SettingsDialog.js'
import { openWorkspace } from './workspaceState.js'
import styles from './Workspace.module.css'

export const ConversationTools = ({ session }: { session: Session }) => {
  const t = useTranslate()
  const [open, setOpen] = useState(false)
  const selected = useRef('')
  return (
    <div className={styles.sessionActions}>
      <IconButton
        size="m"
        icon={<IconMenuOutline20 />}
        tooltip={t('conversationOutline')}
        onClick={() => openWorkspace('timeline')}
      />
      <IconButton
        size="m"
        icon={<IconSettingsOutline16 />}
        tooltip={t('conversationSettings')}
        onPointerDown={() => {
          const selection = window.getSelection()
          const element = selection?.anchorNode?.parentElement
          selected.current = element?.closest('[data-history-message]')
            ? (selection?.toString().trim() ?? '')
            : ''
        }}
        onClick={(event) => {
          if (event.detail === 0) {
            selected.current = ''
          }
          setOpen(true)
        }}
      />
      {open ? (
        <ConversationEditor
          session={session}
          selection={selected.current}
          close={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}

const ConversationEditor = ({
  session,
  selection,
  close,
}: {
  session: Session
  selection: string
  close: () => void
}) => {
  const t = useTranslate()
  const importing = useChatStore((state) => state.importingHistory)
  const [options, setOptions] = useState(() => ({
    ...getConversationDefaults(),
    ...session.options,
  }))
  const [notes, setNotes] = useState(session.notes ?? '')
  const modes = {
    recent: 'settingsContextRecent',
    single: 'settingsContextSingle',
    full: 'settingsContextFull',
  } as const
  return (
    <Modal
      title={t('conversationSettings')}
      className={styles.dialog}
      mainClassName={styles.body}
      closable
      onClose={close}
      footer={
        <>
          <Button variant="outlined" size="m" onClick={close}>
            {t('cancel')}
          </Button>
          <Button
            size="m"
            disabled={importing}
            onClick={() => {
              setConversationOptions(session.id, {
                replyStyle: options.replyStyle,
                contextMode: options.contextMode,
              })
              setSessionNotes(session.id, notes)
              close()
            }}
          >
            {t('confirm')}
          </Button>
        </>
      }
    >
      <label>
        {t('settingsReplyStyle')}
        <select
          aria-label={t('settingsReplyStyle')}
          value={options.replyStyle}
          onChange={(event) => {
            const choice = REPLY_STYLES.find((style) => style === event.target.value)
            if (choice) {
              setOptions({ ...options, replyStyle: choice })
            }
          }}
        >
          {REPLY_STYLES.map((style) => (
            <option key={style} value={style}>
              {t(replyStyleText[style][0])}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('settingsContextMode')}
        <select
          aria-label={t('settingsContextMode')}
          value={options.contextMode}
          onChange={(event) => {
            const choice = CONTEXT_MODES.find((mode) => mode === event.target.value)
            if (choice) {
              setOptions({ ...options, contextMode: choice })
            }
          }}
        >
          {CONTEXT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(modes[mode])}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('conversationNotes')}
        <textarea
          aria-label={t('conversationNotes')}
          rows={4}
          maxLength={800}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      <p className={styles.hint}>{t('conversationNotesHint')}</p>
      {selection ? (
        <div>
          <Button
            variant="outlined"
            size="s"
            onClick={() => setNotes(`${notes.trim()}\n${selection}`.trim().slice(0, 800))}
          >
            {t('appendSelectedNote')}
          </Button>
        </div>
      ) : null}
    </Modal>
  )
}
