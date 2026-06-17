export type Role = 'professor' | 'aluno';
export type DiaTreino = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Profile {
  id: string;
  nome: string;
  role: Role;
  gym_id: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  nome: string;
  grupo_muscular: string | null;
  media_url: string | null;
  gym_id: string | null;
  created_at: string;
}

export interface WorkoutTemplate {
  id: string;
  professor_id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
}

export interface TemplateItem {
  id: string;
  template_id: string;
  exercise_id: string;
  dia: DiaTreino;
  ordem: number;
  series: number;
  reps: string;
  carga_sugerida: number | null;
  descanso_seg: number | null;
  created_at: string;
}

export interface Workout {
  id: string;
  aluno_id: string;
  professor_id: string;
  nome: string;
  origem_template_id: string | null;
  ativo: boolean;
  created_at: string;
}

export interface WorkoutItem {
  id: string;
  workout_id: string;
  exercise_id: string;
  dia: DiaTreino;
  ordem: number;
  series: number;
  reps: string;
  carga: number | null;
  descanso_seg: number | null;
  created_at: string;
}

export interface WorkoutLog {
  id: string;
  workout_item_id: string;
  aluno_id: string;
  data: string;
  carga_real: number | null;
  reps_real: number | null;
  feito: boolean;
  created_at: string;
}

type Insert<T, K extends keyof T = never> = Omit<T, 'id' | 'created_at' | K> &
  Partial<Pick<T, K>>;
type Update<T> = Partial<Omit<T, 'id' | 'created_at'>>;

type Rel = [];

export interface Database {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Insert<Profile, 'gym_id'>;
        Update: Update<Profile>;
        Relationships: Rel;
      };
      exercises: {
        Row: Exercise;
        Insert: Insert<Exercise, 'grupo_muscular' | 'media_url' | 'gym_id'>;
        Update: Update<Exercise>;
        Relationships: Rel;
      };
      workout_templates: {
        Row: WorkoutTemplate;
        Insert: Insert<WorkoutTemplate, 'descricao'>;
        Update: Update<WorkoutTemplate>;
        Relationships: Rel;
      };
      template_items: {
        Row: TemplateItem;
        Insert: Insert<TemplateItem, 'carga_sugerida' | 'descanso_seg'>;
        Update: Update<TemplateItem>;
        Relationships: Rel;
      };
      workouts: {
        Row: Workout;
        Insert: Insert<Workout, 'origem_template_id' | 'ativo'>;
        Update: Update<Workout>;
        Relationships: Rel;
      };
      workout_items: {
        Row: WorkoutItem;
        Insert: Insert<WorkoutItem, 'carga' | 'descanso_seg'>;
        Update: Update<WorkoutItem>;
        Relationships: Rel;
      };
      workout_logs: {
        Row: WorkoutLog;
        Insert: Insert<
          WorkoutLog,
          'data' | 'carga_real' | 'reps_real' | 'feito'
        >;
        Update: Update<WorkoutLog>;
        Relationships: Rel;
      };
    };
  };
}
