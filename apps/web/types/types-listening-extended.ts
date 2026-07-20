// apps/web/types/types-listening-extended.ts
import { z } from 'zod';

/** 留ㅼ슦 愿????ㅽ궎留? 怨쇨굅/?꾩옱 ?꾨뱶紐??쇱슜??紐⑤몢 ?덉슜 */
const ChoiceZ = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    text: z.string().optional(),
    label: z.string().optional(),
    is_correct: z.boolean().optional(),
    correct: z.boolean().optional(),
  })
  .passthrough();

const QuestionZ = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    number: z.number().int().positive().optional(),
    // 蹂몃Ц ?꾨뱶 ?쇱슜
    prompt: z.string().optional(),
    stem: z.string().optional(),
    text: z.string().optional(),
    body: z.string().optional(),
    // ?좏깮吏 ?꾨뱶 ?쇱슜
    choices: z.array(ChoiceZ).optional(),
    options: z.array(ChoiceZ).optional(),
    meta: z.any().optional(),
  })
  .passthrough();

const TrackZ = z
  .object({
    id: z.union([z.string(), z.number()]),
    title: z.string().optional(),
    name: z.string().optional(),
    // ?ㅻ뵒???대?吏 ?꾨뱶 ?쇱슜
    audioUrl: z.string().optional(),
    audio_url: z.string().optional(),
    audio: z.string().optional(),
    imageUrl: z.string().optional(),
    image_url: z.string().optional(),
    questions: z.array(QuestionZ).optional(),
  })
  .passthrough();

/** 理쒖긽??由ъ뒪???명듃 */
export const ListeningSetZ = z
  .object({
    setId: z.string().optional(),
    conversation: TrackZ,
    lecture: TrackZ,
  })
  .passthrough();

export type ListeningSet = z.infer<typeof ListeningSetZ>;




