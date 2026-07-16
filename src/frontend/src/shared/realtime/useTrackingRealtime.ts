import { useEffect } from 'react'
import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Connects a public tracking viewer to the tracking hub. While connected the customer is counted
 * as "online" on the server, and status/history changes for this order refresh automatically.
 */
export function useTrackingRealtime(trackingCode: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (trackingCode.length !== 5) return

    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/tracking')
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    const join = () => {
      void connection.invoke('Join', trackingCode).catch(() => {})
    }

    connection.on('trackingChanged', () => {
      void queryClient.invalidateQueries({ queryKey: ['public-track', trackingCode] })
    })

    connection.onreconnected(() => {
      join()
      void queryClient.invalidateQueries({ queryKey: ['public-track', trackingCode] })
    })

    connection
      .start()
      .then(join)
      .catch(() => {})

    return () => {
      connection.off('trackingChanged')
      if (connection.state !== HubConnectionState.Disconnected) {
        void connection.stop()
      }
    }
  }, [trackingCode, queryClient])
}
