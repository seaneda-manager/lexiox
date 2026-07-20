"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export type CreateHomeworkInput = {
  wordId: string;
  word: string;
  pos: string;
  meanings: string[];
  type: "text" | "audio";
};

export async function createHomeworkFromWrongWords(setId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Not authenticated" };
    }

    // 1. 오답 단어 조회 (학생의 recent attempts에서)
    const wrongAttempts = await db.query(
      `
      SELECT DISTINCT la.wrong_word_ids, w.word, w.base_pos, w.meanings
      FROM vocab_learning_attempts la
      JOIN words w ON w.id = ANY(la.wrong_word_ids::uuid[])
      WHERE la.student_id = $1
      AND la.vocab_track_set_id = $2
      AND la.created_at > NOW() - INTERVAL '1 day'
      ORDER BY w.word
      `,
      [session.user.id, setId]
    );

    if (!wrongAttempts.rows.length) {
      return { ok: true, homework: [] };
    }

    // 2. 각 오답 단어별 Homework 생성
    const homework: CreateHomeworkInput[] = [];
    const seen = new Set<string>();

    for (const row of wrongAttempts.rows) {
      const wrongWordIds = row.wrong_word_ids || [];

      for (const wordId of wrongWordIds) {
        if (seen.has(wordId)) continue;
        seen.add(wordId);

        // 3. 해당 단어 정보 조회
        const wordResult = await db.query(
          `
          SELECT id, word, base_pos, meanings, audio_url
          FROM words
          WHERE id = $1
          `,
          [wordId]
        );

        if (!wordResult.rows.length) continue;

        const word = wordResult.rows[0];
        const type = Math.random() > 0.5 ? "text" : "audio";

        homework.push({
          wordId: word.id,
          word: word.word,
          pos: word.base_pos || "noun",
          meanings: word.meanings || [],
          type,
        });
      }
    }

    // 4. Homework 저장 (batch insert)
    if (homework.length > 0) {
      const values = homework.map((hw, idx) => {
        const offset = idx * 7;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
      }).join(",");

      const params: any[] = [];
      for (const hw of homework) {
        params.push(
          session.user.id,
          hw.wordId,
          hw.word,
          hw.pos,
          JSON.stringify(hw.meanings),
          hw.type,
          new Date()
        );
      }

      await db.query(
        `
        INSERT INTO vocab_student_homework
        (student_id, word_id, word_text, pos, meanings, homework_type, created_at)
        VALUES ${values}
        ON CONFLICT (student_id, word_id, DATE(created_at)) DO NOTHING
        `,
        params
      );
    }

    return { ok: true, homework };
  } catch (error: any) {
    console.error("createHomeworkFromWrongWords error:", error);
    return { ok: false, error: error.message };
  }
}

export async function getTodaysHomework() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Not authenticated" };
    }

    const homework = await db.query(
      `
      SELECT
        id,
        word_id as "wordId",
        word_text as word,
        pos,
        meanings,
        homework_type as type,
        status,
        points
      FROM vocab_student_homework
      WHERE student_id = $1
      AND DATE(created_at) = DATE(NOW())
      ORDER BY created_at
      `,
      [session.user.id]
    );

    return {
      ok: true,
      homework: homework.rows.map((hw: any) => ({
        ...hw,
        meanings: typeof hw.meanings === "string" ? JSON.parse(hw.meanings) : hw.meanings,
      })),
    };
  } catch (error: any) {
    console.error("getTodaysHomework error:", error);
    return { ok: false, error: error.message };
  }
}

export async function updateHomeworkPoints(
  homeworkId: string,
  points: number,
  status: "completed" | "in_progress" = "completed"
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Not authenticated" };
    }

    await db.query(
      `
      UPDATE vocab_student_homework
      SET points = $1, status = $2, updated_at = NOW()
      WHERE id = $3 AND student_id = $4
      `,
      [points, status, homeworkId, session.user.id]
    );

    return { ok: true };
  } catch (error: any) {
    console.error("updateHomeworkPoints error:", error);
    return { ok: false, error: error.message };
  }
}
