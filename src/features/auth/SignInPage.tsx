import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabaseClient'

import { signInSchema, type SignInValues } from './authSchemas'

export function SignInPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) })

  const signIn = useMutation({
    mutationFn: async (values: SignInValues) => {
      const { error } = await supabase.auth.signInWithPassword(values)
      if (error) throw error
    },
    onSuccess: () => navigate('/app', { replace: true }),
    onError: (error) => toast.error(error.message),
  })

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <h1 className="sr-only">Sign in to Spliter</h1>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back to Spliter.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => signIn.mutate(values))}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signin-email">Email</Label>
              <Input id="signin-email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-negative text-sm">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-negative text-sm">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" disabled={signIn.isPending}>
              {signIn.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            No account?{' '}
            <Link to="/signup" className="text-primary underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
