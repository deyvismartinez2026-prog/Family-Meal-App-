export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MemberRole = 'adult' | 'kid';
export type MealType = 'lunch' | 'dinner';
export type StoreType = 'target' | 'walmart' | 'bjs' | 'amazon' | 'any';
export type TripType = 'weekly' | 'bulk' | 'subscribe' | 'any';
export type ShoppingStatus = 'needed' | 'bought' | 'skipped';
export type NutritionConfidence = 'high' | 'med' | 'low';
export type Acceptance = 'loved' | 'ate' | 'rejected' | 'spat';
export type PriceTier = '$' | '$$' | '$$$';

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          id: string;
          code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          created_at?: string;
        };
      };
      family_members: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          role: MemberRole;
          portion_multiplier: number;
          protein_target_g: number | null;
          emoji: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          role: MemberRole;
          portion_multiplier?: number;
          protein_target_g?: number | null;
          emoji?: string;
        };
        Update: Partial<Database['public']['Tables']['family_members']['Insert']>;
      };
      recipes: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          emoji: string;
          thumbnail_url: string | null;
          active_time_min: number;
          total_time_min: number;
          base_servings: number;
          kid_version_notes: string | null;
          make_ahead_notes: string | null;
          cost_per_serving_est: number | null;
          source_url: string | null;
          tags: string[];
          calories_per_serving: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          nutrition_confidence: NutritionConfidence;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          emoji?: string;
          thumbnail_url?: string | null;
          active_time_min?: number;
          total_time_min?: number;
          base_servings?: number;
          kid_version_notes?: string | null;
          make_ahead_notes?: string | null;
          cost_per_serving_est?: number | null;
          source_url?: string | null;
          tags?: string[];
          calories_per_serving?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          nutrition_confidence?: NutritionConfidence;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['recipes']['Insert']>;
      };
      ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          name: string;
          emoji: string;
          quantity: number;
          unit: string;
          store_preference: StoreType;
          trip_type: TripType;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          name: string;
          emoji?: string;
          quantity: number;
          unit: string;
          store_preference?: StoreType;
          trip_type?: TripType;
        };
        Update: Partial<Database['public']['Tables']['ingredients']['Insert']>;
      };
      recipe_steps: {
        Row: {
          id: string;
          recipe_id: string;
          step_number: number;
          instruction: string;
          timer_seconds: number | null;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          step_number: number;
          instruction: string;
          timer_seconds?: number | null;
        };
        Update: Partial<Database['public']['Tables']['recipe_steps']['Insert']>;
      };
      meal_plan: {
        Row: {
          id: string;
          family_id: string;
          date: string;
          meal_type: MealType;
          recipe_id: string | null;
          is_leftover: boolean;
          leftover_source_plan_id: string | null;
          notes: string | null;
          chef_night_off: boolean;
        };
        Insert: {
          id?: string;
          family_id: string;
          date: string;
          meal_type: MealType;
          recipe_id?: string | null;
          is_leftover?: boolean;
          leftover_source_plan_id?: string | null;
          notes?: string | null;
          chef_night_off?: boolean;
        };
        Update: Partial<Database['public']['Tables']['meal_plan']['Insert']>;
      };
      shopping_list: {
        Row: {
          id: string;
          family_id: string;
          week_of: string;
          item_name: string;
          emoji: string;
          qty: number;
          unit: string;
          store: StoreType;
          trip_type: TripType;
          linked_recipe_ids: string[];
          status: ShoppingStatus;
          est_cost: number | null;
          checked_at: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          week_of: string;
          item_name: string;
          emoji?: string;
          qty: number;
          unit: string;
          store?: StoreType;
          trip_type?: TripType;
          linked_recipe_ids?: string[];
          status?: ShoppingStatus;
          est_cost?: number | null;
          checked_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['shopping_list']['Insert']>;
      };
      pantry: {
        Row: {
          id: string;
          family_id: string;
          item_name: string;
          emoji: string;
          quantity: number;
          unit: string;
          expires_on: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          item_name: string;
          emoji?: string;
          quantity: number;
          unit: string;
          expires_on?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pantry']['Insert']>;
      };
      exclusions: {
        Row: {
          id: string;
          family_id: string;
          ingredient_name: string;
          reason: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          ingredient_name: string;
          reason?: string | null;
        };
        Update: Partial<Database['public']['Tables']['exclusions']['Insert']>;
      };
      feedback: {
        Row: {
          id: string;
          family_id: string;
          meal_plan_id: string;
          member_id: string;
          rating: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          meal_plan_id: string;
          member_id: string;
          rating: number;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['feedback']['Insert']>;
      };
      kid_food_log: {
        Row: {
          id: string;
          family_id: string;
          kid_member_id: string;
          food_name: string;
          date_tried: string;
          acceptance: Acceptance;
          retry_queue: boolean;
        };
        Insert: {
          id?: string;
          family_id: string;
          kid_member_id: string;
          food_name: string;
          date_tried: string;
          acceptance: Acceptance;
          retry_queue?: boolean;
        };
        Update: Partial<Database['public']['Tables']['kid_food_log']['Insert']>;
      };
      meal_photos: {
        Row: {
          id: string;
          family_id: string;
          recipe_id: string;
          meal_plan_id: string | null;
          photo_url: string;
          caption: string | null;
          taken_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          recipe_id: string;
          meal_plan_id?: string | null;
          photo_url: string;
          caption?: string | null;
          taken_at?: string;
        };
        Update: Partial<Database['public']['Tables']['meal_photos']['Insert']>;
      };
      restaurants: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          emoji: string;
          cuisine: string;
          price_tier: PriceTier;
          typical_dish: string;
          delivery_apps: string[];
          avg_delivery_min: number | null;
          notes: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          emoji?: string;
          cuisine: string;
          price_tier?: PriceTier;
          typical_dish?: string;
          delivery_apps?: string[];
          avg_delivery_min?: number | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['restaurants']['Insert']>;
      };
      takeout_history: {
        Row: {
          id: string;
          family_id: string;
          restaurant_id: string;
          date: string;
          picked_by: string;
          dish_ordered: string | null;
          est_cost: number | null;
          rating: number | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          restaurant_id: string;
          date: string;
          picked_by: string;
          dish_ordered?: string | null;
          est_cost?: number | null;
          rating?: number | null;
        };
        Update: Partial<Database['public']['Tables']['takeout_history']['Insert']>;
      };
    };
  };
}

export type Family = Database['public']['Tables']['families']['Row'];
export type FamilyMember = Database['public']['Tables']['family_members']['Row'];
export type Recipe = Database['public']['Tables']['recipes']['Row'];
export type Ingredient = Database['public']['Tables']['ingredients']['Row'];
export type RecipeStep = Database['public']['Tables']['recipe_steps']['Row'];
export type MealPlan = Database['public']['Tables']['meal_plan']['Row'];
export type ShoppingItem = Database['public']['Tables']['shopping_list']['Row'];
export type PantryItem = Database['public']['Tables']['pantry']['Row'];
export type Exclusion = Database['public']['Tables']['exclusions']['Row'];
export type Feedback = Database['public']['Tables']['feedback']['Row'];
export type KidFoodLog = Database['public']['Tables']['kid_food_log']['Row'];
export type MealPhoto = Database['public']['Tables']['meal_photos']['Row'];
export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type TakeoutHistory = Database['public']['Tables']['takeout_history']['Row'];
