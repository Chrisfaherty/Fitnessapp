// Supabase database types — explicit Insert types to avoid self-referential Omit<> generics
// In production: run `supabase gen types typescript --local > src/types/database.ts`

export type UserRole = "client" | "trainer" | "admin";
export type CheckInStatus = "pending" | "submitted" | "reviewed";
export type AssignmentStatus = "assigned" | "completed" | "skipped";
export type MessageSenderRole = "trainer" | "client";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          avatar_url: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: UserRole;
          full_name: string;
          avatar_url?: string | null;
          timezone?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string;
          avatar_url?: string | null;
          timezone?: string;
        };
        Relationships: [];
      };
      trainer_clients: {
        Row: {
          id: string;
          trainer_id: string;
          client_id: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          trainer_id: string;
          client_id: string;
          active?: boolean;
        };
        Update: {
          trainer_id?: string;
          client_id?: string;
          active?: boolean;
        };
        Relationships: [];
      };
      health_daily: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          steps: number | null;
          active_energy_kcal: number | null;
          weight_kg: number | null;
          nutrition_kcal: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          sources: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          steps?: number | null;
          active_energy_kcal?: number | null;
          weight_kg?: number | null;
          nutrition_kcal?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          sources?: string[];
        };
        Update: {
          user_id?: string;
          date?: string;
          steps?: number | null;
          active_energy_kcal?: number | null;
          weight_kg?: number | null;
          nutrition_kcal?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          sources?: string[];
        };
        Relationships: [];
      };
      health_workouts: {
        Row: {
          id: string;
          user_id: string;
          external_id: string;
          workout_type: string;
          start_at: string;
          end_at: string;
          kcal: number | null;
          source_app: string | null;
          source_bundle: string | null;
          raw_data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          external_id: string;
          workout_type: string;
          start_at: string;
          end_at: string;
          kcal?: number | null;
          source_app?: string | null;
          source_bundle?: string | null;
          raw_data?: Record<string, unknown> | null;
        };
        Update: {
          user_id?: string;
          external_id?: string;
          workout_type?: string;
          start_at?: string;
          end_at?: string;
          kcal?: number | null;
          source_app?: string | null;
          source_bundle?: string | null;
          raw_data?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
      diary_entries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          notes: string | null;
          mood: number | null;
          sleep_hours: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          notes?: string | null;
          mood?: number | null;
          sleep_hours?: number | null;
        };
        Update: {
          user_id?: string;
          date?: string;
          notes?: string | null;
          mood?: number | null;
          sleep_hours?: number | null;
        };
        Relationships: [];
      };
      check_ins: {
        Row: {
          id: string;
          client_id: string;
          trainer_id: string | null;
          week_start_date: string;
          status: CheckInStatus;
          body_weight_kg: number | null;
          energy_level: number | null;
          stress_level: number | null;
          sleep_quality: number | null;
          client_notes: string | null;
          trainer_notes: string | null;
          trainer_video_url: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          trainer_id?: string | null;
          week_start_date: string;
          status?: CheckInStatus;
          body_weight_kg?: number | null;
          energy_level?: number | null;
          stress_level?: number | null;
          sleep_quality?: number | null;
          client_notes?: string | null;
          trainer_notes?: string | null;
          trainer_video_url?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          client_id?: string;
          trainer_id?: string | null;
          week_start_date?: string;
          status?: CheckInStatus;
          body_weight_kg?: number | null;
          energy_level?: number | null;
          stress_level?: number | null;
          sleep_quality?: number | null;
          client_notes?: string | null;
          trainer_notes?: string | null;
          trainer_video_url?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      meal_plans: {
        Row: {
          id: string;
          trainer_id: string;
          client_id: string;
          title: string;
          description: string | null;
          week_start: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          trainer_id: string;
          client_id: string;
          title: string;
          description?: string | null;
          week_start?: string | null;
          active?: boolean;
        };
        Update: {
          trainer_id?: string;
          client_id?: string;
          title?: string;
          description?: string | null;
          week_start?: string | null;
          active?: boolean;
        };
        Relationships: [];
      };
      meal_plan_days: {
        Row: {
          id: string;
          meal_plan_id: string;
          day_of_week: number;
          meal_name: string;
          description: string | null;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          sort_order: number;
        };
        Insert: {
          meal_plan_id: string;
          day_of_week: number;
          meal_name: string;
          description?: string | null;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          sort_order: number;
        };
        Update: {
          meal_plan_id?: string;
          day_of_week?: number;
          meal_name?: string;
          description?: string | null;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          trainer_id: string;
          client_id: string;
          created_at: string;
        };
        Insert: {
          trainer_id: string;
          client_id: string;
        };
        Update: {
          trainer_id?: string;
          client_id?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          sender_role: MessageSenderRole;
          body: string | null;
          video_storage_path: string | null;
          video_thumbnail: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          sender_role: MessageSenderRole;
          body?: string | null;
          video_storage_path?: string | null;
          video_thumbnail?: string | null;
          read_at?: string | null;
        };
        Update: {
          conversation_id?: string;
          sender_id?: string;
          sender_role?: MessageSenderRole;
          body?: string | null;
          video_storage_path?: string | null;
          video_thumbnail?: string | null;
          read_at?: string | null;
        };
        Relationships: [];
      };
      weekly_summaries: {
        Row: {
          id: string;
          client_id: string;
          week_start_date: string;
          avg_steps: number | null;
          avg_calories: number | null;
          avg_protein_g: number | null;
          avg_weight_kg: number | null;
          workouts_count: number;
          check_in_id: string | null;
          generated_at: string;
        };
        Insert: {
          client_id: string;
          week_start_date: string;
          avg_steps?: number | null;
          avg_calories?: number | null;
          avg_protein_g?: number | null;
          avg_weight_kg?: number | null;
          workouts_count?: number;
          check_in_id?: string | null;
        };
        Update: {
          client_id?: string;
          week_start_date?: string;
          avg_steps?: number | null;
          avg_calories?: number | null;
          avg_protein_g?: number | null;
          avg_weight_kg?: number | null;
          workouts_count?: number;
          check_in_id?: string | null;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          force: string | null;
          level: string;
          mechanic: string | null;
          equipment: string | null;
          category: string;
          primary_muscles: string[];
          secondary_muscles: string[];
          instructions: string[];
          image_paths: string[];
          source: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          force?: string | null;
          level: string;
          mechanic?: string | null;
          equipment?: string | null;
          category: string;
          primary_muscles: string[];
          secondary_muscles: string[];
          instructions: string[];
          image_paths: string[];
          source: string;
        };
        Update: {
          id?: string;
          name?: string;
          force?: string | null;
          level?: string;
          mechanic?: string | null;
          equipment?: string | null;
          category?: string;
          primary_muscles?: string[];
          secondary_muscles?: string[];
          instructions?: string[];
          image_paths?: string[];
          source?: string;
        };
        Relationships: [];
      };
      workout_templates: {
        Row: {
          id: string;
          trainer_id: string;
          title: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          trainer_id: string;
          title: string;
          description?: string | null;
        };
        Update: {
          trainer_id?: string;
          title?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      workout_template_exercises: {
        Row: {
          id: string;
          template_id: string;
          exercise_id: string;
          sort_order: number;
          target_sets: number;
          rep_min: number;
          rep_max: number;
          rest_seconds: number;
          notes: string | null;
        };
        Insert: {
          template_id: string;
          exercise_id: string;
          sort_order: number;
          target_sets: number;
          rep_min: number;
          rep_max: number;
          rest_seconds: number;
          notes?: string | null;
        };
        Update: {
          template_id?: string;
          exercise_id?: string;
          sort_order?: number;
          target_sets?: number;
          rep_min?: number;
          rep_max?: number;
          rest_seconds?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      workout_assignments: {
        Row: {
          id: string;
          client_id: string;
          template_id: string;
          trainer_id: string | null;
          scheduled_date: string | null;
          status: AssignmentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          template_id: string;
          trainer_id?: string | null;
          scheduled_date?: string | null;
          status?: AssignmentStatus;
        };
        Update: {
          client_id?: string;
          template_id?: string;
          trainer_id?: string | null;
          scheduled_date?: string | null;
          status?: AssignmentStatus;
        };
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          client_id: string;
          template_id: string | null;
          assignment_id: string | null;
          performed_at: string;
          duration_seconds: number | null;
          notes: string | null;
          health_external_id: string | null;
          created_at: string;
        };
        Insert: {
          client_id: string;
          template_id?: string | null;
          assignment_id?: string | null;
          performed_at: string;
          duration_seconds?: number | null;
          notes?: string | null;
          health_external_id?: string | null;
        };
        Update: {
          client_id?: string;
          template_id?: string | null;
          assignment_id?: string | null;
          performed_at?: string;
          duration_seconds?: number | null;
          notes?: string | null;
          health_external_id?: string | null;
        };
        Relationships: [];
      };
      workout_session_sets: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string;
          set_number: number;
          reps: number;
          weight_kg: number | null;
          rpe: number | null;
          rest_seconds: number | null;
          completed_at: string;
        };
        Insert: {
          session_id: string;
          exercise_id: string;
          set_number: number;
          reps: number;
          weight_kg?: number | null;
          rpe?: number | null;
          rest_seconds?: number | null;
          completed_at: string;
        };
        Update: {
          session_id?: string;
          exercise_id?: string;
          set_number?: number;
          reps?: number;
          weight_kg?: number | null;
          rpe?: number | null;
          rest_seconds?: number | null;
          completed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_last_session_sets: {
        Args: { p_client_id: string; p_exercise_id: string };
        Returns: Array<{
          set_number: number;
          reps: number;
          weight_kg: number | null;
          rpe: number | null;
          performed_at: string;
        }>;
      };
      get_exercise_volume_trend: {
        Args: { p_client_id: string; p_exercise_id: string; p_days?: number };
        Returns: Array<{
          performed_at: string;
          total_volume: number;
          max_weight_kg: number;
          total_sets: number;
          total_reps: number;
        }>;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
