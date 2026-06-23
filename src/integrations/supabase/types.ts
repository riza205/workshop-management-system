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
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          status: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          employee_id: string
          id?: string
          status: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      car_photos: {
        Row: {
          car_id: string
          created_at: string
          id: string
          storage_path: string
        }
        Insert: {
          car_id: string
          created_at?: string
          id?: string
          storage_path: string
        }
        Update: {
          car_id?: string
          created_at?: string
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_photos_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_tasks: {
        Row: {
          assigned_employee_id: string | null
          car_id: string
          created_at: string
          description: string
          done: boolean
          id: string
        }
        Insert: {
          assigned_employee_id?: string | null
          car_id: string
          created_at?: string
          description: string
          done?: boolean
          id?: string
        }
        Update: {
          assigned_employee_id?: string | null
          car_id?: string
          created_at?: string
          description?: string
          done?: boolean
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_tasks_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_tasks_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      cars: {
        Row: {
          created_at: string
          date_in: string
          id: string
          license_plate: string
          make_model: string
          owner_name: string
          owner_phone: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_in: string
          id?: string
          license_plate: string
          make_model: string
          owner_name: string
          owner_phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_in?: string
          id?: string
          license_plate?: string
          make_model?: string
          owner_name?: string
          owner_phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          date_joined: string
          id: string
          name: string
          phone: string
          role: string
        }
        Insert: {
          created_at?: string
          date_joined: string
          id?: string
          name: string
          phone: string
          role: string
        }
        Update: {
          created_at?: string
          date_joined?: string
          id?: string
          name?: string
          phone?: string
          role?: string
        }
        Relationships: []
      }
      job_card_photos: {
        Row: {
          created_at: string
          id: string
          job_card_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_card_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          job_card_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_card_photos_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      job_cards: {
        Row: {
          assigned_date: string | null
          assigned_technician_id: string | null
          complaint: string | null
          created_at: string
          customer_address: string | null
          customer_approval: boolean
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_date: string | null
          estimated_labour_cost: number | null
          estimated_parts_cost: number | null
          final_bill_amount: number | null
          final_labour_charge: number | null
          fuel_level: number | null
          id: string
          job_date: string
          job_number: string
          job_time: string
          mileage_km: number | null
          parts_used: string | null
          status: string
          updated_at: string
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_reg: string
          vehicle_year: number | null
          vin: string | null
          work_done: string | null
        }
        Insert: {
          assigned_date?: string | null
          assigned_technician_id?: string | null
          complaint?: string | null
          created_at?: string
          customer_address?: string | null
          customer_approval?: boolean
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_date?: string | null
          estimated_labour_cost?: number | null
          estimated_parts_cost?: number | null
          final_bill_amount?: number | null
          final_labour_charge?: number | null
          fuel_level?: number | null
          id?: string
          job_date?: string
          job_number?: string
          job_time?: string
          mileage_km?: number | null
          parts_used?: string | null
          status?: string
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_reg: string
          vehicle_year?: number | null
          vin?: string | null
          work_done?: string | null
        }
        Update: {
          assigned_date?: string | null
          assigned_technician_id?: string | null
          complaint?: string | null
          created_at?: string
          customer_address?: string | null
          customer_approval?: boolean
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_date?: string | null
          estimated_labour_cost?: number | null
          estimated_parts_cost?: number | null
          final_bill_amount?: number | null
          final_labour_charge?: number | null
          fuel_level?: number | null
          id?: string
          job_date?: string
          job_number?: string
          job_time?: string
          mileage_km?: number | null
          parts_used?: string | null
          status?: string
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_reg?: string
          vehicle_year?: number | null
          vin?: string | null
          work_done?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_cards_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
