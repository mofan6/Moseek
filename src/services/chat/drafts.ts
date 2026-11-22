import { create } from 'zustand'
import { openDB } from 'idb'
import type { TranslationMessage } from '../../i18n/index.js'
import { showToast } from '../../components/base/toastState.js'
import { createId } from '../../utils/id.js'
import {
  cancelUpload,
  isImage,
  resolveMimeType,
  uploadAttachment,
  validateFiles,
  type UploadTask,
} from '../attachments.js'
import type { FileAttachment } from './types.js'

export type DraftAttachment = {
  /** 本地标识，也是 IndexedDB 原件与上传任务的 key */
  id: string
  file: File
  isImage: boolean
}

type Draft = { text: string; attachments: DraftAttachment[] }

export const EMPTY_DRAFT: Draft = { text: '', attachments: [] }

/** null 是新对话的草稿。 */
export const useDrafts = create<{ drafts: Map<string | null, Draft> }>(() => ({
  drafts: new Map(),
}))

const TEXT_PREFIX = 'moseek:draft:'
const draftKey = (id: string | null) => id ?? ''
let draftDB: ReturnType<typeof openDB> | undefined
const openDrafts = () =>
  (draftDB ??= openDB('moseek-drafts', 1, {
    upgrade(db) {
      db.createObjectStore('attachments')
    },
  }).catch((error: unknown) => {
    draftDB = undefined
    throw error
  }))

const draftError = () => showToast({ key: 'draftSaveFailed', type: 'error' })

export const restoreDrafts = async () => {
  const restored = new Map<string | null, Draft>()
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(TEXT_PREFIX)) {
        const text = localStorage.getItem(key)
        if (text) {
          restored.set(key.slice(TEXT_PREFIX.length) || null, { text, attachments: [] })
        }
      }
    }
    const db = await openDrafts()
    const tx = db.transaction('attachments', 'readonly')
    for (let cursor = await tx.store.openCursor(); cursor; cursor = await cursor.continue()) {
      const id = String(cursor.key) || null
      restored.set(id, { text: restored.get(id)?.text ?? '', attachments: cursor.value })
    }
  } catch {
    draftError()
  }
  useDrafts.setState((state) => ({ drafts: new Map([...restored, ...state.drafts]) }))
}

export const getDraft = (sessionId: string | null): Draft =>
  useDrafts.getState().drafts.get(sessionId) ?? EMPTY_DRAFT

const updateDraft = (sessionId: string | null, update: (draft: Draft) => Draft) =>
  useDrafts.setState((state) => {
    const previous = state.drafts.get(sessionId) ?? EMPTY_DRAFT
    const draft = update(previous)
    const drafts = new Map(state.drafts)
    const key = draftKey(sessionId)
    if (draft.text !== previous.text) {
      try {
        if (draft.text) {
          localStorage.setItem(TEXT_PREFIX + key, draft.text)
        } else if (localStorage.getItem(TEXT_PREFIX + key) === previous.text) {
          localStorage.removeItem(TEXT_PREFIX + key)
        }
      } catch {
        draftError()
      }
    }
    if (
      draft.attachments !== previous.attachments &&
      (draft.attachments.length || previous.attachments.length)
    ) {
      void openDrafts()
        .then(async (db) => {
          const tx = db.transaction('attachments', 'readwrite')
          if (draft.attachments.length) {
            await tx.store.put(draft.attachments, key)
          } else {
            const current: DraftAttachment[] | undefined = await tx.store.get(key)
            if (
              current?.length === previous.attachments.length &&
              current.every((file, index) => file.id === previous.attachments[index].id)
            ) {
              await tx.store.delete(key)
            }
          }
          await tx.done
        })
        .catch(draftError)
    }
    if (draft.text || draft.attachments.length > 0) {
      drafts.set(sessionId, draft)
    } else {
      drafts.delete(sessionId)
    }
    return { drafts }
  })

export const setDraftText = (sessionId: string | null, text: string) =>
  updateDraft(sessionId, (draft) => ({ ...draft, text }))

const upload = (attachment: DraftAttachment, apiKey: string) => {
  // 上传任务负责记录错误，输入框的附件卡片展示失败及重试入口。
  void uploadAttachment(
    apiKey,
    attachment.id,
    attachment.file,
    attachment.file.name,
    attachment.isImage
  ).catch(() => {})
}

/** 整批校验通过后才加入草稿并开始上传。 */
export const addDraftFiles = (
  sessionId: string | null,
  files: File[],
  apiKey: string
): TranslationMessage | null => {
  if (files.length === 0) {
    return null
  }
  const error = validateFiles(files, getDraft(sessionId).attachments.length)
  if (error) {
    return error
  }
  const added = files.map(
    (file): DraftAttachment => ({
      id: createId(),
      file,
      isImage: isImage(resolveMimeType(file)),
    })
  )
  updateDraft(sessionId, (draft) => ({ ...draft, attachments: [...draft.attachments, ...added] }))
  added.forEach((attachment) => upload(attachment, apiKey))
  return null
}

export const retryDraftAttachment = (
  sessionId: string | null,
  attachmentId: string,
  apiKey: string
) => {
  const attachment = getDraft(sessionId).attachments.find((item) => item.id === attachmentId)
  if (attachment) {
    upload(attachment, apiKey)
  }
}

/** 发送按钮和实际提交共用规则：有内容，且全部附件已上传成功。 */
export const prepareDraftMessage = (draft: Draft, tasks: Record<string, UploadTask>) => {
  const text = draft.text.trim()
  if (!text && draft.attachments.length === 0) {
    return null
  }
  const files: (FileAttachment & { serverId: string; blob: Blob })[] = []
  for (const attachment of draft.attachments) {
    const task = tasks[attachment.id]
    if (task?.status !== 'done' || !task.serverId) {
      return null
    }
    files.push({
      id: attachment.id,
      serverId: task.serverId,
      name: attachment.file.name,
      size: attachment.file.size,
      isImage: attachment.isImage,
      mimeType: resolveMimeType(attachment.file),
      blob: attachment.file,
    })
  }
  return { text, files }
}

export const removeDraftAttachment = (sessionId: string | null, attachmentId: string) => {
  const attachment = getDraft(sessionId).attachments.find((item) => item.id === attachmentId)
  if (!attachment) {
    return
  }
  cancelUpload(attachment.id)
  updateDraft(sessionId, (draft) => ({
    ...draft,
    attachments: draft.attachments.filter((item) => item.id !== attachmentId),
  }))
}

/** 发送成功后原件与 serverId 已交给会话，保留上传完成态。 */
export const clearSentDraft = (sessionId: string | null) => {
  updateDraft(sessionId, () => EMPTY_DRAFT)
}

/** 删除会话或替换历史成功后，释放尚未发送的草稿及上传任务。 */
export const clearDraft = (sessionId: string | null) => {
  getDraft(sessionId).attachments.forEach((attachment) => cancelUpload(attachment.id))
  updateDraft(sessionId, () => EMPTY_DRAFT)
}

export const clearAllDrafts = () => {
  for (const id of useDrafts.getState().drafts.keys()) {
    clearDraft(id)
  }
}

export const moveDraft = (from: string, to: string) => {
  const draft = getDraft(from)
  if (draft !== EMPTY_DRAFT) {
    updateDraft(to, () => draft)
    clearSentDraft(from)
  }
}
