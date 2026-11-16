import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { createAppRouter } from '@/routes/router'

export function App() {
  // Workflow commands are never retried automatically: a retry must reuse the same request key (evidence skill, principle 8).
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false }, mutations: { retry: 0 } } }),
  )
  const [router] = useState(createAppRouter)
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
