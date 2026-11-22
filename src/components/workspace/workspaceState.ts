import { create } from 'zustand'

type WorkspacePanel = 'search' | 'timeline' | 'usage'

export const useWorkspace = create<{ panel: WorkspacePanel | null }>(() => ({ panel: null }))

export const openWorkspace = (panel: WorkspacePanel) => useWorkspace.setState({ panel })
export const closeWorkspace = () => useWorkspace.setState({ panel: null })
