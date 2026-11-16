import { lazy, Suspense } from 'react'
import { LoadingState } from '@/components/states/States'

// Development-only gallery, loaded on demand so it never weighs on the main bundle.
const ComponentGallery = lazy(() => import('./ComponentGallery').then((m) => ({ default: m.ComponentGallery })))

export function ComponentGalleryRoute() {
  return (
    <Suspense fallback={<LoadingState what="the component gallery" />}>
      <ComponentGallery />
    </Suspense>
  )
}
