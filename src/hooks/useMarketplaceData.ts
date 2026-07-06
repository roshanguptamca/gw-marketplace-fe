import { useEffect, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useMarketplaceData<T>(
  load: () => Promise<T>,
  dependencies: readonly unknown[],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true
    setState({ data: null, loading: true, error: null })
    void load()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error : new Error('Something went wrong'),
          })
        }
      })
    return () => {
      active = false
    }
    // The caller owns dependency stability, matching the useEffect API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return state
}
