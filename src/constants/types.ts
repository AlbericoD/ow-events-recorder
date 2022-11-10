export type Viewport = {
  scale: number,
  width: number,
  height: number
}

export type EventBusEvents = {
  mainPositionedFor: Viewport,
  setAutoLaunch: boolean
}
