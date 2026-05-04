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
      bookings: {
        Row: {
          address: string
          arrived_at: string | null
          booking_type: string
          cancellation_fee: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          category_id: string
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          duration: string | null
          id: string
          partner_id: string | null
          payment_method: string | null
          payment_status: string
          preferences: Json | null
          price: number
          professional_id: string | null
          professional_name: string | null
          rating: number | null
          rating_comment: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          refund_status: string | null
          scheduled_at: string | null
          service_id: string
          service_name: string
          start_otp: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          arrived_at?: string | null
          booking_type: string
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category_id: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          partner_id?: string | null
          payment_method?: string | null
          payment_status?: string
          preferences?: Json | null
          price?: number
          professional_id?: string | null
          professional_name?: string | null
          rating?: number | null
          rating_comment?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          refund_status?: string | null
          scheduled_at?: string | null
          service_id: string
          service_name: string
          start_otp?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          arrived_at?: string | null
          booking_type?: string
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category_id?: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          partner_id?: string | null
          payment_method?: string | null
          payment_status?: string
          preferences?: Json | null
          price?: number
          professional_id?: string | null
          professional_name?: string | null
          rating?: number | null
          rating_comment?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          refund_status?: string | null
          scheduled_at?: string | null
          service_id?: string
          service_name?: string
          start_otp?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_availability: {
        Row: {
          available_now: boolean
          listed_today: boolean
          partner_id: string
          updated_at: string
        }
        Insert: {
          available_now?: boolean
          listed_today?: boolean
          partner_id: string
          updated_at?: string
        }
        Update: {
          available_now?: boolean
          listed_today?: boolean
          partner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_earnings: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          customer_name: string | null
          earned_at: string
          id: string
          partner_id: string
          service_name: string
        }
        Insert: {
          amount?: number
          booking_id: string
          created_at?: string
          customer_name?: string | null
          earned_at?: string
          id?: string
          partner_id: string
          service_name: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          customer_name?: string | null
          earned_at?: string
          id?: string
          partner_id?: string
          service_name?: string
        }
        Relationships: []
      }
      partner_schedule: {
        Row: {
          created_at: string
          days: string[]
          end_time: string
          id: string
          partner_id: string
          position: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days?: string[]
          end_time: string
          id?: string
          partner_id: string
          position?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days?: string[]
          end_time?: string
          id?: string
          partner_id?: string
          position?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          is_default: boolean
          kind: string
          label: string
          last4: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          kind: string
          label: string
          last4?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          kind?: string
          label?: string
          last4?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          method: string
          status: string
          transaction_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          method?: string
          status?: string
          transaction_ref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          method?: string
          status?: string
          transaction_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aadhaar_last4: string | null
          aadhaar_verified: boolean
          about: string | null
          accepted_terms: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          default_address_id: string | null
          email: string | null
          full_name: string
          id: string
          mobile: string | null
          mobile_verified: boolean
          updated_at: string
        }
        Insert: {
          aadhaar_last4?: string | null
          aadhaar_verified?: boolean
          about?: string | null
          accepted_terms?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_address_id?: string | null
          email?: string | null
          full_name: string
          id: string
          mobile?: string | null
          mobile_verified?: boolean
          updated_at?: string
        }
        Update: {
          aadhaar_last4?: string | null
          aadhaar_verified?: boolean
          about?: string | null
          accepted_terms?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_address_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          mobile?: string | null
          mobile_verified?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      saved_addresses: {
        Row: {
          city: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string
          latitude: number | null
          line1: string
          longitude: number | null
          pincode: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          latitude?: number | null
          line1: string
          longitude?: number | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          line1?: string
          longitude?: number | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      app_role: "customer" | "partner" | "admin"
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
      app_role: ["customer", "partner", "admin"],
    },
  },
} as const
