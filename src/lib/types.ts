// Add OneSignal types
declare global {
  interface Window {
    OneSignalDeferred?: ((OneSignal: any) => void)[];
    OneSignal?: any;
  }
}

export interface PromoCode {
  id: string;
  code: string;
  direction: string;
  discount_type: string;
  discount_value: number;
  start_date: string;
  end_date: string;
  max_uses: number | null;
  current_uses: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string | null;
}

export {};