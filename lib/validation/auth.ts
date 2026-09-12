import { z } from 'zod';
export const passwordSchema = z.string().min(12, 'Use at least 12 characters.').max(128);
export const authSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('signout') }),
  z.object({ action: z.literal('forgot'), email: z.email().max(254) }),
  z.object({
    action: z.literal('signin'),
    email: z.email().max(254),
    password: z.string().min(1).max(128),
  }),
  z
    .object({
      action: z.literal('signup'),
      email: z.email().max(254),
      password: passwordSchema,
      confirmPassword: z.string(),
      displayName: z.string().trim().max(60).default(''),
    })
    .refine((b) => b.password === b.confirmPassword, {
      message: 'Passwords must match.',
      path: ['confirmPassword'],
    }),
  z
    .object({ action: z.literal('reset'), password: passwordSchema, confirmPassword: z.string() })
    .refine((b) => b.password === b.confirmPassword, {
      message: 'Passwords must match.',
      path: ['confirmPassword'],
    }),
]);
