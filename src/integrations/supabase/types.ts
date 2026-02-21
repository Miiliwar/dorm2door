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
      cafes: {
        Row: {
          closing_time: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          location: string | null
          manager_id: string | null
          name: string
          opening_time: string | null
          updated_at: string
        }
        Insert: {
          closing_time?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string | null
          manager_id?: string | null
          name: string
          opening_time?: string | null
          updated_at?: string
        }
        Update: {
          closing_time?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string | null
          manager_id?: string | null
          name?: string
          opening_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_assignments: {
        Row: {
          assigned_at: string
          delivered_at: string | null
          id: string
          order_id: string
          picked_up_at: string | null
          status: string
          worker_id: string
        }
        Insert: {
          assigned_at?: string
          delivered_at?: string | null
          id?: string
          order_id: string
          picked_up_at?: string | null
          status?: string
          worker_id: string
        }
        Update: {
          assigned_at?: string
          delivered_at?: string | null
          id?: string
          order_id?: string
          picked_up_at?: string | null
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "delivery_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_workers: {
        Row: {
          created_at: string
          id: string
          is_free: boolean
          rating: number | null
          total_deliveries: number
          total_earnings: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_free?: boolean
          rating?: number | null
          total_deliveries?: number
          total_earnings?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_free?: boolean
          rating?: number | null
          total_deliveries?: number
          total_earnings?: number
          user_id?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          available_quantity: number
          cafe_id: string
          category: string
          created_at: string
          description: string | null
          estimated_prep_time: number | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          cafe_id: string
          category?: string
          created_at?: string
          description?: string | null
          estimated_prep_time?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          cafe_id?: string
          category?: string
          created_at?: string
          description?: string | null
          estimated_prep_time?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_order_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_order_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_order_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          order_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cafe_id: string
          created_at: string
          delivery_building: string | null
          delivery_comments: string | null
          delivery_dorm_number: string | null
          delivery_fee: number | null
          delivery_floor: string | null
          delivery_full_name: string | null
          delivery_phone: string | null
          delivery_type: string
          id: string
          order_code: string
          payment_method: string | null
          payment_screenshot_url: string | null
          payment_status: string
          service_fee: number | null
          status: string
          student_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          cafe_id: string
          created_at?: string
          delivery_building?: string | null
          delivery_comments?: string | null
          delivery_dorm_number?: string | null
          delivery_fee?: number | null
          delivery_floor?: string | null
          delivery_full_name?: string | null
          delivery_phone?: string | null
          delivery_type?: string
          id?: string
          order_code: string
          payment_method?: string | null
          payment_screenshot_url?: string | null
          payment_status?: string
          service_fee?: number | null
          status?: string
          student_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          cafe_id?: string
          created_at?: string
          delivery_building?: string | null
          delivery_comments?: string | null
          delivery_dorm_number?: string | null
          delivery_fee?: number | null
          delivery_floor?: string | null
          delivery_full_name?: string | null
          delivery_phone?: string | null
          delivery_type?: string
          id?: string
          order_code?: string
          payment_method?: string | null
          payment_screenshot_url?: string | null
          payment_status?: string
          service_fee?: number | null
          status?: string
          student_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cafe_manager" | "student" | "delivery_worker"
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
      app_role: ["admin", "cafe_manager", "student", "delivery_worker"],
    },
  },
} as const
