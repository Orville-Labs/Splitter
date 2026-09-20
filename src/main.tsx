import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import { SignInPage } from '@/features/auth/SignInPage'
import { SignUpPage } from '@/features/auth/SignUpPage'
import { queryClient } from '@/lib/queryClient'
import { AppShell } from '@/routes/AppShell'
import { ComingSoon } from '@/routes/ComingSoon'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { ActiveSpaceProvider } from '@/state/ActiveSpaceProvider'
import { SessionProvider } from '@/state/SessionProvider'

import './index.css'

/**
 * Top-level routes only, per ROADMAP.md's routing decision: /login,
 * /signup, and /app (auth-gated). In-app tabs are NOT routes — they're
 * local state inside AppShell (Phase 4).
 */
const router = createBrowserRouter([
  { path: '/login', element: <SignInPage /> },
  { path: '/signup', element: <SignUpPage /> },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: (
          <ActiveSpaceProvider>
            <AppShell />
          </ActiveSpaceProvider>
        ),
      },
    ],
  },
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '*', element: <ComingSoon title="Not found" /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
        <Toaster richColors position="top-center" />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
