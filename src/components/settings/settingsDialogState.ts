import { create } from 'zustand'
import { useSettings } from '../../services/settings.js'

/** 设置弹窗的分组：通用设置 / 数据管理 */
export type SettingsSection = 'general' | 'data' | 'connection'

/** 设置弹窗：侧边栏底部、没有 本机配对码 时的操作与 401 提示都可以打开；section 为打开时选中的分组 */
export const useSettingsDialog = create(() => ({
  open: false,
  section: 'general' as SettingsSection,
}))

export const openSettings = (section: SettingsSection) =>
  useSettingsDialog.setState({ open: true, section })

export const closeSettings = () => useSettingsDialog.setState({ open: false })

/** 没有 本机配对码 时打开设置并选中「本机连接」，返回是否已有 Key */
export const ensurePairingCode = () => {
  if (useSettings.getState().pairingCode) {
    return true
  }
  openSettings('connection')
  return false
}
