
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": string,"meta": NonNullable<Json>,"target_id": string,"target_type": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"meta"?: NonNullable<Json>,"target_id": string,"target_type": string,"tenant_id": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"meta"?: NonNullable<Json>,"target_id"?: string,"target_type"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"business_hours": {
                  Row: {
                    "closes_at": string,"opens_at": string,"tenant_id": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "closes_at": string,"opens_at": string,"tenant_id": string,"weekday": number
                  }
                  Update: {
                    "closes_at"?: string,"opens_at"?: string,"tenant_id"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_hours_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"icon_kind": string | null,"icon_value": string | null,"id": string,"is_hidden": boolean,"name": string,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"icon_kind"?: string | null,"icon_value"?: string | null,"id"?: string,"is_hidden"?: boolean,"name": string,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "created_at"?: string,"icon_kind"?: string | null,"icon_value"?: string | null,"id"?: string,"is_hidden"?: boolean,"name"?: string,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"closures": {
                  Row: {
                    "closed_on": string,"note": string | null,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_on": string,"note"?: string | null,"tenant_id": string
                  }
                  Update: {
                    "closed_on"?: string,"note"?: string | null,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "closures_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "channel": string,"created_at": string,"customer_id": string,"granted": boolean,"id": string,"source": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel": string,"created_at"?: string,"customer_id": string,"granted": boolean,"id"?: string,"source": string,"tenant_id": string
                  }
                  Update: {
                    "channel"?: string,"created_at"?: string,"customer_id"?: string,"granted"?: boolean,"id"?: string,"source"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_customer_id_tenant_id_fkey"
      columns: ["customer_id","tenant_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "consents_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_addresses": {
                  Row: {
                    "address_line": string,"created_at": string,"customer_id": string,"id": string,"is_default": boolean,"label": string,"landmark": string | null,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line": string,"created_at"?: string,"customer_id": string,"id"?: string,"is_default"?: boolean,"label"?: string,"landmark"?: string | null,"tenant_id": string
                  }
                  Update: {
                    "address_line"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"is_default"?: boolean,"label"?: string,"landmark"?: string | null,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_addresses_customer_id_tenant_id_fkey"
      columns: ["customer_id","tenant_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "customer_addresses_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"last_order_at": string | null,"member_since": string | null,"name": string,"notes": string | null,"order_count": number,"phone": string,"tags": (string)[],"tenant_id": string,"total_spent": number,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"last_order_at"?: string | null,"member_since"?: string | null,"name": string,"notes"?: string | null,"order_count"?: number,"phone": string,"tags"?: (string)[],"tenant_id": string,"total_spent"?: number,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"last_order_at"?: string | null,"member_since"?: string | null,"name"?: string,"notes"?: string | null,"order_count"?: number,"phone"?: string,"tags"?: (string)[],"tenant_id"?: string,"total_spent"?: number,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"delivery_zones": {
                  Row: {
                    "created_at": string,"eta_text": string | null,"fee": number,"id": string,"is_active": boolean,"name": string,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"eta_text"?: string | null,"fee": number,"id"?: string,"is_active"?: boolean,"name": string,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "created_at"?: string,"eta_text"?: string | null,"fee"?: number,"id"?: string,"is_active"?: boolean,"name"?: string,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "delivery_zones_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"item_option_groups": {
                  Row: {
                    "group_id": string,"item_id": string,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"item_id": string,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "group_id"?: string,"item_id"?: string,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_option_groups_group_id_tenant_id_fkey"
      columns: ["group_id","tenant_id"]
isOneToOne: false
      referencedRelation: "option_groups"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "item_option_groups_item_id_tenant_id_fkey"
      columns: ["item_id","tenant_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "item_option_groups_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"item_photos": {
                  Row: {
                    "id": string,"item_id": string,"path": string,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"item_id": string,"path": string,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "id"?: string,"item_id"?: string,"path"?: string,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_photos_item_id_tenant_id_fkey"
      columns: ["item_id","tenant_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "item_photos_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"item_variants": {
                  Row: {
                    "archived_at": string | null,"id": string,"is_sold_out": boolean,"item_id": string,"low_stock_at": number | null,"name": string,"price": number,"sort": number,"stock_on_hand": number | null,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"id"?: string,"is_sold_out"?: boolean,"item_id": string,"low_stock_at"?: number | null,"name": string,"price": number,"sort"?: number,"stock_on_hand"?: number | null,"tenant_id": string
                  }
                  Update: {
                    "archived_at"?: string | null,"id"?: string,"is_sold_out"?: boolean,"item_id"?: string,"low_stock_at"?: number | null,"name"?: string,"price"?: number,"sort"?: number,"stock_on_hand"?: number | null,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_variants_item_id_tenant_id_fkey"
      columns: ["item_id","tenant_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "item_variants_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"items": {
                  Row: {
                    "category_id": string | null,"created_at": string,"description": string | null,"id": string,"is_featured": boolean,"name": string,"sort": number,"status": string,"tenant_id": string,"track_stock": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_featured"?: boolean,"name": string,"sort"?: number,"status"?: string,"tenant_id": string,"track_stock"?: boolean
                  }
                  Update: {
                    "category_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_featured"?: boolean,"name"?: string,"sort"?: number,"status"?: string,"tenant_id"?: string,"track_stock"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_category_id_tenant_id_fkey"
      columns: ["category_id","tenant_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "items_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"loyalty_ledger": {
                  Row: {
                    "created_at": string,"customer_id": string,"delta": number,"id": string,"order_id": string | null,"reason": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_id": string,"delta": number,"id"?: string,"order_id"?: string | null,"reason": string,"tenant_id": string
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"delta"?: number,"id"?: string,"order_id"?: string | null,"reason"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "loyalty_ledger_customer_id_tenant_id_fkey"
      columns: ["customer_id","tenant_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "loyalty_ledger_order_id_tenant_id_fkey"
      columns: ["order_id","tenant_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "loyalty_ledger_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"loyalty_rules": {
                  Row: {
                    "is_active": boolean,"min_order_total": number,"reward_amount": number,"reward_label": string,"stamps_needed": number,"tenant_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "is_active"?: boolean,"min_order_total"?: number,"reward_amount"?: number,"reward_label"?: string,"stamps_needed"?: number,"tenant_id": string,"updated_at"?: string
                  }
                  Update: {
                    "is_active"?: boolean,"min_order_total"?: number,"reward_amount"?: number,"reward_label"?: string,"stamps_needed"?: number,"tenant_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "loyalty_rules_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: true
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"option_groups": {
                  Row: {
                    "created_at": string,"id": string,"max_select": number,"min_select": number,"name": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"max_select"?: number,"min_select"?: number,"name": string,"tenant_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"max_select"?: number,"min_select"?: number,"name"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "option_groups_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"options": {
                  Row: {
                    "group_id": string,"id": string,"is_sold_out": boolean,"name": string,"price_delta": number,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"id"?: string,"is_sold_out"?: boolean,"name": string,"price_delta"?: number,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "group_id"?: string,"id"?: string,"is_sold_out"?: boolean,"name"?: string,"price_delta"?: number,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "options_group_id_tenant_id_fkey"
      columns: ["group_id","tenant_id"]
isOneToOne: false
      referencedRelation: "option_groups"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "options_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"order_counters": {
                  Row: {
                    "business_date": string,"last_no": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_date": string,"last_no": number,"tenant_id": string
                  }
                  Update: {
                    "business_date"?: string,"last_no"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_counters_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"order_events": {
                  Row: {
                    "actor": string,"created_at": string,"from_status": string | null,"id": string,"kind": string,"note": string | null,"order_id": string,"tenant_id": string,"to_status": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"created_at"?: string,"from_status"?: string | null,"id"?: string,"kind": string,"note"?: string | null,"order_id": string,"tenant_id": string,"to_status"?: string | null
                  }
                  Update: {
                    "actor"?: string,"created_at"?: string,"from_status"?: string | null,"id"?: string,"kind"?: string,"note"?: string | null,"order_id"?: string,"tenant_id"?: string,"to_status"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_events_order_id_tenant_id_fkey"
      columns: ["order_id","tenant_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "order_events_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "id": string,"item_id": string | null,"item_name": string,"line_total": number,"note": string | null,"options": NonNullable<Json>,"options_total": number,"order_id": string,"qty": number,"sort": number,"tenant_id": string,"unit_price": number,"variant_id": string | null,"variant_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"item_id"?: string | null,"item_name": string,"line_total": number,"note"?: string | null,"options"?: NonNullable<Json>,"options_total"?: number,"order_id": string,"qty": number,"sort"?: number,"tenant_id": string,"unit_price": number,"variant_id"?: string | null,"variant_name": string
                  }
                  Update: {
                    "id"?: string,"item_id"?: string | null,"item_name"?: string,"line_total"?: number,"note"?: string | null,"options"?: NonNullable<Json>,"options_total"?: number,"order_id"?: string,"qty"?: number,"sort"?: number,"tenant_id"?: string,"unit_price"?: number,"variant_id"?: string | null,"variant_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_item_id_tenant_id_fkey"
      columns: ["item_id","tenant_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "order_items_order_id_tenant_id_fkey"
      columns: ["order_id","tenant_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "order_items_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variant_id_tenant_id_fkey"
      columns: ["variant_id","tenant_id"]
isOneToOne: false
      referencedRelation: "item_variants"
      referencedColumns: ["id","tenant_id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "address_line": string | null,"business_date": string,"cancel_reason": string | null,"cancelled_at": string | null,"client_key": string,"completed_at": string | null,"customer_id": string | null,"customer_name": string,"customer_phone": string,"delivery_fee": number,"delivery_zone_id": string | null,"discount_total": number,"expires_at": string | null,"fulfillment": string,"id": string,"landmark": string | null,"notes": string | null,"order_no": number,"paid_at": string | null,"payment_method": string,"payment_status": string,"pickup_at": string | null,"placed_at": string,"ready_at": string | null,"status": string,"subtotal": number,"tenant_id": string,"token": string,"total": number,"tracking_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line"?: string | null,"business_date": string,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"client_key": string,"completed_at"?: string | null,"customer_id"?: string | null,"customer_name": string,"customer_phone": string,"delivery_fee"?: number,"delivery_zone_id"?: string | null,"discount_total"?: number,"expires_at"?: string | null,"fulfillment": string,"id"?: string,"landmark"?: string | null,"notes"?: string | null,"order_no": number,"paid_at"?: string | null,"payment_method": string,"payment_status"?: string,"pickup_at"?: string | null,"placed_at"?: string,"ready_at"?: string | null,"status"?: string,"subtotal": number,"tenant_id": string,"token": string,"total": number,"tracking_url"?: string | null
                  }
                  Update: {
                    "address_line"?: string | null,"business_date"?: string,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"client_key"?: string,"completed_at"?: string | null,"customer_id"?: string | null,"customer_name"?: string,"customer_phone"?: string,"delivery_fee"?: number,"delivery_zone_id"?: string | null,"discount_total"?: number,"expires_at"?: string | null,"fulfillment"?: string,"id"?: string,"landmark"?: string | null,"notes"?: string | null,"order_no"?: number,"paid_at"?: string | null,"payment_method"?: string,"payment_status"?: string,"pickup_at"?: string | null,"placed_at"?: string,"ready_at"?: string | null,"status"?: string,"subtotal"?: number,"tenant_id"?: string,"token"?: string,"total"?: number,"tracking_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_customer_id_tenant_id_fkey"
      columns: ["customer_id","tenant_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "orders_delivery_zone_id_tenant_id_fkey"
      columns: ["delivery_zone_id","tenant_id"]
isOneToOne: false
      referencedRelation: "delivery_zones"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "orders_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_accounts": {
                  Row: {
                    "account_name": string,"account_number": string,"bank_name": string | null,"created_at": string,"id": string,"is_active": boolean,"method": string,"qr_path": string | null,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_name": string,"account_number": string,"bank_name"?: string | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"method": string,"qr_path"?: string | null,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "account_name"?: string,"account_number"?: string,"bank_name"?: string | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"method"?: string,"qr_path"?: string | null,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_accounts_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"method": string,"order_id": string,"proof_path": string | null,"reference_no": string | null,"reference_norm": string | null,"reject_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"method": string,"order_id": string,"proof_path"?: string | null,"reference_no"?: string | null,"reference_norm"?: string | null,"reject_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"tenant_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"method"?: string,"order_id"?: string,"proof_path"?: string | null,"reference_no"?: string | null,"reference_norm"?: string | null,"reject_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_order_id_tenant_id_fkey"
      columns: ["order_id","tenant_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "payments_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
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
            "customer_stamp_balances": {
                  Row: {
                    "customer_id": string | null,"stamps": number | null,"tenant_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "loyalty_ledger_customer_id_tenant_id_fkey"
      columns: ["customer_id","tenant_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "loyalty_ledger_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "advance_order":
{ Args: { "p_order_id": string,"p_to_status": string,"p_tracking_url"?: string }; Returns: Json
                           },
"cancel_order":
{ Args: { "p_order_id": string,"p_reason": string }; Returns: Json
                           },
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
"get_my_account":
{ Args: { "p_slug": string }; Returns: Json
                           },
"get_order":
{ Args: { "p_token": string }; Returns: Json
                           },
"get_storefront":
{ Args: { "p_slug": string }; Returns: Json
                           },
"join_as_member":
{ Args: { "p_name": string,"p_order_token"?: string,"p_phone": string,"p_slug": string }; Returns: Json
                           },
"place_order":
{ Args: { "p_payload": Json,"p_slug": string }; Returns: Json
                           },
"quote_order":
{ Args: { "p_payload": Json,"p_slug": string }; Returns: Json
                           },
"record_payment":
{ Args: { "p_method": string,"p_order_id": string }; Returns: Json
                           },
"review_payment":
{ Args: { "p_approve": boolean,"p_payment_id": string,"p_reject_reason"?: string }; Returns: Json
                           },
"save_item":
{ Args: { "p_item": Json }; Returns: Json
                           },
"save_sort_order":
{ Args: { "p_ids": (string)[],"p_kind": string }; Returns: undefined
                           },
"set_stock":
{ Args: { "p_stock_on_hand": number,"p_variant_id": string }; Returns: {
              "archived_at": string | null,
"id": string,
"is_sold_out": boolean,
"item_id": string,
"low_stock_at": number | null,
"name": string,
"price": number,
"sort": number,
"stock_on_hand": number | null,
"tenant_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "item_variants"
        isOneToOne: true
        isSetofReturn: false
      } },
"slug_available":
{ Args: { "p_slug": string }; Returns: boolean
                           },
"submit_payment_proof":
{ Args: { "p_method": string,"p_proof_path": string,"p_reference_no": string,"p_token": string }; Returns: Json
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
