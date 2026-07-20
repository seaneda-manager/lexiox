import { z } from 'zod';

// 理쒖냼 援ъ꽦 ???ㅼ젣 ?꾨뱶???먯쭊 異붽?
export const listeningTrackSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  name: z.string().optional(),
  audioUrl: z.string().optional(),
  audio_url: z.string().optional(),
  imageUrl: z.string().optional(),
  image_url: z.string().optional(),
  // ...?꾩슂??異붽?
});

export const lQuestionSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  stem: z.string(),
  choices: z.array(
    z.object({
      id: z.string(),
      label: z.string().optional(),
      text: z.string(),
      correct: z.boolean().optional(),
    })
  ).optional(),
  // ...?꾩슂??異붽?
});

export const listeningSetSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  conversation: listeningTrackSchema.optional(),
  lecture: listeningTrackSchema.optional(),
  // ...?꾩슂??異붽?
});

// ???
export type ListeningTrack = z.infer<typeof listeningTrackSchema>;
export type LQuestion = z.infer<typeof lQuestionSchema>;
export type ListeningSet = z.infer<typeof listeningSetSchema>;




