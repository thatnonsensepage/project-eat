export type DealType = "bogo" | "percent_off" | "flat_off" | "bundle" | "mystery";
export type PromoStatus = "draft" | "live" | "paused" | "exhausted" | "expired";
export type WalletStatus = "active" | "greyed_out" | "removed";

export type GridPromo = {
  id: string;
  biz_id: string;
  item_name: string;
  deal_type: DealType;
  deal_value: number | null;
  description: string | null;
  valid_to: string;
  quota: number | null;
  claimed_count: number;
  status: PromoStatus;
  tags: string[];
  restocked_at: string | null;
  created_at: string;
  price: number | null;
  photo: string | null;
  biz_name: string;
  biz_tagline: string | null;
  halal: boolean;
  cuisine_tags: string[];
  photos: string[];
  theme: string;
  distance_m: number | null;
};

export type BizStats = {
  active_promos: number;
  total_promos: number;
  waiting_now: number;
  claimed_total: number;
  redeemed_total: number;
  redeemed_today: number;
  bookmarks: number;
  est_revenue: number;
};

export type WalletItem = {
  id: string;
  status: WalletStatus;
  saved_at: string;
  greyed_out_at: string | null;
  promo: {
    id: string;
    item_name: string;
    deal_type: DealType;
    deal_value: number | null;
    description: string | null;
    valid_to: string;
    status: PromoStatus;
    biz: { id: string; name: string; contact_number: string | null };
  };
};

export type DemandRow = {
  promo_id: string;
  item_name: string;
  status: PromoStatus;
  active_saves: number;
  claimed_count: number;
  redeemed_count: number;
  quota: number | null;
  valid_to: string;
};
