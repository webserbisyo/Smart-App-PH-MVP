
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"id": string,"phone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"id": string,"phone"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"id"?: string,"phone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"shop_settings": {
                  Row: {
                    "accepting_orders": boolean,"address": string | null,"busy_until": string | null,"city": string | null,"cod_enabled": boolean,"color_accent": string,"color_primary": string,"color_secondary": string,"cover_path": string | null,"delivery_enabled": boolean,"delivery_fee_via_messenger": boolean,"email": string | null,"facebook_url": string | null,"logo_path": string | null,"maps_url": string | null,"messenger_username": string | null,"pay_later_pickup": boolean,"phone": string | null,"pickup_enabled": boolean,"show_member_count": boolean,"tagline": string | null,"tenant_id": string,"unpaid_expiry_minutes": number,"walk_in_enabled": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "accepting_orders"?: boolean,"address"?: string | null,"busy_until"?: string | null,"city"?: string | null,"cod_enabled"?: boolean,"color_accent"?: string,"color_primary"?: string,"color_secondary"?: string,"cover_path"?: string | null,"delivery_enabled"?: boolean,"delivery_fee_via_messenger"?: boolean,"email"?: string | null,"facebook_url"?: string | null,"logo_path"?: string | null,"maps_url"?: string | null,"messenger_username"?: string | null,"pay_later_pickup"?: boolean,"phone"?: string | null,"pickup_enabled"?: boolean,"show_member_count"?: boolean,"tagline"?: string | null,"tenant_id": string,"unpaid_expiry_minutes"?: number,"walk_in_enabled"?: boolean
                  }
                  Update: {
                    "accepting_orders"?: boolean,"address"?: string | null,"busy_until"?: string | null,"city"?: string | null,"cod_enabled"?: boolean,"color_accent"?: string,"color_primary"?: string,"color_secondary"?: string,"cover_path"?: string | null,"delivery_enabled"?: boolean,"delivery_fee_via_messenger"?: boolean,"email"?: string | null,"facebook_url"?: string | null,"logo_path"?: string | null,"maps_url"?: string | null,"messenger_username"?: string | null,"pay_later_pickup"?: boolean,"phone"?: string | null,"pickup_enabled"?: boolean,"show_member_count"?: boolean,"tagline"?: string | null,"tenant_id"?: string,"unpaid_expiry_minutes"?: number,"walk_in_enabled"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "shop_settings_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: true
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenant_members": {
                  Row: {
                    "created_at": string,"role": string,"status": string,"tenant_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role"?: string,"status"?: string,"tenant_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: string,"status"?: string,"tenant_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_members_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenants": {
                  Row: {
                    "business_type": string,"created_at": string,"id": string,"is_demo": boolean,"name": string,"paid_until": string | null,"plan": string | null,"slug": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_type": string,"created_at"?: string,"id"?: string,"is_demo"?: boolean,"name": string,"paid_until"?: string | null,"plan"?: string | null,"slug": string,"status"?: string
                  }
                  Update: {
                    "business_type"?: string,"created_at"?: string,"id"?: string,"is_demo"?: boolean,"name"?: string,"paid_until"?: string | null,"plan"?: string | null,"slug"?: string,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_my_shop":
{ Args: { "p_business_type": string,"p_name": string,"p_slug": string }; Returns: {
              "business_type": string,
"created_at": string,
"id": string,
"is_demo": boolean,
"name": string,
"paid_until": string | null,
"plan": string | null,
"slug": string,
"status": string
            }
                          SetofOptions: {
        from: "*"
        to: "tenants"
        isOneToOne: true
        isSetofReturn: false
      } },
"slug_available":
{ Args: { "p_slug": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
