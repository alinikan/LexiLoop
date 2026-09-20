import { z } from 'zod';
import { practiceCommands, evidenceSchema, sessionSchema } from './practice';
export const settingsSchema = z.object({
  displayName: z.string().trim().max(60).optional(),
  reducedMotion: z.boolean().optional(),
  goal: z.number().int().min(1).max(20),
  level: z.enum(['A2', 'B1', 'B2', 'C1']),
  interests: z.array(z.string().max(40)).max(8),
  reminder: z.boolean(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z
    .string()
    .max(80)
    .refine((t) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: t });
        return true;
      } catch {
        return false;
      }
    }, 'Choose a valid timezone.'),
  onboarded: z.boolean(),
  dark: z.boolean(),
});
const word = z.string().min(2).max(60);
export const commandSchema = z.discriminatedUnion('type', [
  ...practiceCommands,
  z.object({ type: z.literal('settings'), settings: settingsSchema }),
  z.object({
    type: z.literal('save'),
    word,
    source: z.enum(['personal', 'suggested']),
    note: z.string().max(2000).optional(),
    context: z.string().max(2000).optional(),
    tag: z.string().max(40).optional(),
    priority: z.boolean().optional(),
    toToday: z.boolean().optional(),
    captureId: z.uuid().optional(),
  }),
  z.object({ type: z.literal('know'), word, source: z.enum(['personal', 'suggested']).optional() }),
  ...(['select', 'remove', 'dismiss', 'reset', 'forget', 'practice-word'] as const).map((type) =>
    z.object({ type: z.literal(type), word }),
  ),
  z.object({ type: z.literal('start') }),
  z.object({
    type: z.literal('complete'),
    evidence: evidenceSchema.optional(),
    nextSession: sessionSchema.nullable().optional(),
    sessionKind: z.enum(['learn', 'review']).optional(),
    word,
    quality: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    confidence: z.number().int().min(0).max(4).optional(),
    day: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    kind: z.enum(['learn', 'review']),
    sentence: z.string().max(2000),
    id: z.uuid(),
  }),
  z.object({
    type: z.literal('edit'),
    word,
    note: z.string().max(2000),
    context: z.string().max(2000),
    tag: z.string().max(40),
    favorite: z.boolean(),
    archived: z.boolean(),
  }),
]);
