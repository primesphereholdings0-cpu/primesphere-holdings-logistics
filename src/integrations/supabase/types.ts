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
      audit_logs: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          payload?: Json | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string
          default_currency: string
          default_fx_rate: number
          email: string | null
          id: string
          logo_url: string | null
          notifications_enabled: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string
          default_currency?: string
          default_fx_rate?: number
          email?: string | null
          id?: string
          logo_url?: string | null
          notifications_enabled?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          default_currency?: string
          default_fx_rate?: number
          email?: string | null
          id?: string
          logo_url?: string | null
          notifications_enabled?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_amount: number
          contract_currency: string
          created_at: string
          customer_id: string
          end_date: string | null
          id: string
          route: string
          start_date: string | null
          status: string
        }
        Insert: {
          contract_amount?: number
          contract_currency?: string
          created_at?: string
          customer_id: string
          end_date?: string | null
          id?: string
          route: string
          start_date?: string | null
          status?: string
        }
        Update: {
          contract_amount?: number
          contract_currency?: string
          created_at?: string
          customer_id?: string
          end_date?: string | null
          id?: string
          route?: string
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          company_name: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          status: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          status?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      driver_payments: {
        Row: {
          amount_tzs: number
          created_at: string
          driver_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_type: string
          period_label: string | null
          reference_trip: string | null
        }
        Insert: {
          amount_tzs?: number
          created_at?: string
          driver_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_type?: string
          period_label?: string | null
          reference_trip?: string | null
        }
        Update: {
          amount_tzs?: number
          created_at?: string
          driver_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_type?: string
          period_label?: string | null
          reference_trip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_payments_reference_trip_fkey"
            columns: ["reference_trip"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          base_location: string | null
          created_at: string
          full_name: string
          id: string
          license_number: string | null
          monthly_salary_tzs: number
          phone: string | null
        }
        Insert: {
          base_location?: string | null
          created_at?: string
          full_name: string
          id?: string
          license_number?: string | null
          monthly_salary_tzs?: number
          phone?: string | null
        }
        Update: {
          base_location?: string | null
          created_at?: string
          full_name?: string
          id?: string
          license_number?: string | null
          monthly_salary_tzs?: number
          phone?: string | null
        }
        Relationships: []
      }
      trip_expenses: {
        Row: {
          amount_tzs: number
          category: string
          created_at: string
          description: string | null
          id: string
          receipt_url: string | null
          status: string
          trip_id: string
          volume_liters: number | null
        }
        Insert: {
          amount_tzs?: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          receipt_url?: string | null
          status?: string
          trip_id: string
          volume_liters?: number | null
        }
        Update: {
          amount_tzs?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          receipt_url?: string | null
          status?: string
          trip_id?: string
          volume_liters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_financials: {
        Row: {
          advance_input_type: string
          advance_paid_tzs: number
          advance_paid_usd: number
          advance_value: number
          contract_amount: number
          contract_currency: string
          created_at: string
          fx_exchange_rate: number
          id: string
          total_contract_tzs: number | null
          trip_id: string
        }
        Insert: {
          advance_input_type?: string
          advance_paid_tzs?: number
          advance_paid_usd?: number
          advance_value?: number
          contract_amount?: number
          contract_currency?: string
          created_at?: string
          fx_exchange_rate?: number
          id?: string
          total_contract_tzs?: number | null
          trip_id: string
        }
        Update: {
          advance_input_type?: string
          advance_paid_tzs?: number
          advance_paid_usd?: number
          advance_value?: number
          contract_amount?: number
          contract_currency?: string
          created_at?: string
          fx_exchange_rate?: number
          id?: string
          total_contract_tzs?: number | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_financials_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          audited_at: string | null
          contract_id: string | null
          created_at: string
          customer_id: string | null
          dispatch_date: string | null
          driver_id: string | null
          id: string
          origin_destination: string
          planned_km: number
          return_date: string | null
          settled_at: string | null
          status: string
          trip_code: string
          vehicle_id: string | null
        }
        Insert: {
          audited_at?: string | null
          contract_id?: string | null
          created_at?: string
          customer_id?: string | null
          dispatch_date?: string | null
          driver_id?: string | null
          id?: string
          origin_destination: string
          planned_km?: number
          return_date?: string | null
          settled_at?: string | null
          status?: string
          trip_code: string
          vehicle_id?: string | null
        }
        Update: {
          audited_at?: string | null
          contract_id?: string | null
          created_at?: string
          customer_id?: string | null
          dispatch_date?: string | null
          driver_id?: string | null
          id?: string
          origin_destination?: string
          planned_km?: number
          return_date?: string | null
          settled_at?: string | null
          status?: string
          trip_code?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity_tons: number
          created_at: string
          id: string
          model: string
          reg_number: string
          status: string
        }
        Insert: {
          capacity_tons?: number
          created_at?: string
          id?: string
          model: string
          reg_number: string
          status?: string
        }
        Update: {
          capacity_tons?: number
          created_at?: string
          id?: string
          model?: string
          reg_number?: string
          status?: string
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
      app_role: "admin" | "dispatcher" | "finance" | "driver"
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
      app_role: ["admin", "dispatcher", "finance", "driver"],
    },
  },
} as const
