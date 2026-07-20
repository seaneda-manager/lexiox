export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      academy_class_meetings: {
        Row: {
          class_id: string
          created_at: string
          duration_min: number
          effective_from: string | null
          effective_to: string | null
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          class_id: string
          created_at?: string
          duration_min: number
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          class_id?: string
          created_at?: string
          duration_min?: number
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_class_meetings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "academy_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_class_students: {
        Row: {
          class_id: string
          created_at: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "academy_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_classes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          org_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string | null
        }
        Relationships: []
      }
      academy_students: {
        Row: {
          address: string | null
          auth_user_id: string | null
          birth_date: string | null
          class_days: string[] | null
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          deactivated_reason: string | null
          display_name: string
          email: string | null
          full_name: string | null
          grade: string | null
          grade_band: string | null
          id: string
          is_active: boolean | null
          level: Database["public"]["Enums"]["student_level"]
          login_id: string | null
          memo: string | null
          must_change_password: boolean
          notes: string | null
          parent_phone: string | null
          phone: string | null
          profile_id: string | null
          schedule_slot: string | null
          school: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          class_days?: string[] | null
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_reason?: string | null
          display_name: string
          email?: string | null
          full_name?: string | null
          grade?: string | null
          grade_band?: string | null
          id?: string
          is_active?: boolean | null
          level?: Database["public"]["Enums"]["student_level"]
          login_id?: string | null
          memo?: string | null
          must_change_password?: boolean
          notes?: string | null
          parent_phone?: string | null
          phone?: string | null
          profile_id?: string | null
          schedule_slot?: string | null
          school?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          class_days?: string[] | null
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_reason?: string | null
          display_name?: string
          email?: string | null
          full_name?: string | null
          grade?: string | null
          grade_band?: string | null
          id?: string
          is_active?: boolean | null
          level?: Database["public"]["Enums"]["student_level"]
          login_id?: string | null
          memo?: string | null
          must_change_password?: boolean
          notes?: string | null
          parent_phone?: string | null
          phone?: string | null
          profile_id?: string | null
          schedule_slot?: string | null
          school?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      adaptive_word_states: {
        Row: {
          created_at: string | null
          id: string
          last_seen_at: string | null
          locked: boolean | null
          updated_at: string | null
          user_id: string | null
          weak_score: number | null
          weak_tags: string[] | null
          word_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          last_seen_at?: string | null
          locked?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          weak_score?: number | null
          weak_tags?: string[] | null
          word_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          locked?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          weak_score?: number | null
          weak_tags?: string[] | null
          word_id?: string | null
        }
        Relationships: []
      }
      answer_key: {
        Row: {
          correct_choice_id: string
          question_id: string
        }
        Insert: {
          correct_choice_id: string
          question_id: string
        }
        Update: {
          correct_choice_id?: string
          question_id?: string
        }
        Relationships: []
      }
      answers: {
        Row: {
          attempt_id: string
          correct: boolean | null
          created_at: string | null
          duration_ms: number | null
          picks: number[]
          q_number: number
          updated_at: string | null
        }
        Insert: {
          attempt_id: string
          correct?: boolean | null
          created_at?: string | null
          duration_ms?: number | null
          picks?: number[]
          q_number: number
          updated_at?: string | null
        }
        Update: {
          attempt_id?: string
          correct?: boolean | null
          created_at?: string | null
          duration_ms?: number | null
          picks?: number[]
          q_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          created_by: string | null
          due_at: string | null
          homework_id: string | null
          id: string
          start_at: string | null
          status: string
          target: Json | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          homework_id?: string | null
          id?: string
          start_at?: string | null
          status?: string
          target?: Json | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          homework_id?: string | null
          id?: string
          start_at?: string | null
          status?: string
          target?: Json | null
          title?: string
        }
        Relationships: []
      }
      attempts: {
        Row: {
          finished_at: string | null
          id: string
          org_id: string
          section: Database["public"]["Enums"]["section_enum"]
          set_id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          org_id: string
          section: Database["public"]["Enums"]["section_enum"]
          set_id: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          org_id?: string
          section?: Database["public"]["Enums"]["section_enum"]
          set_id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: number
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: never
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: never
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      choices: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean | null
          order_index: number | null
          question_id: string
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          order_index?: number | null
          question_id: string
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          order_index?: number | null
          question_id?: string
          text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          content_id: number
          content_type: string
          expires_at: string | null
          group_id: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          content_id: number
          content_type: string
          expires_at?: string | null
          group_id?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          content_id?: number
          content_type?: string
          expires_at?: string | null
          group_id?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      content_sets: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          level: string | null
          owner_id: string
          section: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          level?: string | null
          owner_id: string
          section: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          level?: string | null
          owner_id?: string
          section?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          analysis: string | null
          created_at: string | null
          id: string
          paraphrase: string | null
          session_id: string | null
          translation: string | null
          user_id: string
        }
        Insert: {
          analysis?: string | null
          created_at?: string | null
          id?: string
          paraphrase?: string | null
          session_id?: string | null
          translation?: string | null
          user_id: string
        }
        Update: {
          analysis?: string | null
          created_at?: string | null
          id?: string
          paraphrase?: string | null
          session_id?: string | null
          translation?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_score"
            referencedColumns: ["session_id"]
          },
        ]
      }
      dictations: {
        Row: {
          created_at: string | null
          id: string
          question_id: string
          text_submitted: string
          user_id: string
          wer: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          text_submitted: string
          user_id: string
          wer?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          text_submitted?: string
          user_id?: string
          wer?: number | null
        }
        Relationships: []
      }
      digital_writing_items: {
        Row: {
          created_at: string | null
          id: string
          session_id: string | null
          step_meaning: boolean | null
          step_phonetic: boolean | null
          step_spell: boolean | null
          word_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          step_meaning?: boolean | null
          step_phonetic?: boolean | null
          step_spell?: boolean | null
          word_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          step_meaning?: boolean | null
          step_phonetic?: boolean | null
          step_spell?: boolean | null
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_writing_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "digital_writing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_writing_sessions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date_iso: string
          id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date_iso: string
          id?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date_iso?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      drill_attempts: {
        Row: {
          attempts: number
          created_at: string | null
          drill_type: string
          drill_word_result_id: string | null
          id: string
          success: boolean
        }
        Insert: {
          attempts: number
          created_at?: string | null
          drill_type: string
          drill_word_result_id?: string | null
          id?: string
          success: boolean
        }
        Update: {
          attempts?: number
          created_at?: string | null
          drill_type?: string
          drill_word_result_id?: string | null
          id?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "drill_attempts_drill_word_result_id_fkey"
            columns: ["drill_word_result_id"]
            isOneToOne: false
            referencedRelation: "drill_word_results"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_sessions: {
        Row: {
          created_at: string | null
          date_iso: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_iso: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_iso?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      drill_word_results: {
        Row: {
          created_at: string | null
          id: string
          session_id: string | null
          word_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          word_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_word_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "drill_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      explanations: {
        Row: {
          choice_explanations: Json | null
          created_at: string | null
          evidence_sentence: string | null
          evidence_translation_ko: string | null
          id: string
          module: string
          question_id: string
          signal_words: string[] | null
        }
        Insert: {
          choice_explanations?: Json | null
          created_at?: string | null
          evidence_sentence?: string | null
          evidence_translation_ko?: string | null
          id?: string
          module: string
          question_id: string
          signal_words?: string[] | null
        }
        Update: {
          choice_explanations?: Json | null
          created_at?: string | null
          evidence_sentence?: string | null
          evidence_translation_ko?: string | null
          id?: string
          module?: string
          question_id?: string
          signal_words?: string[] | null
        }
        Relationships: []
      }
      grammar_chapters: {
        Row: {
          created_at: string | null
          description: string
          focus: string
          id: string
          is_core: boolean | null
          learner_stage: string
          order: number
          publish_at: string | null
          status: string
          title: string
          unit_ids: string[] | null
          unpublish_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          focus: string
          id: string
          is_core?: boolean | null
          learner_stage: string
          order: number
          publish_at?: string | null
          status?: string
          title: string
          unit_ids?: string[] | null
          unpublish_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          focus?: string
          id?: string
          is_core?: boolean | null
          learner_stage?: string
          order?: number
          publish_at?: string | null
          status?: string
          title?: string
          unit_ids?: string[] | null
          unpublish_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      grammar_progress: {
        Row: {
          drill_index: number
          phase: string
          unit_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          drill_index?: number
          phase: string
          unit_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          drill_index?: number
          phase?: string
          unit_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grammar_progress_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "grammar_units"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_unit_progress: {
        Row: {
          completed_at: string | null
          current_index: number
          id: string
          status: string
          unit_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_index?: number
          id?: string
          status: string
          unit_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_index?: number
          id?: string
          status?: string
          unit_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      grammar_units: {
        Row: {
          created_at: string | null
          id: number
          payload: Json
        }
        Insert: {
          created_at?: string | null
          id?: number
          payload: Json
        }
        Update: {
          created_at?: string | null
          id?: number
          payload?: Json
        }
        Relationships: []
      }
      homework_reminders: {
        Row: {
          assignment_id: string
          homework_id: string
          id: string
          note: string | null
          sent_at: string
          sent_by: string
          target_user_ids: string[]
        }
        Insert: {
          assignment_id: string
          homework_id: string
          id?: string
          note?: string | null
          sent_at?: string
          sent_by: string
          target_user_ids: string[]
        }
        Update: {
          assignment_id?: string
          homework_id?: string
          id?: string
          note?: string | null
          sent_at?: string
          sent_by?: string
          target_user_ids?: string[]
        }
        Relationships: []
      }
      homework_results: {
        Row: {
          completed_at: string
          correct_count: number
          created_at: string
          homework_id: string
          id: string
          results: Json
          total_count: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          correct_count: number
          created_at?: string
          homework_id: string
          id?: string
          results: Json
          total_count: number
          user_id: string
        }
        Update: {
          completed_at?: string
          correct_count?: number
          created_at?: string
          homework_id?: string
          id?: string
          results?: Json
          total_count?: number
          user_id?: string
        }
        Relationships: []
      }
      learning_targets: {
        Row: {
          created_at: string | null
          date_iso: string
          decision: string
          id: string
          user_id: string
          word_id: string
        }
        Insert: {
          created_at?: string | null
          date_iso: string
          decision: string
          id?: string
          user_id: string
          word_id: string
        }
        Update: {
          created_at?: string | null
          date_iso?: string
          decision?: string
          id?: string
          user_id?: string
          word_id?: string
        }
        Relationships: []
      }
      listening_answers: {
        Row: {
          choice_id: string | null
          choice_ids: string[]
          created_at: string
          elapsed_ms: number | null
          id: string
          question_id: string
          session_id: string
          user_id: string
        }
        Insert: {
          choice_id?: string | null
          choice_ids?: string[]
          created_at?: string
          elapsed_ms?: number | null
          id?: string
          question_id: string
          session_id: string
          user_id: string
        }
        Update: {
          choice_id?: string | null
          choice_ids?: string[]
          created_at?: string
          elapsed_ms?: number | null
          id?: string
          question_id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listening_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "listening_answer_key"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "listening_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "listening_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listening_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "listening_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_choices: {
        Row: {
          id: string
          is_correct: boolean
          label: string | null
          question_id: string
          text: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          label?: string | null
          question_id: string
          text: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          label?: string | null
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "listening_choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "listening_answer_key"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "listening_choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "listening_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_passages: {
        Row: {
          id: string
        }
        Insert: {
          id?: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
      listening_play_counters: {
        Row: {
          mode: string
          plays_allowed: number
          plays_used: number
          session_id: string
          track_id: string
          updated_at: string
        }
        Insert: {
          mode: string
          plays_allowed?: number
          plays_used?: number
          session_id: string
          track_id: string
          updated_at?: string
        }
        Update: {
          mode?: string
          plays_allowed?: number
          plays_used?: number
          session_id?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_session"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "listening_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_questions: {
        Row: {
          id: string
          meta: Json
          multi: boolean
          number: number
          stem: string
          track_id: string
          type: string
        }
        Insert: {
          id?: string
          meta?: Json
          multi?: boolean
          number: number
          stem: string
          track_id: string
          type: string
        }
        Update: {
          id?: string
          meta?: Json
          multi?: boolean
          number?: number
          stem?: string
          track_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "listening_questions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "listening_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_sessions: {
        Row: {
          band_score: number | null
          consumed: boolean
          era: string | null
          finished_at: string | null
          id: string
          legacy_score: number | null
          meta: Json
          mode: string
          plays: number
          started_at: string
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          band_score?: number | null
          consumed?: boolean
          era?: string | null
          finished_at?: string | null
          id?: string
          legacy_score?: number | null
          meta?: Json
          mode: string
          plays?: number
          started_at?: string
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          band_score?: number | null
          consumed?: boolean
          era?: string | null
          finished_at?: string | null
          id?: string
          legacy_score?: number | null
          meta?: Json
          mode?: string
          plays?: number
          started_at?: string
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listening_sessions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "listening_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_sets: {
        Row: {
          created_by: string | null
          id: string
          locale: string | null
          spec: Json
          title: string | null
          tpo: number | null
          updated_at: string | null
        }
        Insert: {
          created_by?: string | null
          id: string
          locale?: string | null
          spec: Json
          title?: string | null
          tpo?: number | null
          updated_at?: string | null
        }
        Update: {
          created_by?: string | null
          id?: string
          locale?: string | null
          spec?: Json
          title?: string | null
          tpo?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      listening_tracks: {
        Row: {
          audio_url: string
          created_at: string
          id: string
          kind: string
          meta: Json
          title: string
          transcript: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          title: string
          transcript?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          title?: string
          transcript?: string | null
        }
        Relationships: []
      }
      memberships: {
        Row: {
          org_id: string
          role: Database["public"]["Enums"]["role_enum"]
          user_id: string
        }
        Insert: {
          org_id: string
          role?: Database["public"]["Enums"]["role_enum"]
          user_id: string
        }
        Update: {
          org_id?: string
          role?: Database["public"]["Enums"]["role_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          applied_at: string | null
          id: number
          name: string
        }
        Insert: {
          applied_at?: string | null
          id?: number
          name: string
        }
        Update: {
          applied_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: Json
          note_type: Database["public"]["Enums"]["note_type_enum"]
          org_id: string
          section: Database["public"]["Enums"]["section_enum"]
          set_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: Json
          note_type: Database["public"]["Enums"]["note_type_enum"]
          org_id: string
          section: Database["public"]["Enums"]["section_enum"]
          set_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          note_type?: Database["public"]["Enums"]["note_type_enum"]
          org_id?: string
          section?: Database["public"]["Enums"]["section_enum"]
          set_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          plan: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          plan?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          plan?: string | null
        }
        Relationships: []
      }
      passages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          order_index: number | null
          set_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          order_index?: number | null
          set_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          order_index?: number | null
          set_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passages_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "content_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_quiz_results: {
        Row: {
          id: string
          passed: boolean | null
          question_id: string
          score: number | null
          taken_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          passed?: boolean | null
          question_id: string
          score?: number | null
          taken_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          passed?: boolean | null
          question_id?: string
          score?: number | null
          taken_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      popup_quizzes: {
        Row: {
          created_at: string | null
          id: string
          items: Json
          module: string
          question_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          items: Json
          module: string
          question_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json
          module?: string
          question_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          can_produce: boolean
          class_days: string[]
          created_at: string
          email: string | null
          full_name: string | null
          grade: string | null
          id: string
          is_active: boolean
          is_admin: boolean
          login_id: string | null
          must_change_password: boolean
          name: string | null
          parent_phone: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          can_produce?: boolean
          class_days?: string[]
          created_at?: string
          email?: string | null
          full_name?: string | null
          grade?: string | null
          id: string
          is_active?: boolean
          is_admin?: boolean
          login_id?: string | null
          must_change_password?: boolean
          name?: string | null
          parent_phone?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          can_produce?: boolean
          class_days?: string[]
          created_at?: string
          email?: string | null
          full_name?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          login_id?: string | null
          must_change_password?: boolean
          name?: string | null
          parent_phone?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          clue_quote: string | null
          created_at: string | null
          explanation: string | null
          id: string
          number: number
          order_index: number | null
          passage_id: string | null
          set_id: string
          stem: string
          type: string
          updated_at: string | null
        }
        Insert: {
          clue_quote?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          number: number
          order_index?: number | null
          passage_id?: string | null
          set_id: string
          stem: string
          type: string
          updated_at?: string | null
        }
        Update: {
          clue_quote?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          number?: number
          order_index?: number | null
          passage_id?: string | null
          set_id?: string
          stem?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "passages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "content_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_snapshots: {
        Row: {
          avg_time_per_word_ms: number
          created_at: string | null
          date_iso: string
          id: string
          nickname: string
          rank: number | null
          scope: string
          total_time_ms: number
          user_id: string
          wrong_count: number
        }
        Insert: {
          avg_time_per_word_ms: number
          created_at?: string | null
          date_iso: string
          id?: string
          nickname: string
          rank?: number | null
          scope: string
          total_time_ms: number
          user_id: string
          wrong_count: number
        }
        Update: {
          avg_time_per_word_ms?: number
          created_at?: string | null
          date_iso?: string
          id?: string
          nickname?: string
          rank?: number | null
          scope?: string
          total_time_ms?: number
          user_id?: string
          wrong_count?: number
        }
        Relationships: []
      }
      reading_adaptive_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          item_id: string
          module_stage: number
          session_id: string
          target_id: string
          task_kind: string
          user_answer: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          item_id: string
          module_stage: number
          session_id: string
          target_id: string
          task_kind: string
          user_answer: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          item_id?: string
          module_stage?: number
          session_id?: string
          target_id?: string
          task_kind?: string
          user_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_adaptive_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reading_adaptive_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_adaptive_sessions: {
        Row: {
          created_at: string
          id: string
          stage1_correct: number
          stage1_total: number
          stage2_correct: number
          stage2_total: number
          test_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stage1_correct: number
          stage1_total: number
          stage2_correct: number
          stage2_total: number
          test_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stage1_correct?: number
          stage1_total?: number
          stage2_correct?: number
          stage2_total?: number
          test_id?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_answers: {
        Row: {
          choice_id: string | null
          elapsed_ms: number | null
          passage_id: string | null
          question_id: string
          session_id: string
        }
        Insert: {
          choice_id?: string | null
          elapsed_ms?: number | null
          passage_id?: string | null
          question_id: string
          session_id: string
        }
        Update: {
          choice_id?: string | null
          elapsed_ms?: number | null
          passage_id?: string | null
          question_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_answers_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "reading_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "reading_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_attempts: {
        Row: {
          choice_id: string | null
          created_at: string | null
          elapsed_ms: number | null
          id: string
          question_id: string
          session_id: string
        }
        Insert: {
          choice_id?: string | null
          created_at?: string | null
          elapsed_ms?: number | null
          id?: string
          question_id: string
          session_id: string
        }
        Update: {
          choice_id?: string | null
          created_at?: string | null
          elapsed_ms?: number | null
          id?: string
          question_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_attempts_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "reading_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "reading_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          question_id: string
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_bookmarks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "reading_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_bookmarks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_choices: {
        Row: {
          created_at: string
          explain: string | null
          id: string
          is_correct: boolean
          label: string | null
          ord: number | null
          question_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          explain?: string | null
          id?: string
          is_correct?: boolean
          label?: string | null
          ord?: number | null
          question_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          explain?: string | null
          id?: string
          is_correct?: boolean
          label?: string | null
          ord?: number | null
          question_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "reading_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          question_id: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          question_id: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          question_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_notes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "reading_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_passages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          ord: number | null
          set_id: string | null
          title: string
          ui: Json | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          ord?: number | null
          set_id?: string | null
          title: string
          ui?: Json | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          ord?: number | null
          set_id?: string | null
          title?: string
          ui?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_passages_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "reading_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_passages_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "v_user_reading_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_questions: {
        Row: {
          clue_quote: string | null
          created_at: string | null
          explanation: string | null
          id: string
          meta: Json | null
          number: number
          ord: number | null
          passage_id: string
          stem: string
          type: string
          updated_at: string
        }
        Insert: {
          clue_quote?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          meta?: Json | null
          number: number
          ord?: number | null
          passage_id: string
          stem: string
          type?: string
          updated_at?: string
        }
        Update: {
          clue_quote?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          meta?: Json | null
          number?: number
          ord?: number | null
          passage_id?: string
          stem?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "reading_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_results_2026: {
        Row: {
          answers: Json
          created_at: string
          finished_at: string
          id: number
          test_id: string
          total_questions: number
          user_id: string | null
        }
        Insert: {
          answers: Json
          created_at?: string
          finished_at?: string
          id?: number
          test_id: string
          total_questions: number
          user_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          finished_at?: string
          id?: number
          test_id?: string
          total_questions?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_results_2026_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "reading_tests_2026"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_sessions: {
        Row: {
          band_score: number | null
          era: string | null
          finished_at: string | null
          id: string
          legacy_score: number | null
          mode: string
          passage_id: string
          set_id: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          band_score?: number | null
          era?: string | null
          finished_at?: string | null
          id?: string
          legacy_score?: number | null
          mode: string
          passage_id: string
          set_id?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          band_score?: number | null
          era?: string | null
          finished_at?: string | null
          id?: string
          legacy_score?: number | null
          mode?: string
          passage_id?: string
          set_id?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_sessions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "reading_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_sets: {
        Row: {
          created_at: string | null
          id: string
          label: string
          source: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          id: string
          label: string
          source?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          source?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      reading_tests_2026: {
        Row: {
          created_at: string | null
          exam_era: string | null
          id: string
          label: string
          payload: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exam_era?: string | null
          id: string
          label: string
          payload: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exam_era?: string | null
          id?: string
          label?: string
          payload?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      review_items: {
        Row: {
          created_at: string | null
          explanation: string | null
          id: string
          question_id: string | null
          reference_kor: string | null
          reference_text: string | null
          session_id: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          explanation?: string | null
          id?: string
          question_id?: string | null
          reference_kor?: string | null
          reference_text?: string | null
          session_id?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          explanation?: string | null
          id?: string
          question_id?: string | null
          reference_kor?: string | null
          reference_text?: string | null
          session_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "reading_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_score"
            referencedColumns: ["session_id"]
          },
        ]
      }
      semantic_tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      sets: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          org_id: string
          payload_json: Json
          published_at: string | null
          section: Database["public"]["Enums"]["section_enum"]
          set_id: string
          title: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          org_id: string
          payload_json: Json
          published_at?: string | null
          section: Database["public"]["Enums"]["section_enum"]
          set_id: string
          title?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          org_id?: string
          payload_json?: Json
          published_at?: string | null
          section?: Database["public"]["Enums"]["section_enum"]
          set_id?: string
          title?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shadowing_attempts: {
        Row: {
          audio_url: string
          created_at: string | null
          id: string
          question_id: string
          score: number | null
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          id?: string
          question_id: string
          score?: number | null
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          id?: string
          question_id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      speaking_attempts: {
        Row: {
          audio_url: string
          created_at: string | null
          duration_sec: number | null
          id: string
          prompt_id: string
          scores: Json | null
          total: number | null
          transcript: string | null
          type: string
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          duration_sec?: number | null
          id?: string
          prompt_id: string
          scores?: Json | null
          total?: number | null
          transcript?: string | null
          type: string
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          duration_sec?: number | null
          id?: string
          prompt_id?: string
          scores?: Json | null
          total?: number | null
          transcript?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      speaking_results_2026: {
        Row: {
          approx_sentences: number | null
          approx_words: number | null
          content_score: number | null
          created_at: string
          fluency_score: number | null
          id: string
          language_score: number | null
          meta: Json | null
          mode: string | null
          prompt: string | null
          pronunciation_score: number | null
          script: string
          task_id: string
          test_id: string
          user_id: string | null
        }
        Insert: {
          approx_sentences?: number | null
          approx_words?: number | null
          content_score?: number | null
          created_at?: string
          fluency_score?: number | null
          id?: string
          language_score?: number | null
          meta?: Json | null
          mode?: string | null
          prompt?: string | null
          pronunciation_score?: number | null
          script: string
          task_id: string
          test_id: string
          user_id?: string | null
        }
        Update: {
          approx_sentences?: number | null
          approx_words?: number | null
          content_score?: number | null
          created_at?: string
          fluency_score?: number | null
          id?: string
          language_score?: number | null
          meta?: Json | null
          mode?: string | null
          prompt?: string | null
          pronunciation_score?: number | null
          script?: string
          task_id?: string
          test_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      speaking_voca_drill_results: {
        Row: {
          approx_sentences: number
          created_at: string
          id: string
          meta: Json | null
          mode: string | null
          must_use_words: string[]
          prompt: string
          script: string
          user_id: string | null
        }
        Insert: {
          approx_sentences?: number
          created_at?: string
          id?: string
          meta?: Json | null
          mode?: string | null
          must_use_words: string[]
          prompt: string
          script: string
          user_id?: string | null
        }
        Update: {
          approx_sentences?: number
          created_at?: string
          id?: string
          meta?: Json | null
          mode?: string | null
          must_use_words?: string[]
          prompt?: string
          script?: string
          user_id?: string | null
        }
        Relationships: []
      }
      speed_attempts: {
        Row: {
          correct_count: number
          created_at: string | null
          date_iso: string
          id: string
          total_questions: number
          total_time_ms: number
          try: number
          user_id: string
          wrong_word_ids: string[] | null
        }
        Insert: {
          correct_count: number
          created_at?: string | null
          date_iso: string
          id?: string
          total_questions: number
          total_time_ms: number
          try: number
          user_id: string
          wrong_word_ids?: string[] | null
        }
        Update: {
          correct_count?: number
          created_at?: string | null
          date_iso?: string
          id?: string
          total_questions?: number
          total_time_ms?: number
          try?: number
          user_id?: string
          wrong_word_ids?: string[] | null
        }
        Relationships: []
      }
      speed_challenge_sessions: {
        Row: {
          created_at: string | null
          date_iso: string
          id: string
          user_id: string
          word_ids: string[]
        }
        Insert: {
          created_at?: string | null
          date_iso: string
          id?: string
          user_id: string
          word_ids: string[]
        }
        Update: {
          created_at?: string | null
          date_iso?: string
          id?: string
          user_id?: string
          word_ids?: string[]
        }
        Relationships: []
      }
      speed_challenge_try_results: {
        Row: {
          avg_time_per_word_ms: number
          correct_count: number
          created_at: string | null
          id: string
          session_id: string | null
          total_time_ms: number
          total_words: number
          try_number: number
          wrong_word_ids: string[]
        }
        Insert: {
          avg_time_per_word_ms: number
          correct_count: number
          created_at?: string | null
          id?: string
          session_id?: string | null
          total_time_ms: number
          total_words: number
          try_number: number
          wrong_word_ids: string[]
        }
        Update: {
          avg_time_per_word_ms?: number
          correct_count?: number
          created_at?: string | null
          id?: string
          session_id?: string | null
          total_time_ms?: number
          total_words?: number
          try_number?: number
          wrong_word_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "speed_challenge_try_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "speed_challenge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          is_important: boolean
          note_type: Database["public"]["Enums"]["student_note_type"]
          student_id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_important?: boolean
          note_type?: Database["public"]["Enums"]["student_note_type"]
          student_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_important?: boolean
          note_type?: Database["public"]["Enums"]["student_note_type"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_skill_summaries: {
        Row: {
          area: Database["public"]["Enums"]["student_skill_area"]
          id: string
          level: number
          plan: string | null
          student_id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          area: Database["public"]["Enums"]["student_skill_area"]
          id?: string
          level: number
          plan?: string | null
          student_id: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          area?: Database["public"]["Enums"]["student_skill_area"]
          id?: string
          level?: number
          plan?: string | null
          student_id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_skill_summaries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          due_date: string | null
          id: string
          kind: string | null
          payload_json: Json
          priority: Database["public"]["Enums"]["student_task_priority"]
          start_at: string | null
          status: Database["public"]["Enums"]["student_task_status"]
          student_id: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          due_date?: string | null
          id?: string
          kind?: string | null
          payload_json?: Json
          priority?: Database["public"]["Enums"]["student_task_priority"]
          start_at?: string | null
          status?: Database["public"]["Enums"]["student_task_status"]
          student_id?: string | null
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          due_date?: string | null
          id?: string
          kind?: string | null
          payload_json?: Json
          priority?: Database["public"]["Enums"]["student_task_priority"]
          start_at?: string | null
          status?: Database["public"]["Enums"]["student_task_status"]
          student_id?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_tasks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tasks_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_unit_progress: {
        Row: {
          completed_at: string | null
          first_seen_at: string | null
          last_viewed_at: string | null
          progress: number
          unit_id: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          first_seen_at?: string | null
          last_viewed_at?: string | null
          progress?: number
          unit_id: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          first_seen_at?: string | null
          last_viewed_at?: string | null
          progress?: number
          unit_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_unit_progress_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "grammar_units"
            referencedColumns: ["id"]
          },
        ]
      }
      student_vocab_assignments: {
        Row: {
          assigned_at: string
          available_at: string
          canceled_at: string | null
          canceled_reason: string | null
          completed_at: string | null
          created_at: string
          day_index: number
          id: string
          note: string | null
          set_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["vocab_assignment_status"]
          student_id: string
          track_id: string
        }
        Insert: {
          assigned_at?: string
          available_at: string
          canceled_at?: string | null
          canceled_reason?: string | null
          completed_at?: string | null
          created_at?: string
          day_index: number
          id?: string
          note?: string | null
          set_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["vocab_assignment_status"]
          student_id: string
          track_id: string
        }
        Update: {
          assigned_at?: string
          available_at?: string
          canceled_at?: string | null
          canceled_reason?: string | null
          completed_at?: string | null
          created_at?: string
          day_index?: number
          id?: string
          note?: string | null
          set_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["vocab_assignment_status"]
          student_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_vocab_assignments_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_vocab_assignments_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_vocab_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_vocab_assignments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "vocab_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      student_vocab_breaks: {
        Row: {
          created_at: string
          end_date: string
          exam_track_id: string | null
          id: string
          mode: Database["public"]["Enums"]["student_vocab_break_mode"]
          note: string | null
          start_date: string
          student_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          exam_track_id?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["student_vocab_break_mode"]
          note?: string | null
          start_date: string
          student_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          exam_track_id?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["student_vocab_break_mode"]
          note?: string | null
          start_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_vocab_breaks_exam_track_fk"
            columns: ["exam_track_id"]
            isOneToOne: false
            referencedRelation: "vocab_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_vocab_breaks_exam_track_id_fkey"
            columns: ["exam_track_id"]
            isOneToOne: false
            referencedRelation: "vocab_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_vocab_breaks_student_fk"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_vocab_breaks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_vocab_plans: {
        Row: {
          created_at: string
          cursor_day_index: number
          id: string
          is_active: boolean
          is_enabled: boolean | null
          is_paused: boolean
          max_active_sets: number
          paused_reason: string | null
          queue_size: number
          start_date: string
          start_day_index: number
          student_id: string
          track_id: string
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          cursor_day_index?: number
          id?: string
          is_active?: boolean
          is_enabled?: boolean | null
          is_paused?: boolean
          max_active_sets?: number
          paused_reason?: string | null
          queue_size?: number
          start_date: string
          start_day_index?: number
          student_id: string
          track_id: string
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          created_at?: string
          cursor_day_index?: number
          id?: string
          is_active?: boolean
          is_enabled?: boolean | null
          is_paused?: boolean
          max_active_sets?: number
          paused_reason?: string | null
          queue_size?: number
          start_date?: string
          start_day_index?: number
          student_id?: string
          track_id?: string
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "student_vocab_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_vocab_plans_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "vocab_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      study_answers: {
        Row: {
          choice_id: string
          created_at: string
          id: number
          meta: Json | null
          question_id: string
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          choice_id: string
          created_at?: string
          id?: number
          meta?: Json | null
          question_id: string
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          choice_id?: string
          created_at?: string
          id?: number
          meta?: Json | null
          question_id?: string
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_score"
            referencedColumns: ["session_id"]
          },
        ]
      }
      study_items: {
        Row: {
          id: string
          is_correct: boolean | null
          last_viewed_at: string | null
          module: string
          number: number | null
          question_id: string
          required_learning_done: boolean | null
          session_id: string
          time_taken_ms: number | null
          type: string | null
          wrong_learning_done: boolean | null
        }
        Insert: {
          id?: string
          is_correct?: boolean | null
          last_viewed_at?: string | null
          module: string
          number?: number | null
          question_id: string
          required_learning_done?: boolean | null
          session_id: string
          time_taken_ms?: number | null
          type?: string | null
          wrong_learning_done?: boolean | null
        }
        Update: {
          id?: string
          is_correct?: boolean | null
          last_viewed_at?: string | null
          module?: string
          number?: number | null
          question_id?: string
          required_learning_done?: boolean | null
          session_id?: string
          time_taken_ms?: number | null
          type?: string | null
          wrong_learning_done?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "study_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_score"
            referencedColumns: ["session_id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          completed_at: string | null
          correct_count: number | null
          finished_at: string | null
          id: string
          incorrect_count: number | null
          mode: string | null
          module: string
          score: number | null
          section: string | null
          set_id: string | null
          started_at: string | null
          submodule: string | null
          target_id: string | null
          total_items: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_count?: number | null
          finished_at?: string | null
          id?: string
          incorrect_count?: number | null
          mode?: string | null
          module: string
          score?: number | null
          section?: string | null
          set_id?: string | null
          started_at?: string | null
          submodule?: string | null
          target_id?: string | null
          total_items?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_count?: number | null
          finished_at?: string | null
          id?: string
          incorrect_count?: number | null
          mode?: string | null
          module?: string
          score?: number | null
          section?: string | null
          set_id?: string | null
          started_at?: string | null
          submodule?: string | null
          target_id?: string | null
          total_items?: number | null
          user_id?: string
        }
        Relationships: []
      }
      test_assignments: {
        Row: {
          created_at: string
          due_at: string | null
          expires_at: string | null
          id: string
          kind: string
          status: Database["public"]["Enums"]["test_assignment_status"]
          student_id: string
          teacher_id: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          expires_at?: string | null
          id?: string
          kind: string
          status?: Database["public"]["Enums"]["test_assignment_status"]
          student_id: string
          teacher_id?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          expires_at?: string | null
          id?: string
          kind?: string
          status?: Database["public"]["Enums"]["test_assignment_status"]
          student_id?: string
          teacher_id?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      test_retake_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          last_session_id: string | null
          reason: string | null
          status: Database["public"]["Enums"]["retake_request_status"]
          student_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          last_session_id?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["retake_request_status"]
          student_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          last_session_id?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["retake_request_status"]
          student_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_retake_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_retake_requests_last_session_id_fkey"
            columns: ["last_session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_retake_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_retake_requests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sessions: {
        Row: {
          assignment_id: string
          completed_at: string | null
          created_at: string
          gaze_longest_single_ms: number
          gaze_off_screen_count: number
          gaze_off_screen_total_ms: number
          id: string
          proctoring_mode: Database["public"]["Enums"]["proctoring_mode"]
          proctoring_notes: string | null
          proctoring_status: Database["public"]["Enums"]["proctoring_status"]
          raw_result: Json
          section_scores: Json | null
          started_at: string
          total_score: number | null
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          created_at?: string
          gaze_longest_single_ms?: number
          gaze_off_screen_count?: number
          gaze_off_screen_total_ms?: number
          id?: string
          proctoring_mode?: Database["public"]["Enums"]["proctoring_mode"]
          proctoring_notes?: string | null
          proctoring_status?: Database["public"]["Enums"]["proctoring_status"]
          raw_result?: Json
          section_scores?: Json | null
          started_at?: string
          total_score?: number | null
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          created_at?: string
          gaze_longest_single_ms?: number
          gaze_off_screen_count?: number
          gaze_off_screen_total_ms?: number
          id?: string
          proctoring_mode?: Database["public"]["Enums"]["proctoring_mode"]
          proctoring_notes?: string | null
          proctoring_status?: Database["public"]["Enums"]["proctoring_status"]
          raw_result?: Json
          section_scores?: Json | null
          started_at?: string
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "test_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      test_templates: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          id: string
          kind: string
          label: string
          section_mask: Json
          slug: string
        }
        Insert: {
          config: Json
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          label: string
          section_mask?: Json
          slug: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label?: string
          section_mask?: Json
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_listening_sets: {
        Row: {
          downloaded: boolean | null
          set_id: string
          user_id: string
        }
        Insert: {
          downloaded?: boolean | null
          set_id: string
          user_id: string
        }
        Update: {
          downloaded?: boolean | null
          set_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_listening_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "listening_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_listening_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "v_user_listening_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_word_knowledge: {
        Row: {
          correct_streak: number
          created_at: string
          id: string
          knowledge_percent: number
          last_result: Json | null
          last_seen_at: string | null
          status: Database["public"]["Enums"]["knowledge_status"]
          total_seen: number
          updated_at: string
          user_id: string
          word_id: string
        }
        Insert: {
          correct_streak?: number
          created_at?: string
          id?: string
          knowledge_percent?: number
          last_result?: Json | null
          last_seen_at?: string | null
          status?: Database["public"]["Enums"]["knowledge_status"]
          total_seen?: number
          updated_at?: string
          user_id: string
          word_id: string
        }
        Update: {
          correct_streak?: number
          created_at?: string
          id?: string
          knowledge_percent?: number
          last_result?: Json | null
          last_seen_at?: string | null
          status?: Database["public"]["Enums"]["knowledge_status"]
          total_seen?: number
          updated_at?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_word_knowledge_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_word_knowledge_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      verb_irregular: {
        Row: {
          base: string
          created_at: string
          past: string
          pp: string
          third: string | null
        }
        Insert: {
          base: string
          created_at?: string
          past: string
          pp: string
          third?: string | null
        }
        Update: {
          base?: string
          created_at?: string
          past?: string
          pp?: string
          third?: string | null
        }
        Relationships: []
      }
      video_assets: {
        Row: {
          duration_sec: number | null
          id: string
          is_required: boolean | null
          module: string
          question_id: string
          url: string
        }
        Insert: {
          duration_sec?: number | null
          id?: string
          is_required?: boolean | null
          module: string
          question_id: string
          url: string
        }
        Update: {
          duration_sec?: number | null
          id?: string
          is_required?: boolean | null
          module?: string
          question_id?: string
          url?: string
        }
        Relationships: []
      }
      voca_output_tasks: {
        Row: {
          created_at: string
          id: string
          level: number
          prompt: string
          required_word_ids: Json | null
          suggested_word_ids: Json | null
          tags: Json | null
          title: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          prompt: string
          required_word_ids?: Json | null
          suggested_word_ids?: Json | null
          tags?: Json | null
          title?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          prompt?: string
          required_word_ids?: Json | null
          suggested_word_ids?: Json | null
          tags?: Json | null
          title?: string | null
          type?: string
        }
        Relationships: []
      }
      voca_passages: {
        Row: {
          created_at: string
          id: string
          level: number
          tags: Json | null
          text: string
          title: string | null
          word_ids: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          tags?: Json | null
          text: string
          title?: string | null
          word_ids?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          tags?: Json | null
          text?: string
          title?: string | null
          word_ids?: Json | null
        }
        Relationships: []
      }
      voca_results: {
        Row: {
          answers: Json
          correct_count: number | null
          created_at: string
          finished_at: string | null
          id: string
          raw_score: number | null
          test_id: string
          total_items: number
          user_id: string | null
        }
        Insert: {
          answers?: Json
          correct_count?: number | null
          created_at?: string
          finished_at?: string | null
          id?: string
          raw_score?: number | null
          test_id: string
          total_items?: number
          user_id?: string | null
        }
        Update: {
          answers?: Json
          correct_count?: number | null
          created_at?: string
          finished_at?: string | null
          id?: string
          raw_score?: number | null
          test_id?: string
          total_items?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voca_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "voca_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      voca_tests: {
        Row: {
          config: Json | null
          created_at: string
          description: string | null
          id: string
          label: string
          level: number
          output_task_ids: Json | null
          passage_ids: Json | null
          tags: Json | null
          word_ids: Json | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          label: string
          level?: number
          output_task_ids?: Json | null
          passage_ids?: Json | null
          tags?: Json | null
          word_ids?: Json | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          level?: number
          output_task_ids?: Json | null
          passage_ids?: Json | null
          tags?: Json | null
          word_ids?: Json | null
        }
        Relationships: []
      }
      voca_word_sounds: {
        Row: {
          audio_url: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          sound_type: string
          word_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sound_type: string
          word_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sound_type?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voca_word_sounds_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "voca_words"
            referencedColumns: ["id"]
          },
        ]
      }
      voca_words: {
        Row: {
          collocations: Json | null
          created_at: string
          examples: Json | null
          id: string
          level: number
          meaning_en: string
          meaning_kr: string
          pos: string
          synonyms_en_simple: string[] | null
          tags: Json | null
          word: string
        }
        Insert: {
          collocations?: Json | null
          created_at?: string
          examples?: Json | null
          id?: string
          level?: number
          meaning_en: string
          meaning_kr: string
          pos: string
          synonyms_en_simple?: string[] | null
          tags?: Json | null
          word: string
        }
        Update: {
          collocations?: Json | null
          created_at?: string
          examples?: Json | null
          id?: string
          level?: number
          meaning_en?: string
          meaning_kr?: string
          pos?: string
          synonyms_en_simple?: string[] | null
          tags?: Json | null
          word?: string
        }
        Relationships: []
      }
      vocab_drill_asset_stats: {
        Row: {
          asset_id: string
          attempts_total: number
          avg_ms: number | null
          last_seen_at: string | null
          updated_at: string
          wrong_total: number
        }
        Insert: {
          asset_id: string
          attempts_total?: number
          avg_ms?: number | null
          last_seen_at?: string | null
          updated_at?: string
          wrong_total?: number
        }
        Update: {
          asset_id?: string
          attempts_total?: number
          avg_ms?: number | null
          last_seen_at?: string | null
          updated_at?: string
          wrong_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vocab_drill_asset_stats_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "vocab_drill_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_drill_assets: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          drill_type: Database["public"]["Enums"]["vocab_drill_type"]
          id: string
          locked_at: string | null
          locked_by: string | null
          note: string | null
          status: Database["public"]["Enums"]["vocab_asset_status"]
          updated_at: string
          version: number
          word_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          created_by?: string | null
          drill_type: Database["public"]["Enums"]["vocab_drill_type"]
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["vocab_asset_status"]
          updated_at?: string
          version?: number
          word_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          drill_type?: Database["public"]["Enums"]["vocab_drill_type"]
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["vocab_asset_status"]
          updated_at?: string
          version?: number
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_drill_assets_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_drill_assets_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_drill_attempts: {
        Row: {
          academy_student_id: string | null
          answer_text: string | null
          answered_at: string
          asset_id: string | null
          assignment_id: string | null
          attempt_no: number
          chosen_choice: string | null
          created_at: string
          drill_type: Database["public"]["Enums"]["vocab_drill_type"]
          id: string
          is_correct: boolean
          meta: Json
          response_ms: number | null
          session_id: string | null
          set_id: string | null
          user_id: string
          word_id: string
        }
        Insert: {
          academy_student_id?: string | null
          answer_text?: string | null
          answered_at?: string
          asset_id?: string | null
          assignment_id?: string | null
          attempt_no?: number
          chosen_choice?: string | null
          created_at?: string
          drill_type: Database["public"]["Enums"]["vocab_drill_type"]
          id?: string
          is_correct: boolean
          meta?: Json
          response_ms?: number | null
          session_id?: string | null
          set_id?: string | null
          user_id: string
          word_id: string
        }
        Update: {
          academy_student_id?: string | null
          answer_text?: string | null
          answered_at?: string
          asset_id?: string | null
          assignment_id?: string | null
          attempt_no?: number
          chosen_choice?: string | null
          created_at?: string
          drill_type?: Database["public"]["Enums"]["vocab_drill_type"]
          id?: string
          is_correct?: boolean
          meta?: Json
          response_ms?: number | null
          session_id?: string | null
          set_id?: string | null
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_drill_attempts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "vocab_drill_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_drill_attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_drill_attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_drill_daily_rollups: {
        Row: {
          academy_student_id: string
          avg_ms: number | null
          correct: number
          day: string
          drill_type: Database["public"]["Enums"]["vocab_drill_type"]
          total: number
          updated_at: string
        }
        Insert: {
          academy_student_id: string
          avg_ms?: number | null
          correct?: number
          day: string
          drill_type: Database["public"]["Enums"]["vocab_drill_type"]
          total?: number
          updated_at?: string
        }
        Update: {
          academy_student_id?: string
          avg_ms?: number | null
          correct?: number
          day?: string
          drill_type?: Database["public"]["Enums"]["vocab_drill_type"]
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      vocab_drill_results: {
        Row: {
          answered_at: string
          created_at: string
          drill_type: string
          id: string
          is_correct: boolean
          user_id: string
          word_id: string
        }
        Insert: {
          answered_at?: string
          created_at?: string
          drill_type: string
          id?: string
          is_correct: boolean
          user_id: string
          word_id: string
        }
        Update: {
          answered_at?: string
          created_at?: string
          drill_type?: string
          id?: string
          is_correct?: boolean
          user_id?: string
          word_id?: string
        }
        Relationships: []
      }
      vocab_exam_results: {
        Row: {
          correct_auto: number
          created_at: string
          grade_band: Database["public"]["Enums"]["grade_band"] | null
          id: string
          mode: string
          rate_auto: number
          raw_answers: Json
          total_questions: number
          user_id: string | null
        }
        Insert: {
          correct_auto: number
          created_at?: string
          grade_band?: Database["public"]["Enums"]["grade_band"] | null
          id?: string
          mode?: string
          rate_auto: number
          raw_answers?: Json
          total_questions: number
          user_id?: string | null
        }
        Update: {
          correct_auto?: number
          created_at?: string
          grade_band?: Database["public"]["Enums"]["grade_band"] | null
          id?: string
          mode?: string
          rate_auto?: number
          raw_answers?: Json
          total_questions?: number
          user_id?: string | null
        }
        Relationships: []
      }
      vocab_homework: {
        Row: {
          date: string
          drill_types: string[]
          id: string
          source: string
          status: string
          updated_at: string
          user_id: string
          word_ids: string[]
        }
        Insert: {
          date: string
          drill_types: string[]
          id?: string
          source?: string
          status?: string
          updated_at?: string
          user_id: string
          word_ids: string[]
        }
        Update: {
          date?: string
          drill_types?: string[]
          id?: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
          word_ids?: string[]
        }
        Relationships: []
      }
      vocab_import_batch_items: {
        Row: {
          batch_id: string
          text_norm: string
          word_id: string
        }
        Insert: {
          batch_id: string
          text_norm: string
          word_id: string
        }
        Update: {
          batch_id?: string
          text_norm?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_import_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vocab_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_import_batch_items_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_import_batch_items_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_import_batches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inserted_count: number
          note: string | null
          skipped_count: number
          source_label: string | null
          total_lines: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inserted_count?: number
          note?: string | null
          skipped_count?: number
          source_label?: string | null
          total_lines?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inserted_count?: number
          note?: string | null
          skipped_count?: number
          source_label?: string | null
          total_lines?: number
        }
        Relationships: []
      }
      vocab_items: {
        Row: {
          created_at: string | null
          id: string
          lexicon_id: string | null
          mastered: boolean | null
          origin_session: string | null
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lexicon_id?: string | null
          mastered?: boolean | null
          origin_session?: string | null
          user_id: string
          word: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lexicon_id?: string | null
          mastered?: boolean | null
          origin_session?: string | null
          user_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_items_lexicon_fk"
            columns: ["lexicon_id"]
            isOneToOne: false
            referencedRelation: "vocab_lexicon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_items_origin_session_fkey"
            columns: ["origin_session"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_items_origin_session_fkey"
            columns: ["origin_session"]
            isOneToOne: false
            referencedRelation: "v_session_score"
            referencedColumns: ["session_id"]
          },
        ]
      }
      vocab_learning_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          occurred_at: string
          payload: Json | null
          stage: string
          user_id: string
          word_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          occurred_at?: string
          payload?: Json | null
          stage: string
          user_id: string
          word_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json | null
          stage?: string
          user_id?: string
          word_id?: string
        }
        Relationships: []
      }
      vocab_lexicon: {
        Row: {
          collocations: Json
          created_at: string
          example_en: string | null
          example_ko: string | null
          id: string
          image_url: string | null
          lemma: string | null
          meaning_syn_map: Json
          meanings_en_simple: string[]
          meanings_ko: string[]
          pieces: string[] | null
          pos: string | null
          tts_lang: string
          word: string
        }
        Insert: {
          collocations?: Json
          created_at?: string
          example_en?: string | null
          example_ko?: string | null
          id?: string
          image_url?: string | null
          lemma?: string | null
          meaning_syn_map?: Json
          meanings_en_simple?: string[]
          meanings_ko?: string[]
          pieces?: string[] | null
          pos?: string | null
          tts_lang?: string
          word: string
        }
        Update: {
          collocations?: Json
          created_at?: string
          example_en?: string | null
          example_ko?: string | null
          id?: string
          image_url?: string | null
          lemma?: string | null
          meaning_syn_map?: Json
          meanings_en_simple?: string[]
          meanings_ko?: string[]
          pieces?: string[] | null
          pos?: string | null
          tts_lang?: string
          word?: string
        }
        Relationships: []
      }
      vocab_set_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          note: string | null
          set_id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          note?: string | null
          set_id: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          note?: string | null
          set_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_set_assignments_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_set_assignments_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_set_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_set_items: {
        Row: {
          created_at: string
          order_no: number | null
          set_id: string
          sort_order: number
          word_id: string
        }
        Insert: {
          created_at?: string
          order_no?: number | null
          set_id: string
          sort_order?: number
          word_id: string
        }
        Update: {
          created_at?: string
          order_no?: number | null
          set_id?: string
          sort_order?: number
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_set_items_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_set_items_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_set_items_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_set_items_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_set_words: {
        Row: {
          created_at: string
          order_idx: number | null
          set_id: string
          word_id: string
        }
        Insert: {
          created_at?: string
          order_idx?: number | null
          set_id: string
          word_id: string
        }
        Update: {
          created_at?: string
          order_idx?: number | null
          set_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_set_words_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_set_words_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_set_words_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_set_words_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_sets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          grade_band: Database["public"]["Enums"]["grade_band"] | null
          id: string
          level: string | null
          notes: string | null
          source_label: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_band?: Database["public"]["Enums"]["grade_band"] | null
          id?: string
          level?: string | null
          notes?: string | null
          source_label?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_band?: Database["public"]["Enums"]["grade_band"] | null
          id?: string
          level?: string | null
          notes?: string | null
          source_label?: string | null
          title?: string
        }
        Relationships: []
      }
      vocab_track_day_sets: {
        Row: {
          created_at: string
          day_index: number
          set_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          day_index: number
          set_id: string
          track_id: string
        }
        Update: {
          created_at?: string
          day_index?: number
          set_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_track_day_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_track_day_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_track_day_sets_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "vocab_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_track_days: {
        Row: {
          created_at: string
          day_index: number
          id: string
          set_id: string
          title: string | null
          track_id: string
        }
        Insert: {
          created_at?: string
          day_index: number
          id?: string
          set_id: string
          title?: string | null
          track_id: string
        }
        Update: {
          created_at?: string
          day_index?: number
          id?: string
          set_id?: string
          title?: string | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_track_days_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_track_days_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_track_days_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "vocab_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_track_sets: {
        Row: {
          created_at: string
          day_index: number
          id: string
          set_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          day_index: number
          id?: string
          set_id: string
          track_id: string
        }
        Update: {
          created_at?: string
          day_index?: number
          id?: string
          set_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_track_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_track_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "vocab_sets_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_track_sets_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "vocab_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_tracks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          slug: string
          title: string
          total_days: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          slug: string
          title: string
          total_days?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          total_days?: number | null
        }
        Relationships: []
      }
      vocab_weak_state: {
        Row: {
          id: string
          is_weak: boolean
          last_success_at: string | null
          last_weak_at: string
          success_streak: number
          updated_at: string
          user_id: string
          weak_at: string
          weak_count: number
          word_id: string
        }
        Insert: {
          id?: string
          is_weak?: boolean
          last_success_at?: string | null
          last_weak_at: string
          success_streak?: number
          updated_at?: string
          user_id: string
          weak_at: string
          weak_count?: number
          word_id: string
        }
        Update: {
          id?: string
          is_weak?: boolean
          last_success_at?: string | null
          last_weak_at?: string
          success_streak?: number
          updated_at?: string
          user_id?: string
          weak_at?: string
          weak_count?: number
          word_id?: string
        }
        Relationships: []
      }
      vocab_word_strength: {
        Row: {
          academy_student_id: string
          drill_type: Database["public"]["Enums"]["vocab_drill_type"]
          is_weak: boolean
          last_seen_at: string | null
          right_total: number
          streak: number
          strength: number
          updated_at: string
          word_id: string
          wrong_total: number
        }
        Insert: {
          academy_student_id: string
          drill_type: Database["public"]["Enums"]["vocab_drill_type"]
          is_weak?: boolean
          last_seen_at?: string | null
          right_total?: number
          streak?: number
          strength?: number
          updated_at?: string
          word_id: string
          wrong_total?: number
        }
        Update: {
          academy_student_id?: string
          drill_type?: Database["public"]["Enums"]["vocab_drill_type"]
          is_weak?: boolean
          last_seen_at?: string | null
          right_total?: number
          streak?: number
          strength?: number
          updated_at?: string
          word_id?: string
          wrong_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vocab_word_strength_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_word_strength_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      word_form: {
        Row: {
          adj_form: string | null
          adj_meaning_ko: string | null
          adv_form: string | null
          adv_meaning_ko: string | null
          base_pos: string | null
          created_at: string
          ed_adj_form: string | null
          ed_adj_meaning_ko: string | null
          lemma: string | null
          noun_form: string | null
          noun_meaning_ko: string | null
          updated_at: string
          verb_3rd: string | null
          verb_base: string | null
          verb_past: string | null
          verb_pp: string | null
          word_id: string
        }
        Insert: {
          adj_form?: string | null
          adj_meaning_ko?: string | null
          adv_form?: string | null
          adv_meaning_ko?: string | null
          base_pos?: string | null
          created_at?: string
          ed_adj_form?: string | null
          ed_adj_meaning_ko?: string | null
          lemma?: string | null
          noun_form?: string | null
          noun_meaning_ko?: string | null
          updated_at?: string
          verb_3rd?: string | null
          verb_base?: string | null
          verb_past?: string | null
          verb_pp?: string | null
          word_id: string
        }
        Update: {
          adj_form?: string | null
          adj_meaning_ko?: string | null
          adv_form?: string | null
          adv_meaning_ko?: string | null
          base_pos?: string | null
          created_at?: string
          ed_adj_form?: string | null
          ed_adj_meaning_ko?: string | null
          lemma?: string | null
          noun_form?: string | null
          noun_meaning_ko?: string | null
          updated_at?: string
          verb_3rd?: string | null
          verb_base?: string | null
          verb_past?: string | null
          verb_pp?: string | null
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_form_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: true
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_form_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: true
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      word_forms: {
        Row: {
          adj_form: string | null
          adj_meaning_ko: string | null
          adv_form: string | null
          adv_meaning_ko: string | null
          base_pos: string | null
          created_at: string
          ed_adj_form: string | null
          ed_adj_meaning_ko: string | null
          lemma: string | null
          noun_form: string | null
          noun_meaning_ko: string | null
          updated_at: string
          verb_3rd: string | null
          verb_ing: string | null
          verb_past: string | null
          verb_pp: string | null
          word_id: string
        }
        Insert: {
          adj_form?: string | null
          adj_meaning_ko?: string | null
          adv_form?: string | null
          adv_meaning_ko?: string | null
          base_pos?: string | null
          created_at?: string
          ed_adj_form?: string | null
          ed_adj_meaning_ko?: string | null
          lemma?: string | null
          noun_form?: string | null
          noun_meaning_ko?: string | null
          updated_at?: string
          verb_3rd?: string | null
          verb_ing?: string | null
          verb_past?: string | null
          verb_pp?: string | null
          word_id: string
        }
        Update: {
          adj_form?: string | null
          adj_meaning_ko?: string | null
          adv_form?: string | null
          adv_meaning_ko?: string | null
          base_pos?: string | null
          created_at?: string
          ed_adj_form?: string | null
          ed_adj_meaning_ko?: string | null
          lemma?: string | null
          noun_form?: string | null
          noun_meaning_ko?: string | null
          updated_at?: string
          verb_3rd?: string | null
          verb_ing?: string | null
          verb_past?: string | null
          verb_pp?: string | null
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_forms_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: true
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_forms_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: true
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      word_grade_bands: {
        Row: {
          grade: Database["public"]["Enums"]["grade_band"]
          word_id: string
        }
        Insert: {
          grade: Database["public"]["Enums"]["grade_band"]
          word_id: string
        }
        Update: {
          grade?: Database["public"]["Enums"]["grade_band"]
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_grade_bands_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_grade_bands_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      word_grammar_hints: {
        Row: {
          created_at: string
          grammar_category: Database["public"]["Enums"]["grammar_category"]
          id: string
          right_example: string | null
          short_tip_en: string | null
          short_tip_ko: string
          show_until_grade: Database["public"]["Enums"]["grade_band"] | null
          sort_order: number
          word_id: string
          wrong_example: string | null
        }
        Insert: {
          created_at?: string
          grammar_category?: Database["public"]["Enums"]["grammar_category"]
          id?: string
          right_example?: string | null
          short_tip_en?: string | null
          short_tip_ko: string
          show_until_grade?: Database["public"]["Enums"]["grade_band"] | null
          sort_order?: number
          word_id: string
          wrong_example?: string | null
        }
        Update: {
          created_at?: string
          grammar_category?: Database["public"]["Enums"]["grammar_category"]
          id?: string
          right_example?: string | null
          short_tip_en?: string | null
          short_tip_ko?: string
          show_until_grade?: Database["public"]["Enums"]["grade_band"] | null
          sort_order?: number
          word_id?: string
          wrong_example?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "word_grammar_hints_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_grammar_hints_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      word_semantic_tags: {
        Row: {
          tag_id: string
          word_id: string
        }
        Insert: {
          tag_id: string
          word_id: string
        }
        Update: {
          tag_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_semantic_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "semantic_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_semantic_tags_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_semantic_tags_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      word_sources: {
        Row: {
          created_at: string
          exam_month: number | null
          exam_round: string | null
          exam_year: number | null
          extra: Json
          grade: Database["public"]["Enums"]["grade_band"] | null
          id: string
          source_label: string
          source_type: Database["public"]["Enums"]["word_source_type"]
          word_id: string
        }
        Insert: {
          created_at?: string
          exam_month?: number | null
          exam_round?: string | null
          exam_year?: number | null
          extra?: Json
          grade?: Database["public"]["Enums"]["grade_band"] | null
          id?: string
          source_label: string
          source_type: Database["public"]["Enums"]["word_source_type"]
          word_id: string
        }
        Update: {
          created_at?: string
          exam_month?: number | null
          exam_round?: string | null
          exam_year?: number | null
          extra?: Json
          grade?: Database["public"]["Enums"]["grade_band"] | null
          id?: string
          source_label?: string
          source_type?: Database["public"]["Enums"]["word_source_type"]
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_sources_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_sources_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      words: {
        Row: {
          antonyms_terms: string[]
          collocations: Json | null
          created_at: string
          derived_terms: string[]
          difficulty: number | null
          etymology: Json | null
          examples_easy: string[]
          examples_normal: string[]
          frequency_score: number | null
          id: string
          is_function_word: boolean
          lemma: string | null
          meanings_en_simple: string[]
          meanings_ko: string[]
          notes: string | null
          pos: string | null
          synonyms_en_simple: string[]
          text: string
          text_key: string | null
          text_norm: string | null
          updated_at: string
        }
        Insert: {
          antonyms_terms?: string[]
          collocations?: Json | null
          created_at?: string
          derived_terms?: string[]
          difficulty?: number | null
          etymology?: Json | null
          examples_easy?: string[]
          examples_normal?: string[]
          frequency_score?: number | null
          id?: string
          is_function_word?: boolean
          lemma?: string | null
          meanings_en_simple?: string[]
          meanings_ko?: string[]
          notes?: string | null
          pos?: string | null
          synonyms_en_simple?: string[]
          text: string
          text_key?: string | null
          text_norm?: string | null
          updated_at?: string
        }
        Update: {
          antonyms_terms?: string[]
          collocations?: Json | null
          created_at?: string
          derived_terms?: string[]
          difficulty?: number | null
          etymology?: Json | null
          examples_easy?: string[]
          examples_normal?: string[]
          frequency_score?: number | null
          id?: string
          is_function_word?: boolean
          lemma?: string | null
          meanings_en_simple?: string[]
          meanings_ko?: string[]
          notes?: string | null
          pos?: string | null
          synonyms_en_simple?: string[]
          text?: string
          text_key?: string | null
          text_norm?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      writing_2026_answers: {
        Row: {
          content: string
          created_at: string
          id: string
          item_key: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          item_key: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          item_key?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "writing_2026_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "writing_2026_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_2026_sessions: {
        Row: {
          created_at: string
          id: string
          test_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          test_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          test_id?: string
          user_id?: string
        }
        Relationships: []
      }
      writing_outlines: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          kind: string
          prompt_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: string
          kind: string
          prompt_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          kind?: string
          prompt_id?: string
          user_id?: string
        }
        Relationships: []
      }
      writing_revisions: {
        Row: {
          created_at: string | null
          id: string
          kind: string
          prompt_id: string
          text_body: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          kind: string
          prompt_id: string
          text_body: string
          user_id: string
          version: number
        }
        Update: {
          created_at?: string | null
          id?: string
          kind?: string
          prompt_id?: string
          text_body?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      writing_rubrics: {
        Row: {
          created_at: string | null
          feedback: string | null
          id: string
          kind: string
          prompt_id: string
          scores: Json
          total: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          kind: string
          prompt_id: string
          scores: Json
          total?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          kind?: string
          prompt_id?: string
          scores?: Json
          total?: number | null
          user_id?: string
        }
        Relationships: []
      }
      zzz_probe: {
        Row: {
          id: number | null
        }
        Insert: {
          id?: number | null
        }
        Update: {
          id?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      answers_count_by_passage: {
        Row: {
          answers: number | null
          passage_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "reading_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_answer_key: {
        Row: {
          answer_choice_ids: string[] | null
          question_id: string | null
        }
        Relationships: []
      }
      student_reading_trends: {
        Row: {
          attempt_count: number | null
          first_finished_at: string | null
          last_finished_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_reading_attempts_enriched: {
        Row: {
          choice_id: string | null
          created_at: string | null
          elapsed_ms: number | null
          is_correct: boolean | null
          passage_id: string | null
          question_id: string | null
          question_number: number | null
          session_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_attempts_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "reading_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "reading_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_sessions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "reading_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      v_session_score: {
        Row: {
          answered: number | null
          correct: number | null
          finished_at: string | null
          mode: string | null
          score_pct: number | null
          section: string | null
          session_id: string | null
          started_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_user_listening_sets: {
        Row: {
          id: string | null
          title: string | null
        }
        Insert: {
          id?: string | null
          title?: string | null
        }
        Update: {
          id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      v_user_reading_sets: {
        Row: {
          created_at: string | null
          downloaded: boolean | null
          id: string | null
          source: string | null
          title: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          downloaded?: never
          id?: string | null
          source?: string | null
          title?: string | null
          user_id?: never
          version?: number | null
        }
        Update: {
          created_at?: string | null
          downloaded?: never
          id?: string | null
          source?: string | null
          title?: string | null
          user_id?: never
          version?: number | null
        }
        Relationships: []
      }
      v_vocab_event_weight: {
        Row: {
          event_type: string | null
          id: string | null
          user_id: string | null
          weight: number | null
          word_id: string | null
        }
        Insert: {
          event_type?: string | null
          id?: string | null
          user_id?: string | null
          weight?: never
          word_id?: string | null
        }
        Update: {
          event_type?: string | null
          id?: string | null
          user_id?: string | null
          weight?: never
          word_id?: string | null
        }
        Relationships: []
      }
      v_vocab_weak_score: {
        Row: {
          user_id: string | null
          weak_score: number | null
          word_id: string | null
        }
        Relationships: []
      }
      v_vocab_weak_status: {
        Row: {
          user_id: string | null
          weak_score: number | null
          weak_status: string | null
          word_id: string | null
        }
        Relationships: []
      }
      vocab_sets_with_counts: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          grade_band: Database["public"]["Enums"]["grade_band"] | null
          id: string | null
          item_count: number | null
          level: string | null
          notes: string | null
          source_label: string | null
          title: string | null
          word_count: number | null
          words_count: number | null
        }
        Relationships: []
      }
      words_with_meaning: {
        Row: {
          antonyms_terms: string[] | null
          collocations: Json | null
          created_at: string | null
          derived_terms: string[] | null
          difficulty: number | null
          etymology: Json | null
          examples_easy: string[] | null
          examples_normal: string[] | null
          frequency_score: number | null
          id: string | null
          is_function_word: boolean | null
          lemma: string | null
          meanings_en_simple: string[] | null
          meanings_ko: string[] | null
          notes: string | null
          pos: string | null
          synonyms_en_simple: string[] | null
          text: string | null
          text_key: string | null
          text_norm: string | null
          updated_at: string | null
        }
        Insert: {
          antonyms_terms?: string[] | null
          collocations?: Json | null
          created_at?: string | null
          derived_terms?: string[] | null
          difficulty?: number | null
          etymology?: Json | null
          examples_easy?: string[] | null
          examples_normal?: string[] | null
          frequency_score?: number | null
          id?: string | null
          is_function_word?: boolean | null
          lemma?: string | null
          meanings_en_simple?: string[] | null
          meanings_ko?: string[] | null
          notes?: string | null
          pos?: string | null
          synonyms_en_simple?: string[] | null
          text?: string | null
          text_key?: string | null
          text_norm?: string | null
          updated_at?: string | null
        }
        Update: {
          antonyms_terms?: string[] | null
          collocations?: Json | null
          created_at?: string | null
          derived_terms?: string[] | null
          difficulty?: number | null
          etymology?: Json | null
          examples_easy?: string[] | null
          examples_normal?: string[] | null
          frequency_score?: number | null
          id?: string | null
          is_function_word?: boolean | null
          lemma?: string | null
          meanings_en_simple?: string[] | null
          meanings_ko?: string[] | null
          notes?: string | null
          pos?: string | null
          synonyms_en_simple?: string[] | null
          text?: string | null
          text_key?: string | null
          text_norm?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_set_role: {
        Args: { p_role: string; p_user: string }
        Returns: undefined
      }
      consume_listening_play:
        | {
            Args: { _counter_id: number }
            Returns: {
              plays_allowed: number
              plays_used: number
              remaining: number
              session_id: string
            }[]
          }
        | { Args: { _id: string }; Returns: undefined }
      derive_verb_forms: {
        Args: { p_base: string }
        Returns: {
          verb_3rd: string
          verb_base: string
          verb_past: string
          verb_pp: string
        }[]
      }
      en_verb_3rd: { Args: { base: string }; Returns: string }
      en_verb_past_regular: { Args: { base: string }; Returns: string }
      get_daily_speed_ranking: {
        Args: { date_iso_param: string }
        Returns: {
          best_time: number
          user_id: string
        }[]
      }
      get_vocab_weak_status: {
        Args: { p_user_id: string; p_word_ids: string[] }
        Returns: {
          weak_score: number
          weak_status: string
          word_id: string
        }[]
      }
      inc_listening_plays: { Args: { _id: string }; Returns: undefined }
      inflect_verb_3rd: { Args: { lemma: string }; Returns: string }
      inflect_verb_ing: { Args: { lemma: string }; Returns: string }
      inflect_verb_past: { Args: { lemma: string }; Returns: string }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_admin_or_producer:
        | { Args: never; Returns: boolean }
        | { Args: { p_uid: string }; Returns: boolean }
      is_member: {
        Args: {
          org: string
          roles?: Database["public"]["Enums"]["role_enum"][]
        }
        Returns: boolean
      }
      is_staff: { Args: { uid: string }; Returns: boolean }
      jwt_role: { Args: never; Returns: string }
      listening_review_rows:
        | {
            Args: { p_session_id: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.listening_review_rows(p_session_id => int8), public.listening_review_rows(p_session_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
        | {
            Args: { p_session_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.listening_review_rows(p_session_id => int8), public.listening_review_rows(p_session_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
      listening_review_score:
        | {
            Args: { p_session_id: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.listening_review_score(p_session_id => int8), public.listening_review_score(p_session_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
        | {
            Args: { p_session_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.listening_review_score(p_session_id => int8), public.listening_review_score(p_session_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
      listening_session_score: {
        Args: { sess_id: string }
        Returns: {
          correct: number
          total: number
        }[]
      }
      lock_vocab_drill_asset: {
        Args: { p_asset_id: string }
        Returns: undefined
      }
      make_admin: { Args: { p_email: string }; Returns: undefined }
      make_teacher: { Args: { p_email: string }; Returns: undefined }
      record_vocab_drill_attempt_v2: {
        Args: {
          p_academy_student_id: string
          p_answer_text?: string
          p_asset_id?: string
          p_assignment_id?: string
          p_attempt_no?: number
          p_chosen_choice?: string
          p_drill_type: Database["public"]["Enums"]["vocab_drill_type"]
          p_is_correct: boolean
          p_meta?: Json
          p_response_ms?: number
          p_session_id?: string
          p_set_id?: string
          p_word_id: string
        }
        Returns: string
      }
      reset_claims: { Args: never; Returns: undefined }
      save_reading_passage_full: { Args: { p_model: Json }; Returns: Json }
      save_reading_passage_full_with_order: {
        Args: { p_model: Json }
        Returns: Json
      }
      set_claims: {
        Args: { p_role: string; p_sub: string }
        Returns: undefined
      }
      show_claims: { Args: never; Returns: Json }
      upsert_word_form_deriv: {
        Args: {
          p_adj_form?: string
          p_adv_form?: string
          p_ed_adj_form?: string
          p_noun_form?: string
          p_word_id: string
        }
        Returns: undefined
      }
      upsert_word_form_verb: {
        Args: { p_base: string; p_word_id: string }
        Returns: undefined
      }
    }
    Enums: {
      grade_band: "K1_2" | "K3_4" | "K5_6" | "K7_9" | "K10_12" | "POST_K12"
      grammar_category:
        | "NONE"
        | "BE_VERB"
        | "GENERAL_VERB"
        | "PRONOUN"
        | "ARTICLE"
        | "PREPOSITION"
        | "CONJUNCTION"
        | "RELATIVE_PRONOUN"
      knowledge_status: "UNKNOWN" | "LEARNING" | "KNOWN" | "MASTERED"
      note_type_enum: "listening_notes" | "reading_translation"
      proctoring_mode: "none" | "gaze_only"
      proctoring_status: "not_required" | "ok" | "suspicious"
      retake_request_status: "pending" | "approved" | "rejected" | "cancelled"
      role_enum: "owner" | "manager" | "teacher" | "student"
      section_enum: "reading" | "listening" | "speaking" | "writing"
      student_level: "beginner" | "intermediate" | "advanced"
      student_note_type: "teacher" | "parent" | "student"
      student_skill_area:
        | "grammar"
        | "syntax"
        | "reading"
        | "listening"
        | "speaking"
        | "writing"
      student_task_priority: "low" | "medium" | "high"
      student_task_status: "todo" | "in_progress" | "done"
      student_vocab_break_mode: "HALT" | "SWITCH_TO_EXAM"
      test_assignment_status:
        | "assigned"
        | "in_progress"
        | "completed"
        | "expired"
        | "cancelled"
      user_role: "student" | "teacher" | "admin"
      vocab_asset_status: "DRAFT" | "LOCKED" | "RETIRED"
      vocab_assignment_status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED"
      vocab_drill_type: "WORD_FORM_MCQ" | "SENTENCE_BLANK" | "COLLOCATION"
      word_source_type:
        | "TEXTBOOK"
        | "SCHOOL_PRINT"
        | "SUNEUNG"
        | "MOGOSA"
        | "EBS"
        | "TOEFL"
        | "TOEIC"
        | "TEPS"
        | "SAT"
        | "CUSTOM"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      grade_band: ["K1_2", "K3_4", "K5_6", "K7_9", "K10_12", "POST_K12"],
      grammar_category: [
        "NONE",
        "BE_VERB",
        "GENERAL_VERB",
        "PRONOUN",
        "ARTICLE",
        "PREPOSITION",
        "CONJUNCTION",
        "RELATIVE_PRONOUN",
      ],
      knowledge_status: ["UNKNOWN", "LEARNING", "KNOWN", "MASTERED"],
      note_type_enum: ["listening_notes", "reading_translation"],
      proctoring_mode: ["none", "gaze_only"],
      proctoring_status: ["not_required", "ok", "suspicious"],
      retake_request_status: ["pending", "approved", "rejected", "cancelled"],
      role_enum: ["owner", "manager", "teacher", "student"],
      section_enum: ["reading", "listening", "speaking", "writing"],
      student_level: ["beginner", "intermediate", "advanced"],
      student_note_type: ["teacher", "parent", "student"],
      student_skill_area: [
        "grammar",
        "syntax",
        "reading",
        "listening",
        "speaking",
        "writing",
      ],
      student_task_priority: ["low", "medium", "high"],
      student_task_status: ["todo", "in_progress", "done"],
      student_vocab_break_mode: ["HALT", "SWITCH_TO_EXAM"],
      test_assignment_status: [
        "assigned",
        "in_progress",
        "completed",
        "expired",
        "cancelled",
      ],
      user_role: ["student", "teacher", "admin"],
      vocab_asset_status: ["DRAFT", "LOCKED", "RETIRED"],
      vocab_assignment_status: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"],
      vocab_drill_type: ["WORD_FORM_MCQ", "SENTENCE_BLANK", "COLLOCATION"],
      word_source_type: [
        "TEXTBOOK",
        "SCHOOL_PRINT",
        "SUNEUNG",
        "MOGOSA",
        "EBS",
        "TOEFL",
        "TOEIC",
        "TEPS",
        "SAT",
        "CUSTOM",
      ],
    },
  },
} as const
