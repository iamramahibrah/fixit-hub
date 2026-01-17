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
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      deadlines: {
        Row: {
          created_at: string
          description: string | null
          due_date: string
          id: string
          is_completed: boolean
          penalty: number | null
          title: string
          type: Database["public"]["Enums"]["deadline_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          is_completed?: boolean
          penalty?: number | null
          title: string
          type?: Database["public"]["Enums"]["deadline_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          is_completed?: boolean
          penalty?: number | null
          title?: string
          type?: Database["public"]["Enums"]["deadline_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      etims_submissions: {
        Row: {
          control_unit_date: string | null
          control_unit_number: string | null
          created_at: string
          error_message: string | null
          fiscal_code: string | null
          id: string
          invoice_id: string
          qr_code_url: string | null
          receipt_number: string | null
          request_payload: Json | null
          response_payload: Json | null
          retry_count: number | null
          status: Database["public"]["Enums"]["etims_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          control_unit_date?: string | null
          control_unit_number?: string | null
          created_at?: string
          error_message?: string | null
          fiscal_code?: string | null
          id?: string
          invoice_id: string
          qr_code_url?: string | null
          receipt_number?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["etims_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          control_unit_date?: string | null
          control_unit_number?: string | null
          created_at?: string
          error_message?: string | null
          fiscal_code?: string | null
          id?: string
          invoice_id?: string
          qr_code_url?: string | null
          receipt_number?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["etims_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etims_submissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_kra_pin: string | null
          customer_name: string
          customer_phone: string | null
          due_date: string
          etims_control_number: string | null
          etims_qr_code: string | null
          etims_status: Database["public"]["Enums"]["etims_status"] | null
          id: string
          invoice_number: string
          items: Json
          payment_method: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
          vat_amount: number
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_kra_pin?: string | null
          customer_name: string
          customer_phone?: string | null
          due_date: string
          etims_control_number?: string | null
          etims_qr_code?: string | null
          etims_status?: Database["public"]["Enums"]["etims_status"] | null
          id?: string
          invoice_number: string
          items?: Json
          payment_method?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
          vat_amount?: number
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_kra_pin?: string | null
          customer_name?: string
          customer_phone?: string | null
          due_date?: string
          etims_control_number?: string | null
          etims_qr_code?: string | null
          etims_status?: Database["public"]["Enums"]["etims_status"] | null
          id?: string
          invoice_number?: string
          items?: Json
          payment_method?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
          vat_amount?: number
        }
        Relationships: []
      }
      loyalty_customers: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone: string
          points_balance: number
          total_points_earned: number
          total_points_redeemed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          phone: string
          points_balance?: number
          total_points_earned?: number
          total_points_redeemed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string
          points_balance?: number
          total_points_earned?: number
          total_points_redeemed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          id: string
          points: number
          sale_amount: number | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          points: number
          sale_amount?: number | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          points?: number
          sale_amount?: number | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "loyalty_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          payment_method: string
          payment_reference: string | null
          status: string
          subscription_plan: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_method: string
          payment_reference?: string | null
          status?: string
          subscription_plan: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_method?: string
          payment_reference?: string | null
          status?: string
          subscription_plan?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pos_sessions: {
        Row: {
          closing_cash: number | null
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          opening_cash: number | null
          started_at: string
          total_sales: number | null
          total_transactions: number | null
          user_id: string
        }
        Insert: {
          closing_cash?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          opening_cash?: number | null
          started_at?: string
          total_sales?: number | null
          total_transactions?: number | null
          user_id: string
        }
        Update: {
          closing_cash?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          opening_cash?: number | null
          started_at?: string
          total_sales?: number | null
          total_transactions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          annual_price: number
          badge: string | null
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_highlighted: boolean | null
          monthly_price: number
          name: string
          plan_key: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          annual_price?: number
          badge?: string | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_highlighted?: boolean | null
          monthly_price?: number
          name: string
          plan_key: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          annual_price?: number
          badge?: string | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_highlighted?: boolean | null
          monthly_price?: number
          name?: string
          plan_key?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_public: boolean | null
          minimum_stock: number | null
          name: string
          public_description: string | null
          quantity: number
          show_price: boolean | null
          sku: string | null
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          minimum_stock?: number | null
          name: string
          public_description?: string | null
          quantity?: number
          show_price?: boolean | null
          sku?: string | null
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          minimum_stock?: number | null
          name?: string
          public_description?: string | null
          quantity?: number
          show_price?: boolean | null
          sku?: string | null
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          business_type: string | null
          created_at: string
          email: string | null
          email_reminders: boolean | null
          id: string
          is_vat_registered: boolean | null
          kra_api_key: string | null
          kra_api_secret: string | null
          kra_pin: string | null
          login_background_url: string | null
          login_image_url: string | null
          logo_url: string | null
          mpesa_consumer_key: string | null
          mpesa_consumer_secret: string | null
          mpesa_passkey: string | null
          mpesa_paybill: string | null
          mpesa_shortcode: string | null
          mpesa_till_number: string | null
          paystack_public_key: string | null
          paystack_secret_key: string | null
          pesapal_consumer_key: string | null
          pesapal_consumer_secret: string | null
          phone_number: string | null
          reminder_days_before: number | null
          sms_reminders: boolean | null
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          subscription_ends_at: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
          whatsapp_reminders: boolean | null
        }
        Insert: {
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          email?: string | null
          email_reminders?: boolean | null
          id?: string
          is_vat_registered?: boolean | null
          kra_api_key?: string | null
          kra_api_secret?: string | null
          kra_pin?: string | null
          login_background_url?: string | null
          login_image_url?: string | null
          logo_url?: string | null
          mpesa_consumer_key?: string | null
          mpesa_consumer_secret?: string | null
          mpesa_passkey?: string | null
          mpesa_paybill?: string | null
          mpesa_shortcode?: string | null
          mpesa_till_number?: string | null
          paystack_public_key?: string | null
          paystack_secret_key?: string | null
          pesapal_consumer_key?: string | null
          pesapal_consumer_secret?: string | null
          phone_number?: string | null
          reminder_days_before?: number | null
          sms_reminders?: boolean | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          subscription_ends_at?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
          whatsapp_reminders?: boolean | null
        }
        Update: {
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          email?: string | null
          email_reminders?: boolean | null
          id?: string
          is_vat_registered?: boolean | null
          kra_api_key?: string | null
          kra_api_secret?: string | null
          kra_pin?: string | null
          login_background_url?: string | null
          login_image_url?: string | null
          logo_url?: string | null
          mpesa_consumer_key?: string | null
          mpesa_consumer_secret?: string | null
          mpesa_passkey?: string | null
          mpesa_paybill?: string | null
          mpesa_shortcode?: string | null
          mpesa_till_number?: string | null
          paystack_public_key?: string | null
          paystack_secret_key?: string | null
          pesapal_consumer_key?: string | null
          pesapal_consumer_secret?: string | null
          phone_number?: string | null
          reminder_days_before?: number | null
          sms_reminders?: boolean | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          subscription_ends_at?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_reminders?: boolean | null
        }
        Relationships: []
      }
      public_page_content: {
        Row: {
          content_type: string
          content_value: string | null
          created_at: string
          id: string
          is_active: boolean | null
          page_name: string
          section_key: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          content_type?: string
          content_value?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          page_name: string
          section_key: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          content_type?: string
          content_value?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          page_name?: string
          section_key?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      service_offerings: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_accounts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_user_id: string
          permissions: Json | null
          phone: string | null
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_user_id: string
          permissions?: Json | null
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_user_id?: string
          permissions?: Json | null
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          cashier_id: string | null
          category: string
          created_at: string
          customer: string | null
          date: string
          description: string
          id: string
          is_vat_applicable: boolean
          payment_method: string | null
          payment_reference: string | null
          receipt_image: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
          vat_amount: number | null
          vendor: string | null
        }
        Insert: {
          amount: number
          cashier_id?: string | null
          category: string
          created_at?: string
          customer?: string | null
          date?: string
          description: string
          id?: string
          is_vat_applicable?: boolean
          payment_method?: string | null
          payment_reference?: string | null
          receipt_image?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
          vat_amount?: number | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          cashier_id?: string | null
          category?: string
          created_at?: string
          customer?: string | null
          date?: string
          description?: string
          id?: string
          is_vat_applicable?: boolean
          payment_method?: string | null
          payment_reference?: string | null
          receipt_image?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
          vat_amount?: number | null
          vendor?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      get_app_setting: { Args: { setting_key: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "cashier" | "super_admin" | "staff"
      deadline_type: "vat" | "income-tax" | "custom"
      etims_status:
        | "pending"
        | "submitted"
        | "verified"
        | "failed"
        | "cancelled"
      expense_category:
        | "rent"
        | "stock"
        | "transport"
        | "utilities"
        | "salaries"
        | "marketing"
        | "equipment"
        | "other"
      invoice_status: "draft" | "sent" | "paid" | "overdue"
      sale_category: "product" | "service"
      subscription_plan: "free_trial" | "starter" | "business" | "pro"
      transaction_type: "sale" | "expense"
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
      app_role: ["admin", "user", "cashier", "super_admin", "staff"],
      deadline_type: ["vat", "income-tax", "custom"],
      etims_status: ["pending", "submitted", "verified", "failed", "cancelled"],
      expense_category: [
        "rent",
        "stock",
        "transport",
        "utilities",
        "salaries",
        "marketing",
        "equipment",
        "other",
      ],
      invoice_status: ["draft", "sent", "paid", "overdue"],
      sale_category: ["product", "service"],
      subscription_plan: ["free_trial", "starter", "business", "pro"],
      transaction_type: ["sale", "expense"],
    },
  },
} as const
