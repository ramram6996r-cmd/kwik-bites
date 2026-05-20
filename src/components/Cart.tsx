import React, { useState } from "react";
import { 
  X, ShoppingBag, Plus, Minus, Tag, AlertCircle, 
  MapPin, User, Phone, CheckCircle, ExternalLink, Copy
} from "lucide-react";
import { FoodProduct, CartItem, Coupon, Order } from "../types";
import { db, collection, addDoc, OperationType, handleFirestoreError } from "../lib/firebase";

interface CartProps {
  cartItems: CartItem[];
  foods: FoodProduct[];
  coupons: Coupon[];
  onClose: () => void;
  onUpdateQuantity: (product: FoodProduct, size: "half" | "full", delta: number) => void;
  onClearCart: () => void;
}

export default function Cart({
  cartItems,
  foods,
  coupons,
  onClose,
  onUpdateQuantity,
  onClearCart
}: CartProps) {
  // Checkout form details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [customCouponCode, setCustomCouponCode] = useState("");

  // Order submission
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderSummary, setPlacedOrderSummary] = useState<string>("");
  const [whatsAppLink, setWhatsAppLink] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Derived calculations
  const calculateItemPrice = (item: CartItem): number => {
    if (item.selectedSize === "half" && item.product.has_half_plate && item.product.half_plate_price !== undefined) {
      return item.product.half_plate_price;
    }
    return item.product.full_plate_price;
  };

  const getSubtotal = (): number => {
    return cartItems.reduce((acc, item) => {
      return acc + (calculateItemPrice(item) * item.quantity);
    }, 0);
  };

  // 4) Check for Buy One Get One Free savings (Requirement 4)
  const calculateBogoSavings = (): { totalFreeItems: number; totalSavings: number; bogoBreakdown: string[] } => {
    let totalFreeItems = 0;
    let totalSavings = 0;
    const bogoBreakdown: string[] = [];

    cartItems.forEach(item => {
      // If product has been marked as BOGO (is_bogo is true)
      if (item.product.is_bogo) {
        // Zomato/Swiggy standard: "Buy 1 Get 1 free"
        // Hence, for every item added, you get 1 free, or:
        // mathematically, if quantity is N, you pay for N, and receive an additional N items for free!
        // We calculate savings = N * single item price
        const price = calculateItemPrice(item);
        const freeCount = item.quantity; // You get as many free as you purchased!
        totalFreeItems += freeCount;
        totalSavings += freeCount * price;
        bogoBreakdown.push(`${item.product.product_name} (${item.selectedSize}) x${item.quantity}`);
      }
    });

    return { totalFreeItems, totalSavings, bogoBreakdown };
  };

  const bogoInfo = calculateBogoSavings();
  const subtotal = getSubtotal();

  // 3) Coupon Rules Validation (Requirement 3)
  const validateAndGetDiscount = (coupon: Coupon): { valid: boolean; error: string; discount: number } => {
    // A) Check active status
    if (!coupon.active_status) {
      return { valid: false, error: "This coupon code is currently inactive", discount: 0 };
    }

    // B) Check minimum order amount
    if (subtotal < coupon.min_order_amount) {
      return { 
        valid: false, 
        error: `Requires a minimum cart value of ₹${coupon.min_order_amount} (Add ₹${coupon.min_order_amount - subtotal} more to qualify)`, 
        discount: 0 
      };
    }

    // C) Check and validate #101 Special Product Specific code
    if (coupon.product_specific) {
      const targetTerm = coupon.product_specific.toLowerCase().trim(); // e.g., "#101"
      
      const matchingQuantity = cartItems.reduce((acc, item) => {
        const nameMatches = item.product.product_name.toLowerCase().includes(targetTerm);
        const descMatches = (item.product.description || "").toLowerCase().includes(targetTerm);
        const tagMatches = !!(item.product.product_tag && item.product.product_tag.toLowerCase().includes(targetTerm));
        if (nameMatches || descMatches || tagMatches) {
          return acc + item.quantity;
        }
        return acc;
      }, 0);

      if (matchingQuantity === 0) {
        return { 
          valid: false, 
          error: `Only valid when buying signature items tagged with '${coupon.product_specific}' (e.g., items with Tag ${coupon.product_specific})`, 
          discount: 0 
        };
      }

      if (matchingQuantity < 2) {
        return {
          valid: false,
          error: `Minimum 2 items with Tag '${coupon.product_specific}' are required to apply this coupon. (Select ${2 - matchingQuantity} more matching dish to unlock!)`,
          discount: 0
        };
      }
    }

    // D) Calculate discount values
    let discountAmount = 0;
    if (coupon.product_specific && coupon.product_specific.trim()) {
      const targetTerm = coupon.product_specific.toLowerCase().trim();
      
      // Calculate specific subtotal of matching items
      const specificSubtotal = cartItems.reduce((acc, item) => {
        const nameMatches = item.product.product_name.toLowerCase().includes(targetTerm);
        const descMatches = (item.product.description || "").toLowerCase().includes(targetTerm);
        const tagMatches = !!(item.product.product_tag && item.product.product_tag.toLowerCase().includes(targetTerm));
        if (nameMatches || descMatches || tagMatches) {
          return acc + (calculateItemPrice(item) * item.quantity);
        }
        return acc;
      }, 0);

      if (coupon.discount_type === "percentage") {
        discountAmount = Math.round((specificSubtotal * coupon.discount_value) / 100);
      } else {
        discountAmount = Math.min(coupon.discount_value, specificSubtotal);
      }
    } else {
      // General discount on overall cart
      if (coupon.discount_type === "percentage") {
        discountAmount = Math.round((subtotal * coupon.discount_value) / 100);
      } else {
        discountAmount = coupon.discount_value;
      }
    }

    // Cap discount to subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    return { valid: true, error: "", discount: discountAmount };
  };

  const handleApplyCoupon = (coupon: Coupon) => {
    setCouponError("");
    const result = validateAndGetDiscount(coupon);
    if (result.valid) {
      setAppliedCoupon(coupon);
    } else {
      setCouponError(result.error);
      setAppliedCoupon(null);
    }
  };

  const handleApplyCustomCode = () => {
    setCouponError("");
    const codeSearched = customCouponCode.toUpperCase().trim();
    if (!codeSearched) return;

    const matchedCoupon = coupons.find(c => c.code === codeSearched);
    if (matchedCoupon) {
      handleApplyCoupon(matchedCoupon);
    } else {
      setCouponError(`Invalide coupon code "${codeSearched}". Please configure coupons in Admin Backend.`);
      setAppliedCoupon(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  // Apply chosen discount, if any
  const discountAmount = appliedCoupon ? validateAndGetDiscount(appliedCoupon).discount : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // Compile WhatsApp preformatted and encode link (Requirement 6)
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    setIsSubmitting(true);

    try {
      const couponAppliedCode = appliedCoupon ? appliedCoupon.code : "None";
      
      // Save order payload into Firebase db collection `/orders` (Core Requirement #1)
      const path = "orders";
      const orderPayload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        items: cartItems.map(item => ({
          product_name: item.product.product_name,
          selectedSize: item.selectedSize,
          quantity: item.quantity,
          price: calculateItemPrice(item)
        })),
        total_before_discount: subtotal,
        discount_amount: discountAmount,
        grand_total: grandTotal,
        applied_coupon: couponAppliedCode,
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, path), orderPayload);

      // Build swiggy/zomato style WhatsApp text message (6)
      let message = `🍽️ *KWIK BITES FEAST ORDER CONFIRMATION*\n`;
      message += `==============================\n\n`;
      message += `*CUSTOMER DETAILS:*\n`;
      message += `👤 Name: ${customerName}\n`;
      message += `📞 Contact: ${customerPhone}\n`;
      message += `📍 Address: ${deliveryAddress}\n\n`;

      message += `*ITEMS CONFIGURED:*\n`;
      cartItems.forEach((item) => {
        const itemPrice = calculateItemPrice(item);
        const itemSub = itemPrice * item.quantity;
        const bogoLabel = item.product.is_bogo ? " [BOGO ACTIVE]" : "";
        message += `• ${item.product.product_name} (${item.selectedSize === "half" ? "Half Plate" : "Full Plate"}) x${item.quantity} | ₹${itemSub}${bogoLabel}\n`;
      });
      message += `\n`;

      if (bogoInfo.totalFreeItems > 0) {
        message += `🎁 *BUY 1 GET 1 FREE SUMMARY (BOGO):*\n`;
        message += `You will receive an additional *${bogoInfo.totalFreeItems} free items* of:\n`;
        bogoInfo.bogoBreakdown.forEach(breakItem => {
          message += `• ${breakItem} [Totally Free!]\n`;
        });
        message += `Estimated savings: *₹${bogoInfo.totalSavings}*\n\n`;
      }

      message += `------------------------------\n`;
      message += `🛒 Cart Subtotal: ₹${subtotal}\n`;
      if (appliedCoupon) {
        message += `🎟️ Coupon Applied: ${appliedCoupon.code} (-₹${discountAmount})\n`;
      }
      message += `💵 *GRAND TOTAL: ₹${grandTotal}*\n`;
      message += `------------------------------\n\n`;
      message += `Please prepare my dishes fresh! Kwik Bites Deliver on WhatsApp linked!`;

      // Set state and render success view
      setPlacedOrderSummary(message);
      
      // WhatsApp default API link builder
      // Use clean standard sanitization for link
      const encodedText = encodeURIComponent(message);
      // Construct classic WhatsApp link (we can default to checkout trigger)
      const link = `https://api.whatsapp.com/send?phone=919611029911&text=${encodedText}`;
      setWhatsAppLink(link);
      
      setOrderPlaced(true);
      onClearCart();
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, "orders");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(placedOrderSummary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end font-sans transition-all" id="cart-drawer-overlay">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col justify-between overflow-hidden" id="cart-drawer-container">
        {/* Header */}
        <div className="bg-slate-950 text-white p-4 px-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-rose-500" />
            <h3 className="font-bold text-base">Your Gourmet Food Plate</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white"
            id="btn-close-cart"
          >
            <X className="h-5.5 w-5.5" />
          </button>
        </div>

        {orderPlaced ? (
          /* SUCCESS SCREEN DISPLAY */
          <div className="flex-grow p-6 flex flex-col gap-6 overflow-y-auto" id="checkout-success-container">
            <div className="text-center py-4 flex flex-col items-center">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="h-9 w-9" />
              </div>
              <h4 className="text-xl font-black text-slate-950">Grand Order Placed!</h4>
              <p className="text-xs text-slate-500 mt-1">Logged to Firestore database & Compiled for WhatsApp</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">WhatsApp Message Preview:</span>
                <button
                  onClick={handleCopyMessage}
                  className="p-1 px-2.5 bg-slate-200 hover:bg-slate-300 rounded text-xs text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Copy formatted checkout message"
                >
                  <Copy className="h-3 w-3" />
                  {copiedText ? "Copied!" : "Copy Order Text"}
                </button>
              </div>
              <pre className="text-[11px] font-mono whitespace-pre-wrap text-slate-800 bg-white p-3.5 rounded-xl border border-slate-100 max-h-56 overflow-y-auto">
                {placedOrderSummary}
              </pre>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={whatsAppLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black text-center rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:transform active:scale-95"
                id="whats-app-submit-action"
              >
                <span>SEND TO WHATSAPP NOW</span>
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={onClose}
                className="w-full py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-bold text-center rounded-xl cursor-pointer"
              >
                Return to Storefront
              </button>
            </div>
          </div>
        ) : cartItems.length === 0 ? (
          /* EMPTY PLATE SCREEN */
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center" id="cart-empty-panel">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-slate-300" />
            </div>
            <h4 className="text-base font-bold text-slate-950">Your cart is empty</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">Double-tap plates of delicious Biryani, Starters, or Desserts to load them up.</p>
            <button 
              onClick={onClose}
              className="mt-4 px-5 py-2.5 bg-rose-500 text-white font-bold text-xs rounded-lg hover:bg-rose-600 cursor-pointer"
            >
              Browse Menu Now
            </button>
          </div>
        ) : (
          /* CART ACTIVE VIEW */
          <div className="flex-grow flex flex-col overflow-hidden" id="cart-active-panel">
            {/* Products Scroller list */}
            <div className="flex-grow p-4 md:p-6 overflow-y-auto flex flex-col gap-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Added Dishes</h4>

              <div className="flex flex-col gap-3 divide-y divide-slate-100">
                {cartItems.map((item, index) => {
                  const singlePrice = calculateItemPrice(item);
                  const itemSubtotal = singlePrice * item.quantity;

                  return (
                    <div key={`${item.product.id}-${item.selectedSize}`} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="font-bold text-sm text-slate-950 truncate max-w-[200px]">{item.product.product_name}</h5>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">
                            {item.selectedSize === "half" ? "Half" : "Full"}
                          </span>
                          {item.product.is_bogo && (
                            <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-bold uppercase">
                              BOGO +1 Free
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-900 mt-1">₹{singlePrice}</p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center border border-slate-200 rounded-lg p-1 bg-slate-50">
                          <button
                            onClick={() => onUpdateQuantity(item.product, item.selectedSize, -1)}
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2.5 font-bold text-xs text-slate-950">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.product, item.selectedSize, 1)}
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="font-mono text-xs font-extrabold text-slate-950 w-14 text-right">₹{itemSubtotal}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BOGO Savings Display */}
              {bogoInfo.totalFreeItems > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs">
                  <span className="p-1 bg-rose-500 text-white rounded-md mt-0.5">🎁</span>
                  <div>
                    <span className="font-extrabold text-rose-950 block">BUY 1 GET 1 FREE SAVINGS ACTIVATED!</span>
                    <span className="text-slate-600 text-[11px] font-medium block mt-0.5">
                      You will receive <strong className="text-rose-600 font-extrabold">{bogoInfo.totalFreeItems} free backup portions</strong> of your BOGO items automatically in your shipment bags.
                    </span>
                    <span className="text-rose-700 font-extrabold mt-1 block">Saved over ₹{bogoInfo.totalSavings}!</span>
                  </div>
                </div>
              )}

              {/* ACTIVE APPLIED COUPONS AND ACCORDION (Requirement 3) */}
              <div className="border-t border-slate-200 pt-5 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Apply Kwik Bites Coupons</h4>
                
                {appliedCoupon ? (
                  <div className="bg-emerald-50 text-emerald-950 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4.5 w-4.5 text-emerald-600" />
                      <div>
                        <span className="text-xs block font-bold text-emerald-800 font-mono tracking-wider">{appliedCoupon.code} Applied!</span>
                        <span className="text-[11px] text-emerald-600">{appliedCoupon.description}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-emerald-800 hover:text-emerald-950 text-xs font-black cursor-pointer bg-white px-2 py-1 rounded border border-emerald-100"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ENTER PROMO CODE (WELCOME200)"
                      value={customCouponCode}
                      onChange={(e) => setCustomCouponCode(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs flex-grow font-semibold font-mono uppercase focus:outline-hidden"
                    />
                    <button
                      onClick={handleApplyCustomCode}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {couponError && (
                  <div className="text-[11px] text-amber-700 font-semibold bg-amber-50 rounded-lg border border-amber-100 p-2.5 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span>{couponError}</span>
                  </div>
                )}

                {/* Micro-Selector list for coupons */}
                {!appliedCoupon && coupons.length > 0 && (
                  <div className="flex flex-col gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Available Coupons:</span>
                    <div className="flex flex-col gap-2">
                      {coupons.map(coupon => {
                        const { valid, error } = validateAndGetDiscount(coupon);
                        return (
                          <button
                            key={coupon.id}
                            onClick={() => handleApplyCoupon(coupon)}
                            disabled={!valid}
                            className={`text-left p-3 rounded-xl border flex items-start gap-4 transition-all ${
                              valid
                                ? "border-slate-200 hover:border-slate-350 bg-white cursor-pointer hover:shadow-2xs active:scale-[0.99]"
                                : "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                            }`}
                          >
                            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg font-bold font-mono text-[11px]">
                              {coupon.code}
                            </div>
                            <div className="flex-grow min-w-0">
                              <span className="font-bold text-xs text-slate-900 block">{coupon.description}</span>
                              <span className="text-[10px] text-slate-500 block">Min. order value: ₹{coupon.min_order_amount}</span>
                              {!valid && error && (
                                <span className="text-[9px] text-amber-600 font-semibold block mt-0.5">{error}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* CHECKOUT DELIVER DETAILS */}
              <form onSubmit={handleCheckoutSubmit} className="border-t border-slate-200 pt-5 flex flex-col gap-3.5 mb-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Delivery Address</h4>
                
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Customer Full Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg h-9"
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Delivery Number (WhatsApp Active) *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg h-9"
                  />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    required
                    rows={2}
                    placeholder="Physical Delivery Address Details, Block, Landmark *"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg"
                  />
                </div>

                {/* Grand Total bill box */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-2 mt-2">
                  <div className="flex justify-between text-xs text-slate-600 font-bold">
                    <span>Items Subtotal:</span>
                    <span>₹{subtotal}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-xs text-rose-600 font-bold">
                      <span>🎟️ coupon Applied ({appliedCoupon.code}):</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between font-extrabold text-sm text-slate-950">
                    <span>Grand Payable Amount:</span>
                    <span className="text-base font-extrabold text-rose-600">₹{grandTotal}</span>
                  </div>
                </div>

                {/* Placing action */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-sm rounded-xl tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-200 transition-all active:transform active:scale-95 disabled:bg-slate-400"
                >
                  {isSubmitting ? "Syncing Order History..." : `PLACE ORDER & COMPILE FOR WHATSAPP • ₹${grandTotal}`}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
