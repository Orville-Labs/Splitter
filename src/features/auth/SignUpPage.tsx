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

import { signUpSchema, type SignUpValues } from './authSchemas'

export function SignUpPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) })

  const signUp = useMutation({
    mutationFn: async (values: SignUpValues) => {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { display_name: values.displayName } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Check your email to confirm your account, then sign in.')
      navigate('/login', { replace: true })
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <h1 className="sr-only">Create a Spliter account</h1>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Start splitting expenses with your group.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => signUp.mutate(values))}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signup-name">Your name</Label>
              <Input id="signup-name" autoComplete="name" {...register('displayName')} />
              {errors.displayName && (
                <p className="text-negative text-sm">{errors.displayName.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-negative text-sm">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-negative text-sm">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" disabled={signUp.isPending}>
              {signUp.isPending ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
