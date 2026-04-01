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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_analysis_memory: {
        Row: {
          context_data: Json | null
          created_at: string
          decision: string | null
          id: string
          product_id: string | null
          summary: string
          user_id: string
        }
        Insert: {
          context_data?: Json | null
          created_at?: string
          decision?: string | null
          id?: string
          product_id?: string | null
          summary: string
          user_id: string
        }
        Update: {
          context_data?: Json | null
          created_at?: string
          decision?: string | null
          id?: string
          product_id?: string | null
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          last_used_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          last_used_at?: string | null
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          last_used_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      creative_generations: {
        Row: {
          aspect_ratio: string
          bullet_points: string[] | null
          created_at: string
          creative_idea: string | null
          cta_text: string | null
          generated_image_url: string | null
          headline: string | null
          id: string
          message_type: string
          product_description: string | null
          product_name: string
          source_images: string[] | null
          subheadline: string | null
          text_layout: string | null
          user_id: string
        }
        Insert: {
          aspect_ratio?: string
          bullet_points?: string[] | null
          created_at?: string
          creative_idea?: string | null
          cta_text?: string | null
          generated_image_url?: string | null
          headline?: string | null
          id?: string
          message_type?: string
          product_description?: string | null
          product_name?: string
          source_images?: string[] | null
          subheadline?: string | null
          text_layout?: string | null
          user_id: string
        }
        Update: {
          aspect_ratio?: string
          bullet_points?: string[] | null
          created_at?: string
          creative_idea?: string | null
          cta_text?: string | null
          generated_image_url?: string | null
          headline?: string | null
          id?: string
          message_type?: string
          product_description?: string | null
          product_name?: string
          source_images?: string[] | null
          subheadline?: string | null
          text_layout?: string | null
          user_id?: string
        }
        Relationships: []
      }
      landing_projects: {
        Row: {
          created_at: string
          desired_tone: string | null
          id: string
          market_country: string | null
          price: string | null
          product_description: string | null
          product_images: string[] | null
          product_name: string
          status: string
          strategy_output: Json | null
          structure_output: Json | null
          target_audience: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          desired_tone?: string | null
          id?: string
          market_country?: string | null
          price?: string | null
          product_description?: string | null
          product_images?: string[] | null
          product_name: string
          status?: string
          strategy_output?: Json | null
          structure_output?: Json | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          desired_tone?: string | null
          id?: string
          market_country?: string | null
          price?: string | null
          product_description?: string | null
          product_images?: string[] | null
          product_name?: string
          status?: string
          strategy_output?: Json | null
          structure_output?: Json | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      landing_sections: {
        Row: {
          copy_direction: string | null
          created_at: string
          generated_copy: Json | null
          goal: string | null
          id: string
          image_style: string | null
          image_url: string | null
          project_id: string
          section_order: number
          section_type: string
          status: string
          updated_at: string
        }
        Insert: {
          copy_direction?: string | null
          created_at?: string
          generated_copy?: Json | null
          goal?: string | null
          id?: string
          image_style?: string | null
          image_url?: string | null
          project_id: string
          section_order?: number
          section_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          copy_direction?: string | null
          created_at?: string
          generated_copy?: Json | null
          goal?: string | null
          id?: string
          image_style?: string | null
          image_url?: string | null
          project_id?: string
          section_order?: number
          section_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "landing_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_periods: {
        Row: {
          ad_spend_usd: number
          confirmed_orders: number
          created_at: string
          date_from: string
          date_to: string
          delivered_orders: number
          delivery_discount: number
          id: string
          packaging_cost: number
          product_id: string
          purchase_price: number
          received_orders: number
          selling_price: number
          updated_at: string
        }
        Insert: {
          ad_spend_usd?: number
          confirmed_orders?: number
          created_at?: string
          date_from?: string
          date_to?: string
          delivered_orders?: number
          delivery_discount?: number
          id?: string
          packaging_cost?: number
          product_id: string
          purchase_price?: number
          received_orders?: number
          selling_price?: number
          updated_at?: string
        }
        Update: {
          ad_spend_usd?: number
          confirmed_orders?: number
          created_at?: string
          date_from?: string
          date_to?: string
          delivered_orders?: number
          delivery_discount?: number
          id?: string
          packaging_cost?: number
          product_id?: string
          purchase_price?: number
          received_orders?: number
          selling_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_periods_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      synced_daily_stats: {
        Row: {
          confirmed: number
          created: number
          delivered: number
          id: string
          product_name: string
          returned: number
          stat_date: string
          synced_at: string
          user_id: string
        }
        Insert: {
          confirmed?: number
          created?: number
          delivered?: number
          id?: string
          product_name: string
          returned?: number
          stat_date: string
          synced_at?: string
          user_id: string
        }
        Update: {
          confirmed?: number
          created?: number
          delivered?: number
          id?: string
          product_name?: string
          returned?: number
          stat_date?: string
          synced_at?: string
          user_id?: string
        }
        Relationships: []
      }
      synced_product_inputs: {
        Row: {
          ad_spend: number
          id: string
          packaging_cost: number
          product_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_spend?: number
          id?: string
          packaging_cost?: number
          product_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_spend?: number
          id?: string
          packaging_cost?: number
          product_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      synced_products: {
        Row: {
          delivery_discount: number
          id: string
          name: string
          purchase_price: number
          sale_price: number
          synced_at: string
          total_confirmed: number
          total_created: number
          total_delivered: number
          total_returned: number
          user_id: string
        }
        Insert: {
          delivery_discount?: number
          id?: string
          name: string
          purchase_price?: number
          sale_price?: number
          synced_at?: string
          total_confirmed?: number
          total_created?: number
          total_delivered?: number
          total_returned?: number
          user_id: string
        }
        Update: {
          delivery_discount?: number
          id?: string
          name?: string
          purchase_price?: number
          sale_price?: number
          synced_at?: string
          total_confirmed?: number
          total_created?: number
          total_delivered?: number
          total_returned?: number
          user_id?: string
        }
        Relationships: []
      }
      test_product_competitors: {
        Row: {
          created_at: string
          id: string
          selling_price: number
          test_product_id: string
          video_url: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          selling_price?: number
          test_product_id: string
          video_url?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          selling_price?: number
          test_product_id?: string
          video_url?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_product_competitors_test_product_id_fkey"
            columns: ["test_product_id"]
            isOneToOne: false
            referencedRelation: "test_products"
            referencedColumns: ["id"]
          },
        ]
      }
      test_product_scores: {
        Row: {
          created_at: string
          has_videos: number
          id: string
          selling_now: number
          small_no_variants: number
          solves_problem: number
          test_product_id: string
          updated_at: string
          wow_factor: number
        }
        Insert: {
          created_at?: string
          has_videos?: number
          id?: string
          selling_now?: number
          small_no_variants?: number
          solves_problem?: number
          test_product_id: string
          updated_at?: string
          wow_factor?: number
        }
        Update: {
          created_at?: string
          has_videos?: number
          id?: string
          selling_now?: number
          small_no_variants?: number
          solves_problem?: number
          test_product_id?: string
          updated_at?: string
          wow_factor?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_product_scores_test_product_id_fkey"
            columns: ["test_product_id"]
            isOneToOne: true
            referencedRelation: "test_products"
            referencedColumns: ["id"]
          },
        ]
      }
      test_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          confirmation_cost: number
          created_at: string
          currency_rate: number
          id: string
          operation_cost_per_order: number
          return_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmation_cost?: number
          created_at?: string
          currency_rate?: number
          id?: string
          operation_cost_per_order?: number
          return_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmation_cost?: number
          created_at?: string
          currency_rate?: number
          id?: string
          operation_cost_per_order?: number
          return_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
