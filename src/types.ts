export interface FoodProduct {
  id?: string;
  product_name: string;
  category: string;
  full_plate_price: number;
  half_plate_price?: number;
  has_half_plate: boolean;
  description: string;
  image_url: string;
  rating: number;
  stock_status: 'instock' | 'out_of_stock';
  is_popular: boolean; // Favorites of the City Display
  is_featured: boolean;
  is_bogo: boolean; // Buy One Buy One (BOGO)
  display_order: number;
  product_tag?: string; // e.g. "#101"
}

export interface Coupon {
  id?: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_order_amount: number;
  product_specific?: string | null; // e.g. "#101" to match item names
  active_status: boolean;
}

export interface CartItem {
  product: FoodProduct;
  selectedSize: 'half' | 'full';
  quantity: number;
}

export interface Order {
  id?: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: {
    product_name: string;
    selectedSize: 'half' | 'full';
    quantity: number;
    price: number;
  }[];
  total_before_discount: number;
  discount_amount: number;
  grand_total: number;
  applied_coupon?: string;
  created_at?: string;
}
