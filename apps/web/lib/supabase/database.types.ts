export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      words: {
        Row: {
          id: string
          text: string
          pos: string | null
          lemma: string | null
          is_function_word: boolean
          meanings_ko: string[]
          meanings_en_simple: string[]
          examples_easy: string[]
          examples_normal: string[]
          derived_terms: string[]
          difficulty: number | null
          frequency_score: number | null
          notes: string | null
          phonetic: string | null
          audioUrl: string | null
          synonyms_ko: string[][]
          antonyms_ko: string[][]
          example_en: string | null
          example_ko: string | null
          adj_comp: string | null
          adj_sup: string | null
          adv_comp: string | null
          adv_sup: string | null
          created_at: string
        }
        Insert: {
          id?: string
          text: string
          pos?: string | null
          lemma?: string | null
          is_function_word?: boolean
          meanings_ko: string[]
          meanings_en_simple?: string[]
          examples_easy?: string[]
          examples_normal?: string[]
          derived_terms?: string[]
          difficulty?: number | null
          frequency_score?: number | null
          notes?: string | null
          phonetic?: string | null
          audioUrl?: string | null
          synonyms_ko?: string[][]
          antonyms_ko?: string[][]
          example_en?: string | null
          example_ko?: string | null
          adj_comp?: string | null
          adj_sup?: string | null
          adv_comp?: string | null
          adv_sup?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          text?: string
          pos?: string | null
          lemma?: string | null
          is_function_word?: boolean
          meanings_ko?: string[]
          meanings_en_simple?: string[]
          examples_easy?: string[]
          examples_normal?: string[]
          derived_terms?: string[]
          difficulty?: number | null
          frequency_score?: number | null
          notes?: string | null
          phonetic?: string | null
          audioUrl?: string | null
          synonyms_ko?: string[][]
          antonyms_ko?: string[][]
          example_en?: string | null
          example_ko?: string | null
          adj_comp?: string | null
          adj_sup?: string | null
          adv_comp?: string | null
          adv_sup?: string | null
          created_at?: string
        }
      }
      word_grade_bands: {
        Row: { id: string; word_id: string; grade: string }
        Insert: { id?: string; word_id: string; grade: string }
        Update: { id?: string; word_id?: string; grade?: string }
      }
      word_sources: {
        Row: { id: string; word_id: string; source_type: string; source_label: string; exam_year: number | null; exam_month: number | null; exam_round: string | null; grade: string | null }
        Insert: { id?: string; word_id: string; source_type: string; source_label: string; exam_year?: number | null; exam_month?: number | null; exam_round?: string | null; grade?: string | null }
        Update: { id?: string; word_id?: string; source_type?: string; source_label?: string; exam_year?: number | null; exam_month?: number | null; exam_round?: string | null; grade?: string | null }
      }
      word_grammar_hints: {
        Row: { id: string; word_id: string; grammar_category: string; short_tip_ko: string; short_tip_en: string | null; wrong_example: string | null; right_example: string | null; show_until_grade: string | null; sort_order: number }
        Insert: { id?: string; word_id: string; grammar_category: string; short_tip_ko: string; short_tip_en?: string | null; wrong_example?: string | null; right_example?: string | null; show_until_grade?: string | null; sort_order?: number }
        Update: { id?: string; word_id?: string; grammar_category?: string; short_tip_ko?: string; short_tip_en?: string | null; wrong_example?: string | null; right_example?: string | null; show_until_grade?: string | null; sort_order?: number }
      }
      semantic_tags: {
        Row: { id: string; name: string; description: string | null }
        Insert: { id?: string; name: string; description?: string | null }
        Update: { id?: string; name?: string; description?: string | null }
      }
      word_semantic_tags: {
        Row: { id: string; word_id: string; tag_id: string }
        Insert: { id?: string; word_id: string; tag_id: string }
        Update: { id?: string; word_id?: string; tag_id?: string }
      }
      user_word_knowledge: {
        Row: { id: string; user_id: string; word_id: string; status: string; last_reviewed: string | null }
        Insert: { id?: string; user_id: string; word_id: string; status: string; last_reviewed?: string | null }
        Update: { id?: string; user_id?: string; word_id?: string; status?: string; last_reviewed?: string | null }
      }
      academy_students: {
        Row: { id: string; user_id: string | null; auth_user_id: string | null; login_id: string | null; full_name: string | null; grade: string | null; school: string | null; is_active: boolean | null; must_change_password: boolean | null; created_at: string | null }
        Insert: { id?: string; user_id?: string | null; auth_user_id?: string | null; login_id?: string | null; full_name?: string | null; grade?: string | null; school?: string | null; is_active?: boolean | null; must_change_password?: boolean | null; created_at?: string | null }
        Update: { id?: string; user_id?: string | null; auth_user_id?: string | null; login_id?: string | null; full_name?: string | null; grade?: string | null; school?: string | null; is_active?: boolean | null; must_change_password?: boolean | null; created_at?: string | null }
      }
      vocab_tracks: {
        Row: { id: string; slug: string | null; title: string | null; description: string | null; total_days: number | null; created_at: string | null; is_active?: boolean | null }
        Insert: { id?: string; slug?: string | null; title?: string | null; description?: string | null; total_days?: number | null; created_at?: string | null; is_active?: boolean | null }
        Update: { id?: string; slug?: string | null; title?: string | null; description?: string | null; total_days?: number | null; created_at?: string | null; is_active?: boolean | null }
      }
      vocab_sets: {
        Row: { id: string; title: string | null; description: string | null; track_id: string | null; order_index: number | null; created_at: string | null }
        Insert: { id?: string; title?: string | null; description?: string | null; track_id?: string | null; order_index?: number | null; created_at?: string | null }
        Update: { id?: string; title?: string | null; description?: string | null; track_id?: string | null; order_index?: number | null; created_at?: string | null }
      }
      vocab_set_items: {
        Row: { id: string; set_id: string | null; word_id: string | null; order_index: number | null }
        Insert: { id?: string; set_id?: string | null; word_id?: string | null; order_index?: number | null }
        Update: { id?: string; set_id?: string | null; word_id?: string | null; order_index?: number | null }
      }
      student_vocab_plans: {
        Row: { id: string; student_id: string; track_id: string; start_date: string; weekdays: number[]; max_active_sets: number | null; is_enabled: boolean | null; start_day_index: number | null; cursor_day_index: number | null; is_paused: boolean | null; paused_reason: string | null; sets_per_day: number | null }
        Insert: { id?: string; student_id: string; track_id: string; start_date: string; weekdays: number[]; max_active_sets?: number | null; is_enabled?: boolean | null; start_day_index?: number | null; cursor_day_index?: number | null; is_paused?: boolean | null; paused_reason?: string | null; sets_per_day?: number | null }
        Update: { id?: string; student_id?: string; track_id?: string; start_date?: string; weekdays?: number[]; max_active_sets?: number | null; is_enabled?: boolean | null; start_day_index?: number | null; cursor_day_index?: number | null; is_paused?: boolean | null; paused_reason?: string | null; sets_per_day?: number | null }
      }
      student_vocab_assignments: {
        Row: { id: string; student_id: string; track_id: string; day_index: number; set_id: string; status: string; available_at: string; assigned_at: string | null; started_at: string | null; completed_at: string | null; note: string | null }
        Insert: { id?: string; student_id: string; track_id: string; day_index: number; set_id: string; status: string; available_at: string; assigned_at?: string | null; started_at?: string | null; completed_at?: string | null; note?: string | null }
        Update: { id?: string; student_id?: string; track_id?: string; day_index?: number; set_id?: string; status?: string; available_at?: string; assigned_at?: string | null; started_at?: string | null; completed_at?: string | null; note?: string | null }
      }
      student_vocab_breaks: {
        Row: { id: string; student_id: string; start_date: string; end_date: string; mode: string; exam_track_id: string | null; note: string | null }
        Insert: { id?: string; student_id: string; start_date: string; end_date: string; mode: string; exam_track_id?: string | null; note?: string | null }
        Update: { id?: string; student_id?: string; start_date?: string; end_date?: string; mode?: string; exam_track_id?: string | null; note?: string | null }
      }
      profiles: {
        Row: { id: string; is_admin: boolean | null; role: string | null }
        Insert: { id: string; is_admin?: boolean | null; role?: string | null }
        Update: { id?: string; is_admin?: boolean | null; role?: string | null }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      grade_band: "K1_2" | "K3_4" | "K5_6" | "K7_9" | "K10_12" | "POST_K12"
      word_source_type: "TEXTBOOK" | "SCHOOL_PRINT" | "SUNEUNG" | "MOGOSA" | "EBS" | "TOEFL" | "TOEIC" | "TEPS" | "SAT" | "CUSTOM"
      knowledge_status: "UNKNOWN" | "LEARNING" | "KNOWN" | "MASTERED"
      grammar_category: "NONE" | "BE_VERB" | "GENERAL_VERB" | "PRONOUN" | "ARTICLE" | "PREPOSITION" | "CONJUNCTION" | "RELATIVE_PRONOUN"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
