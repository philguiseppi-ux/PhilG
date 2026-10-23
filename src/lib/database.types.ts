export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      datacenters: {
        Row: {
          id: string
          name: string
          code: string
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          address?: string | null
          created_at?: string
        }
      }
      service_categories: {
        Row: {
          id: string
          name: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          created_at?: string
        }
      }
      services: {
        Row: {
          id: string
          code: string
          name: string
          description: string
          category_id: string
          service_type: 'UNIT' | 'OPTION' | 'BASE'
          billing_scope: 'PER_VM' | 'PER_CLIENT' | 'PER_DC' | 'ONE_SHOT'
          billing_mode: 'MONTHLY' | 'ONE_SHOT' | 'BOTH'
          base_price_monthly: number | null
          base_price_one_shot: number | null
          unit: string
          is_active: boolean
          sage_item_code: string
          sage_vat_code: string
          sage_analytic_code: string | null
          vcpu_count: number
          ram_gb: number
          disk_gb: number
          is_multiplier: boolean
          multiplier_value: number
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string
          category_id: string
          service_type?: 'UNIT' | 'OPTION' | 'BASE'
          billing_scope?: 'PER_VM' | 'PER_CLIENT' | 'PER_DC' | 'ONE_SHOT'
          billing_mode?: 'MONTHLY' | 'ONE_SHOT' | 'BOTH'
          base_price_monthly?: number | null
          base_price_one_shot?: number | null
          unit: string
          is_active?: boolean
          sage_item_code?: string
          sage_vat_code?: string
          sage_analytic_code?: string | null
          vcpu_count?: number
          ram_gb?: number
          disk_gb?: number
          is_multiplier?: boolean
          multiplier_value?: number
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string
          category_id?: string
          service_type?: 'UNIT' | 'OPTION' | 'BASE'
          billing_scope?: 'PER_VM' | 'PER_CLIENT' | 'PER_DC' | 'ONE_SHOT'
          billing_mode?: 'MONTHLY' | 'ONE_SHOT' | 'BOTH'
          base_price_monthly?: number | null
          base_price_one_shot?: number | null
          unit?: string
          is_active?: boolean
          sage_item_code?: string
          sage_vat_code?: string
          sage_analytic_code?: string | null
          vcpu_count?: number
          ram_gb?: number
          disk_gb?: number
          is_multiplier?: boolean
          multiplier_value?: number
          created_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          quote_number: string
          client_name: string
          client_company: string
          client_email: string
          client_phone: string
          valid_until: string
          status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'LOST'
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quote_number: string
          client_name: string
          client_company?: string
          client_email?: string
          client_phone?: string
          valid_until: string
          status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'LOST'
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quote_number?: string
          client_name?: string
          client_company?: string
          client_email?: string
          client_phone?: string
          valid_until?: string
          status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'LOST'
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      service_resource_details: {
        Row: {
          id: string
          service_id: string
          resource_type: 'CPU' | 'RAM' | 'DISK'
          quantity: number
          unit: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          resource_type: 'CPU' | 'RAM' | 'DISK'
          quantity?: number
          unit: string
          description?: string
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          resource_type?: 'CPU' | 'RAM' | 'DISK'
          quantity?: number
          unit?: string
          description?: string
          created_at?: string
        }
      }
      service_multipliers: {
        Row: {
          id: string
          service_id: string
          affected_category_id: string
          multiplier_factor: number
          description: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          affected_category_id: string
          multiplier_factor?: number
          description?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          affected_category_id?: string
          multiplier_factor?: number
          description?: string
          is_active?: boolean
          created_at?: string
        }
      }
      service_dependencies: {
        Row: {
          id: string
          parent_service_id: string
          dependent_service_id: string
          dependency_type: 'REQUIRED' | 'OPTIONAL' | 'AUTO_SCALE'
          resource_matcher: 'CPU' | 'RAM' | 'DISK' | 'ALL' | null
          quantity_multiplier: number
          auto_add: boolean
          is_active: boolean
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          parent_service_id: string
          dependent_service_id: string
          dependency_type: 'REQUIRED' | 'OPTIONAL' | 'AUTO_SCALE'
          resource_matcher?: 'CPU' | 'RAM' | 'DISK' | 'ALL' | null
          quantity_multiplier?: number
          auto_add?: boolean
          is_active?: boolean
          description?: string
          created_at?: string
        }
        Update: {
          id?: string
          parent_service_id?: string
          dependent_service_id?: string
          dependency_type?: 'REQUIRED' | 'OPTIONAL' | 'AUTO_SCALE'
          resource_matcher?: 'CPU' | 'RAM' | 'DISK' | 'ALL' | null
          quantity_multiplier?: number
          auto_add?: boolean
          is_active?: boolean
          description?: string
          created_at?: string
        }
      }
      quote_lines: {
        Row: {
          id: string
          quote_id: string
          service_id: string
          datacenter_id: string | null
          description: string
          quantity: number
          base_quantity: number
          billing_selected: 'MONTHLY' | 'ONE_SHOT'
          unit_price: number
          discount_percent: number
          total: number
          vcpu_count: number
          ram_gb: number
          disk_gb: number
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          service_id: string
          datacenter_id?: string | null
          description: string
          quantity?: number
          base_quantity?: number
          billing_selected: 'MONTHLY' | 'ONE_SHOT'
          unit_price: number
          discount_percent?: number
          total: number
          vcpu_count?: number
          ram_gb?: number
          disk_gb?: number
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          service_id?: string
          datacenter_id?: string | null
          description?: string
          quantity?: number
          base_quantity?: number
          billing_selected?: 'MONTHLY' | 'ONE_SHOT'
          unit_price?: number
          discount_percent?: number
          total?: number
          vcpu_count?: number
          ram_gb?: number
          disk_gb?: number
          created_at?: string
        }
      }
    }
  }
}
