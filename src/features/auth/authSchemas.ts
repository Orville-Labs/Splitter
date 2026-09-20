import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})
export type SignInValues = z.infer<typeof signInSchema>

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name').max(40, 'Keep it under 40 characters'),
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(8, 'At least 8 characters'),
})
export type SignUpValues = z.infer<typeof signUpSchema>
