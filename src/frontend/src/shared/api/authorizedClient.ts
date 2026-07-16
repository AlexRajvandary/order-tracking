import { API_BASE_URL } from './config'
import { ApiError } from './client'

type AccessTokenHolder = {
  getAccessToken: () => string | null
  setAccessToken: (token: string | null) => void
  onUnauthorized: () => void
}

let holder: AccessTokenHolder | null = null
let refreshPromise: Promise<string | null> | null = null

export function registerAuthHolder(next: AccessTokenHolder) {
  holder = next
}

export function getStoredAccessToken(): string | null {
  return holder?.getAccessToken() ?? null
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })

        if (!response.ok) {
          holder?.onUnauthorized()
          return null
        }

        const data = (await response.json()) as { accessToken: string }
        holder?.setAccessToken(data.accessToken)
        return data.accessToken
      } catch {
        holder?.onUnauthorized()
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

export async function authorizedFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers)
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  if (!isFormData && init?.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const accessToken = holder?.getAccessToken()
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (response.status === 401 && holder) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`)
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
        credentials: 'include',
      })
    }
  }

  return response
}

export async function authorizedJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authorizedFetch(path, init)

  if (!response.ok) {
    let detail: string | undefined
    try {
      const problem = (await response.json()) as { detail?: string; title?: string }
      detail = problem.detail ?? problem.title
    } catch {
      detail = response.statusText
    }

    throw new ApiError(detail ?? 'Request failed', response.status, detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function authorizedBlob(path: string, init?: RequestInit): Promise<Blob> {
  const response = await authorizedFetch(path, init)

  if (!response.ok) {
    let detail: string | undefined
    try {
      const problem = (await response.json()) as { detail?: string; title?: string }
      detail = problem.detail ?? problem.title
    } catch {
      detail = response.statusText
    }

    throw new ApiError(detail ?? 'Request failed', response.status, detail)
  }

  return response.blob()
}

/** Multipart upload with upload progress (0–100). Uses XHR because fetch has no upload progress. */
export function authorizedUpload<T>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const send = (accessToken: string | null) =>
    new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE_URL}${path}`)
      xhr.withCredentials = true

      if (accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
      }

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || !onProgress) return
        onProgress(Math.round((event.loaded / event.total) * 100))
      }

      xhr.onload = () => {
        if (xhr.status === 401) {
          reject(new ApiError('Unauthorized', 401))
          return
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          let detail: string | undefined
          try {
            const problem = JSON.parse(xhr.responseText) as { detail?: string; title?: string }
            detail = problem.detail ?? problem.title
          } catch {
            detail = xhr.statusText
          }
          reject(new ApiError(detail ?? 'Request failed', xhr.status, detail))
          return
        }

        if (xhr.status === 204 || !xhr.responseText) {
          resolve(undefined as T)
          return
        }

        try {
          resolve(JSON.parse(xhr.responseText) as T)
        } catch {
          reject(new ApiError('Invalid response', xhr.status))
        }
      }

      xhr.onerror = () => reject(new ApiError('Network error', 0))
      xhr.send(formData)
    })

  return send(holder?.getAccessToken() ?? null).catch(async (error) => {
    if (!(error instanceof ApiError) || error.status !== 401 || !holder) {
      throw error
    }

    const newToken = await refreshAccessToken()
    if (!newToken) {
      throw error
    }

    return send(newToken)
  })
}

