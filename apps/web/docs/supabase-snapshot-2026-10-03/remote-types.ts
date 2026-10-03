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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      __jenny_probe: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
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
          last_learning_stage_date: string | null
          learning_stage_streak: number | null
          learning_stage_total_points: number | null
          level: Database["public"]["Enums"]["student_level"]
          login_id: string | null
          memo: string | null
          must_change_password: boolean
          notes: string | null
          parent_email: string | null
          parent_phone: string | null
          phone: string | null
          profile_id: string | null
          schedule_slot: string | null
          school: string | null
          school_id: string | null
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
          last_learning_stage_date?: string | null
          learning_stage_streak?: number | null
          learning_stage_total_points?: number | null
          level?: Database["public"]["Enums"]["student_level"]
          login_id?: string | null
          memo?: string | null
          must_change_password?: boolean
          notes?: string | null
          parent_email?: string | null
          parent_phone?: string | null
          phone?: string | null
          profile_id?: string | null
          schedule_slot?: string | null
          school?: string | null
          school_id?: string | null
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
          last_learning_stage_date?: string | null
          learning_stage_streak?: number | null
          learning_stage_total_points?: number | null
          level?: Database["public"]["Enums"]["student_level"]
          login_id?: string | null
          memo?: string | null
          must_change_password?: boolean
          notes?: string | null
          parent_email?: string | null
          parent_phone?: string | null
          phone?: string | null
          profile_id?: string | null
          schedule_slot?: string | null
          school?: string | null
          school_id?: string | null
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
          {
            foreignKeyName: "academy_students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
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
      ai_usage_logs: {
        Row: {
          cache_creation_input_tokens: number
          cache_read_input_tokens: number
          created_at: string
          estimated_cost_usd: number | null
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          route: string
        }
        Insert: {
          cache_creation_input_tokens?: number
          cache_read_input_tokens?: number
          created_at?: string
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          route: string
        }
        Update: {
          cache_creation_input_tokens?: number
          cache_read_input_tokens?: number
          created_at?: string
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          route?: string
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
          content_id: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          due_date: string | null
          homework_id: string | null
          id: string
          kind: string | null
          retry_allowed: boolean
          review_required: boolean
          scope_id: string | null
          section: string | null
          start_at: string | null
          status: string
          target: Json | null
          target_id: string | null
          target_type: string | null
          title: string
          track: string | null
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          due_date?: string | null
          homework_id?: string | null
          id?: string
          kind?: string | null
          retry_allowed?: boolean
          review_required?: boolean
          scope_id?: string | null
          section?: string | null
          start_at?: string | null
          status?: string
          target?: Json | null
          target_id?: string | null
          target_type?: string | null
          title: string
          track?: string | null
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          due_date?: string | null
          homework_id?: string | null
          id?: string
          kind?: string | null
          retry_allowed?: boolean
          review_required?: boolean
          scope_id?: string | null
          section?: string | null
          start_at?: string | null
          status?: string
          target?: Json | null
          target_id?: string | null
          target_type?: string | null
          title?: string
          track?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "naesin_exam_scopes"
            referencedColumns: ["id"]
          },
        ]
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
      calendar_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_date: string
          event_type: string
          id: string
          note: string | null
          replaces_date: string | null
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_date: string
          event_type: string
          id?: string
          note?: string | null
          replaces_date?: string | null
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type?: string
          id?: string
          note?: string | null
          replaces_date?: string | null
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
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
      class_problem_history_2026: {
        Row: {
          assigned_date: string
          assignment_id: string | null
          class_id: string
          created_at: string | null
          id: string
          num_students_assigned: number | null
          num_students_completed: number | null
          problem_id: string
          problem_type: string
          updated_at: string | null
        }
        Insert: {
          assigned_date: string
          assignment_id?: string | null
          class_id: string
          created_at?: string | null
          id?: string
          num_students_assigned?: number | null
          num_students_completed?: number | null
          problem_id: string
          problem_type: string
          updated_at?: string | null
        }
        Update: {
          assigned_date?: string
          assignment_id?: string | null
          class_id?: string
          created_at?: string | null
          id?: string
          num_students_assigned?: number | null
          num_students_completed?: number | null
          problem_id?: string
          problem_type?: string
          updated_at?: string | null
        }
        Relationships: []
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
      contents: {
        Row: {
          chapter: string | null
          created_at: string
          difficulty: string | null
          grade: string | null
          id: string
          is_school_specific: boolean
          publisher: string | null
          school_level: string | null
          section: string
          semester: string | null
          source_book: string | null
          source_type: string | null
          status: string
          tags: string[] | null
          title: string
          track: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          chapter?: string | null
          created_at?: string
          difficulty?: string | null
          grade?: string | null
          id?: string
          is_school_specific?: boolean
          publisher?: string | null
          school_level?: string | null
          section: string
          semester?: string | null
          source_book?: string | null
          source_type?: string | null
          status?: string
          tags?: string[] | null
          title: string
          track: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          chapter?: string | null
          created_at?: string
          difficulty?: string | null
          grade?: string | null
          id?: string
          is_school_specific?: boolean
          publisher?: string | null
          school_level?: string | null
          section?: string
          semester?: string | null
          source_book?: string | null
          source_type?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          track?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          ai_feedback: string | null
          completed_at: string | null
          context: Json | null
          id: string
          points_earned: number
          prompt: string
          response: string | null
          student_id: string
          task_date: string
          task_type: string
        }
        Insert: {
          ai_feedback?: string | null
          completed_at?: string | null
          context?: Json | null
          id?: string
          points_earned?: number
          prompt: string
          response?: string | null
          student_id: string
          task_date?: string
          task_type: string
        }
        Update: {
          ai_feedback?: string | null
          completed_at?: string | null
          context?: Json | null
          id?: string
          points_earned?: number
          prompt?: string
          response?: string | null
          student_id?: string
          task_date?: string
          task_type?: string
        }
        Relationships: []
      }
      daily_tests: {
        Row: {
          academic_passage_ids: string[] | null
          answers: Json | null
          assigned_date: string | null
          class_id: string | null
          complete_words_ids: string[] | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          daily_life_ids: string[] | null
          deleted_at: string | null
          difficulty: string
          due_date: string | null
          id: string
          started_at: string | null
          status: string | null
          student_id: string | null
          task_type: string
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          academic_passage_ids?: string[] | null
          answers?: Json | null
          assigned_date?: string | null
          class_id?: string | null
          complete_words_ids?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_life_ids?: string[] | null
          deleted_at?: string | null
          difficulty: string
          due_date?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          student_id?: string | null
          task_type: string
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          academic_passage_ids?: string[] | null
          answers?: Json | null
          assigned_date?: string | null
          class_id?: string | null
          complete_words_ids?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_life_ids?: string[] | null
          deleted_at?: string | null
          difficulty?: string
          due_date?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          student_id?: string | null
          task_type?: string
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deepcheck_sessions: {
        Row: {
          core_concepts: string[]
          created_at: string
          english_explanation: string | null
          id: string
          skills_covered: string[]
          status: string
          strengths: string[]
          student_id: string
          teacher_notes: string | null
          updated_at: string
          weaknesses: string[]
        }
        Insert: {
          core_concepts?: string[]
          created_at?: string
          english_explanation?: string | null
          id?: string
          skills_covered?: string[]
          status?: string
          strengths?: string[]
          student_id: string
          teacher_notes?: string | null
          updated_at?: string
          weaknesses?: string[]
        }
        Update: {
          core_concepts?: string[]
          created_at?: string
          english_explanation?: string | null
          id?: string
          skills_covered?: string[]
          status?: string
          strengths?: string[]
          student_id?: string
          teacher_notes?: string | null
          updated_at?: string
          weaknesses?: string[]
        }
        Relationships: []
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
      exam_mode_requests: {
        Row: {
          canceled_at: string | null
          canceled_by: string | null
          created_at: string
          held_at: string | null
          id: string
          notified_at: string | null
          resumed_at: string | null
          school_exam_period_id: string
          status: string
        }
        Insert: {
          canceled_at?: string | null
          canceled_by?: string | null
          created_at?: string
          held_at?: string | null
          id?: string
          notified_at?: string | null
          resumed_at?: string | null
          school_exam_period_id: string
          status?: string
        }
        Update: {
          canceled_at?: string | null
          canceled_by?: string | null
          created_at?: string
          held_at?: string | null
          id?: string
          notified_at?: string | null
          resumed_at?: string | null
          school_exam_period_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_mode_requests_school_exam_period_id_fkey"
            columns: ["school_exam_period_id"]
            isOneToOne: true
            referencedRelation: "school_exam_periods"
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
      generated_exam_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          due_date: string | null
          exam_id: string
          id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          due_date?: string | null
          exam_id: string
          id?: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          due_date?: string | null
          exam_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_exam_assignments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "generated_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_exam_responses: {
        Row: {
          answers: Json
          assignment_id: string
          created_at: string
          id: string
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          answers?: Json
          assignment_id: string
          created_at?: string
          id?: string
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          answers?: Json
          assignment_id?: string
          created_at?: string
          id?: string
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_exam_responses_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "generated_exam_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_exams: {
        Row: {
          created_at: string
          created_by: string
          exam_month: number
          exam_year: number
          grade: string
          id: string
          questions: Json
          school: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          exam_month: number
          exam_year: number
          grade: string
          id?: string
          questions?: Json
          school: string
          title?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          exam_month?: number
          exam_year?: number
          grade?: string
          id?: string
          questions?: Json
          school?: string
          title?: string
        }
        Relationships: []
      }
      grammar_2026_drills: {
        Row: {
          answer: string
          audio_url: string | null
          created_at: string | null
          distractors: Json
          grammar_labels: Json
          id: string
          order_index: number
          sentence: string
          source: string
          type: string
          unit_id: string
        }
        Insert: {
          answer: string
          audio_url?: string | null
          created_at?: string | null
          distractors?: Json
          grammar_labels?: Json
          id?: string
          order_index: number
          sentence: string
          source?: string
          type: string
          unit_id: string
        }
        Update: {
          answer?: string
          audio_url?: string | null
          created_at?: string | null
          distractors?: Json
          grammar_labels?: Json
          id?: string
          order_index?: number
          sentence?: string
          source?: string
          type?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grammar_2026_drills_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "grammar_2026_units"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_2026_explanation_segments: {
        Row: {
          audio_url: string | null
          content: Json
          created_at: string | null
          id: string
          narration: string | null
          order_index: number
          source: string
          type: string
          unit_id: string
        }
        Insert: {
          audio_url?: string | null
          content?: Json
          created_at?: string | null
          id?: string
          narration?: string | null
          order_index: number
          source?: string
          type: string
          unit_id: string
        }
        Update: {
          audio_url?: string | null
          content?: Json
          created_at?: string | null
          id?: string
          narration?: string | null
          order_index?: number
          source?: string
          type?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grammar_2026_explanation_segments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "grammar_2026_units"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_2026_student_responses: {
        Row: {
          accordion_opened: boolean
          answer_correct: boolean
          created_at: string | null
          drill_id: string
          id: string
          label_correct: boolean | null
          selected_answer: string | null
          selected_label_id: string | null
          student_id: string
        }
        Insert: {
          accordion_opened?: boolean
          answer_correct: boolean
          created_at?: string | null
          drill_id: string
          id?: string
          label_correct?: boolean | null
          selected_answer?: string | null
          selected_label_id?: string | null
          student_id: string
        }
        Update: {
          accordion_opened?: boolean
          answer_correct?: boolean
          created_at?: string | null
          drill_id?: string
          id?: string
          label_correct?: boolean | null
          selected_answer?: string | null
          selected_label_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grammar_2026_student_responses_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "grammar_2026_drills"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_2026_stylistic_items: {
        Row: {
          created_at: string | null
          explanation: string
          id: string
          options: Json
          order_index: number
          prompt: string
          skill: string
          unit_id: string
        }
        Insert: {
          created_at?: string | null
          explanation?: string
          id?: string
          options?: Json
          order_index?: number
          prompt: string
          skill: string
          unit_id: string
        }
        Update: {
          created_at?: string | null
          explanation?: string
          id?: string
          options?: Json
          order_index?: number
          prompt?: string
          skill?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grammar_2026_stylistic_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "grammar_2026_units"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_2026_unit_completions: {
        Row: {
          completed_at: string | null
          id: string
          student_id: string
          unit_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          student_id: string
          unit_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          student_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grammar_2026_unit_completions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "grammar_2026_units"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_2026_units: {
        Row: {
          admin_note: string | null
          created_at: string | null
          description: string | null
          id: string
          label_en: string
          label_ko: string
          level: string
          order_index: number
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          description?: string | null
          id: string
          label_en: string
          label_ko: string
          level?: string
          order_index?: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          label_en?: string
          label_ko?: string
          level?: string
          order_index?: number
          status?: string
          updated_at?: string | null
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
      grammar_elements: {
        Row: {
          category: string
          code: string
          created_at: string
          label_en: string
          label_ko: string
          order_index: number
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          label_en: string
          label_ko: string
          order_index?: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          label_en?: string
          label_ko?: string
          order_index?: number
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
      grammar_quiz_items: {
        Row: {
          answer: string
          created_at: string
          created_by: string | null
          distractors: Json
          element_code: string | null
          explanation: string | null
          id: string
          item_type: string
          origin_drill_id: string | null
          source: string
          status: string
          stem: string
          track: string
          updated_at: string
          vocab_level: number
          word_count: number
        }
        Insert: {
          answer: string
          created_at?: string
          created_by?: string | null
          distractors?: Json
          element_code?: string | null
          explanation?: string | null
          id?: string
          item_type: string
          origin_drill_id?: string | null
          source?: string
          status?: string
          stem: string
          track: string
          updated_at?: string
          vocab_level?: number
          word_count?: number
        }
        Update: {
          answer?: string
          created_at?: string
          created_by?: string | null
          distractors?: Json
          element_code?: string | null
          explanation?: string | null
          id?: string
          item_type?: string
          origin_drill_id?: string | null
          source?: string
          status?: string
          stem?: string
          track?: string
          updated_at?: string
          vocab_level?: number
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "grammar_quiz_items_element_code_fkey"
            columns: ["element_code"]
            isOneToOne: false
            referencedRelation: "grammar_elements"
            referencedColumns: ["code"]
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
      grammar_unit_taxonomy: {
        Row: {
          authoring_mode: string
          common_traps: string[]
          created_at: string
          decision_point: string
          difficulty: string
          example_base: string
          example_pattern_type: string
          example_transforms: string[]
          explanation_full: string | null
          explanation_short: string
          grammar_category: string
          grammar_point: string
          id: string
          is_active: boolean
          point_id: string | null
          related_error_codes: string[]
          selection_patterns: string[]
          structure_pattern: string
          tags: string[]
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          authoring_mode: string
          common_traps?: string[]
          created_at?: string
          decision_point: string
          difficulty: string
          example_base?: string
          example_pattern_type: string
          example_transforms?: string[]
          explanation_full?: string | null
          explanation_short: string
          grammar_category: string
          grammar_point: string
          id: string
          is_active?: boolean
          point_id?: string | null
          related_error_codes?: string[]
          selection_patterns?: string[]
          structure_pattern: string
          tags?: string[]
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          authoring_mode?: string
          common_traps?: string[]
          created_at?: string
          decision_point?: string
          difficulty?: string
          example_base?: string
          example_pattern_type?: string
          example_transforms?: string[]
          explanation_full?: string | null
          explanation_short?: string
          grammar_category?: string
          grammar_point?: string
          id?: string
          is_active?: boolean
          point_id?: string | null
          related_error_codes?: string[]
          selection_patterns?: string[]
          structure_pattern?: string
          tags?: string[]
          unit_id?: string | null
          updated_at?: string
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
      hi_naesin_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_type: string
          created_at: string
          due_at: string | null
          enabled_drill_types: string[] | null
          id: string
          note: string | null
          passage_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type: string
          created_at?: string
          due_at?: string | null
          enabled_drill_types?: string[] | null
          id?: string
          note?: string | null
          passage_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type?: string
          created_at?: string
          due_at?: string | null
          enabled_drill_types?: string[] | null
          id?: string
          note?: string | null
          passage_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hi_naesin_assignments_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "hi_naesin_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      hi_naesin_drill_responses: {
        Row: {
          created_at: string
          drill_id: string
          elapsed_sec: number | null
          feedback_text: string | null
          id: string
          is_correct: boolean | null
          response_choice: string | null
          response_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          score_pct: number | null
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          drill_id: string
          elapsed_sec?: number | null
          feedback_text?: string | null
          id?: string
          is_correct?: boolean | null
          response_choice?: string | null
          response_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_pct?: number | null
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          drill_id?: string
          elapsed_sec?: number | null
          feedback_text?: string | null
          id?: string
          is_correct?: boolean | null
          response_choice?: string | null
          response_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_pct?: number | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hi_naesin_drill_responses_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "hi_naesin_drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hi_naesin_drill_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "hi_naesin_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hi_naesin_drills: {
        Row: {
          created_at: string
          drill_type: string
          id: string
          is_published: boolean
          order_index: number
          passage_id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          drill_type: string
          id?: string
          is_published?: boolean
          order_index?: number
          passage_id: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          drill_type?: string
          id?: string
          is_published?: boolean
          order_index?: number
          passage_id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hi_naesin_drills_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "hi_naesin_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      hi_naesin_passage_analysis: {
        Row: {
          blank_items: Json | null
          blank_locked: boolean | null
          connector_items: Json | null
          connector_locked: boolean | null
          created_at: string | null
          grammar_items: Json | null
          grammar_locked: boolean | null
          id: string
          passage_id: string | null
          updated_at: string | null
          vocab_items: Json | null
          vocab_locked: boolean | null
        }
        Insert: {
          blank_items?: Json | null
          blank_locked?: boolean | null
          connector_items?: Json | null
          connector_locked?: boolean | null
          created_at?: string | null
          grammar_items?: Json | null
          grammar_locked?: boolean | null
          id?: string
          passage_id?: string | null
          updated_at?: string | null
          vocab_items?: Json | null
          vocab_locked?: boolean | null
        }
        Update: {
          blank_items?: Json | null
          blank_locked?: boolean | null
          connector_items?: Json | null
          connector_locked?: boolean | null
          created_at?: string | null
          grammar_items?: Json | null
          grammar_locked?: boolean | null
          id?: string
          passage_id?: string | null
          updated_at?: string | null
          vocab_items?: Json | null
          vocab_locked?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hi_naesin_passage_analysis_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: true
            referencedRelation: "hi_naesin_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      hi_naesin_passage_sentences: {
        Row: {
          created_at: string
          id: string
          importance: string
          order_index: number
          passage_id: string
          sentence_en: string
          sentence_ko: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          importance?: string
          order_index: number
          passage_id: string
          sentence_en: string
          sentence_ko?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          importance?: string
          order_index?: number
          passage_id?: string
          sentence_en?: string
          sentence_ko?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hi_naesin_passage_sentences_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "hi_naesin_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      hi_naesin_passages: {
        Row: {
          book_name: string | null
          book_unit: string | null
          created_at: string
          created_by: string | null
          exam_month: number | null
          exam_year: number | null
          grade: string
          id: string
          is_published: boolean
          passage_text: string
          question_number: number | null
          school_name: string | null
          source_type: string
          textbook_name: string | null
          title: string | null
          topic_tags: string[]
          translation_ko: string | null
          unit_label: string | null
          updated_at: string
          word_count: number | null
        }
        Insert: {
          book_name?: string | null
          book_unit?: string | null
          created_at?: string
          created_by?: string | null
          exam_month?: number | null
          exam_year?: number | null
          grade: string
          id?: string
          is_published?: boolean
          passage_text: string
          question_number?: number | null
          school_name?: string | null
          source_type: string
          textbook_name?: string | null
          title?: string | null
          topic_tags?: string[]
          translation_ko?: string | null
          unit_label?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          book_name?: string | null
          book_unit?: string | null
          created_at?: string
          created_by?: string | null
          exam_month?: number | null
          exam_year?: number | null
          grade?: string
          id?: string
          is_published?: boolean
          passage_text?: string
          question_number?: number | null
          school_name?: string | null
          source_type?: string
          textbook_name?: string | null
          title?: string | null
          topic_tags?: string[]
          translation_ko?: string | null
          unit_label?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Relationships: []
      }
      hi_naesin_sessions: {
        Row: {
          analytics_snapshot: Json
          assignment_id: string | null
          created_at: string
          id: string
          passage_id: string
          score_percent: number | null
          session_type: string
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          analytics_snapshot?: Json
          assignment_id?: string | null
          created_at?: string
          id?: string
          passage_id: string
          score_percent?: number | null
          session_type: string
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          analytics_snapshot?: Json
          assignment_id?: string | null
          created_at?: string
          id?: string
          passage_id?: string
          score_percent?: number | null
          session_type?: string
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hi_naesin_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "hi_naesin_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hi_naesin_sessions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "hi_naesin_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      hi_naesin_variant_answers: {
        Row: {
          created_at: string
          elapsed_sec: number | null
          id: string
          is_correct: boolean
          question_id: string
          selected_choice_id: string | null
          selected_order: string[] | null
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          elapsed_sec?: number | null
          id?: string
          is_correct: boolean
          question_id: string
          selected_choice_id?: string | null
          selected_order?: string[] | null
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          elapsed_sec?: number | null
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_choice_id?: string | null
          selected_order?: string[] | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hi_naesin_variant_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "hi_naesin_variant_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hi_naesin_variant_answers_selected_choice_id_fkey"
            columns: ["selected_choice_id"]
            isOneToOne: false
            referencedRelation: "hi_naesin_variant_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hi_naesin_variant_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "hi_naesin_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hi_naesin_variant_choices: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          order_index: number
          question_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          order_index: number
          question_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "hi_naesin_variant_choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "hi_naesin_variant_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      hi_naesin_variant_questions: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          is_published: boolean
          order_index: number
          passage_id: string
          payload: Json
          question_type: string
          stem: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          passage_id: string
          payload?: Json
          question_type: string
          stem?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          passage_id?: string
          payload?: Json
          question_type?: string
          stem?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hi_naesin_variant_questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "hi_naesin_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_book_units: {
        Row: {
          answer_key_data: Json
          book_id: string
          created_at: string
          id: string
          title: string | null
          unit_index: number
          updated_at: string
        }
        Insert: {
          answer_key_data?: Json
          book_id: string
          created_at?: string
          id?: string
          title?: string | null
          unit_index: number
          updated_at?: string
        }
        Update: {
          answer_key_data?: Json
          book_id?: string
          created_at?: string
          id?: string
          title?: string | null
          unit_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_book_units_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "homework_books"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_books: {
        Row: {
          created_at: string
          created_by: string | null
          expected_mock_exam: string | null
          expected_school_grade: string | null
          id: string
          is_active: boolean
          level: string | null
          recommended_grade: string | null
          subject: string | null
          title: string
          total_units: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_mock_exam?: string | null
          expected_school_grade?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          recommended_grade?: string | null
          subject?: string | null
          title: string
          total_units?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_mock_exam?: string | null
          expected_school_grade?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          recommended_grade?: string | null
          subject?: string | null
          title?: string
          total_units?: number | null
          updated_at?: string
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
      jr_grammar_chapters: {
        Row: {
          ai_review: Json | null
          ai_score: number | null
          content: string
          created_at: string | null
          examples: Json | null
          exercises: Json | null
          explanation: string | null
          id: string
          key_points: string | null
          korean_explanation: string | null
          level: string | null
          source_page: number | null
          source_textbook: string | null
          status: string | null
          textbook: string | null
          textbook_mapping: string | null
          title: string
          topic_area: string | null
          updated_at: string | null
        }
        Insert: {
          ai_review?: Json | null
          ai_score?: number | null
          content: string
          created_at?: string | null
          examples?: Json | null
          exercises?: Json | null
          explanation?: string | null
          id?: string
          key_points?: string | null
          korean_explanation?: string | null
          level?: string | null
          source_page?: number | null
          source_textbook?: string | null
          status?: string | null
          textbook?: string | null
          textbook_mapping?: string | null
          title: string
          topic_area?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_review?: Json | null
          ai_score?: number | null
          content?: string
          created_at?: string | null
          examples?: Json | null
          exercises?: Json | null
          explanation?: string | null
          id?: string
          key_points?: string | null
          korean_explanation?: string | null
          level?: string | null
          source_page?: number | null
          source_textbook?: string | null
          status?: string | null
          textbook?: string | null
          textbook_mapping?: string | null
          title?: string
          topic_area?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      jr_grammar_lesson_logs: {
        Row: {
          concept_id: string | null
          concept_name: string | null
          explanation: string | null
          fill_in_answer: string | null
          id: string
          is_correct: boolean | null
          last_reviewed_at: string | null
          repetition_count: number | null
          session_id: string
        }
        Insert: {
          concept_id?: string | null
          concept_name?: string | null
          explanation?: string | null
          fill_in_answer?: string | null
          id?: string
          is_correct?: boolean | null
          last_reviewed_at?: string | null
          repetition_count?: number | null
          session_id: string
        }
        Update: {
          concept_id?: string | null
          concept_name?: string | null
          explanation?: string | null
          fill_in_answer?: string | null
          id?: string
          is_correct?: boolean | null
          last_reviewed_at?: string | null
          repetition_count?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_grammar_lesson_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jr_grammar_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_grammar_practice_logs: {
        Row: {
          attempted_at: string | null
          hint_logs: Json | null
          hints_used: number | null
          id: string
          is_correct: boolean | null
          max_points: number | null
          points_earned: number | null
          problem_id: string | null
          session_id: string
          student_answer: string | null
        }
        Insert: {
          attempted_at?: string | null
          hint_logs?: Json | null
          hints_used?: number | null
          id?: string
          is_correct?: boolean | null
          max_points?: number | null
          points_earned?: number | null
          problem_id?: string | null
          session_id: string
          student_answer?: string | null
        }
        Update: {
          attempted_at?: string | null
          hint_logs?: Json | null
          hints_used?: number | null
          id?: string
          is_correct?: boolean | null
          max_points?: number | null
          points_earned?: number | null
          problem_id?: string | null
          session_id?: string
          student_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_grammar_practice_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jr_grammar_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_grammar_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_question_index: number | null
          grammar_chapter: string | null
          id: string
          stage: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_question_index?: number | null
          grammar_chapter?: string | null
          id?: string
          stage?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_question_index?: number | null
          grammar_chapter?: string | null
          id?: string
          stage?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_grammar_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_listening_audio: {
        Row: {
          audio_transcript: string | null
          audio_url: string
          created_at: string | null
          difficulty: string | null
          duration_seconds: number | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_transcript?: string | null
          audio_url: string
          created_at?: string | null
          difficulty?: string | null
          duration_seconds?: number | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_transcript?: string | null
          audio_url?: string
          created_at?: string | null
          difficulty?: string | null
          duration_seconds?: number | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      jr_listening_checkup_logs: {
        Row: {
          checkup_content: string | null
          id: string
          is_homework: boolean | null
          session_id: string
          submitted_at: string | null
        }
        Insert: {
          checkup_content?: string | null
          id?: string
          is_homework?: boolean | null
          session_id: string
          submitted_at?: string | null
        }
        Update: {
          checkup_content?: string | null
          id?: string
          is_homework?: boolean | null
          session_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_listening_checkup_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jr_listening_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_listening_notes_logs: {
        Row: {
          id: string
          note_content: string | null
          recorded_at: string | null
          session_id: string
        }
        Insert: {
          id?: string
          note_content?: string | null
          recorded_at?: string | null
          session_id: string
        }
        Update: {
          id?: string
          note_content?: string | null
          recorded_at?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_listening_notes_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jr_listening_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_listening_question_logs: {
        Row: {
          final_answer: string | null
          final_attempt_at: string | null
          final_correct: boolean | null
          id: string
          initial_answer: string | null
          initial_attempt_at: string | null
          initial_correct: boolean | null
          problem_id: string | null
          script_explanation: string | null
          script_shown: boolean | null
          session_id: string
        }
        Insert: {
          final_answer?: string | null
          final_attempt_at?: string | null
          final_correct?: boolean | null
          id?: string
          initial_answer?: string | null
          initial_attempt_at?: string | null
          initial_correct?: boolean | null
          problem_id?: string | null
          script_explanation?: string | null
          script_shown?: boolean | null
          session_id: string
        }
        Update: {
          final_answer?: string | null
          final_attempt_at?: string | null
          final_correct?: boolean | null
          id?: string
          initial_answer?: string | null
          initial_attempt_at?: string | null
          initial_correct?: boolean | null
          problem_id?: string | null
          script_explanation?: string | null
          script_shown?: boolean | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_listening_question_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jr_listening_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_listening_sessions: {
        Row: {
          ai_review: Json | null
          ai_score: number | null
          audio_id: string | null
          audio_url: string | null
          completed_at: string | null
          content: Json | null
          created_at: string | null
          current_question_index: number | null
          difficulty: string | null
          id: string
          keywords: Json | null
          level: number | null
          listening_type: string | null
          source_page: number | null
          source_textbook: string | null
          stage: string
          status: string | null
          student_id: string
          textbook: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          ai_review?: Json | null
          ai_score?: number | null
          audio_id?: string | null
          audio_url?: string | null
          completed_at?: string | null
          content?: Json | null
          created_at?: string | null
          current_question_index?: number | null
          difficulty?: string | null
          id?: string
          keywords?: Json | null
          level?: number | null
          listening_type?: string | null
          source_page?: number | null
          source_textbook?: string | null
          stage?: string
          status?: string | null
          student_id: string
          textbook?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_review?: Json | null
          ai_score?: number | null
          audio_id?: string | null
          audio_url?: string | null
          completed_at?: string | null
          content?: Json | null
          created_at?: string | null
          current_question_index?: number | null
          difficulty?: string | null
          id?: string
          keywords?: Json | null
          level?: number | null
          listening_type?: string | null
          source_page?: number | null
          source_textbook?: string | null
          stage?: string
          status?: string | null
          student_id?: string
          textbook?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_listening_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_listening_shadowing_logs: {
        Row: {
          alternative_expressions: string[] | null
          completed_at: string | null
          id: string
          original_sentence: string | null
          sentence_id: string | null
          session_id: string
          student_recording_url: string | null
        }
        Insert: {
          alternative_expressions?: string[] | null
          completed_at?: string | null
          id?: string
          original_sentence?: string | null
          sentence_id?: string | null
          session_id: string
          student_recording_url?: string | null
        }
        Update: {
          alternative_expressions?: string[] | null
          completed_at?: string | null
          id?: string
          original_sentence?: string | null
          sentence_id?: string | null
          session_id?: string
          student_recording_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_listening_shadowing_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jr_listening_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_reading_comprehension_logs: {
        Row: {
          attempted_at: string | null
          id: string
          is_correct: boolean | null
          is_homework: boolean | null
          problem_id: string | null
          problem_type: string | null
          session_id: string
          student_answer: string | null
        }
        Insert: {
          attempted_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_homework?: boolean | null
          problem_id?: string | null
          problem_type?: string | null
          session_id: string
          student_answer?: string | null
        }
        Update: {
          attempted_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_homework?: boolean | null
          problem_id?: string | null
          problem_type?: string | null
          session_id?: string
          student_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_reading_comprehension_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jr_reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_reading_discussion_logs: {
        Row: {
          completed_at: string | null
          id: string
          question: string | null
          session_id: string
          spoken_answer_url: string | null
          written_answer: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          question?: string | null
          session_id: string
          spoken_answer_url?: string | null
          written_answer?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          question?: string | null
          session_id?: string
          spoken_answer_url?: string | null
          written_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_reading_discussion_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jr_reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_reading_grammar_logs: {
        Row: {
          completed_at: string | null
          explanation: string | null
          id: string
          sentence_index: number
          session_id: string
          structure_text: string | null
          structure_type: string | null
        }
        Insert: {
          completed_at?: string | null
          explanation?: string | null
          id?: string
          sentence_index: number
          session_id: string
          structure_text?: string | null
          structure_type?: string | null
        }
        Update: {
          completed_at?: string | null
          explanation?: string | null
          id?: string
          sentence_index?: number
          session_id?: string
          structure_text?: string | null
          structure_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_reading_grammar_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jr_reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_reading_passages: {
        Row: {
          ai_review: Json | null
          ai_score: number | null
          comprehension_questions: Json | null
          content: string
          content_metadata: Json | null
          created_at: string | null
          difficulty: string
          grammar_analysis: Json | null
          id: string
          jikdok_jihae_base: Json | null
          jikdok_jihae_customization: Json | null
          key_sentences: Json | null
          korean_translation: string | null
          level: number | null
          questions: Json | null
          source_page: number | null
          source_textbook: string | null
          status: string | null
          textbook: string | null
          textbook_mapping: string | null
          title: string
          translation: Json | null
          updated_at: string | null
          vocabulary: Json | null
          vocabulary_level: string | null
          word_count: number | null
        }
        Insert: {
          ai_review?: Json | null
          ai_score?: number | null
          comprehension_questions?: Json | null
          content: string
          content_metadata?: Json | null
          created_at?: string | null
          difficulty?: string
          grammar_analysis?: Json | null
          id?: string
          jikdok_jihae_base?: Json | null
          jikdok_jihae_customization?: Json | null
          key_sentences?: Json | null
          korean_translation?: string | null
          level?: number | null
          questions?: Json | null
          source_page?: number | null
          source_textbook?: string | null
          status?: string | null
          textbook?: string | null
          textbook_mapping?: string | null
          title: string
          translation?: Json | null
          updated_at?: string | null
          vocabulary?: Json | null
          vocabulary_level?: string | null
          word_count?: number | null
        }
        Update: {
          ai_review?: Json | null
          ai_score?: number | null
          comprehension_questions?: Json | null
          content?: string
          content_metadata?: Json | null
          created_at?: string | null
          difficulty?: string
          grammar_analysis?: Json | null
          id?: string
          jikdok_jihae_base?: Json | null
          jikdok_jihae_customization?: Json | null
          key_sentences?: Json | null
          korean_translation?: string | null
          level?: number | null
          questions?: Json | null
          source_page?: number | null
          source_textbook?: string | null
          status?: string | null
          textbook?: string | null
          textbook_mapping?: string | null
          title?: string
          translation?: Json | null
          updated_at?: string | null
          vocabulary?: Json | null
          vocabulary_level?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
      jr_reading_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_sentence_index: number | null
          id: string
          passage_content: string | null
          passage_id: string
          stage: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_sentence_index?: number | null
          id?: string
          passage_content?: string | null
          passage_id: string
          stage?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_sentence_index?: number | null
          id?: string
          passage_content?: string | null
          passage_id?: string
          stage?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_reading_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_reading_translation_logs: {
        Row: {
          completed_at: string | null
          direct_translation: string | null
          id: string
          interpretation: string | null
          interpretation_type: string | null
          sentence_index: number
          session_id: string
          thought_unit: string | null
        }
        Insert: {
          completed_at?: string | null
          direct_translation?: string | null
          id?: string
          interpretation?: string | null
          interpretation_type?: string | null
          sentence_index: number
          session_id: string
          thought_unit?: string | null
        }
        Update: {
          completed_at?: string | null
          direct_translation?: string | null
          id?: string
          interpretation?: string | null
          interpretation_type?: string | null
          sentence_index?: number
          session_id?: string
          thought_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_reading_translation_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jr_reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_reading_vocab_logs: {
        Row: {
          id: string
          interpretation_tip: string | null
          marked_at: string | null
          meaning: string | null
          pos: string | null
          sentence_index: number
          session_id: string
          word_id: string | null
          word_text: string | null
        }
        Insert: {
          id?: string
          interpretation_tip?: string | null
          marked_at?: string | null
          meaning?: string | null
          pos?: string | null
          sentence_index: number
          session_id: string
          word_id?: string | null
          word_text?: string | null
        }
        Update: {
          id?: string
          interpretation_tip?: string | null
          marked_at?: string | null
          meaning?: string | null
          pos?: string | null
          sentence_index?: number
          session_id?: string
          word_id?: string | null
          word_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_reading_vocab_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jr_reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_speaking_writing_submissions: {
        Row: {
          assignment_id: string | null
          assignment_type: string | null
          content_url: string | null
          feedback_given_at: string | null
          id: string
          is_homework: boolean | null
          student_id: string
          submission_type: string
          submitted_at: string | null
          teacher_feedback: string | null
          text_content: string | null
        }
        Insert: {
          assignment_id?: string | null
          assignment_type?: string | null
          content_url?: string | null
          feedback_given_at?: string | null
          id?: string
          is_homework?: boolean | null
          student_id: string
          submission_type: string
          submitted_at?: string | null
          teacher_feedback?: string | null
          text_content?: string | null
        }
        Update: {
          assignment_id?: string | null
          assignment_type?: string | null
          content_url?: string | null
          feedback_given_at?: string | null
          id?: string
          is_homework?: boolean | null
          student_id?: string
          submission_type?: string
          submitted_at?: string | null
          teacher_feedback?: string | null
          text_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_speaking_writing_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_speaking_writing_tasks: {
        Row: {
          ai_review: Json | null
          ai_score: number | null
          assigned_to_student_id: string | null
          content: Json | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          due_date: string | null
          id: string
          korean_prompt: string | null
          level: number | null
          preparation_time: number | null
          prompt: string
          response_time: number | null
          rubric: string | null
          sample_answer: string | null
          sample_answer_korean: string | null
          source_page: number | null
          source_textbook: string | null
          status: string | null
          task_type: string
          textbook_mapping: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          ai_review?: Json | null
          ai_score?: number | null
          assigned_to_student_id?: string | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          due_date?: string | null
          id?: string
          korean_prompt?: string | null
          level?: number | null
          preparation_time?: number | null
          prompt: string
          response_time?: number | null
          rubric?: string | null
          sample_answer?: string | null
          sample_answer_korean?: string | null
          source_page?: number | null
          source_textbook?: string | null
          status?: string | null
          task_type: string
          textbook_mapping?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_review?: Json | null
          ai_score?: number | null
          assigned_to_student_id?: string | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          due_date?: string | null
          id?: string
          korean_prompt?: string | null
          level?: number | null
          preparation_time?: number | null
          prompt?: string
          response_time?: number | null
          rubric?: string | null
          sample_answer?: string | null
          sample_answer_korean?: string | null
          source_page?: number | null
          source_textbook?: string | null
          status?: string | null
          task_type?: string
          textbook_mapping?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_stage_attempts: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          meaning_viewed: boolean | null
          quiz_answer: number | null
          quiz_attempts: number | null
          quiz_correct: boolean | null
          spelling_attempt: string | null
          spelling_attempts: number | null
          spelling_correct: boolean | null
          student_id: string
          tab_sequence: Json | null
          time_spent_total: number | null
          updated_at: string
          word_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          meaning_viewed?: boolean | null
          quiz_answer?: number | null
          quiz_attempts?: number | null
          quiz_correct?: boolean | null
          spelling_attempt?: string | null
          spelling_attempts?: number | null
          spelling_correct?: boolean | null
          student_id: string
          tab_sequence?: Json | null
          time_spent_total?: number | null
          updated_at?: string
          word_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          meaning_viewed?: boolean | null
          quiz_answer?: number | null
          quiz_attempts?: number | null
          quiz_correct?: boolean | null
          spelling_attempt?: string | null
          spelling_attempts?: number | null
          spelling_correct?: boolean | null
          student_id?: string
          tab_sequence?: Json | null
          time_spent_total?: number | null
          updated_at?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_stage_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_stage_attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_stage_attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_stage_flags: {
        Row: {
          admin_notes: string | null
          confidence: number | null
          created_at: string
          detected_issue: string | null
          flag_type: string
          id: string
          original_data: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          suggested_fix: string | null
          updated_at: string
          word_id: string
        }
        Insert: {
          admin_notes?: string | null
          confidence?: number | null
          created_at?: string
          detected_issue?: string | null
          flag_type: string
          id?: string
          original_data?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          suggested_fix?: string | null
          updated_at?: string
          word_id: string
        }
        Update: {
          admin_notes?: string | null
          confidence?: number | null
          created_at?: string
          detected_issue?: string | null
          flag_type?: string
          id?: string
          original_data?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          suggested_fix?: string | null
          updated_at?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_stage_flags_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_stage_flags_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_stage_items: {
        Row: {
          admin_notes: string | null
          created_at: string
          data_status: string
          given_spelling: string
          id: string
          meaning_1: string | null
          meaning_1_en: string | null
          meaning_2: string | null
          meaning_2_en: string | null
          meaning_context: string | null
          meaning_definition_en: string | null
          meaning_related_words: Json | null
          mojibake_detected: boolean | null
          quiz_choices: Json | null
          quiz_example_en: string | null
          quiz_example_ko: string | null
          quiz_synonyms: Json | null
          updated_at: string
          word_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          data_status?: string
          given_spelling: string
          id?: string
          meaning_1?: string | null
          meaning_1_en?: string | null
          meaning_2?: string | null
          meaning_2_en?: string | null
          meaning_context?: string | null
          meaning_definition_en?: string | null
          meaning_related_words?: Json | null
          mojibake_detected?: boolean | null
          quiz_choices?: Json | null
          quiz_example_en?: string | null
          quiz_example_ko?: string | null
          quiz_synonyms?: Json | null
          updated_at?: string
          word_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          data_status?: string
          given_spelling?: string
          id?: string
          meaning_1?: string | null
          meaning_1_en?: string | null
          meaning_2?: string | null
          meaning_2_en?: string | null
          meaning_context?: string | null
          meaning_definition_en?: string | null
          meaning_related_words?: Json | null
          mojibake_detected?: boolean | null
          quiz_choices?: Json | null
          quiz_example_en?: string | null
          quiz_example_ko?: string | null
          quiz_synonyms?: Json | null
          updated_at?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_stage_items_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: true
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_stage_items_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: true
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
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
      lecture_assignments: {
        Row: {
          assigned_by: string | null
          class_id: string | null
          created_at: string
          due_at: string | null
          id: string
          lecture_id: string
          student_id: string | null
        }
        Insert: {
          assigned_by?: string | null
          class_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          lecture_id: string
          student_id?: string | null
        }
        Update: {
          assigned_by?: string | null
          class_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          lecture_id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecture_assignments_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_completions: {
        Row: {
          completed_at: string
          id: string
          lecture_id: string
          quiz_score: number | null
          quiz_total: number | null
          student_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lecture_id: string
          quiz_score?: number | null
          quiz_total?: number | null
          student_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lecture_id?: string
          quiz_score?: number | null
          quiz_total?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_completions_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_questions: {
        Row: {
          body: string
          created_at: string
          id: string
          lecture_id: string
          student_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          lecture_id: string
          student_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          lecture_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_questions_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_quiz_attempts: {
        Row: {
          answer: string
          attempted_at: string
          id: string
          is_correct: boolean
          lecture_id: string
          question_id: string
          student_id: string
        }
        Insert: {
          answer: string
          attempted_at?: string
          id?: string
          is_correct: boolean
          lecture_id: string
          question_id: string
          student_id: string
        }
        Update: {
          answer?: string
          attempted_at?: string
          id?: string
          is_correct?: boolean
          lecture_id?: string
          question_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_quiz_attempts_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_quiz_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "lecture_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_quiz_questions: {
        Row: {
          blank_answer: string
          created_at: string
          hint: string | null
          id: string
          lecture_id: string
          question_text: string
          sort_order: number
          timestamp_seconds: number
        }
        Insert: {
          blank_answer: string
          created_at?: string
          hint?: string | null
          id?: string
          lecture_id: string
          question_text: string
          sort_order?: number
          timestamp_seconds: number
        }
        Update: {
          blank_answer?: string
          created_at?: string
          hint?: string | null
          id?: string
          lecture_id?: string
          question_text?: string
          sort_order?: number
          timestamp_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lecture_quiz_questions_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_active: boolean
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string
        }
        Relationships: []
      }
      level_test_questions: {
        Row: {
          audio_url: string | null
          choices: Json | null
          correct_choice_id: string | null
          created_at: string
          created_by: string | null
          generated_by_ai: boolean
          id: string
          is_active: boolean
          order_index: number
          passage_text: string | null
          prompt: string
          section: string
          sub_level: string | null
          topic_label: string | null
          track: string | null
        }
        Insert: {
          audio_url?: string | null
          choices?: Json | null
          correct_choice_id?: string | null
          created_at?: string
          created_by?: string | null
          generated_by_ai?: boolean
          id?: string
          is_active?: boolean
          order_index?: number
          passage_text?: string | null
          prompt: string
          section: string
          sub_level?: string | null
          topic_label?: string | null
          track?: string | null
        }
        Update: {
          audio_url?: string | null
          choices?: Json | null
          correct_choice_id?: string | null
          created_at?: string
          created_by?: string | null
          generated_by_ai?: boolean
          id?: string
          is_active?: boolean
          order_index?: number
          passage_text?: string | null
          prompt?: string
          section?: string
          sub_level?: string | null
          topic_label?: string | null
          track?: string | null
        }
        Relationships: []
      }
      level_test_responses: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          response_audio_url: string | null
          response_choice_id: string | null
          response_text: string | null
          session_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          response_audio_url?: string | null
          response_choice_id?: string | null
          response_text?: string | null
          session_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          response_audio_url?: string | null
          response_choice_id?: string | null
          response_text?: string | null
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_test_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "level_test_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_test_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "level_test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      level_test_sessions: {
        Row: {
          branch: string | null
          completed_at: string | null
          id: string
          recommended_level: string | null
          recommended_sub_level: string | null
          section_scores: Json
          stage: number
          started_at: string
          status: string
          student_id: string
          teacher_notes: string | null
          track: string | null
        }
        Insert: {
          branch?: string | null
          completed_at?: string | null
          id?: string
          recommended_level?: string | null
          recommended_sub_level?: string | null
          section_scores?: Json
          stage?: number
          started_at?: string
          status?: string
          student_id: string
          teacher_notes?: string | null
          track?: string | null
        }
        Update: {
          branch?: string | null
          completed_at?: string | null
          id?: string
          recommended_level?: string | null
          recommended_sub_level?: string | null
          section_scores?: Json
          stage?: number
          started_at?: string
          status?: string
          student_id?: string
          teacher_notes?: string | null
          track?: string | null
        }
        Relationships: []
      }
      lexiox_jr_drill_results: {
        Row: {
          assignment_id: string | null
          completed_at: string
          id: string
          passage_id: string
          score_pct: number | null
          stage: string
          student_id: string
        }
        Insert: {
          assignment_id?: string | null
          completed_at?: string
          id?: string
          passage_id: string
          score_pct?: number | null
          stage: string
          student_id: string
        }
        Update: {
          assignment_id?: string | null
          completed_at?: string
          id?: string
          passage_id?: string
          score_pct?: number | null
          stage?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lexiox_jr_drill_results_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "lexiox_jr_passage_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lexiox_jr_drill_results_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "naesin_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      lexiox_jr_passage_assignments: {
        Row: {
          assigned_by: string
          created_at: string
          due_at: string | null
          id: string
          passage_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          due_at?: string | null
          id?: string
          passage_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          due_at?: string | null
          id?: string
          passage_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lexiox_jr_passage_assignments_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "naesin_passages"
            referencedColumns: ["id"]
          },
        ]
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
      listening_practice_results_2026: {
        Row: {
          correct_count: number | null
          created_at: string
          id: string
          kind: string
          payload: Json
          result_id: string | null
          test_id: string
          total_count: number | null
          track_id: string
          user_id: string | null
          wer: number | null
        }
        Insert: {
          correct_count?: number | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          result_id?: string | null
          test_id: string
          total_count?: number | null
          track_id: string
          user_id?: string | null
          wer?: number | null
        }
        Update: {
          correct_count?: number | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          result_id?: string | null
          test_id?: string
          total_count?: number | null
          track_id?: string
          user_id?: string | null
          wer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listening_practice_results_2026_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "listening_results_2026"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listening_practice_results_2026_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "listening_tests_2026"
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
      listening_results: {
        Row: {
          combined_correct: number | null
          combined_total: number | null
          created_at: string | null
          final_cefr: string | null
          final_score_band: number | null
          id: string
          module1_answers: Json | null
          module1_correct_count: number | null
          module1_correct_rate: number | null
          module1_total: number | null
          module2_answers: Json | null
          module2_correct_count: number | null
          module2_mode: string | null
          module2_total: number | null
          student_id: string
          test_id: string
        }
        Insert: {
          combined_correct?: number | null
          combined_total?: number | null
          created_at?: string | null
          final_cefr?: string | null
          final_score_band?: number | null
          id?: string
          module1_answers?: Json | null
          module1_correct_count?: number | null
          module1_correct_rate?: number | null
          module1_total?: number | null
          module2_answers?: Json | null
          module2_correct_count?: number | null
          module2_mode?: string | null
          module2_total?: number | null
          student_id: string
          test_id: string
        }
        Update: {
          combined_correct?: number | null
          combined_total?: number | null
          created_at?: string | null
          final_cefr?: string | null
          final_score_band?: number | null
          id?: string
          module1_answers?: Json | null
          module1_correct_count?: number | null
          module1_correct_rate?: number | null
          module1_total?: number | null
          module2_answers?: Json | null
          module2_correct_count?: number | null
          module2_mode?: string | null
          module2_total?: number | null
          student_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listening_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "listening_tests_2026"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_results_2026: {
        Row: {
          answers: Json
          assignment_id: string | null
          correct_count: number
          created_at: string
          difficulty: string | null
          finished_at: string
          id: string
          module: number
          review_attempts: Json | null
          review_notes: Json
          test_id: string
          total_questions: number
          user_id: string | null
        }
        Insert: {
          answers?: Json
          assignment_id?: string | null
          correct_count?: number
          created_at?: string
          difficulty?: string | null
          finished_at?: string
          id?: string
          module: number
          review_attempts?: Json | null
          review_notes?: Json
          test_id: string
          total_questions?: number
          user_id?: string | null
        }
        Update: {
          answers?: Json
          assignment_id?: string | null
          correct_count?: number
          created_at?: string
          difficulty?: string | null
          finished_at?: string
          id?: string
          module?: number
          review_attempts?: Json | null
          review_notes?: Json
          test_id?: string
          total_questions?: number
          user_id?: string | null
        }
        Relationships: []
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
      listening_tests: {
        Row: {
          content: Json | null
          created_at: string
          description: string | null
          exam_era: string | null
          id: string
          is_locked: boolean | null
          label: string
          status: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          description?: string | null
          exam_era?: string | null
          id?: string
          is_locked?: boolean | null
          label: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          description?: string | null
          exam_era?: string | null
          id?: string
          is_locked?: boolean | null
          label?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      listening_tests_2026: {
        Row: {
          created_at: string
          exam_era: string
          grade: string | null
          id: string
          is_active: boolean
          is_locked: boolean
          label: string
          level: string | null
          payload: Json
          program: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_era?: string
          grade?: string | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          label: string
          level?: string | null
          payload: Json
          program?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_era?: string
          grade?: string | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          label?: string
          level?: string | null
          payload?: Json
          program?: string
          updated_at?: string
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
      login_history: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      middle_naesin_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          due_at: string | null
          id: string
          note: string | null
          student_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          note?: string | null
          student_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          note?: string | null
          student_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "middle_naesin_assignments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "middle_naesin_units"
            referencedColumns: ["id"]
          },
        ]
      }
      middle_naesin_contents: {
        Row: {
          body_text: string | null
          content_type: string
          created_at: string
          extra_data: Json | null
          id: string
          sort_order: number
          title: string | null
          translation_ko: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          body_text?: string | null
          content_type: string
          created_at?: string
          extra_data?: Json | null
          id?: string
          sort_order?: number
          title?: string | null
          translation_ko?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          body_text?: string | null
          content_type?: string
          created_at?: string
          extra_data?: Json | null
          id?: string
          sort_order?: number
          title?: string | null
          translation_ko?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "middle_naesin_contents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "middle_naesin_units"
            referencedColumns: ["id"]
          },
        ]
      }
      middle_naesin_drill_results: {
        Row: {
          attempt_count: number
          completed_at: string
          created_at: string
          detail: Json | null
          drill_type: string
          id: string
          ref_id: string
          score: number
          student_id: string
          total: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string
          created_at?: string
          detail?: Json | null
          drill_type: string
          id?: string
          ref_id?: string
          score?: number
          student_id: string
          total?: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string
          created_at?: string
          detail?: Json | null
          drill_type?: string
          id?: string
          ref_id?: string
          score?: number
          student_id?: string
          total?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "middle_naesin_drill_results_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "middle_naesin_units"
            referencedColumns: ["id"]
          },
        ]
      }
      middle_naesin_units: {
        Row: {
          created_at: string
          grade: string
          id: string
          is_published: boolean
          lesson_number: number | null
          lesson_title: string | null
          publisher: string
          school_name: string | null
          semester: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          is_published?: boolean
          lesson_number?: number | null
          lesson_title?: string | null
          publisher: string
          school_name?: string | null
          semester: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          is_published?: boolean
          lesson_number?: number | null
          lesson_title?: string | null
          publisher?: string
          school_name?: string | null
          semester?: number
          updated_at?: string
        }
        Relationships: []
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
      naesin_assignments: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          retry_allowed: boolean
          review_required: boolean
          scope_id: string
          status: string
          target_id: string
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          id?: string
          retry_allowed?: boolean
          review_required?: boolean
          scope_id: string
          status?: string
          target_id: string
          target_type: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          id?: string
          retry_allowed?: boolean
          review_required?: boolean
          scope_id?: string
          status?: string
          target_id?: string
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "naesin_assignments_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "naesin_exam_scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_contents: {
        Row: {
          chapter: string | null
          content_kind: string
          created_at: string
          difficulty: string | null
          grade: string | null
          id: string
          is_active: boolean
          publisher: string | null
          question_origin_type: string | null
          school_level: string
          section: string
          semester: string | null
          source_book: string | null
          source_type: string
          tags: string[] | null
          title: string
          track: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          chapter?: string | null
          content_kind: string
          created_at?: string
          difficulty?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean
          publisher?: string | null
          question_origin_type?: string | null
          school_level: string
          section: string
          semester?: string | null
          source_book?: string | null
          source_type: string
          tags?: string[] | null
          title: string
          track?: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          chapter?: string | null
          content_kind?: string
          created_at?: string
          difficulty?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean
          publisher?: string | null
          question_origin_type?: string | null
          school_level?: string
          section?: string
          semester?: string | null
          source_book?: string | null
          source_type?: string
          tags?: string[] | null
          title?: string
          track?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      naesin_exam_schedule: {
        Row: {
          created_at: string
          created_by: string | null
          exam_date: string
          exam_name: string
          id: string
          note: string | null
          school: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exam_date: string
          exam_name?: string
          id?: string
          note?: string | null
          school?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exam_date?: string
          exam_name?: string
          id?: string
          note?: string | null
          school?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "naesin_exam_schedule_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_exam_schedule_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_exam_scope_items: {
        Row: {
          body: string | null
          content_id: string
          created_at: string
          id: string
          is_active: boolean
          is_required: boolean
          item_type: string
          note: string | null
          scope_id: string
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          content_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          item_type?: string
          note?: string | null
          scope_id: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          content_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          item_type?: string
          note?: string | null
          scope_id?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "naesin_exam_scope_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "naesin_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_exam_scope_items_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "naesin_exam_scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_exam_scopes: {
        Row: {
          academic_year: number
          created_at: string
          end_date: string | null
          exam_type: string
          grade: string
          id: string
          is_active: boolean
          memo: string | null
          school_level: string
          school_name: string
          semester: string
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          academic_year: number
          created_at?: string
          end_date?: string | null
          exam_type: string
          grade: string
          id?: string
          is_active?: boolean
          memo?: string | null
          school_level: string
          school_name: string
          semester: string
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          academic_year?: number
          created_at?: string
          end_date?: string | null
          exam_type?: string
          grade?: string
          id?: string
          is_active?: boolean
          memo?: string | null
          school_level?: string
          school_name?: string
          semester?: string
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      naesin_passages: {
        Row: {
          created_at: string
          created_by: string | null
          exam_type: string | null
          grade_label: string | null
          id: string
          is_published: boolean
          original_question_style: string | null
          paragraph_count: number
          payload: Json
          raw_passage: string
          school_level: string | null
          sentence_count: number
          slug: string
          source_label: string | null
          source_type: string | null
          status: string
          tags: string[]
          title: string
          track: string
          updated_at: string
          updated_by: string | null
          variant_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exam_type?: string | null
          grade_label?: string | null
          id?: string
          is_published?: boolean
          original_question_style?: string | null
          paragraph_count?: number
          payload?: Json
          raw_passage?: string
          school_level?: string | null
          sentence_count?: number
          slug: string
          source_label?: string | null
          source_type?: string | null
          status?: string
          tags?: string[]
          title: string
          track: string
          updated_at?: string
          updated_by?: string | null
          variant_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exam_type?: string | null
          grade_label?: string | null
          id?: string
          is_published?: boolean
          original_question_style?: string | null
          paragraph_count?: number
          payload?: Json
          raw_passage?: string
          school_level?: string | null
          sentence_count?: number
          slug?: string
          source_label?: string | null
          source_type?: string | null
          status?: string
          tags?: string[]
          title?: string
          track?: string
          updated_at?: string
          updated_by?: string | null
          variant_count?: number
        }
        Relationships: []
      }
      naesin_reading_analytics_snapshots: {
        Row: {
          accuracy_overall: number
          avg_elapsed_sec_by_type: Json
          by_passage: Json
          by_question_type: Json
          by_skill_group: Json
          created_at: string
          id: string
          prescription_tags: Database["public"]["Enums"]["naesin_prescription_tag"][]
          session_id: string
          updated_at: string
          wrong_reason_breakdown: Json
        }
        Insert: {
          accuracy_overall?: number
          avg_elapsed_sec_by_type?: Json
          by_passage?: Json
          by_question_type?: Json
          by_skill_group?: Json
          created_at?: string
          id?: string
          prescription_tags?: Database["public"]["Enums"]["naesin_prescription_tag"][]
          session_id: string
          updated_at?: string
          wrong_reason_breakdown?: Json
        }
        Update: {
          accuracy_overall?: number
          avg_elapsed_sec_by_type?: Json
          by_passage?: Json
          by_question_type?: Json
          by_skill_group?: Json
          created_at?: string
          id?: string
          prescription_tags?: Database["public"]["Enums"]["naesin_prescription_tag"][]
          session_id?: string
          updated_at?: string
          wrong_reason_breakdown?: Json
        }
        Relationships: [
          {
            foreignKeyName: "naesin_reading_analytics_snapshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "naesin_reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_reading_answers: {
        Row: {
          answer_text: string | null
          awarded_score: number
          confidence: number | null
          created_at: string
          elapsed_sec: number | null
          evidence_checked: boolean
          flagged: boolean
          id: string
          is_correct: boolean
          mapping_pairs: Json
          max_score: number
          omitted: boolean
          ordered_values: string[]
          question_id: string
          selected_choice_id: string | null
          selected_choice_ids: string[]
          session_id: string
          updated_at: string
          wrong_reason_tags: Database["public"]["Enums"]["naesin_wrong_reason_tag"][]
        }
        Insert: {
          answer_text?: string | null
          awarded_score?: number
          confidence?: number | null
          created_at?: string
          elapsed_sec?: number | null
          evidence_checked?: boolean
          flagged?: boolean
          id?: string
          is_correct: boolean
          mapping_pairs?: Json
          max_score?: number
          omitted?: boolean
          ordered_values?: string[]
          question_id: string
          selected_choice_id?: string | null
          selected_choice_ids?: string[]
          session_id: string
          updated_at?: string
          wrong_reason_tags?: Database["public"]["Enums"]["naesin_wrong_reason_tag"][]
        }
        Update: {
          answer_text?: string | null
          awarded_score?: number
          confidence?: number | null
          created_at?: string
          elapsed_sec?: number | null
          evidence_checked?: boolean
          flagged?: boolean
          id?: string
          is_correct?: boolean
          mapping_pairs?: Json
          max_score?: number
          omitted?: boolean
          ordered_values?: string[]
          question_id?: string
          selected_choice_id?: string | null
          selected_choice_ids?: string[]
          session_id?: string
          updated_at?: string
          wrong_reason_tags?: Database["public"]["Enums"]["naesin_wrong_reason_tag"][]
        }
        Relationships: [
          {
            foreignKeyName: "naesin_reading_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_reading_answers_selected_choice_id_fkey"
            columns: ["selected_choice_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_reading_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_reading_choices: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          label: string
          order_index: number
          question_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          label: string
          order_index: number
          question_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          label?: string
          order_index?: number
          question_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "naesin_reading_choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_reading_evidence: {
        Row: {
          created_at: string
          end_offset: number | null
          id: string
          note: string | null
          order_index: number
          paragraph_label: string | null
          question_id: string
          quote: string | null
          start_offset: number | null
          type: Database["public"]["Enums"]["naesin_evidence_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_offset?: number | null
          id?: string
          note?: string | null
          order_index?: number
          paragraph_label?: string | null
          question_id: string
          quote?: string | null
          start_offset?: number | null
          type: Database["public"]["Enums"]["naesin_evidence_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_offset?: number | null
          id?: string
          note?: string | null
          order_index?: number
          paragraph_label?: string | null
          question_id?: string
          quote?: string | null
          start_offset?: number | null
          type?: Database["public"]["Enums"]["naesin_evidence_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "naesin_reading_evidence_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_reading_passages: {
        Row: {
          created_at: string
          difficulty: Database["public"]["Enums"]["naesin_reading_difficulty"]
          exam_context: Database["public"]["Enums"]["naesin_exam_context"]
          genre: Database["public"]["Enums"]["naesin_passage_genre"]
          grade_band: Database["public"]["Enums"]["naesin_grade_band"]
          grammar_focus: string[]
          id: string
          metadata: Json
          order_index: number
          set_id: string
          source_type: Database["public"]["Enums"]["naesin_reading_source_type"]
          summary: string | null
          tags: string[]
          text: string
          title: string | null
          translation_ko: string | null
          updated_at: string
          vocab_focus: string[]
        }
        Insert: {
          created_at?: string
          difficulty: Database["public"]["Enums"]["naesin_reading_difficulty"]
          exam_context: Database["public"]["Enums"]["naesin_exam_context"]
          genre: Database["public"]["Enums"]["naesin_passage_genre"]
          grade_band: Database["public"]["Enums"]["naesin_grade_band"]
          grammar_focus?: string[]
          id?: string
          metadata?: Json
          order_index: number
          set_id: string
          source_type: Database["public"]["Enums"]["naesin_reading_source_type"]
          summary?: string | null
          tags?: string[]
          text: string
          title?: string | null
          translation_ko?: string | null
          updated_at?: string
          vocab_focus?: string[]
        }
        Update: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["naesin_reading_difficulty"]
          exam_context?: Database["public"]["Enums"]["naesin_exam_context"]
          genre?: Database["public"]["Enums"]["naesin_passage_genre"]
          grade_band?: Database["public"]["Enums"]["naesin_grade_band"]
          grammar_focus?: string[]
          id?: string
          metadata?: Json
          order_index?: number
          set_id?: string
          source_type?: Database["public"]["Enums"]["naesin_reading_source_type"]
          summary?: string | null
          tags?: string[]
          text?: string
          title?: string | null
          translation_ko?: string | null
          updated_at?: string
          vocab_focus?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "naesin_reading_passages_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_reading_questions: {
        Row: {
          answer_key: Json
          created_at: string
          difficulty:
            | Database["public"]["Enums"]["naesin_reading_difficulty"]
            | null
          explanation: string | null
          grammar_tags: string[]
          id: string
          logic_tags: string[]
          metadata: Json
          number_label: string
          order_index: number
          passage_id: string
          prompt_ko: string | null
          score: number
          set_id: string
          skill_tags: string[]
          stem: string
          type: Database["public"]["Enums"]["naesin_question_type"]
          updated_at: string
          vocab_tags: string[]
        }
        Insert: {
          answer_key: Json
          created_at?: string
          difficulty?:
            | Database["public"]["Enums"]["naesin_reading_difficulty"]
            | null
          explanation?: string | null
          grammar_tags?: string[]
          id?: string
          logic_tags?: string[]
          metadata?: Json
          number_label: string
          order_index: number
          passage_id: string
          prompt_ko?: string | null
          score?: number
          set_id: string
          skill_tags?: string[]
          stem: string
          type: Database["public"]["Enums"]["naesin_question_type"]
          updated_at?: string
          vocab_tags?: string[]
        }
        Update: {
          answer_key?: Json
          created_at?: string
          difficulty?:
            | Database["public"]["Enums"]["naesin_reading_difficulty"]
            | null
          explanation?: string | null
          grammar_tags?: string[]
          id?: string
          logic_tags?: string[]
          metadata?: Json
          number_label?: string
          order_index?: number
          passage_id?: string
          prompt_ko?: string | null
          score?: number
          set_id?: string
          skill_tags?: string[]
          stem?: string
          type?: Database["public"]["Enums"]["naesin_question_type"]
          updated_at?: string
          vocab_tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "naesin_reading_questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_passages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_reading_questions_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_reading_review_evidence_logs: {
        Row: {
          created_at: string
          id: string
          matched: boolean
          note: string | null
          passage_id: string
          question_id: string
          selected_evidence: string[]
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched?: boolean
          note?: string | null
          passage_id: string
          question_id: string
          selected_evidence?: string[]
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          matched?: boolean
          note?: string | null
          passage_id?: string
          question_id?: string
          selected_evidence?: string[]
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "naesin_reading_review_evidence_logs_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_passages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_reading_review_evidence_logs_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_reading_review_evidence_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_reading_review_sentence_analysis_logs: {
        Row: {
          complement_text: string | null
          created_at: string
          id: string
          modifier_text: string | null
          note: string | null
          object_text: string | null
          passage_id: string
          question_id: string
          session_id: string
          subject_text: string | null
          target_sentence: string
          translation_ko: string | null
          updated_at: string
          verb_text: string | null
        }
        Insert: {
          complement_text?: string | null
          created_at?: string
          id?: string
          modifier_text?: string | null
          note?: string | null
          object_text?: string | null
          passage_id: string
          question_id: string
          session_id: string
          subject_text?: string | null
          target_sentence: string
          translation_ko?: string | null
          updated_at?: string
          verb_text?: string | null
        }
        Update: {
          complement_text?: string | null
          created_at?: string
          id?: string
          modifier_text?: string | null
          note?: string | null
          object_text?: string | null
          passage_id?: string
          question_id?: string
          session_id?: string
          subject_text?: string | null
          target_sentence?: string
          translation_ko?: string | null
          updated_at?: string
          verb_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "naesin_reading_review_sentence_analysis_logs_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_passages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_reading_review_sentence_analysis_logs_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_reading_review_sentence_analysis_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_reading_review_unknown_word_logs: {
        Row: {
          created_at: string
          id: string
          passage_id: string
          session_id: string
          updated_at: string
          words: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          passage_id: string
          session_id: string
          updated_at?: string
          words?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          passage_id?: string
          session_id?: string
          updated_at?: string
          words?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "naesin_reading_review_unknown_word_logs_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_passages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_reading_review_unknown_word_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_reading_review_vocab_logs: {
        Row: {
          attempt_no: number
          cloze_text: string | null
          created_at: string
          id: string
          is_correct: boolean
          passage_id: string
          prompt_sentence: string | null
          session_id: string
          updated_at: string
          user_answer: string | null
          word: string
        }
        Insert: {
          attempt_no?: number
          cloze_text?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          passage_id: string
          prompt_sentence?: string | null
          session_id: string
          updated_at?: string
          user_answer?: string | null
          word: string
        }
        Update: {
          attempt_no?: number
          cloze_text?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          passage_id?: string
          prompt_sentence?: string | null
          session_id?: string
          updated_at?: string
          user_answer?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "naesin_reading_review_vocab_logs_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_passages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_reading_review_vocab_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_reading_session_analysis_snapshots: {
        Row: {
          accuracy_overall: number | null
          behavior_metrics: Json
          by_passage: Json
          by_question_type: Json
          created_at: string
          evidence_metrics: Json
          prescriptions: string[]
          score_percent: number | null
          sentence_metrics: Json
          session_id: string
          set_id: string
          student_id: string
          updated_at: string
          vocab_metrics: Json
          weak_tags: string[]
        }
        Insert: {
          accuracy_overall?: number | null
          behavior_metrics?: Json
          by_passage?: Json
          by_question_type?: Json
          created_at?: string
          evidence_metrics?: Json
          prescriptions?: string[]
          score_percent?: number | null
          sentence_metrics?: Json
          session_id: string
          set_id: string
          student_id: string
          updated_at?: string
          vocab_metrics?: Json
          weak_tags?: string[]
        }
        Update: {
          accuracy_overall?: number | null
          behavior_metrics?: Json
          by_passage?: Json
          by_question_type?: Json
          created_at?: string
          evidence_metrics?: Json
          prescriptions?: string[]
          score_percent?: number | null
          sentence_metrics?: Json
          session_id?: string
          set_id?: string
          student_id?: string
          updated_at?: string
          vocab_metrics?: Json
          weak_tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "naesin_reading_session_analysis_snapshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "naesin_reading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_reading_session_analysis_snapshots_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_reading_sessions: {
        Row: {
          analytics_snapshot: Json
          assignment_id: string | null
          band_label: string | null
          created_at: string
          id: string
          metadata: Json
          mode: Database["public"]["Enums"]["naesin_session_mode"]
          score_percent: number | null
          score_raw: number | null
          set_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["naesin_session_status"]
          student_id: string
          submitted_at: string | null
          total_elapsed_sec: number | null
          updated_at: string
        }
        Insert: {
          analytics_snapshot?: Json
          assignment_id?: string | null
          band_label?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          mode?: Database["public"]["Enums"]["naesin_session_mode"]
          score_percent?: number | null
          score_raw?: number | null
          set_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["naesin_session_status"]
          student_id: string
          submitted_at?: string | null
          total_elapsed_sec?: number | null
          updated_at?: string
        }
        Update: {
          analytics_snapshot?: Json
          assignment_id?: string | null
          band_label?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          mode?: Database["public"]["Enums"]["naesin_session_mode"]
          score_percent?: number | null
          score_raw?: number | null
          set_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["naesin_session_status"]
          student_id?: string
          submitted_at?: string | null
          total_elapsed_sec?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "naesin_reading_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "student_naesin_reading_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naesin_reading_sessions_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      naesin_reading_sets: {
        Row: {
          book_name: string | null
          created_at: string
          created_by: string | null
          curriculum_id: string | null
          difficulty: Database["public"]["Enums"]["naesin_reading_difficulty"]
          estimated_minutes: number | null
          exam_context: Database["public"]["Enums"]["naesin_exam_context"]
          grade_band: Database["public"]["Enums"]["naesin_grade_band"]
          id: string
          is_published: boolean
          metadata: Json
          school_name: string | null
          semester: string | null
          source_type: Database["public"]["Enums"]["naesin_reading_source_type"]
          subtitle: string | null
          tags: string[]
          title: string
          total_questions: number
          track: string
          unit_range: string | null
          updated_at: string
        }
        Insert: {
          book_name?: string | null
          created_at?: string
          created_by?: string | null
          curriculum_id?: string | null
          difficulty: Database["public"]["Enums"]["naesin_reading_difficulty"]
          estimated_minutes?: number | null
          exam_context: Database["public"]["Enums"]["naesin_exam_context"]
          grade_band: Database["public"]["Enums"]["naesin_grade_band"]
          id?: string
          is_published?: boolean
          metadata?: Json
          school_name?: string | null
          semester?: string | null
          source_type: Database["public"]["Enums"]["naesin_reading_source_type"]
          subtitle?: string | null
          tags?: string[]
          title: string
          total_questions?: number
          track?: string
          unit_range?: string | null
          updated_at?: string
        }
        Update: {
          book_name?: string | null
          created_at?: string
          created_by?: string | null
          curriculum_id?: string | null
          difficulty?: Database["public"]["Enums"]["naesin_reading_difficulty"]
          estimated_minutes?: number | null
          exam_context?: Database["public"]["Enums"]["naesin_exam_context"]
          grade_band?: Database["public"]["Enums"]["naesin_grade_band"]
          id?: string
          is_published?: boolean
          metadata?: Json
          school_name?: string | null
          semester?: string | null
          source_type?: Database["public"]["Enums"]["naesin_reading_source_type"]
          subtitle?: string | null
          tags?: string[]
          title?: string
          total_questions?: number
          track?: string
          unit_range?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      naesin_reading_student_tendency_snapshots: {
        Row: {
          basis_session_ids: string[]
          created_at: string
          id: string
          prescription_tags: string[]
          student_id: string
          top_patterns: Json
          updated_at: string
          weak_tags: string[]
          window_size: number
        }
        Insert: {
          basis_session_ids?: string[]
          created_at?: string
          id?: string
          prescription_tags?: string[]
          student_id: string
          top_patterns?: Json
          updated_at?: string
          weak_tags?: string[]
          window_size: number
        }
        Update: {
          basis_session_ids?: string[]
          created_at?: string
          id?: string
          prescription_tags?: string[]
          student_id?: string
          top_patterns?: Json
          updated_at?: string
          weak_tags?: string[]
          window_size?: number
        }
        Relationships: []
      }
      naesin_sessions: {
        Row: {
          assignment_id: string | null
          id: string
          logs: Json
          passage_id: string
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          id?: string
          logs?: Json
          passage_id: string
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          id?: string
          logs?: Json
          passage_id?: string
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "naesin_sessions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "naesin_passages"
            referencedColumns: ["id"]
          },
        ]
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
      passage_grammar_targets: {
        Row: {
          authoring_mode: string | null
          created_at: string
          detection_mode: string
          explanation_override: string | null
          grammar_unit_id: string
          id: string
          is_primary: boolean
          label_axes_payload: Json
          note: string | null
          option_payload: Json
          passage_id: string
          sentence_id: string | null
          status: string
          updated_at: string
          wrong_reason_notes: string[]
        }
        Insert: {
          authoring_mode?: string | null
          created_at?: string
          detection_mode: string
          explanation_override?: string | null
          grammar_unit_id: string
          id?: string
          is_primary?: boolean
          label_axes_payload?: Json
          note?: string | null
          option_payload?: Json
          passage_id: string
          sentence_id?: string | null
          status: string
          updated_at?: string
          wrong_reason_notes?: string[]
        }
        Update: {
          authoring_mode?: string | null
          created_at?: string
          detection_mode?: string
          explanation_override?: string | null
          grammar_unit_id?: string
          id?: string
          is_primary?: boolean
          label_axes_payload?: Json
          note?: string | null
          option_payload?: Json
          passage_id?: string
          sentence_id?: string | null
          status?: string
          updated_at?: string
          wrong_reason_notes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "passage_grammar_targets_grammar_unit_id_fkey"
            columns: ["grammar_unit_id"]
            isOneToOne: false
            referencedRelation: "grammar_unit_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passage_grammar_targets_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "naesin_passages"
            referencedColumns: ["id"]
          },
        ]
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
      perk_catalog: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          metadata: Json | null
          name: string
          perk_type: string
          point_cost: number
          stock: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json | null
          name: string
          perk_type: string
          point_cost: number
          stock?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json | null
          name?: string
          perk_type?: string
          point_cost?: number
          stock?: number | null
        }
        Relationships: []
      }
      perk_redemptions: {
        Row: {
          admin_note: string | null
          id: string
          perk_id: string
          points_spent: number
          requested_at: string
          resolved_at: string | null
          status: string
          student_id: string
        }
        Insert: {
          admin_note?: string | null
          id?: string
          perk_id: string
          points_spent: number
          requested_at?: string
          resolved_at?: string | null
          status?: string
          student_id: string
        }
        Update: {
          admin_note?: string | null
          id?: string
          perk_id?: string
          points_spent?: number
          requested_at?: string
          resolved_at?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perk_redemptions_perk_id_fkey"
            columns: ["perk_id"]
            isOneToOne: false
            referencedRelation: "perk_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_homework: {
        Row: {
          answer_key_data: Json | null
          answer_key_url: string | null
          book_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          is_active: boolean
          plan_id: string | null
          repeat_number: number
          student_id: string | null
          subject: string | null
          title: string
          unit_index: number | null
          updated_at: string
        }
        Insert: {
          answer_key_data?: Json | null
          answer_key_url?: string | null
          book_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string | null
          repeat_number?: number
          student_id?: string | null
          subject?: string | null
          title: string
          unit_index?: number | null
          updated_at?: string
        }
        Update: {
          answer_key_data?: Json | null
          answer_key_url?: string | null
          book_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string | null
          repeat_number?: number
          student_id?: string | null
          subject?: string | null
          title?: string
          unit_index?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_homework_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "homework_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_homework_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_homework_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "student_homework_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_homework_submissions: {
        Row: {
          ai_results: Json | null
          correct_count: number | null
          created_at: string
          graded_at: string | null
          homework_id: string
          id: string
          photo_url: string | null
          student_id: string
          total_count: number | null
        }
        Insert: {
          ai_results?: Json | null
          correct_count?: number | null
          created_at?: string
          graded_at?: string | null
          homework_id: string
          id?: string
          photo_url?: string | null
          student_id: string
          total_count?: number | null
        }
        Update: {
          ai_results?: Json | null
          correct_count?: number | null
          created_at?: string
          graded_at?: string | null
          homework_id?: string
          id?: string
          photo_url?: string | null
          student_id?: string
          total_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "photo_homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_homework_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      point_rules: {
        Row: {
          base_points: number
          category: string
          description: string | null
          first_try_bonus: number
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          base_points?: number
          category: string
          description?: string | null
          first_try_bonus?: number
          id: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          base_points?: number
          category?: string
          description?: string | null
          first_try_bonus?: number
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
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
      problem_bank_academic_passage_2026: {
        Row: {
          created_at: string | null
          created_by: string | null
          difficulty: string
          id: string
          passage_html: string
          questions: Json
          source_test_id: string | null
          title: string
          topic: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          difficulty: string
          id?: string
          passage_html: string
          questions: Json
          source_test_id?: string | null
          title: string
          topic: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          difficulty?: string
          id?: string
          passage_html?: string
          questions?: Json
          source_test_id?: string | null
          title?: string
          topic?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      problem_bank_complete_words_2026: {
        Row: {
          blanks: Json
          created_at: string | null
          created_by: string | null
          difficulty: string
          id: string
          paragraph_html: string
          source_test_id: string | null
          topic: string
          updated_at: string | null
        }
        Insert: {
          blanks: Json
          created_at?: string | null
          created_by?: string | null
          difficulty: string
          id?: string
          paragraph_html: string
          source_test_id?: string | null
          topic: string
          updated_at?: string | null
        }
        Update: {
          blanks?: Json
          created_at?: string | null
          created_by?: string | null
          difficulty?: string
          id?: string
          paragraph_html?: string
          source_test_id?: string | null
          topic?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      problem_bank_daily_life_2026: {
        Row: {
          content_html: string
          context_type: string
          created_at: string | null
          created_by: string | null
          difficulty: string
          id: string
          questions: Json
          source_test_id: string | null
          topic: string
          updated_at: string | null
        }
        Insert: {
          content_html: string
          context_type: string
          created_at?: string | null
          created_by?: string | null
          difficulty: string
          id?: string
          questions: Json
          source_test_id?: string | null
          topic: string
          updated_at?: string | null
        }
        Update: {
          content_html?: string
          context_type?: string
          created_at?: string | null
          created_by?: string | null
          difficulty?: string
          id?: string
          questions?: Json
          source_test_id?: string | null
          topic?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      problem_topic_tracker_2026: {
        Row: {
          available_after_date: string | null
          created_at: string | null
          id: string
          last_solved_date: string | null
          problem_type: string
          solve_count: number | null
          student_id: string
          topic: string
          updated_at: string | null
        }
        Insert: {
          available_after_date?: string | null
          created_at?: string | null
          id?: string
          last_solved_date?: string | null
          problem_type: string
          solve_count?: number | null
          student_id: string
          topic: string
          updated_at?: string | null
        }
        Update: {
          available_after_date?: string | null
          created_at?: string | null
          id?: string
          last_solved_date?: string | null
          problem_type?: string
          solve_count?: number | null
          student_id?: string
          topic?: string
          updated_at?: string | null
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
          program: string | null
          role: string | null
          tribe: string | null
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
          program?: string | null
          role?: string | null
          tribe?: string | null
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
          program?: string | null
          role?: string | null
          tribe?: string | null
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
          choice_ids: string[] | null
          created_at: string | null
          elapsed_ms: number | null
          passage_id: string | null
          question_id: string
          session_id: string
        }
        Insert: {
          choice_id?: string | null
          choice_ids?: string[] | null
          created_at?: string | null
          elapsed_ms?: number | null
          passage_id?: string | null
          question_id: string
          session_id: string
        }
        Update: {
          choice_id?: string | null
          choice_ids?: string[] | null
          created_at?: string | null
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
      reading_attempt_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_choice: Database["public"]["Enums"]["reading_choice"] | null
          time_spent_ms: number | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_choice?: Database["public"]["Enums"]["reading_choice"] | null
          time_spent_ms?: number | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_choice?: Database["public"]["Enums"]["reading_choice"] | null
          time_spent_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "reading_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "reading_questions"
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
      reading_module_defs: {
        Row: {
          academic_count: number
          branch: Database["public"]["Enums"]["reading_branch"]
          created_at: string
          ctw_count: number
          daily_count: number
          id: string
          module_no: number
          test_id: string
        }
        Insert: {
          academic_count?: number
          branch: Database["public"]["Enums"]["reading_branch"]
          created_at?: string
          ctw_count?: number
          daily_count?: number
          id?: string
          module_no: number
          test_id: string
        }
        Update: {
          academic_count?: number
          branch?: Database["public"]["Enums"]["reading_branch"]
          created_at?: string
          ctw_count?: number
          daily_count?: number
          id?: string
          module_no?: number
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_module_defs_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "reading_test_defs"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_module_items: {
        Row: {
          id: string
          module_id: string
          position: number
          question_id: string
        }
        Insert: {
          id?: string
          module_id: string
          position: number
          question_id: string
        }
        Update: {
          id?: string
          module_id?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_module_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "reading_module_defs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_module_items_question_id_fkey"
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
      reading_question_explanations: {
        Row: {
          correct_choice_explanation: string | null
          created_at: string | null
          evidence_interpretation: string | null
          id: string
          incorrect_choices: Json | null
          key_point_distractors: Json
          key_point_summary: string | null
          question_id: string
          question_interpretation: string | null
          test_id: string
          updated_at: string | null
          vocabulary_notes: Json | null
        }
        Insert: {
          correct_choice_explanation?: string | null
          created_at?: string | null
          evidence_interpretation?: string | null
          id?: string
          incorrect_choices?: Json | null
          key_point_distractors?: Json
          key_point_summary?: string | null
          question_id: string
          question_interpretation?: string | null
          test_id: string
          updated_at?: string | null
          vocabulary_notes?: Json | null
        }
        Update: {
          correct_choice_explanation?: string | null
          created_at?: string | null
          evidence_interpretation?: string | null
          id?: string
          incorrect_choices?: Json | null
          key_point_distractors?: Json
          key_point_summary?: string | null
          question_id?: string
          question_interpretation?: string | null
          test_id?: string
          updated_at?: string | null
          vocabulary_notes?: Json | null
        }
        Relationships: []
      }
      reading_question_meta: {
        Row: {
          glossary: Json | null
          question_id: string
          target_span: Json | null
        }
        Insert: {
          glossary?: Json | null
          question_id: string
          target_span?: Json | null
        }
        Update: {
          glossary?: Json | null
          question_id?: string
          target_span?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_question_meta_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "reading_questions"
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
          assignment_id: string | null
          created_at: string
          finished_at: string
          id: number
          is_adaptive: boolean | null
          review_attempts: Json | null
          stage2_difficulty: string | null
          test_id: string
          total_questions: number
          user_id: string | null
        }
        Insert: {
          answers: Json
          assignment_id?: string | null
          created_at?: string
          finished_at?: string
          id?: number
          is_adaptive?: boolean | null
          review_attempts?: Json | null
          stage2_difficulty?: string | null
          test_id: string
          total_questions: number
          user_id?: string | null
        }
        Update: {
          answers?: Json
          assignment_id?: string | null
          created_at?: string
          finished_at?: string
          id?: number
          is_adaptive?: boolean | null
          review_attempts?: Json | null
          stage2_difficulty?: string | null
          test_id?: string
          total_questions?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_results_2026_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "test_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_results_2026_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "reading_tests_2026"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_session_answers: {
        Row: {
          choice_id: string
          created_at: string
          elapsed_ms: number | null
          id: number
          question_id: string
          session_id: string
        }
        Insert: {
          choice_id: string
          created_at?: string
          elapsed_ms?: number | null
          id?: number
          question_id: string
          session_id: string
        }
        Update: {
          choice_id?: string
          created_at?: string
          elapsed_ms?: number | null
          id?: number
          question_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_session_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "reading_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_session_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reading_sessions"
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
          product: string | null
          profile_id: string | null
          set_id: string | null
          started_at: string | null
          track: string | null
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
          product?: string | null
          profile_id?: string | null
          set_id?: string | null
          started_at?: string | null
          track?: string | null
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
          product?: string | null
          profile_id?: string | null
          set_id?: string | null
          started_at?: string | null
          track?: string | null
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
      reading_test_defs: {
        Row: {
          created_at: string
          id: string
          is_mst: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_mst?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_mst?: boolean
          name?: string
        }
        Relationships: []
      }
      reading_tests: {
        Row: {
          created_at: string
          description: string | null
          exam_era: string | null
          id: string
          is_locked: boolean | null
          label: string
          payload: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exam_era?: string | null
          id?: string
          is_locked?: boolean | null
          label: string
          payload?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exam_era?: string | null
          id?: string
          is_locked?: boolean | null
          label?: string
          payload?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reading_tests_2026: {
        Row: {
          created_at: string | null
          exam_era: string | null
          id: string
          is_locked: boolean
          label: string
          payload: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exam_era?: string | null
          id: string
          is_locked?: boolean
          label: string
          payload: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exam_era?: string | null
          id?: string
          is_locked?: boolean
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
      school_exam_periods: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          exam_type: string
          id: string
          note: string | null
          prep_start_date: string
          school_id: string
          semester: number
          start_date: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          exam_type: string
          id?: string
          note?: string | null
          prep_start_date: string
          school_id: string
          semester: number
          start_date: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          exam_type?: string
          id?: string
          note?: string | null
          prep_start_date?: string
          school_id?: string
          semester?: number
          start_date?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_exam_periods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
          ai_delivery_score: number | null
          ai_feedback: string | null
          ai_graded_at: string | null
          ai_language_score: number | null
          ai_topic_score: number | null
          ai_total_score: number | null
          approx_sentences: number | null
          approx_words: number | null
          audio_url: string | null
          content_score: number | null
          created_at: string
          final_delivery_score: number | null
          final_feedback: string | null
          final_language_score: number | null
          final_topic_score: number | null
          final_total_score: number | null
          fluency_score: number | null
          graded_at: string | null
          graded_by: string | null
          grading_status: string
          id: string
          language_score: number | null
          meta: Json | null
          mode: string | null
          prompt: string | null
          pronunciation_score: number | null
          review_attempts: Json | null
          script: string
          task_id: string
          test_id: string
          user_id: string | null
        }
        Insert: {
          ai_delivery_score?: number | null
          ai_feedback?: string | null
          ai_graded_at?: string | null
          ai_language_score?: number | null
          ai_topic_score?: number | null
          ai_total_score?: number | null
          approx_sentences?: number | null
          approx_words?: number | null
          audio_url?: string | null
          content_score?: number | null
          created_at?: string
          final_delivery_score?: number | null
          final_feedback?: string | null
          final_language_score?: number | null
          final_topic_score?: number | null
          final_total_score?: number | null
          fluency_score?: number | null
          graded_at?: string | null
          graded_by?: string | null
          grading_status?: string
          id?: string
          language_score?: number | null
          meta?: Json | null
          mode?: string | null
          prompt?: string | null
          pronunciation_score?: number | null
          review_attempts?: Json | null
          script: string
          task_id: string
          test_id: string
          user_id?: string | null
        }
        Update: {
          ai_delivery_score?: number | null
          ai_feedback?: string | null
          ai_graded_at?: string | null
          ai_language_score?: number | null
          ai_topic_score?: number | null
          ai_total_score?: number | null
          approx_sentences?: number | null
          approx_words?: number | null
          audio_url?: string | null
          content_score?: number | null
          created_at?: string
          final_delivery_score?: number | null
          final_feedback?: string | null
          final_language_score?: number | null
          final_topic_score?: number | null
          final_total_score?: number | null
          fluency_score?: number | null
          graded_at?: string | null
          graded_by?: string | null
          grading_status?: string
          id?: string
          language_score?: number | null
          meta?: Json | null
          mode?: string | null
          prompt?: string | null
          pronunciation_score?: number | null
          review_attempts?: Json | null
          script?: string
          task_id?: string
          test_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      speaking_rounds: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          round_number: number
          speaking_test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          round_number: number
          speaking_test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          round_number?: number
          speaking_test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaking_rounds_speaking_test_id_fkey"
            columns: ["speaking_test_id"]
            isOneToOne: false
            referencedRelation: "speaking_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_test_responses: {
        Row: {
          audio_urls: Json
          feedback: string | null
          id: string
          scored_at: string | null
          scores: Json | null
          status: string
          student_id: string
          submitted_at: string
          test_id: string
        }
        Insert: {
          audio_urls?: Json
          feedback?: string | null
          id?: string
          scored_at?: string | null
          scores?: Json | null
          status?: string
          student_id: string
          submitted_at?: string
          test_id: string
        }
        Update: {
          audio_urls?: Json
          feedback?: string | null
          id?: string
          scored_at?: string | null
          scores?: Json | null
          status?: string
          student_id?: string
          submitted_at?: string
          test_id?: string
        }
        Relationships: []
      }
      speaking_tests: {
        Row: {
          created_at: string
          exam_era: string
          id: string
          is_active: boolean
          is_locked: boolean
          label: string
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_era?: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          label?: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_era?: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          label?: string
          payload?: Json
          updated_at?: string
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
      student_activities: {
        Row: {
          accuracy: number | null
          activity_type: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          meta: Json
          score: number | null
          section: string | null
          source_id: string | null
          source_table: string | null
          started_at: string | null
          status: string
          student_id: string
          title: string | null
          track: string
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          activity_type: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          meta?: Json
          score?: number | null
          section?: string | null
          source_id?: string | null
          source_table?: string | null
          started_at?: string | null
          status?: string
          student_id: string
          title?: string | null
          track: string
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          meta?: Json
          score?: number | null
          section?: string | null
          source_id?: string | null
          source_table?: string | null
          started_at?: string | null
          status?: string
          student_id?: string
          title?: string | null
          track?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_activity_weak_tags: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          meta: Json
          severity: string | null
          source: string | null
          student_id: string
          weak_tag: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          meta?: Json
          severity?: string | null
          source?: string | null
          student_id: string
          weak_tag: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          meta?: Json
          severity?: string | null
          source?: string | null
          student_id?: string
          weak_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_activity_weak_tags_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "student_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      student_avatars: {
        Row: {
          active_theme_id: string | null
          equipped_items: Json
          evolution_stage: number
          student_id: string
          updated_at: string
        }
        Insert: {
          active_theme_id?: string | null
          equipped_items?: Json
          evolution_stage?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          active_theme_id?: string | null
          equipped_items?: Json
          evolution_stage?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_avatars_active_theme_id_fkey"
            columns: ["active_theme_id"]
            isOneToOne: false
            referencedRelation: "perk_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      student_day_blocks: {
        Row: {
          assessment_done: boolean
          block_date: string
          concept_done: boolean
          created_at: string
          created_by: string | null
          done: boolean
          done_at: string | null
          end_time: string | null
          exam_id: string | null
          id: string
          kind: string
          note: string | null
          practice_done: boolean
          source: string
          start_time: string | null
          student_id: string
          subject: string | null
          title: string
          updated_at: string
          weakness_note: string | null
          zone: string
        }
        Insert: {
          assessment_done?: boolean
          block_date: string
          concept_done?: boolean
          created_at?: string
          created_by?: string | null
          done?: boolean
          done_at?: string | null
          end_time?: string | null
          exam_id?: string | null
          id?: string
          kind: string
          note?: string | null
          practice_done?: boolean
          source?: string
          start_time?: string | null
          student_id: string
          subject?: string | null
          title: string
          updated_at?: string
          weakness_note?: string | null
          zone: string
        }
        Update: {
          assessment_done?: boolean
          block_date?: string
          concept_done?: boolean
          created_at?: string
          created_by?: string | null
          done?: boolean
          done_at?: string | null
          end_time?: string | null
          exam_id?: string | null
          id?: string
          kind?: string
          note?: string | null
          practice_done?: boolean
          source?: string
          start_time?: string | null
          student_id?: string
          subject?: string | null
          title?: string
          updated_at?: string
          weakness_note?: string | null
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_day_blocks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "student_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_day_blocks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_exams: {
        Row: {
          assigned_by: string | null
          created_at: string
          created_by: string | null
          end_date: string
          exam_type: string
          id: string
          prep_start_date: string
          preset_key: string | null
          source: string
          source_id: string | null
          start_date: string
          student_id: string
          subjects: string[]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          exam_type: string
          id?: string
          prep_start_date: string
          preset_key?: string | null
          source?: string
          source_id?: string | null
          start_date: string
          student_id: string
          subjects?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          exam_type?: string
          id?: string
          prep_start_date?: string
          preset_key?: string | null
          source?: string
          source_id?: string | null
          start_date?: string
          student_id?: string
          subjects?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_exams_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_gamification: {
        Row: {
          current_streak: number
          last_activity_date: string | null
          level: number
          longest_streak: number
          student_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          current_streak?: number
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          student_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          current_streak?: number
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          student_id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_homework_plans: {
        Row: {
          book_id: string
          created_at: string
          created_by: string | null
          current_repeat_number: number
          cursor_unit_index: number
          id: string
          is_enabled: boolean
          is_paused: boolean
          paused_reason: string | null
          start_date: string
          student_id: string
          target_repeat_count: number
          units_per_session: number
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          book_id: string
          created_at?: string
          created_by?: string | null
          current_repeat_number?: number
          cursor_unit_index?: number
          id?: string
          is_enabled?: boolean
          is_paused?: boolean
          paused_reason?: string | null
          start_date: string
          student_id: string
          target_repeat_count?: number
          units_per_session?: number
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          book_id?: string
          created_at?: string
          created_by?: string | null
          current_repeat_number?: number
          cursor_unit_index?: number
          id?: string
          is_enabled?: boolean
          is_paused?: boolean
          paused_reason?: string | null
          start_date?: string
          student_id?: string
          target_repeat_count?: number
          units_per_session?: number
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "student_homework_plans_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "homework_books"
            referencedColumns: ["id"]
          },
        ]
      }
      student_lesson_logs: {
        Row: {
          created_at: string
          end_time: string | null
          homework_note: string | null
          id: string
          lesson_date: string
          log_note: string | null
          plan_note: string | null
          start_time: string | null
          status: string
          student_id: string
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          homework_note?: string | null
          id?: string
          lesson_date: string
          log_note?: string | null
          plan_note?: string | null
          start_time?: string | null
          status?: string
          student_id: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          homework_note?: string | null
          id?: string
          lesson_date?: string
          log_note?: string | null
          plan_note?: string | null
          start_time?: string | null
          status?: string
          student_id?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_lesson_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_naesin_reading_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          due_at: string | null
          id: string
          metadata: Json
          mode: Database["public"]["Enums"]["naesin_session_mode"]
          note: string | null
          set_id: string
          status: Database["public"]["Enums"]["naesin_session_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          metadata?: Json
          mode?: Database["public"]["Enums"]["naesin_session_mode"]
          note?: string | null
          set_id: string
          status?: Database["public"]["Enums"]["naesin_session_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          metadata?: Json
          mode?: Database["public"]["Enums"]["naesin_session_mode"]
          note?: string | null
          set_id?: string
          status?: Database["public"]["Enums"]["naesin_session_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_naesin_reading_assignments_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "naesin_reading_sets"
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
      student_parent_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          parent_id: string
          relation: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          parent_id: string
          relation?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          parent_id?: string
          relation?: string | null
          student_id?: string
        }
        Relationships: []
      }
      student_point_ledger: {
        Row: {
          bonus_points: number
          earned_at: string
          id: number
          metadata: Json | null
          points: number
          rule_id: string
          source_ref: string | null
          student_id: string
        }
        Insert: {
          bonus_points?: number
          earned_at?: string
          id?: number
          metadata?: Json | null
          points: number
          rule_id: string
          source_ref?: string | null
          student_id: string
        }
        Update: {
          bonus_points?: number
          earned_at?: string
          id?: number
          metadata?: Json | null
          points?: number
          rule_id?: string
          source_ref?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_point_ledger_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "point_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      student_prescriptions: {
        Row: {
          activity_id: string | null
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          payload: Json
          prescription_type: string
          status: string
          student_id: string
          title: string | null
          updated_at: string
          weak_tag: string
        }
        Insert: {
          activity_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          payload?: Json
          prescription_type: string
          status?: string
          student_id: string
          title?: string | null
          updated_at?: string
          weak_tag: string
        }
        Update: {
          activity_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          payload?: Json
          prescription_type?: string
          status?: string
          student_id?: string
          title?: string | null
          updated_at?: string
          weak_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_prescriptions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "student_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      student_problem_history_2026: {
        Row: {
          assignment_id: string | null
          completed_at: string
          created_at: string | null
          daily_task_id: string | null
          id: string
          is_correct: boolean | null
          problem_id: string
          problem_type: string
          score: number | null
          student_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          assignment_id?: string | null
          completed_at: string
          created_at?: string | null
          daily_task_id?: string | null
          id?: string
          is_correct?: boolean | null
          problem_id: string
          problem_type: string
          score?: number | null
          student_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          assignment_id?: string | null
          completed_at?: string
          created_at?: string | null
          daily_task_id?: string | null
          id?: string
          is_correct?: boolean | null
          problem_id?: string
          problem_type?: string
          score?: number | null
          student_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          book_id: string
          chapter_id: string
          completed_at: string | null
          created_at: string | null
          member_id: string
          progress_id: number
        }
        Insert: {
          book_id: string
          chapter_id: string
          completed_at?: string | null
          created_at?: string | null
          member_id: string
          progress_id?: number
        }
        Update: {
          book_id?: string
          chapter_id?: string
          completed_at?: string | null
          created_at?: string | null
          member_id?: string
          progress_id?: number
        }
        Relationships: []
      }
      student_readiness: {
        Row: {
          check_status: string
          created_at: string
          element: string
          id: string
          perform_status: string
          student_id: string
          sub_element: string
          test_score: number | null
          test_status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          check_status?: string
          created_at?: string
          element: string
          id?: string
          perform_status?: string
          student_id: string
          sub_element: string
          test_score?: number | null
          test_status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          check_status?: string
          created_at?: string
          element?: string
          id?: string
          perform_status?: string
          student_id?: string
          sub_element?: string
          test_score?: number | null
          test_status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_readiness_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "middle_naesin_units"
            referencedColumns: ["id"]
          },
        ]
      }
      student_routine_slots: {
        Row: {
          active_from: string | null
          active_to: string | null
          created_at: string
          end_time: string
          id: string
          kind: string
          label: string | null
          start_time: string
          student_id: string
          updated_at: string
          weekday: number
          zone: string
        }
        Insert: {
          active_from?: string | null
          active_to?: string | null
          created_at?: string
          end_time: string
          id?: string
          kind: string
          label?: string | null
          start_time: string
          student_id: string
          updated_at?: string
          weekday: number
          zone: string
        }
        Update: {
          active_from?: string | null
          active_to?: string | null
          created_at?: string
          end_time?: string
          id?: string
          kind?: string
          label?: string | null
          start_time?: string
          student_id?: string
          updated_at?: string
          weekday?: number
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_routine_slots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_schedule_events: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          event_type: string
          id: string
          is_applied: boolean | null
          reason: string | null
          start_date: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          event_type: string
          id?: string
          is_applied?: boolean | null
          reason?: string | null
          start_date: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          event_type?: string
          id?: string
          is_applied?: boolean | null
          reason?: string | null
          start_date?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_schedule_events_student_id_fkey"
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
          session_state: Json | null
          set_id: string
          stage: number
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
          session_state?: Json | null
          set_id: string
          stage?: number
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
          session_state?: Json | null
          set_id?: string
          stage?: number
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
          direction: string | null
          id: string
          is_active: boolean
          is_enabled: boolean | null
          is_paused: boolean
          learning_option: number | null
          max_active_sets: number
          paused_reason: string | null
          queue_size: number
          sets_per_day: number
          speed_mode: string | null
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
          direction?: string | null
          id?: string
          is_active?: boolean
          is_enabled?: boolean | null
          is_paused?: boolean
          learning_option?: number | null
          max_active_sets?: number
          paused_reason?: string | null
          queue_size?: number
          sets_per_day?: number
          speed_mode?: string | null
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
          direction?: string | null
          id?: string
          is_active?: boolean
          is_enabled?: boolean | null
          is_paused?: boolean
          learning_option?: number | null
          max_active_sets?: number
          paused_reason?: string | null
          queue_size?: number
          sets_per_day?: number
          speed_mode?: string | null
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
      teacher_tasks: {
        Row: {
          category: string
          created_at: string
          due_at: string | null
          due_display: string | null
          id: string
          label: string
          status: string
          student_name: string | null
          teacher_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          due_at?: string | null
          due_display?: string | null
          id?: string
          label: string
          status?: string
          student_name?: string | null
          teacher_id: string
        }
        Update: {
          category?: string
          created_at?: string
          due_at?: string | null
          due_display?: string | null
          id?: string
          label?: string
          status?: string
          student_name?: string | null
          teacher_id?: string
        }
        Relationships: []
      }
      teacher_warnings: {
        Row: {
          created_at: string
          id: string
          issued_at: string
          notes: string | null
          reason: string
          resolved_at: string | null
          severity: string | null
          status: string | null
          student_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issued_at?: string
          notes?: string | null
          reason: string
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          student_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issued_at?: string
          notes?: string | null
          reason?: string
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          student_id?: string
          teacher_id?: string
        }
        Relationships: []
      }
      test_assignment_groups: {
        Row: {
          assigned_by: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          kind: string
          started_at: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          kind: string
          started_at?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          kind?: string
          started_at?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          completed_at: string | null
          created_at: string
          due_at: string | null
          due_date: string | null
          expires_at: string | null
          group_id: string | null
          group_sequence: number | null
          id: string
          kind: string | null
          listening_test_id: string | null
          reading_test_id: string | null
          results_payload: Json | null
          score: number | null
          sections: string[] | null
          speaking_round_id: string | null
          speaking_test_id: string | null
          started_at: string | null
          status: string
          student_id: string
          submitted_at: string | null
          teacher_id: string | null
          template_id: string | null
          updated_at: string | null
          writing_test_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          due_date?: string | null
          expires_at?: string | null
          group_id?: string | null
          group_sequence?: number | null
          id?: string
          kind?: string | null
          listening_test_id?: string | null
          reading_test_id?: string | null
          results_payload?: Json | null
          score?: number | null
          sections?: string[] | null
          speaking_round_id?: string | null
          speaking_test_id?: string | null
          started_at?: string | null
          status?: string
          student_id: string
          submitted_at?: string | null
          teacher_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          writing_test_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          due_date?: string | null
          expires_at?: string | null
          group_id?: string | null
          group_sequence?: number | null
          id?: string
          kind?: string | null
          listening_test_id?: string | null
          reading_test_id?: string | null
          results_payload?: Json | null
          score?: number | null
          sections?: string[] | null
          speaking_round_id?: string | null
          speaking_test_id?: string | null
          started_at?: string | null
          status?: string
          student_id?: string
          submitted_at?: string | null
          teacher_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          writing_test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "test_assignment_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_listening_test_id_fkey"
            columns: ["listening_test_id"]
            isOneToOne: false
            referencedRelation: "listening_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_reading_test_id_fkey"
            columns: ["reading_test_id"]
            isOneToOne: false
            referencedRelation: "reading_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_speaking_round_id_fkey"
            columns: ["speaking_round_id"]
            isOneToOne: false
            referencedRelation: "speaking_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_speaking_test_id_fkey"
            columns: ["speaking_test_id"]
            isOneToOne: false
            referencedRelation: "speaking_tests"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "test_assignments_writing_test_id_fkey"
            columns: ["writing_test_id"]
            isOneToOne: false
            referencedRelation: "writing_tests"
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
      textbook_lesson_grammar_map: {
        Row: {
          created_at: string
          grade: string
          grammar_unit_id: string
          id: string
          is_core: boolean
          lesson_no: string
          lesson_title: string | null
          note: string | null
          priority: number
          semester: string
          textbook_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade: string
          grammar_unit_id: string
          id?: string
          is_core?: boolean
          lesson_no: string
          lesson_title?: string | null
          note?: string | null
          priority?: number
          semester: string
          textbook_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string
          grammar_unit_id?: string
          id?: string
          is_core?: boolean
          lesson_no?: string
          lesson_title?: string | null
          note?: string | null
          priority?: number
          semester?: string
          textbook_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "textbook_lesson_grammar_map_grammar_unit_id_fkey"
            columns: ["grammar_unit_id"]
            isOneToOne: false
            referencedRelation: "grammar_unit_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      toefl_chapter_content: {
        Row: {
          chapter_id: string
          content_ref_id: string | null
          content_ref_table: string | null
          content_type: Database["public"]["Enums"]["toefl_content_type"]
          created_at: string | null
          id: string
          level: Database["public"]["Enums"]["toefl_level"]
          notes: string | null
          order_num: number
          title: string | null
        }
        Insert: {
          chapter_id: string
          content_ref_id?: string | null
          content_ref_table?: string | null
          content_type: Database["public"]["Enums"]["toefl_content_type"]
          created_at?: string | null
          id?: string
          level: Database["public"]["Enums"]["toefl_level"]
          notes?: string | null
          order_num?: number
          title?: string | null
        }
        Update: {
          chapter_id?: string
          content_ref_id?: string | null
          content_ref_table?: string | null
          content_type?: Database["public"]["Enums"]["toefl_content_type"]
          created_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["toefl_level"]
          notes?: string | null
          order_num?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toefl_chapter_content_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "toefl_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      toefl_chapters: {
        Row: {
          created_at: string | null
          description: string | null
          focus_type: string | null
          id: string
          order_num: number
          skill: Database["public"]["Enums"]["toefl_skill"]
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          focus_type?: string | null
          id?: string
          order_num: number
          skill: Database["public"]["Enums"]["toefl_skill"]
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          focus_type?: string | null
          id?: string
          order_num?: number
          skill?: Database["public"]["Enums"]["toefl_skill"]
          title?: string
        }
        Relationships: []
      }
      toefl_level_results: {
        Row: {
          id: string
          level: Database["public"]["Enums"]["toefl_level"]
          passed: boolean
          score: number | null
          skill: Database["public"]["Enums"]["toefl_skill"]
          student_id: string
          tested_at: string | null
        }
        Insert: {
          id?: string
          level: Database["public"]["Enums"]["toefl_level"]
          passed?: boolean
          score?: number | null
          skill: Database["public"]["Enums"]["toefl_skill"]
          student_id: string
          tested_at?: string | null
        }
        Update: {
          id?: string
          level?: Database["public"]["Enums"]["toefl_level"]
          passed?: boolean
          score?: number | null
          skill?: Database["public"]["Enums"]["toefl_skill"]
          student_id?: string
          tested_at?: string | null
        }
        Relationships: []
      }
      toefl_student_level: {
        Row: {
          current_level: Database["public"]["Enums"]["toefl_level"]
          mode: Database["public"]["Enums"]["toefl_student_mode"]
          skill: Database["public"]["Enums"]["toefl_skill"]
          student_id: string
          updated_at: string | null
        }
        Insert: {
          current_level?: Database["public"]["Enums"]["toefl_level"]
          mode?: Database["public"]["Enums"]["toefl_student_mode"]
          skill: Database["public"]["Enums"]["toefl_skill"]
          student_id: string
          updated_at?: string | null
        }
        Update: {
          current_level?: Database["public"]["Enums"]["toefl_level"]
          mode?: Database["public"]["Enums"]["toefl_student_mode"]
          skill?: Database["public"]["Enums"]["toefl_skill"]
          student_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      toefl_student_progress: {
        Row: {
          chapter_id: string
          completed_at: string | null
          drill_done: boolean
          lecture_done: boolean
          level: Database["public"]["Enums"]["toefl_level"]
          practice_done: boolean
          review_done: boolean
          student_id: string
          test_done: boolean
          updated_at: string | null
        }
        Insert: {
          chapter_id: string
          completed_at?: string | null
          drill_done?: boolean
          lecture_done?: boolean
          level: Database["public"]["Enums"]["toefl_level"]
          practice_done?: boolean
          review_done?: boolean
          student_id: string
          test_done?: boolean
          updated_at?: string | null
        }
        Update: {
          chapter_id?: string
          completed_at?: string | null
          drill_done?: boolean
          lecture_done?: boolean
          level?: Database["public"]["Enums"]["toefl_level"]
          practice_done?: boolean
          review_done?: boolean
          student_id?: string
          test_done?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toefl_student_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "toefl_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_practice_attempts: {
        Row: {
          accuracy: number
          content_id: string | null
          content_ref: string | null
          content_source: string
          created_at: string
          duration_sec: number
          error_count: number
          id: string
          reveal_mode: string
          shuffled: boolean
          strict: boolean
          student_id: string
          weak_words: string[]
          wpm: number
        }
        Insert: {
          accuracy?: number
          content_id?: string | null
          content_ref?: string | null
          content_source: string
          created_at?: string
          duration_sec?: number
          error_count?: number
          id?: string
          reveal_mode: string
          shuffled?: boolean
          strict?: boolean
          student_id: string
          weak_words?: string[]
          wpm?: number
        }
        Update: {
          accuracy?: number
          content_id?: string | null
          content_ref?: string | null
          content_source?: string
          created_at?: string
          duration_sec?: number
          error_count?: number
          id?: string
          reveal_mode?: string
          shuffled?: boolean
          strict?: boolean
          student_id?: string
          weak_words?: string[]
          wpm?: number
        }
        Relationships: [
          {
            foreignKeyName: "typing_practice_attempts_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "typing_practice_content"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_practice_content: {
        Row: {
          body_en: string
          body_ko: string | null
          created_at: string
          created_by: string | null
          difficulty: string | null
          id: string
          source_ref: string | null
          source_type: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          body_en: string
          body_ko?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          id?: string
          source_ref?: string | null
          source_type: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          body_en?: string
          body_ko?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          id?: string
          source_ref?: string | null
          source_type?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ui_label_catalog: {
        Row: {
          audience: string | null
          created_at: string
          domain: string
          id: string
          is_active: boolean
          key: string
          label_en: string | null
          label_ko: string
          long_description_ko: string | null
          parent_message_ko: string | null
          school_level: string | null
          section: string | null
          short_description_ko: string | null
          sort_order: number
          student_message_ko: string | null
          teacher_message_ko: string | null
          track: string | null
          updated_at: string
        }
        Insert: {
          audience?: string | null
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean
          key: string
          label_en?: string | null
          label_ko: string
          long_description_ko?: string | null
          parent_message_ko?: string | null
          school_level?: string | null
          section?: string | null
          short_description_ko?: string | null
          sort_order?: number
          student_message_ko?: string | null
          teacher_message_ko?: string | null
          track?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string | null
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          key?: string
          label_en?: string | null
          label_ko?: string
          long_description_ko?: string | null
          parent_message_ko?: string | null
          school_level?: string | null
          section?: string | null
          short_description_ko?: string | null
          sort_order?: number
          student_message_ko?: string | null
          teacher_message_ko?: string | null
          track?: string | null
          updated_at?: string
        }
        Relationships: []
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
      user_vocab_game_stats: {
        Row: {
          best_level: number | null
          correct_count: number | null
          created_at: string | null
          game_type: string
          id: string
          total_games: number | null
          total_points: number | null
          total_questions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_level?: number | null
          correct_count?: number | null
          created_at?: string | null
          game_type: string
          id?: string
          total_games?: number | null
          total_points?: number | null
          total_questions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_level?: number | null
          correct_count?: number | null
          created_at?: string | null
          game_type?: string
          id?: string
          total_games?: number | null
          total_points?: number | null
          total_questions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      vocab_assignment_notices: {
        Row: {
          assignment_id: string
          created_at: string
          day_index: number
          dismissed_at: string | null
          id: string
          notice_type: string
          read_at: string | null
          status: string
          student_id: string
          teacher_id: string | null
          track_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          day_index: number
          dismissed_at?: string | null
          id?: string
          notice_type: string
          read_at?: string | null
          status?: string
          student_id: string
          teacher_id?: string | null
          track_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          day_index?: number
          dismissed_at?: string | null
          id?: string
          notice_type?: string
          read_at?: string | null
          status?: string
          student_id?: string
          teacher_id?: string | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_assignment_notices_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "student_vocab_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_assignment_notices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_daily_points: {
        Row: {
          completed_count: number | null
          created_at: string
          date: string
          homework_count: number | null
          id: string
          student_id: string
          total_points: number | null
          updated_at: string
        }
        Insert: {
          completed_count?: number | null
          created_at?: string
          date?: string
          homework_count?: number | null
          id?: string
          student_id: string
          total_points?: number | null
          updated_at?: string
        }
        Update: {
          completed_count?: number | null
          created_at?: string
          date?: string
          homework_count?: number | null
          id?: string
          student_id?: string
          total_points?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_daily_points_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
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
          drill_type: string
          id: string
          is_correct: boolean
          meta: Json | null
          set_id: string | null
          student_id: string
          word_id: string
        }
        Insert: {
          answered_at?: string
          drill_type: string
          id?: string
          is_correct: boolean
          meta?: Json | null
          set_id?: string | null
          student_id: string
          word_id: string
        }
        Update: {
          answered_at?: string
          drill_type?: string
          id?: string
          is_correct?: boolean
          meta?: Json | null
          set_id?: string | null
          student_id?: string
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
      vocab_game_results: {
        Row: {
          created_at: string | null
          game_session_id: string
          id: string
          is_correct: boolean | null
          points_gained: number | null
          question_id: string
        }
        Insert: {
          created_at?: string | null
          game_session_id: string
          id?: string
          is_correct?: boolean | null
          points_gained?: number | null
          question_id: string
        }
        Update: {
          created_at?: string | null
          game_session_id?: string
          id?: string
          is_correct?: boolean | null
          points_gained?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_game_results_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "vocab_game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_game_sessions: {
        Row: {
          correct_count: number | null
          created_at: string | null
          final_level: number | null
          game_type: string
          id: string
          question_count: number | null
          total_points: number | null
          user_id: string
        }
        Insert: {
          correct_count?: number | null
          created_at?: string | null
          final_level?: number | null
          game_type: string
          id?: string
          question_count?: number | null
          total_points?: number | null
          user_id: string
        }
        Update: {
          correct_count?: number | null
          created_at?: string | null
          final_level?: number | null
          game_type?: string
          id?: string
          question_count?: number | null
          total_points?: number | null
          user_id?: string
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
      vocab_learning_attempts: {
        Row: {
          accuracy: number | null
          attempted_at: string
          created_at: string
          id: string
          passed: boolean | null
          set_id: string
          stage: string
          student_id: string
          wrong_word_ids: string[]
        }
        Insert: {
          accuracy?: number | null
          attempted_at: string
          created_at?: string
          id?: string
          passed?: boolean | null
          set_id: string
          stage: string
          student_id: string
          wrong_word_ids?: string[]
        }
        Update: {
          accuracy?: number | null
          attempted_at?: string
          created_at?: string
          id?: string
          passed?: boolean | null
          set_id?: string
          stage?: string
          student_id?: string
          wrong_word_ids?: string[]
        }
        Relationships: []
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
      vocab_point_logs: {
        Row: {
          created_at: string
          homework_id: string | null
          id: string
          metadata: Json | null
          point_type: string
          points: number
          student_id: string
        }
        Insert: {
          created_at?: string
          homework_id?: string | null
          id?: string
          metadata?: Json | null
          point_type: string
          points: number
          student_id: string
        }
        Update: {
          created_at?: string
          homework_id?: string | null
          id?: string
          metadata?: Json | null
          point_type?: string
          points?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_point_logs_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "vocab_student_homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_point_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
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
          order_index: number | null
          source_label: string | null
          title: string
          track_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_band?: Database["public"]["Enums"]["grade_band"] | null
          id?: string
          level?: string | null
          notes?: string | null
          order_index?: number | null
          source_label?: string | null
          title: string
          track_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_band?: Database["public"]["Enums"]["grade_band"] | null
          id?: string
          level?: string | null
          notes?: string | null
          order_index?: number | null
          source_label?: string | null
          title?: string
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vocab_sets_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "vocab_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_student_goals: {
        Row: {
          course_id: string
          created_at: string
          deadline: string
          id: string
          status: string | null
          student_id: string
          target_day: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          deadline: string
          id?: string
          status?: string | null
          student_id: string
          target_day: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          deadline?: string
          id?: string
          status?: string | null
          student_id?: string
          target_day?: number
          updated_at?: string
        }
        Relationships: []
      }
      vocab_student_homework: {
        Row: {
          completed_at: string | null
          created_at: string
          created_date: string
          homework_type: string
          id: string
          meanings: Json | null
          points: number | null
          pos: string | null
          status: string
          student_id: string
          updated_at: string
          word_id: string
          word_text: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_date?: string
          homework_type: string
          id?: string
          meanings?: Json | null
          points?: number | null
          pos?: string | null
          status?: string
          student_id: string
          updated_at?: string
          word_id: string
          word_text: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_date?: string
          homework_type?: string
          id?: string
          meanings?: Json | null
          points?: number | null
          pos?: string | null
          status?: string
          student_id?: string
          updated_at?: string
          word_id?: string
          word_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_student_homework_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_student_homework_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_student_homework_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_test_configs: {
        Row: {
          arrangement: string
          coverage_ratio: number
          created_at: string
          hints_enabled: boolean
          id: string
          max_hint_level: number
          scope: string
          scope_id: string | null
          skip_learning_check: boolean
          updated_at: string
        }
        Insert: {
          arrangement?: string
          coverage_ratio?: number
          created_at?: string
          hints_enabled?: boolean
          id?: string
          max_hint_level?: number
          scope: string
          scope_id?: string | null
          skip_learning_check?: boolean
          updated_at?: string
        }
        Update: {
          arrangement?: string
          coverage_ratio?: number
          created_at?: string
          hints_enabled?: boolean
          id?: string
          max_hint_level?: number
          scope?: string
          scope_id?: string | null
          skip_learning_check?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      vocab_test_questions: {
        Row: {
          answer_seq: number | null
          answered_at: string | null
          audio_url: string | null
          correct_answer: string
          created_at: string
          hint_level: number
          id: string
          is_correct: boolean | null
          meaning_ko: string[] | null
          options: Json | null
          points_earned: number | null
          points_max: number
          question_number: number
          question_type: string
          session_id: string
          streak_before: number | null
          streak_bonus: number
          student_answer: string | null
          word_id: string
          word_text: string
        }
        Insert: {
          answer_seq?: number | null
          answered_at?: string | null
          audio_url?: string | null
          correct_answer: string
          created_at?: string
          hint_level?: number
          id?: string
          is_correct?: boolean | null
          meaning_ko?: string[] | null
          options?: Json | null
          points_earned?: number | null
          points_max?: number
          question_number: number
          question_type: string
          session_id: string
          streak_before?: number | null
          streak_bonus?: number
          student_answer?: string | null
          word_id: string
          word_text: string
        }
        Update: {
          answer_seq?: number | null
          answered_at?: string | null
          audio_url?: string | null
          correct_answer?: string
          created_at?: string
          hint_level?: number
          id?: string
          is_correct?: boolean | null
          meaning_ko?: string[] | null
          options?: Json | null
          points_earned?: number | null
          points_max?: number
          question_number?: number
          question_type?: string
          session_id?: string
          streak_before?: number | null
          streak_bonus?: number
          student_answer?: string | null
          word_id?: string
          word_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_test_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "vocab_test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_test_sessions: {
        Row: {
          answered_count: number
          best_streak: number
          class_id: string
          correct_count: number | null
          created_at: string
          current_streak: number
          day_number: number
          duration_seconds: number | null
          hints_used: number
          id: string
          max_points: number | null
          score: number | null
          started_at: string | null
          status: string
          student_id: string
          submitted_at: string | null
          total_count: number | null
          total_points: number
          total_words_count: number
          track_id: string
          updated_at: string
          use_wrong_only: boolean
          words_count: number
        }
        Insert: {
          answered_count?: number
          best_streak?: number
          class_id: string
          correct_count?: number | null
          created_at?: string
          current_streak?: number
          day_number: number
          duration_seconds?: number | null
          hints_used?: number
          id?: string
          max_points?: number | null
          score?: number | null
          started_at?: string | null
          status?: string
          student_id: string
          submitted_at?: string | null
          total_count?: number | null
          total_points?: number
          total_words_count: number
          track_id: string
          updated_at?: string
          use_wrong_only?: boolean
          words_count: number
        }
        Update: {
          answered_count?: number
          best_streak?: number
          class_id?: string
          correct_count?: number | null
          created_at?: string
          current_streak?: number
          day_number?: number
          duration_seconds?: number | null
          hints_used?: number
          id?: string
          max_points?: number | null
          score?: number | null
          started_at?: string | null
          status?: string
          student_id?: string
          submitted_at?: string | null
          total_count?: number | null
          total_points?: number
          total_words_count?: number
          track_id?: string
          updated_at?: string
          use_wrong_only?: boolean
          words_count?: number
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
          speed_mode: string
          speed_timeout_seconds: number | null
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
          speed_mode?: string
          speed_timeout_seconds?: number | null
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
          speed_mode?: string
          speed_timeout_seconds?: number | null
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
      word_synonyms: {
        Row: {
          created_at: string | null
          id: string
          relationship_type: string
          similarity_score: number
          source: string | null
          synonym_word_id: string
          tier: number
          updated_at: string | null
          word_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          relationship_type?: string
          similarity_score?: number
          source?: string | null
          synonym_word_id: string
          tier?: number
          updated_at?: string | null
          word_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          relationship_type?: string
          similarity_score?: number
          source?: string | null
          synonym_word_id?: string
          tier?: number
          updated_at?: string | null
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_synonyms_synonym_word_id_fkey"
            columns: ["synonym_word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_synonyms_synonym_word_id_fkey"
            columns: ["synonym_word_id"]
            isOneToOne: false
            referencedRelation: "words_with_meaning"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_synonyms_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_synonyms_word_id_fkey"
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
          last_learning_stage_attempt: string | null
          learning_stage_attempts: number | null
          learning_stage_completed: boolean | null
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
          last_learning_stage_attempt?: string | null
          learning_stage_attempts?: number | null
          learning_stage_completed?: boolean | null
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
          last_learning_stage_attempt?: string | null
          learning_stage_attempts?: number | null
          learning_stage_completed?: boolean | null
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
          final_discussion_score: number | null
          final_email_score: number | null
          final_grade_feedback: string | null
          final_total_score: number | null
          graded_at: string | null
          grading_status: string
          id: string
          item_key: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          final_discussion_score?: number | null
          final_email_score?: number | null
          final_grade_feedback?: string | null
          final_total_score?: number | null
          graded_at?: string | null
          grading_status?: string
          id?: string
          item_key: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          final_discussion_score?: number | null
          final_email_score?: number | null
          final_grade_feedback?: string | null
          final_total_score?: number | null
          graded_at?: string | null
          grading_status?: string
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
          ai_build_a_sentence_score: number | null
          ai_discussion_score: number | null
          ai_email_score: number | null
          ai_grade_feedback: string | null
          ai_graded_at: string | null
          ai_total_score: number | null
          created_at: string
          final_build_a_sentence_score: number | null
          final_discussion_score: number | null
          final_email_score: number | null
          final_grade_feedback: string | null
          final_total_score: number | null
          graded_at: string | null
          graded_by: string | null
          grading_status: string
          id: string
          meta: Json | null
          parent_session_id: string | null
          raw_answers: Json | null
          review_attempts: Json | null
          test_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_build_a_sentence_score?: number | null
          ai_discussion_score?: number | null
          ai_email_score?: number | null
          ai_grade_feedback?: string | null
          ai_graded_at?: string | null
          ai_total_score?: number | null
          created_at?: string
          final_build_a_sentence_score?: number | null
          final_discussion_score?: number | null
          final_email_score?: number | null
          final_grade_feedback?: string | null
          final_total_score?: number | null
          graded_at?: string | null
          graded_by?: string | null
          grading_status?: string
          id?: string
          meta?: Json | null
          parent_session_id?: string | null
          raw_answers?: Json | null
          review_attempts?: Json | null
          test_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_build_a_sentence_score?: number | null
          ai_discussion_score?: number | null
          ai_email_score?: number | null
          ai_grade_feedback?: string | null
          ai_graded_at?: string | null
          ai_total_score?: number | null
          created_at?: string
          final_build_a_sentence_score?: number | null
          final_discussion_score?: number | null
          final_email_score?: number | null
          final_grade_feedback?: string | null
          final_total_score?: number | null
          graded_at?: string | null
          graded_by?: string | null
          grading_status?: string
          id?: string
          meta?: Json | null
          parent_session_id?: string | null
          raw_answers?: Json | null
          review_attempts?: Json | null
          test_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "writing_2026_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "writing_2026_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      writing_tests: {
        Row: {
          created_at: string
          exam_era: string
          id: string
          is_active: boolean
          is_locked: boolean
          label: string
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_era?: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          label?: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_era?: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          label?: string
          payload?: Json
          updated_at?: string
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
      class_completed_problems: {
        Row: {
          class_id: string | null
          problem_id: string | null
          problem_type: string | null
          times_assigned: number | null
        }
        Relationships: []
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
      student_recent_topics: {
        Row: {
          is_blocked: boolean | null
          last_solved_date: string | null
          problem_type: string | null
          student_id: string | null
          topic: string | null
        }
        Insert: {
          is_blocked?: never
          last_solved_date?: string | null
          problem_type?: string | null
          student_id?: string | null
          topic?: string | null
        }
        Update: {
          is_blocked?: never
          last_solved_date?: string | null
          problem_type?: string | null
          student_id?: string | null
          topic?: string | null
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
          description: string | null
          grade_band: Database["public"]["Enums"]["grade_band"] | null
          id: string | null
          item_count: number | null
          level: string | null
          source_label: string | null
          title: string | null
          track_id: string | null
          word_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vocab_sets_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "vocab_tracks"
            referencedColumns: ["id"]
          },
        ]
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
      award_points: {
        Args: {
          p_bonus?: number
          p_metadata?: Json
          p_rule_id: string
          p_source_ref?: string
          p_student_id: string
        }
        Returns: number
      }
      calc_level: { Args: { pts: number }; Returns: number }
      calculate_available_date: {
        Args: {
          p_day_index: number
          p_start_date: string
          p_weekdays: number[]
        }
        Returns: string
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
      create_overdue_assignment_notices: {
        Args: never
        Returns: {
          created_count: number
        }[]
      }
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
      get_course_available_dates: {
        Args: {
          p_start_date: string
          p_total_days: number
          p_weekdays: number[]
        }
        Returns: {
          available_at: string
          day_index: number
        }[]
      }
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
      is_current_user_student_key: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      is_member: {
        Args: {
          org: string
          roles?: Database["public"]["Enums"]["role_enum"][]
        }
        Returns: boolean
      }
      is_own_academy_student: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      is_staff:
        | { Args: never; Returns: boolean }
        | { Args: { uid: string }; Returns: boolean }
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
      reading_eval_answer:
        | {
            Args: { p_choice_id: string; p_question_id: string }
            Returns: boolean
          }
        | {
            Args: {
              p_choice_id: string
              p_choice_ids: string[]
              p_question_id: string
            }
            Returns: boolean
          }
      reading_review_rows: {
        Args: { session_id: string }
        Returns: {
          correct_choice: string
          is_correct: boolean
          q_no: number
          question: string
          user_choice: string
        }[]
      }
      reading_review_score: {
        Args: { session_id: string }
        Returns: {
          correct: number
          total: number
        }[]
      }
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
      shift_assignments_by_event: {
        Args: { p_end_date: string; p_start_date: string; p_student_id: string }
        Returns: {
          affected_tracks: string[]
          shifted_count: number
        }[]
      }
      show_claims: { Args: never; Returns: Json }
      student_can_view_exam: { Args: { p_exam_id: string }; Returns: boolean }
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
      naesin_evidence_type: "sentence" | "span" | "paragraph" | "logic"
      naesin_exam_context:
        | "midterm"
        | "final"
        | "monthly_mock"
        | "csat_like"
        | "homework"
        | "clinic"
      naesin_grade_band: "ELEM" | "M1" | "M2" | "M3" | "H1" | "H2" | "H3"
      naesin_passage_genre:
        | "narrative"
        | "expository"
        | "argumentative"
        | "dialogue"
        | "notice"
        | "email"
        | "ad"
        | "chart_based"
        | "hybrid"
      naesin_prescription_tag:
        | "vocab_context_weak"
        | "blank_logic_weak"
        | "sentence_order_weak"
        | "detail_accuracy_low"
        | "slow_reader"
        | "grammar_context_weak"
      naesin_question_type:
        | "main_idea"
        | "title"
        | "purpose"
        | "tone"
        | "detail"
        | "not_true"
        | "inference"
        | "vocab_in_context"
        | "reference"
        | "blank"
        | "sentence_insertion"
        | "order"
        | "summary"
        | "topic_sentence"
        | "grammar_in_context"
        | "phrase_meaning"
        | "author_claim"
        | "matching"
        | "chart_interpretation"
      naesin_reading_difficulty:
        | "foundation"
        | "basic"
        | "standard"
        | "advanced"
        | "challenge"
      naesin_reading_source_type:
        | "school_exam"
        | "mock_exam"
        | "textbook"
        | "academy_original"
        | "worksheet"
        | "ebs_like"
      naesin_session_mode: "practice" | "test" | "review" | "clinic"
      naesin_session_status: "assigned" | "started" | "submitted" | "reviewed"
      naesin_wrong_reason_tag:
        | "misread_sentence"
        | "missed_keyword"
        | "vocab_unknown"
        | "grammar_confusion"
        | "logic_confusion"
        | "careless"
        | "time_pressure"
        | "guessed"
      note_type_enum: "listening_notes" | "reading_translation"
      proctoring_mode: "none" | "gaze_only"
      proctoring_status: "not_required" | "ok" | "suspicious"
      reading_academic_subtype:
        | "MAIN_IDEA"
        | "DETAIL"
        | "NEGATIVE_FACT"
        | "VOCAB_IN_CONTEXT"
        | "INFERENCE"
        | "PURPOSE"
      reading_branch: "ROUTING" | "LOWER" | "HIGHER"
      reading_choice: "A" | "B" | "C" | "D"
      reading_daily_format: "NOTICE" | "EMAIL" | "POST" | "SCHEDULE"
      reading_difficulty_tier: "EASY" | "MEDIUM" | "HARD"
      reading_task_type: "CTW" | "DAILY" | "ACADEMIC"
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
      toefl_content_type: "lecture" | "practice" | "test" | "drill"
      toefl_level: "basic" | "intermediate" | "advanced"
      toefl_skill: "reading" | "listening" | "speaking" | "writing"
      toefl_student_mode: "learning" | "exam"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      naesin_evidence_type: ["sentence", "span", "paragraph", "logic"],
      naesin_exam_context: [
        "midterm",
        "final",
        "monthly_mock",
        "csat_like",
        "homework",
        "clinic",
      ],
      naesin_grade_band: ["ELEM", "M1", "M2", "M3", "H1", "H2", "H3"],
      naesin_passage_genre: [
        "narrative",
        "expository",
        "argumentative",
        "dialogue",
        "notice",
        "email",
        "ad",
        "chart_based",
        "hybrid",
      ],
      naesin_prescription_tag: [
        "vocab_context_weak",
        "blank_logic_weak",
        "sentence_order_weak",
        "detail_accuracy_low",
        "slow_reader",
        "grammar_context_weak",
      ],
      naesin_question_type: [
        "main_idea",
        "title",
        "purpose",
        "tone",
        "detail",
        "not_true",
        "inference",
        "vocab_in_context",
        "reference",
        "blank",
        "sentence_insertion",
        "order",
        "summary",
        "topic_sentence",
        "grammar_in_context",
        "phrase_meaning",
        "author_claim",
        "matching",
        "chart_interpretation",
      ],
      naesin_reading_difficulty: [
        "foundation",
        "basic",
        "standard",
        "advanced",
        "challenge",
      ],
      naesin_reading_source_type: [
        "school_exam",
        "mock_exam",
        "textbook",
        "academy_original",
        "worksheet",
        "ebs_like",
      ],
      naesin_session_mode: ["practice", "test", "review", "clinic"],
      naesin_session_status: ["assigned", "started", "submitted", "reviewed"],
      naesin_wrong_reason_tag: [
        "misread_sentence",
        "missed_keyword",
        "vocab_unknown",
        "grammar_confusion",
        "logic_confusion",
        "careless",
        "time_pressure",
        "guessed",
      ],
      note_type_enum: ["listening_notes", "reading_translation"],
      proctoring_mode: ["none", "gaze_only"],
      proctoring_status: ["not_required", "ok", "suspicious"],
      reading_academic_subtype: [
        "MAIN_IDEA",
        "DETAIL",
        "NEGATIVE_FACT",
        "VOCAB_IN_CONTEXT",
        "INFERENCE",
        "PURPOSE",
      ],
      reading_branch: ["ROUTING", "LOWER", "HIGHER"],
      reading_choice: ["A", "B", "C", "D"],
      reading_daily_format: ["NOTICE", "EMAIL", "POST", "SCHEDULE"],
      reading_difficulty_tier: ["EASY", "MEDIUM", "HARD"],
      reading_task_type: ["CTW", "DAILY", "ACADEMIC"],
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
      toefl_content_type: ["lecture", "practice", "test", "drill"],
      toefl_level: ["basic", "intermediate", "advanced"],
      toefl_skill: ["reading", "listening", "speaking", "writing"],
      toefl_student_mode: ["learning", "exam"],
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

