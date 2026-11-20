import { createContext, useContext } from 'react'

export const MessageScrollContext = createContext({
  followLatest: () => {},
  pauseFollowing: () => {},
})

export const useScrollToBottom = () => useContext(MessageScrollContext).followLatest
export const usePauseFollowing = () => useContext(MessageScrollContext).pauseFollowing
