import { openDB, type DBSchema } from 'idb'

interface FontDatabase extends DBSchema {
  fonts: { key: 'custom'; value: File }
}

const openFontDatabase = () =>
  openDB<FontDatabase>('moseek-fonts', 1, {
    upgrade: (db) => {
      db.createObjectStore('fonts')
    },
  })

let installed: { file: File; face: FontFace } | undefined
let restoring: Promise<string | undefined> | undefined

const loadFace = async (file: File) =>
  new FontFace('Moseek Custom', await file.arrayBuffer()).load()

const installFace = (file: File, face: FontFace) => {
  if (installed) {
    document.fonts.delete(installed.face)
  }
  document.fonts.add(face)
  installed = { file, face }
}

const restore = async () => {
  const db = await openFontDatabase()
  try {
    const file = await db.get('fonts', 'custom')
    if (file && !installed) {
      const face = await loadFace(file)
      if (!installed) {
        installFace(file, face)
      }
    }
    return installed?.file.name
  } finally {
    db.close()
  }
}

export const restoreCustomFont = () =>
  installed
    ? Promise.resolve(installed.file.name)
    : (restoring ??= restore().finally(() => {
        restoring = undefined
      }))

export const importCustomFont = async (file: File) => {
  // Validate the font before replacing the previously saved file.
  const face = await loadFace(file)
  const db = await openFontDatabase()
  try {
    await db.put('fonts', file, 'custom')
  } finally {
    db.close()
  }
  installFace(file, face)
}
