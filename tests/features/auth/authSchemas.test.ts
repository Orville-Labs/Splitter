import { describe, expect, it } from 'vitest'
import { signInSchema, signUpSchema } from '@/features/auth/authSchemas'

describe('signInSchema', () => {
  it('accepts a valid email and non-empty password', () => {
    const result = signInSchema.safeParse({ email: 'kavin@example.com', password: 'anything' })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = signInSchema.safeParse({ email: 'not-an-email', password: 'anything' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty password', () => {
    const result = signInSchema.safeParse({ email: 'kavin@example.com', password: '' })
    expect(result.success).toBe(false)
  })
})

describe('signUpSchema', () => {
  it('accepts a valid signup', () => {
    const result = signUpSchema.safeParse({
      displayName: 'Kavin',
      email: 'kavin@example.com',
      password: 'longenough',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a password under 8 characters', () => {
    const result = signUpSchema.safeParse({
      displayName: 'Kavin',
      email: 'kavin@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty display name', () => {
    const result = signUpSchema.safeParse({
      displayName: '  ',
      email: 'kavin@example.com',
      password: 'longenough',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a display name over 40 characters', () => {
    const result = signUpSchema.safeParse({
      displayName: 'x'.repeat(41),
      email: 'kavin@example.com',
      password: 'longenough',
    })
    expect(result.success).toBe(false)
  })
})
