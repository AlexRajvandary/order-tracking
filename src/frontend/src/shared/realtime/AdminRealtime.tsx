import { useEffect } from 'react'
import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/model/AuthContext'
import { getStoredAccessToken } from '@/shared/api/authorizedClient'
import { invalidateTopics } from './topics'
import { patchPresence } from './presence'

/**
 * Keeps a SignalR connection to the admin hub open while an admin is authenticated and
 * translates server events into React Query cache updates for live dashboards and tables.
 */
export function AdminRealtime() {
  const { isAuthenticated, user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated) return

    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/admin', {
        accessTokenFactory: () => getStoredAccessToken() ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('topicsChanged', (topics: string[]) => {
      invalidateTopics(queryClient, topics)
    })

    connection.on('adminPresenceChanged', (payload: { adminId: string; isOnline: boolean }) => {
      patchPresence(queryClient, 'admins', payload.adminId, payload.isOnline)
    })

    connection.on('clientPresenceChanged', (payload: { customerId: string; isOnline: boolean }) => {
      patchPresence(queryClient, 'customers', payload.customerId, payload.isOnline)
      patchPresence(queryClient, 'customer', payload.customerId, payload.isOnline)
    })

    // After a reconnect we may have missed events; refetch everything realtime-backed.
    connection.onreconnected(() => {
      invalidateTopics(queryClient, ['orders', 'customers', 'admins', 'statuses', 'dashboard'])
    })

    connection.start().catch(() => {
      // AutomaticReconnect only applies after a successful start; ignore initial failure.
    })

    return () => {
      connection.off('topicsChanged')
      connection.off('adminPresenceChanged')
      connection.off('clientPresenceChanged')
      if (connection.state !== HubConnectionState.Disconnected) {
        void connection.stop()
      }
    }
  }, [isAuthenticated, user?.id, queryClient])

  return null
}
