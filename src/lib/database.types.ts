
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "categories": {
                  Row: {
                    "created_at": string,"household_id": string,"id": string,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"household_id": string,"id"?: string,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"household_id"?: string,"id"?: string,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"households": {
                  Row: {
                    "created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"invites": {
                  Row: {
                    "code": string,"created_at": string,"created_by": string | null,"expires_at": string,"household_id": string,"id": string,"revoked_at": string | null,"role": Database["public"]['Enums']["member_role"],"used_at": string | null,"used_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"household_id": string,"id"?: string,"revoked_at"?: string | null,"role": Database["public"]['Enums']["member_role"],"used_at"?: string | null,"used_by"?: string | null
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"household_id"?: string,"id"?: string,"revoked_at"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"used_at"?: string | null,"used_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"items": {
                  Row: {
                    "category_id": string,"household_id": string,"id": string,"in_stock": boolean | null,"low_threshold": number | null,"marked_low": boolean,"name": string,"quantity": number | null,"tracking_type": Database["public"]['Enums']["tracking_type"],"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"household_id": string,"id"?: string,"in_stock"?: boolean | null,"low_threshold"?: number | null,"marked_low"?: boolean,"name": string,"quantity"?: number | null,"tracking_type": Database["public"]['Enums']["tracking_type"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "category_id"?: string,"household_id"?: string,"id"?: string,"in_stock"?: boolean | null,"low_threshold"?: number | null,"marked_low"?: boolean,"name"?: string,"quantity"?: number | null,"tracking_type"?: Database["public"]['Enums']["tracking_type"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_household_id_category_id_fkey"
      columns: ["household_id","category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "items_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "display_name": string,"household_id": string,"id": string,"joined_at": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "display_name": string,"household_id": string,"id"?: string,"joined_at"?: string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "display_name"?: string,"household_id"?: string,"id"?: string,"joined_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_household":
{ Args: { "household_name": string,"member_display_name": string }; Returns: string
                           },
"create_invite":
{ Args: { "invite_role": Database["public"]['Enums']["member_role"],"target_household": string }; Returns: {
              "code": string,
"created_at": string,
"created_by": string | null,
"expires_at": string,
"household_id": string,
"id": string,
"revoked_at": string | null,
"role": Database["public"]['Enums']["member_role"],
"used_at": string | null,
"used_by": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "invites"
        isOneToOne: true
        isSetofReturn: false
      } },
"join_household":
{ Args: { "invite_code": string,"member_display_name": string }; Returns: string
                           },
"leave_household":
{ Args: { "target_household": string }; Returns: undefined
                           },
"remove_member":
{ Args: { "target_member": string }; Returns: undefined
                           },
"revoke_invite":
{ Args: { "target_invite": string }; Returns: undefined
                           },
"set_member_role":
{ Args: { "new_role": Database["public"]['Enums']["member_role"],"target_member": string }; Returns: undefined
                           },
"transfer_ownership":
{ Args: { "target_member": string }; Returns: undefined
                           },
"update_display_name":
{ Args: { "new_name": string,"target_household": string }; Returns: undefined
                           }
          }
          Enums: {
            "member_role": "owner"|"editor"|"viewer","tracking_type": "counter"|"yes_no"
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "member_role": ["owner", "editor", "viewer"],"tracking_type": ["counter", "yes_no"]
          }
        }
} as const
