import React, { useState, useEffect } from "react";
import { 
  Search, Star, Check, ShoppingCart, Info, Award, 
  Sparkles, ShieldCheck, Heart, Clock, ChevronRight, Flame,
  Settings, ShoppingBag, MapPin, Tag, Phone, Calendar, 
  Users, ExternalLink, RefreshCw, ClipboardCheck, MessageSquare,
  Gift, Crown, CheckSquare, Plus, Minus, ArrowRight, Download, FileSpreadsheet
} from "lucide-react";
import { FoodProduct, Coupon, CartItem } from "../types";
import SafeImage from "./SafeImage";

interface StorefrontProps {
  foods: FoodProduct[];
  onAddToCart: (product: FoodProduct, size: "half" | "full") => void;
  cartItemCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  cartItems: CartItem[];
  onUpdateQuantity: (product: FoodProduct, size: "half" | "full", delta: number) => void;
  coupons: Coupon[];
}

export default function Storefront({
  foods,
  onAddToCart,
  cartItemCount,
  onOpenCart,
  onOpenAdmin,
  selectedCategory,
  setSelectedCategory,
  cartItems,
  onUpdateQuantity,
  coupons,
}: StorefrontProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("home");
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Address lookup state / placeholder
  const [deliveryAddress, setDeliveryAddress] = useState("BTM, Bangalore");

  // Contact Form State
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactGuests, setContactGuests] = useState("50");
  const [contactDate, setContactDate] = useState("");
  const [contactOccasion, setContactOccasion] = useState("Wedding Catering");
  const [contactNotes, setContactNotes] = useState("");

  // Track selected portion size (half vs full) per product in the storefront
  const [selectedSizes, setSelectedSizes] = useState<Record<string, "half" | "full">>({});

  // Filter States (Swiggy layout inputs)
  const [sortOption, setSortOption] = useState("default");
  const [vegOnlyFilter, setVegOnlyFilter] = useState(false);
  const [rating4PlusFilter, setRating4PlusFilter] = useState(false);
  const [fastDeliveryFilter, setFastDeliveryFilter] = useState(false);

  // Product detail modal state
  const [selectedProductDetails, setSelectedProductDetails] = useState<FoodProduct | null>(null);
  const [selectedProductSpice, setSelectedProductSpice] = useState("Medium Spice (Signature)");
  const [selectedProductPortion, setSelectedProductPortion] = useState<"half" | "full">("full");

  // Helper function to check if a dish is vegetarian
  const isProductVeg = (name: string, category: string) => {
    const ln = name.toLowerCase();
    const lc = category.toLowerCase();
    if (ln.includes("chicken") || ln.includes("mutton") || ln.includes("kebab") || ln.includes("kabab") || lc.includes("non-veg")) {
      return false;
    }
    return true;
  };

  // Static customer reviews array
  const reviews = [
    {
      name: "Anand Viswanathan",
      stars: 5,
      review: "The Mutton Ghee Roast and Biryani from Kwik Bites were phenomenal! Every piece was tender and fragrant. Highly recommend for any home celebrations.",
      location: "Indiranagar, Bangalore",
      date: "2 days ago"
    },
    {
      name: "Deepika Rao",
      stars: 5,
      review: "We ordered catering for our house warming party of 40 guests. The live tandoor station was the highlight. Hygienic, responsive staff, and delicious foods!",
      location: "Koramangala, Bangalore",
      date: "1 week ago"
    },
    {
      name: "Rohan Malhotra",
      stars: 5,
      review: "Amazing service! The customized Double Ka Meetha (#101 tag) is something from heaven. Perfectly sweetened and high quality dry-fruits. 5 stars easily.",
      location: "JP Nagar, Bangalore",
      date: "3 weeks ago"
    }
  ];

  // Initialize selected sizes for products that have half plate
  useEffect(() => {
    const initialSizes: Record<string, "half" | "full"> = {};
    foods.forEach(food => {
      if (food.id) {
        initialSizes[food.id] = food.has_half_plate ? "half" : "full";
      }
    });
    setSelectedSizes(prevState => ({ ...initialSizes, ...prevState }));
  }, [foods]);

  const handleToggleSize = (productId: string, size: "half" | "full") => {
    setSelectedSizes(prev => ({
      ...prev,
      [productId]: size
    }));
  };

  const getProductPrice = (food: FoodProduct) => {
    if (!food.id) return food.full_plate_price;
    const selectedSize = selectedSizes[food.id] || "full";
    if (selectedSize === "half" && food.has_half_plate && food.half_plate_price !== undefined) {
      return food.half_plate_price;
    }
    return food.full_plate_price;
  };

  const getItemCartQty = (productId: string | undefined, size: "half" | "full") => {
    if (!productId) return 0;
    const item = cartItems.find(
      (ci) => ci.product.id === productId && ci.selectedSize === size
    );
    return item ? item.quantity : 0;
  };

  // Filter lists based on states
  const cityFavorites = foods.filter(food => food.is_popular);
  const bogoDeals = foods.filter(food => food.is_bogo);

  const finalFilteredFoods = React.useMemo(() => {
    let list = foods.filter(food => {
      // 1. Search filter matching name, description, category or product tags
      const matchesSearch = food.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            food.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            food.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (food.product_tag && food.product_tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // 2. Selected Category filter
      const matchesCategory = selectedCategory === "All" || food.category === selectedCategory;

      // 3. Vegetarian only filter
      const matchesVeg = !vegOnlyFilter || isProductVeg(food.product_name, food.category);

      // 4. Rating >= 4.5 filter
      const matchesRating = !rating4PlusFilter || food.rating >= 4.5;

      // 5. Instock filter
      const matchesFast = !fastDeliveryFilter || food.stock_status === "instock";

      return matchesSearch && matchesCategory && matchesVeg && matchesRating && matchesFast;
    });

    // Sort order
    if (sortOption === "rating") {
      list = [...list].sort((a, b) => b.rating - a.rating);
    } else if (sortOption === "price_low_high") {
      list = [...list].sort((a, b) => a.full_plate_price - b.full_plate_price);
    } else if (sortOption === "price_high_low") {
      list = [...list].sort((a, b) => b.full_plate_price - a.full_plate_price);
    }

    return list;
  }, [foods, searchQuery, selectedCategory, vegOnlyFilter, rating4PlusFilter, fastDeliveryFilter, sortOption]);

  const categories = React.useMemo(() => {
    return ["All", ...Array.from(new Set(foods.map((f) => f.category))).filter((cat): cat is string => !!cat)];
  }, [foods]);

  const filteredFoods = finalFilteredFoods;

  // Ensure category is valid if menu updates dynamically
  useEffect(() => {
    if (selectedCategory !== "All" && !categories.includes(selectedCategory)) {
      setSelectedCategory("All");
    }
  }, [foods, selectedCategory, categories, setSelectedCategory]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 120; // sticky header padding
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      setActiveSection(id);
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const handleSendInquiry = (serviceName: string) => {
    const text = `Hi Kwik Bites Catering, I am interested in booking your professional catering services for a *${serviceName}*. Please share menu options and packages.`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/919611029911?text=${encoded}`, "_blank");
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `*New Catering Inquiry - Kwik Bites*
-----------------------------
*Name:* ${contactName || "Customer"}
*Phone:* ${contactPhone || "Not specified"}
*Occasion:* ${contactOccasion}
*No of Guests:* ${contactGuests}
*Preferred Date:* ${contactDate || "Not checked yet"}
*Additional Requests:* ${contactNotes || "None"}
-----------------------------
Please confirm packages and pricing options!`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/919611029911?text=${encoded}`, "_blank");
  };

  // Catering services definitions
  const cateringServices = [
    {
      id: "wedding",
      title: "Wedding Catering",
      description: "Grand traditional buffet, designer mocktail counters, luxury plate service, and premium hot tandoors.",
      icon: Crown,
      badge: "Premium Experience",
      color: "from-amber-500 to-amber-600"
    },
    {
      id: "birthday",
      title: "Birthday Parties",
      description: "Fun fusion snack live-stations, customized child-friendly menus, woodfire sliders, and elegant cake cutting support.",
      icon: Gift,
      badge: "Fun & Festive",
      color: "from-rose-500 to-rose-600"
    },
    {
      id: "corporate",
      title: "Corporate Events",
      description: "Sophisticated executive meals, high tea arrangements, hygienic packed boxes, and multi-cuisine corporate menus.",
      icon: Award,
      badge: "Hygienic & Formal",
      color: "from-blue-500 to-blue-600"
    },
    {
      id: "outdoor",
      title: "Outdoor Events",
      description: "Live interactive cooking counters, fresh hand-rolled kathi rolls, smoking BBQ grills, and cooling beverages.",
      icon: Flame,
      badge: "Live Counters",
      color: "from-amber-600 to-rose-500"
    },
    {
      id: "private",
      title: "Private Parties",
      description: "Intimate dynamic dining setups, personal chef experience, craft culinary pairing, and customized appetizers.",
      icon: Heart,
      badge: "Bespoke Taste",
      color: "from-purple-500 to-purple-600"
    },
    {
      id: "home",
      title: "Special Home Functions",
      description: "Homestyle authentic festive recipe catering, pure traditional spices, safe family gatherings, and standard clean serving.",
      icon: Sparkles,
      badge: "Pure & Traditional",
      color: "from-emerald-500 to-emerald-600"
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900" id="storefront-container">

      {/* Main Brand Sticky Header */}
      <nav className="bg-white border-b border-rose-100 py-3.5 px-4 md:px-6 sticky top-0 z-30 shadow-sm" id="storefront-nav">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-rose-500 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-sm">
                K
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-slate-950 flex items-center gap-1.5">
                  Kwik Bites <span className="text-[9px] px-1.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-full font-bold uppercase tracking-wider">Feast</span>
                </h1>
                <p className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-rose-500" /> WhatsApp synced delivery under 25 mins
                </p>
              </div>
            </div>

            {/* Quick Location Badge */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-700">
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              <span>{deliveryAddress}</span>
            </div>
            
            {/* Mobile Cart / Quick Access bar */}
            <div className="sm:hidden flex items-center gap-2">
              <button
                onClick={onOpenCart}
                className="relative p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer shadow-md shadow-rose-200 flex items-center justify-center"
              >
                <ShoppingCart className="h-4 w-4" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-slate-950 text-white font-bold text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                    {cartItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Sticky Menu Bar (Desktop and adaptive tabs) */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full sm:w-auto scrollbar-hidden py-1">
            {[
              { id: "home", label: "Home" },
              { id: "menu", label: "Menu" },
              { id: "favorites", label: "Favorites" },
              { id: "offers", label: "Offers" },
              { id: "services", label: "Services" },
              { id: "reviews", label: "Reviews" },
              { id: "contact", label: "Contact us" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-all whitespace-nowrap ${
                  activeSection === tab.id
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-rose-500 bg-slate-50 hover:bg-rose-50"
                }`}
              >
                {tab.label}
              </button>
            ))}

            <button
              onClick={onOpenCart}
              className="hidden sm:relative sm:flex p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer shadow-md shadow-rose-200 items-center justify-center"
              id="desktop-cart-btn"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-slate-950 text-white font-bold text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Welcome banner ("Home" section) - Swiggy opening page inspired */}
      <section id="home" className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        <div className="bg-radial from-slate-900 via-slate-950 to-black text-white rounded-3xl p-6 md:p-10 shadow-xl text-center relative overflow-hidden flex flex-col items-center gap-5 border border-slate-800">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full -translate-y-8 translate-x-12 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-aurora-500/5 rounded-full translate-y-12 -translate-x-12 blur-3xl" />
          
          <div className="z-10 bg-rose-500 text-white px-3.5 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase flex items-center gap-1.5 shadow-sm">
            <Sparkles className="h-3 w-3 text-amber-300 fill-amber-300" />
            KWIK BITES PREMIUM COMFORT MEALS
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black md:leading-tight tracking-tight z-10">
            Sizzle & Feast on Modern <br />
            <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-rose-300 bg-clip-text text-transparent">Gourmet Indian Comforts</span>
          </h2>
          
          <p className="text-xs md:text-sm text-slate-300 max-w-xl z-10 leading-relaxed font-medium">
            Discover sizzling hot clay ovens, fragrant long-grain hand-crafted biryanis, crispy royal kebabs, and authentic slow-churned sweet treats.
          </p>

          <div className="w-full max-w-xl relative mt-2 z-10 shadow-lg" id="search-input-box">
            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search food, desserts or codes (e.g., Mutton, #101, Tandoori...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white text-slate-900 rounded-xl border-none focus:outline-hidden text-xs h-12 shadow-inner focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Swiggy Vibe quick tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 z-10 text-[10px] mt-1 text-slate-400 font-bold">
            <span>QUICK BROWSE:</span>
            {["Biryani", "Starters", "Desserts", "Special #101"].map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  if (tag === "Special #101") {
                    setSearchQuery("#101");
                    scrollToSection("menu");
                  } else {
                    setSelectedCategory(tag);
                    scrollToSection("menu");
                  }
                }}
                className="bg-slate-900 border border-slate-800 hover:border-rose-500 text-slate-300 hover:text-rose-400 px-2.5 py-1 rounded-full transition-all cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Trust points footer inside home card */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-900 w-full max-w-lg text-[10px] text-slate-400">
            <div>
              <span className="block text-slate-200 font-bold uppercase tracking-wider">Premium Ingredients</span>
              Pure cow ghee & saffron
            </div>
            <div>
              <span className="block text-slate-200 font-bold uppercase tracking-wider">Hot Sealed Packs</span>
              Spill-proof containers
            </div>
            <div>
              <span className="block text-slate-200 font-bold uppercase tracking-wider">Direct WhatsApp</span>
              Hassle-free tracking
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-10">

        {/* LIVE SEARCH RESULTS (Failsafe & Smart Search) */}
        {searchQuery !== "" && (
          <section id="search-results" className="flex flex-col gap-4 bg-rose-50/10 p-4 border border-rose-100/30 rounded-3xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-rose-100/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-500 text-white rounded-lg">
                  <Search className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    Search Results for "{searchQuery}"
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">Found {filteredFoods.length} amazing dishes</p>
                </div>
              </div>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-black text-rose-600 hover:text-rose-800 bg-rose-100/60 px-3 py-1.5 rounded-full border border-rose-200 cursor-pointer"
              >
                Clear Search Results
              </button>
            </div>

            {filteredFoods.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
                <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-slate-700 text-sm">No dishes matched "{searchQuery}"</h4>
                <p className="text-xs text-slate-400 mt-1">Try searching for other dishes like "Biryani", "Paneer", or "Kebab"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {filteredFoods.map((food) => {
                  const pId = food.id || "";
                  const selectedSize = selectedSizes[pId] || "full";
                  const activePrice = getProductPrice(food);
                  const cartQty = getItemCartQty(pId, selectedSize);
                  const isVegItem = isProductVeg(food.product_name, food.category);

                  return (
                    <div 
                      key={food.id} 
                      onClick={() => {
                        setSelectedProductDetails(food);
                        setSelectedProductPortion(selectedSize);
                      }}
                      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all relative flex flex-col justify-between cursor-pointer group"
                    >
                      <div className="relative h-28 sm:h-36 md:h-44">
                        <SafeImage src={food.image_url} alt={food.product_name} />
                        
                        {/* Rating block & Veg/non veg badge */}
                        <div className="absolute top-2 left-2 flex gap-1.5 items-center bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded-lg">
                          <span className={`w-2 h-2 rounded-full ${isVegItem ? "bg-emerald-500" : "bg-rose-500"}`} />
                          <span className="text-[9px] sm:text-[10px] text-white font-black">
                            ★ {food.rating}
                          </span>
                        </div>

                        {/* Traditional Swiggy styled Bottom Image Text Overlay (ITEMS AT price) */}
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent text-white rounded-lg p-1 sm:p-1.5 px-2 flex items-center justify-between text-[8px] sm:text-[10.5px]">
                          <span className="font-extrabold text-[#fecdd3] tracking-tight uppercase line-clamp-1">Gourmet Feast</span>
                          <span className="font-black text-white whitespace-nowrap">₹{food.full_plate_price} ONWARDS</span>
                        </div>
                      </div>

                      <div className="p-2 sm:p-3.5 flex-grow flex flex-col justify-between gap-1 sm:gap-2.5">
                        <div>
                          <div className="flex items-center gap-1">
                            <h4 className="font-black text-slate-950 text-xs sm:text-sm line-clamp-1 flex-1">{food.product_name}</h4>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight font-medium min-h-[22px] sm:min-h-[32px]">
                            {food.description}
                          </p>
                        </div>

                        {/* Portion Sizes Selector */}
                        {food.has_half_plate && (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="bg-slate-50 p-1 sm:p-1.5 rounded-lg border border-slate-100 flex items-center justify-between text-[9px] sm:text-xs font-bold my-0.5"
                          >
                            <span className="text-slate-500 hidden sm:inline">Portion:</span>
                            <div className="flex gap-1 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => handleToggleSize(pId, "half")}
                                className={`px-1.5 py-0.5 rounded transition-all text-[9.5px] sm:text-[10.5px] font-black cursor-pointer ${
                                  selectedSize === "half" ? "bg-rose-500 text-white" : "text-slate-600 hover:text-slate-800"
                                }`}
                              >
                                Half
                              </button>
                              <button
                                onClick={() => handleToggleSize(pId, "full")}
                                className={`px-1.5 py-0.5 rounded transition-all text-[9.5px] sm:text-[10.5px] font-black cursor-pointer ${
                                  selectedSize === "full" ? "bg-rose-500 text-white" : "text-slate-600 hover:text-slate-800"
                                }`}
                              >
                                Full
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="border-t border-slate-50 pt-2 flex items-center justify-between">
                          <div>
                            <span className="text-[8px] text-slate-400 block font-semibold uppercase tracking-wider hidden sm:block">
                              {selectedSize === "half" ? "Half Portion" : "Full Portion"}
                            </span>
                            <span className="text-xs sm:text-base font-black text-slate-950">₹{activePrice}</span>
                          </div>

                          {food.stock_status === "out_of_stock" ? (
                            <span className="text-[9.5px] text-red-500 font-bold px-1.5 py-0.5 bg-red-50 rounded">
                              Sold Out
                            </span>
                          ) : cartQty > 0 ? (
                            <div 
                              onClick={(e) => e.stopPropagation()} 
                              className="flex items-center bg-rose-500 text-white rounded-lg font-black h-7 text-xs border border-rose-600 overflow-hidden"
                            >
                              <button 
                                onClick={() => onUpdateQuantity(food, selectedSize, -1)} 
                                className="px-2 py-0.5 text-xs hover:bg-rose-600 transition-colors cursor-pointer"
                              >
                                <Minus className="h-2.5 w-2.5" />
                              </button>
                              <span className="px-1.5 text-[11px] bg-rose-500 text-white font-bold">{cartQty}</span>
                              <button 
                                onClick={() => onUpdateQuantity(food, selectedSize, 1)} 
                                className="px-2 py-0.5 text-xs hover:bg-rose-600 transition-colors cursor-pointer"
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(food, selectedSize);
                              }}
                              className="bg-white border border-rose-200 text-rose-505 hover:bg-rose-50 p-1 px-3 sm:px-4 rounded-lg text-xs font-extrabold transition-all shadow-xs cursor-pointer text-rose-500"
                            >
                              + ADD
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 1. FAVORITES OF THE CITY SECTION */}
        {cityFavorites.length > 0 && searchQuery === "" && (
          <section id="favorites" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                  <Star className="h-4.5 w-4.5 fill-amber-500" />
                </span>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-950 flex items-center gap-2">
                    Favorites of the City <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full font-bold uppercase">Must Try</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Traditional signature gourmet masterpieces favored across homes</p>
                </div>
              </div>
            </div>

            {/* Grid 2-columns on mobile, responsive desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {cityFavorites.map((food) => {
                const pId = food.id || "";
                const selectedSize = selectedSizes[pId] || "full";
                const activePrice = getProductPrice(food);
                const cartQty = getItemCartQty(pId, selectedSize);
                const isVegItem = isProductVeg(food.product_name, food.category);

                return (
                  <div 
                    key={food.id} 
                    onClick={() => {
                      setSelectedProductDetails(food);
                      setSelectedProductPortion(selectedSize);
                    }}
                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all relative flex flex-col justify-between cursor-pointer group"
                  >
                    <div className="relative h-28 sm:h-36 md:h-44">
                      <SafeImage src={food.image_url} alt={food.product_name} />
                      
                      {/* Rating block & Veg/non veg badge */}
                      <div className="absolute top-2 left-2 flex gap-1.5 items-center bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded-lg z-10">
                        <span className={`w-2 h-2 rounded-full ${isVegItem ? "bg-emerald-500" : "bg-rose-500"}`} />
                        <span className="text-[9px] sm:text-[10px] text-white font-black">
                          ★ {food.rating}
                        </span>
                      </div>

                      {/* Traditional Swiggy styled Image Overlay (ITEMS AT price) */}
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent text-white rounded-lg p-1 sm:p-1.5 px-2 flex items-center justify-between text-[8px] sm:text-[10.5px]">
                        <span className="font-extrabold text-[#fecdd3] tracking-tight uppercase line-clamp-1">Kwik Bites Pick</span>
                        <span className="font-black text-white whitespace-nowrap">₹{food.full_plate_price} ONWARDS</span>
                      </div>
                    </div>

                    <div className="p-2 sm:p-3.5 flex-grow flex flex-col justify-between gap-1 sm:gap-2.5">
                      <div>
                        <h4 className="font-black text-slate-950 text-xs sm:text-sm line-clamp-1 h-4 sm:h-5">{food.product_name}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 min-h-[22px] sm:min-h-[32px] leading-tight font-medium">
                          {food.description}
                        </p>
                      </div>

                      {/* Portion Sizes Selector */}
                      {food.has_half_plate && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="bg-slate-50 p-1 sm:p-1.5 rounded-lg border border-slate-100 flex items-center justify-between text-[9px] sm:text-xs font-bold my-0.5"
                        >
                          <span className="text-slate-500 hidden sm:inline">Portion:</span>
                          <div className="flex gap-1 w-full sm:w-auto justify-end">
                            <button
                              onClick={() => handleToggleSize(pId, "half")}
                              className={`px-1.5 py-0.5 rounded transition-all text-[9.5px] sm:text-[10.5px] font-black cursor-pointer ${
                                selectedSize === "half" ? "bg-rose-500 text-white" : "text-slate-600 hover:text-slate-800"
                              }`}
                            >
                              Half
                            </button>
                            <button
                              onClick={() => handleToggleSize(pId, "full")}
                              className={`px-1.5 py-0.5 rounded transition-all text-[9.5px] sm:text-[10.5px] font-black cursor-pointer ${
                                selectedSize === "full" ? "bg-rose-500 text-white" : "text-slate-600 hover:text-slate-800"
                              }`}
                            >
                              Full
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                        <div>
                          <span className="text-[8px] text-slate-400 block font-semibold uppercase tracking-wider hidden sm:block">
                            {selectedSize === "half" ? "Half Plate" : "Full Plate"}
                          </span>
                          <span className="text-xs sm:text-base font-black text-slate-950">₹{activePrice}</span>
                        </div>

                        {food.stock_status === "out_of_stock" ? (
                          <span className="text-[10px] text-red-500 font-bold px-2 py-1 bg-red-50 rounded">
                            Sold Out
                          </span>
                        ) : cartQty > 0 ? (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center bg-rose-500 text-white rounded-lg font-black h-7 text-xs shadow-xs border border-rose-600 overflow-hidden"
                          >
                            <button 
                              onClick={() => onUpdateQuantity(food, selectedSize, -1)} 
                              className="px-2 py-0.5 text-xs hover:bg-rose-600 transition-colors cursor-pointer"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="px-1.5 font-bold min-w-[12px] text-center text-[11px] bg-rose-500 text-white">{cartQty}</span>
                            <button 
                              onClick={() => onUpdateQuantity(food, selectedSize, 1)} 
                              className="px-2 py-0.5 text-xs hover:bg-rose-600 transition-colors cursor-pointer"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(food, selectedSize);
                            }}
                            className="bg-white border border-rose-200 text-rose-500 font-extrabold hover:bg-rose-50 p-1 px-2.5 sm:px-4 rounded-lg text-xs transition-all tracking-wider shadow-xs cursor-pointer"
                          >
                            + ADD
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 2. BOGO SECTION */}
        {bogoDeals.length > 0 && searchQuery === "" && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                  <Flame className="h-4.5 w-4.5 fill-rose-500 text-rose-500" />
                </span>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-950 flex items-center gap-2">
                    Buy One Get One Free! <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-600 border border-rose-200 rounded-full font-bold">BOGO</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Feast double: 1 free extra portion added on every BOGO dish inside cart</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {bogoDeals.map((food) => {
                const pId = food.id || "";
                const selectedSize = selectedSizes[pId] || "full";
                const activePrice = getProductPrice(food);
                const cartQty = getItemCartQty(pId, selectedSize);
                const isVegItem = isProductVeg(food.product_name, food.category);

                return (
                  <div 
                    key={food.id} 
                    onClick={() => {
                      setSelectedProductDetails(food);
                      setSelectedProductPortion(selectedSize);
                    }}
                    className="bg-white border border-rose-50 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all relative flex flex-col justify-between cursor-pointer group"
                  >
                    <div className="relative h-28 sm:h-36 md:h-44">
                      <SafeImage src={food.image_url} alt={food.product_name} />
                      
                      {/* Rating block & Veg/non veg badge */}
                      <div className="absolute top-2 left-2 flex gap-1.5 items-center bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded-lg z-10">
                        <span className={`w-2 h-2 rounded-full ${isVegItem ? "bg-emerald-500" : "bg-rose-500"}`} />
                        <span className="text-[9px] sm:text-[10px] text-white font-black">
                          ★ {food.rating}
                        </span>
                      </div>

                      {/* Traditional Swiggy styled Image Overlay */}
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent text-white rounded-lg p-1 sm:p-1.5 px-2 flex items-center justify-between text-[8px] sm:text-[10.5px]">
                        <span className="font-extrabold text-[#fecdd3] tracking-tight uppercase line-clamp-1">Buy 1 Get 1 Free</span>
                        <span className="font-black text-white whitespace-nowrap">₹{food.full_plate_price}</span>
                      </div>
                    </div>

                    <div className="p-2 sm:p-3.5 flex-grow flex flex-col justify-between gap-1 sm:gap-2.5">
                      <div>
                        <h4 className="font-extrabold text-slate-950 text-xs sm:text-sm line-clamp-1 h-4 sm:h-5">{food.product_name}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 min-h-[22px] sm:min-h-[32px] leading-tight font-medium">
                          {food.description}
                        </p>
                      </div>

                      {food.has_half_plate && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="bg-slate-50 p-1 sm:p-1.5 rounded-lg border border-slate-100 flex items-center justify-between text-[9px] sm:text-xs font-bold my-0.5"
                        >
                          <span className="text-slate-500 hidden sm:inline">Portion:</span>
                          <div className="flex gap-1 w-full sm:w-auto justify-end">
                            <button
                              onClick={() => handleToggleSize(pId, "half")}
                              className={`px-1.5 py-0.5 rounded transition-all text-[9.5px] sm:text-[10.5px] font-black cursor-pointer ${
                                  selectedSize === "half" ? "bg-rose-500 text-white" : "text-slate-600 hover:text-slate-800"
                              }`}
                            >
                              Half
                            </button>
                            <button
                              onClick={() => handleToggleSize(pId, "full")}
                              className={`px-1.5 py-0.5 rounded transition-all text-[9.5px] sm:text-[10.5px] font-black cursor-pointer ${
                                  selectedSize === "full" ? "bg-rose-500 text-white" : "text-slate-600 hover:text-slate-800"
                              }`}
                            >
                              Full
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                        <div>
                          <span className="text-[8px] text-slate-400 block font-semibold uppercase tracking-wider hidden sm:block">
                            Price
                          </span>
                          <span className="text-xs sm:text-base font-black text-slate-950">₹{activePrice}</span>
                        </div>

                        {food.stock_status === "out_of_stock" ? (
                          <span className="text-[10px] text-red-500 font-bold px-2 py-1 bg-red-50 rounded">
                            Sold Out
                          </span>
                        ) : cartQty > 0 ? (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center bg-rose-500 text-white rounded-lg font-black h-7 text-xs border border-rose-600 overflow-hidden"
                          >
                            <button 
                              onClick={() => onUpdateQuantity(food, selectedSize, -1)} 
                              className="px-2 py-0.5 text-xs hover:bg-rose-600 cursor-pointer"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="px-1.5 text-[11px] bg-rose-500 text-white">{cartQty}</span>
                            <button 
                              onClick={() => onUpdateQuantity(food, selectedSize, 1)} 
                              className="px-2 py-0.5 text-xs hover:bg-rose-600 cursor-pointer"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(food, selectedSize);
                            }}
                            className="bg-white border border-rose-200 text-rose-500 font-extrabold hover:bg-rose-50 p-1 px-2.5 sm:px-4 rounded-lg text-xs transition-all shadow-xs cursor-pointer"
                          >
                            + ADD
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. OFFERS / DISCOUNT COUPONS SECTION */}
        <section id="offers" className="flex flex-col gap-4">
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-rose-100 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                <Tag className="h-4.5 w-4.5 text-rose-500" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-950">Active Promo Deals & Offers</h3>
                <p className="text-xs text-slate-500 font-medium">Copy and apply these coupon codes in your cart to redeem massive discounts!</p>
              </div>
            </div>

            {coupons.length === 0 ? (
              <p className="text-xs text-slate-400">No active coupons currently. Check back later for festive offers!</p>
            ) : (
              // Side-by-side exact 2 items per row in Mobile
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {coupons.map((coupon) => (
                  <div 
                    key={coupon.id} 
                    className="border-2 border-dashed border-rose-100 hover:border-rose-300 rounded-2xl p-2.5 sm:p-4 bg-rose-50/20 relative flex flex-col justify-between gap-2.5"
                  >
                    {/* Tiny punch card side circles for ticket aesthetic */}
                    <div className="absolute top-1/2 -left-2.5 w-5 h-5 bg-slate-50 rounded-full border border-rose-100 -translate-y-1/2" />
                    <div className="absolute top-1/2 -right-2.5 w-5 h-5 bg-slate-50 rounded-full border border-rose-100 -translate-y-1/2" />

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-block px-2.5 py-1 bg-rose-600 text-white font-extrabold text-[10px] sm:text-xs tracking-widest rounded-lg shadow-xs uppercase">
                          {coupon.code}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-emerald-600 font-extrabold flex items-center gap-0.5">
                          ● {coupon.active_status ? "ACTIVE" : "DISABLED"}
                        </span>
                      </div>

                      <p className="text-[10px] sm:text-xs text-slate-700 font-bold mt-2 leading-tight">
                        {coupon.description}
                      </p>

                      <div className="mt-1 text-[9px] text-slate-400 font-semibold">
                        Cart Min: ₹{coupon.min_order_amount} 
                        {coupon.product_specific && ` • Tagged: ${coupon.product_specific}`}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyCoupon(coupon.code)}
                      className={`w-full py-1.5 rounded-lg text-[9.5px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                        copiedCoupon === coupon.code
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-rose-500 border-rose-200 hover:bg-rose-50"
                      }`}
                    >
                      {copiedCoupon === coupon.code ? (
                        <>
                          <Check className="h-3 w-3" />
                          COPIED OK!
                        </>
                      ) : (
                        <>
                          <ClipboardCheck className="h-3 w-3" />
                          TAP TO COPY
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 4. GOV CERTIFIED PRODUCTS & CATEGORY FILTER STICKY ROW */}
        <section id="menu" className="flex flex-col gap-6">
          
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
            <span className="p-1.5 bg-rose-500 text-white rounded-lg font-bold">★</span>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-950">Fresh Gourmet Feast Menu</h3>
              <p className="text-xs text-slate-500 font-medium">Curated daily with chemical-free sourcing, ground spices, and certified kitchen hygiene.</p>
            </div>
          </div>

          {/* Sticky Filter Bar (Scrollable Categories + Search sync) */}
          <div className="sticky top-[73px] sm:top-[74px] bg-slate-50/95 backdrop-blur-md py-3.5 z-20 border-b border-slate-100 flex flex-col gap-2 shadow-xs -mx-4 px-4 md:-mx-6 md:px-6">
            <div className="flex items-center justify-between gap-4 font-bold text-xs text-slate-500">
              <span>EXPLORE CUSTOM CATEGORIES:</span>
              {selectedCategory !== "All" && (
                <button 
                  onClick={() => setSelectedCategory("All")}
                  className="text-rose-500 hover:text-rose-700 font-black"
                >
                  Reset filters
                </button>
              )}
            </div>
            
            <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hidden">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    selectedCategory === cat
                      ? "bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Traditional Swiggy styled Filter Pills & Sorter */}
            <div className="flex flex-wrap gap-2.5 mt-2 pt-2 border-t border-slate-100">
              {/* Filter Veg Only */}
              <button
                onClick={() => setVegOnlyFilter(!vegOnlyFilter)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide flex items-center gap-1.5 border transition-all cursor-pointer ${
                  vegOnlyFilter 
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-black shadow-xs" 
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex items-center justify-center border ${vegOnlyFilter ? "border-emerald-500 bg-emerald-500" : "border-slate-400 bg-transparent"}`}>
                  {vegOnlyFilter && <div className="w-1 h-1 rounded-full bg-white" />}
                </div>
                Pure Veg
              </button>

              {/* Filter Rated 4.5+ */}
              <button
                onClick={() => setRating4PlusFilter(!rating4PlusFilter)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide flex items-center gap-1.5 border transition-all cursor-pointer ${
                  rating4PlusFilter 
                    ? "bg-amber-50 border-amber-300 text-amber-700 font-black shadow-xs" 
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                ★ Rated 4.5+
              </button>

              {/* Filter Available Now / In-stock */}
              <button
                onClick={() => setFastDeliveryFilter(!fastDeliveryFilter)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide flex items-center gap-1.5 border transition-all cursor-pointer ${
                  fastDeliveryFilter 
                    ? "bg-rose-50 border-rose-300 text-rose-700 font-black shadow-xs" 
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                In Stock Dishes
              </button>

              {/* Quick Sorting Dropdown */}
              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-[11px] font-black tracking-wide pl-2.5 pr-6 py-1.5 rounded-full outline-hidden appearance-none cursor-pointer"
                >
                  <option value="default">Default Sort</option>
                  <option value="rating">Rating (High → Low)</option>
                  <option value="price_low_high">Price: Low to High</option>
                  <option value="price_high_low">Price: High to Low</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px]">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Product Grid - Side-by-side 2 per row in mobile only */}
          {filteredFoods.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xs">
              <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-950">No dishes match your tags</h4>
              <p className="text-xs text-slate-500 mt-1">Try resetting the custom filters or type checking standard biryanis.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {filteredFoods.map((food) => {
                const pId = food.id || "";
                const selectedSize = selectedSizes[pId] || "full";
                const activePrice = getProductPrice(food);
                const cartQty = getItemCartQty(pId, selectedSize);
                const isVegItem = isProductVeg(food.product_name, food.category);

                return (
                  <div 
                    key={food.id} 
                    onClick={() => {
                      setSelectedProductDetails(food);
                      setSelectedProductPortion(selectedSize);
                    }}
                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all relative flex flex-col justify-between cursor-pointer group animate-fade-in"
                  >
                    <div className="relative h-28 sm:h-36 md:h-44">
                      <SafeImage src={food.image_url} alt={food.product_name} />
                      
                      {/* Rating block & Veg/non veg badge */}
                      <div className="absolute top-2 left-2 flex gap-1.5 items-center bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded-lg z-10">
                        <span className={`w-2 h-2 rounded-full ${isVegItem ? "bg-emerald-500" : "bg-rose-500"}`} />
                        <span className="text-[9px] sm:text-[10px] text-white font-black">
                          ★ {food.rating}
                        </span>
                      </div>

                      {/* Traditional Swiggy styled Bottom Image Text Overlay (ITEMS AT price) */}
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent text-white rounded-lg p-1 sm:p-1.5 px-2 flex items-center justify-between text-[8px] sm:text-[10.5px]">
                        <span className="font-extrabold text-[#fecdd3] tracking-tight uppercase line-clamp-1">Kwik Bites Feast</span>
                        <span className="font-black text-white whitespace-nowrap">₹{food.full_plate_price} ONWARDS</span>
                      </div>
                    </div>

                    <div className="p-2 sm:p-3.5 flex-grow flex flex-col justify-between gap-1 sm:gap-2.5 font-sans">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-black text-slate-950 text-xs sm:text-sm line-clamp-1 h-4 sm:h-5">{food.product_name}</h4>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 min-h-[22px] sm:min-h-[32px] leading-tight font-medium">
                          {food.description}
                        </p>
                      </div>

                      {food.has_half_plate && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="bg-slate-50 p-1 sm:p-1.5 rounded-lg border border-slate-100 flex items-center justify-between text-[9px] sm:text-xs font-bold my-0.5 font-sans"
                        >
                          <span className="text-slate-500 hidden sm:inline">Portion:</span>
                          <div className="flex gap-1 w-full sm:w-auto justify-end">
                            <button
                              onClick={() => handleToggleSize(pId, "half")}
                              className={`px-1.5 py-0.5 rounded transition-all text-[9.5px] sm:text-[10.5px] font-black cursor-pointer ${
                                selectedSize === "half" ? "bg-rose-500 text-white" : "text-slate-600 hover:text-slate-800"
                              }`}
                            >
                              Half
                            </button>
                            <button
                              onClick={() => handleToggleSize(pId, "full")}
                              className={`px-1.5 py-0.5 rounded transition-all text-[9.5px] sm:text-[10.5px] font-black cursor-pointer ${
                                selectedSize === "full" ? "bg-rose-500 text-white" : "text-slate-600 hover:text-slate-800"
                              }`}
                            >
                              Full
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                        <div>
                          <span className="text-[8px] text-slate-400 block font-semibold uppercase tracking-wider hidden sm:block">
                            {selectedSize === "half" ? "Half Portion" : "Full Portion"}
                          </span>
                          <span className="text-xs sm:text-base font-black text-slate-950">₹{activePrice}</span>
                        </div>

                        {food.stock_status === "out_of_stock" ? (
                          <span className="text-[9px] text-red-500 font-bold px-2 py-1 bg-red-50 rounded">
                            Sold Out
                          </span>
                        ) : cartQty > 0 ? (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center bg-rose-500 text-white rounded-lg font-black h-7 text-xs border border-rose-600 overflow-hidden"
                          >
                            <button 
                              onClick={() => onUpdateQuantity(food, selectedSize, -1)} 
                              className="px-2 py-0.5 text-xs hover:bg-rose-600 transition-colors cursor-pointer"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="px-1.5 text-[11px] bg-rose-500 text-white font-bold">{cartQty}</span>
                            <button 
                              onClick={() => onUpdateQuantity(food, selectedSize, 1)} 
                              className="px-2 py-0.5 text-xs hover:bg-rose-600 transition-colors cursor-pointer"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(food, selectedSize);
                            }}
                            className="bg-white border border-rose-200 text-rose-500 font-extrabold hover:bg-rose-50 p-1 px-2.5 sm:px-4 rounded-lg text-xs transition-all shadow-xs cursor-pointer"
                          >
                            + ADD
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 5. CATERING & SERVICES SECTION */}
        <section id="services" className="flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
            <span className="p-1.5 bg-rose-500 text-white rounded-lg">
              <Award className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-xl font-black text-slate-950">Event Catering & Live Kitchen Services</h3>
              <p className="text-xs text-slate-500 font-medium">From corporate lunch packages to grand scale wedding caterers with chef counters.</p>
            </div>
          </div>

          {/* Grid optimized for slide-by-side: 2 per row in mobile only! */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {cateringServices.map((service) => {
              const IconComp = service.icon;
              return (
                <div 
                  key={service.id} 
                  className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-5 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-3">
                      <div className={`w-8 h-8 sm:w-11 sm:h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 group-hover:scale-105 transition-transform`}>
                        <IconComp className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <span className="text-[8px] sm:text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 sm:px-2 py-0.5 rounded-full font-bold">
                        {service.badge}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-950 text-xs sm:text-base mb-1">{service.title}</h4>
                    <p className="text-[10.5px] sm:text-xs text-slate-500 leading-tight font-medium">
                      {service.description}
                    </p>

                    <ul className="mt-2 text-[9px] sm:text-[11px] text-slate-400 font-bold space-y-0.5 hidden sm:block">
                      <li>✓ Dynamic Custom Menu selection</li>
                      <li>✓ Onsite live tandoor counter setups</li>
                      <li>✓ Professional clean server uniforms</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleSendInquiry(service.title)}
                    className="w-full mt-1.5 sm:mt-2 py-2 text-rose-600 group-hover:bg-rose-600 group-hover:text-white border border-rose-200 text-[9.5px] sm:text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Phone className="h-3 w-3" />
                    INQUIRE NOW
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. CLIENT REVIEWS SECTION */}
        <section id="reviews" className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-rose-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                <Star className="h-4.5 w-4.5 fill-amber-500 text-amber-500" />
              </span>
              <div>
                <h3 className="text-xl font-black text-slate-950">Verified Customer Reviews</h3>
                <p className="text-xs text-slate-500 font-medium">Real reviews aggregated from gourmet food lovers on Swiggy and Google Locals.</p>
              </div>
            </div>

            {/* Google review direct linkage */}
            <a 
              href="https://www.google.com/search?q=kwik+bites+reviews"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-500 font-extrabold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer self-stretch md:self-auto justify-center"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Review Us on Google
            </a>
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes marqueeLeftToRight {
              0% { transform: translate3d(-33.33333%, 0, 0); }
              100% { transform: translate3d(0, 0, 0); }
            }
            .animate-marquee-left-to-right {
              animation: marqueeLeftToRight 28s linear infinite;
            }
            .animate-marquee-left-to-right:hover {
              animation-play-state: paused;
            }
          `}} />

          {/* Scrolling Left to Right Marquee */}
          <div className="relative w-full overflow-hidden bg-white py-4 border border-rose-100 rounded-2xl shadow-xs">
            {/* Left & Right ambient fade gradient overlay blocks */}
            <div className="absolute top-0 left-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
            <div className="absolute top-0 right-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
            
            {/* Infinite sliding wrapper */}
            <div className="flex gap-4 animate-marquee-left-to-right" style={{
              display: 'flex',
              width: 'max-content',
            }}>
              {/* Duplicate reviews list times 4 for continuous seamless loop */}
              {[...reviews, ...reviews, ...reviews, ...reviews].map((rev, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-50 border border-slate-100 p-3 rounded-xl min-w-[240px] sm:min-w-[280px] max-w-[280px] flex-shrink-0 shadow-xs flex flex-col justify-between"
                  style={{ whiteSpace: 'normal' }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1 text-[11px] font-sans">
                      <span className="font-extrabold text-slate-900 truncate">{rev.name}</span>
                      <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">{rev.date}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                      <div className="flex gap-0.5">
                        {[...Array(rev.stars)].map((_, i) => (
                          <Star key={i} className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                        ))}
                      </div>
                      <span className="text-[8px] text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-black uppercase">Verified</span>
                    </div>

                    <p className="text-[10px] sm:text-[10.5px] text-slate-600 leading-snug italic font-medium">
                      "{rev.review}"
                    </p>
                  </div>

                  <div className="text-[8.5px] text-rose-500/80 font-black uppercase mt-1 tracking-tight flex items-center gap-0.5">
                    📍 {rev.location}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. QUICK CONTACT & WhatsApp INQUIRY FORM */}
        <section id="contact" className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-rose-100 p-6 md:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row gap-8">
              
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div>
                  <span className="bg-rose-50 text-rose-600 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border border-rose-100">
                    GET AN INSTANT DIRECT QUOTE
                  </span>
                  
                  <h3 className="text-xl md:text-2xl font-black text-slate-950 mt-3">Ready to Host Your Next Event?</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">
                    Plan your custom menu with us. Submit the details of your party guest count and date, and our cooking experts will draft a quote live on WhatsApp!
                  </p>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700 font-bold">
                  <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl">
                    <Phone className="h-4.5 w-4.5 text-rose-500" />
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Call or WhatsApp</span>
                      <span>+91 96110 29911</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl">
                    <MapPin className="h-4.5 w-4.5 text-rose-500" />
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Main Base Kitchen Location</span>
                      <span>Bitehouse, Block-4, BTM, Bangalore, India</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form redirect to WhatsApp */}
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-6 shadow-sm">
                <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Your Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">WhatsApp Phone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9611029911"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-slate-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Occasion / Service</label>
                      <select
                        value={contactOccasion}
                        onChange={(e) => setContactOccasion(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-slate-950"
                      >
                        <option value="Wedding Catering">Wedding Catering</option>
                        <option value="Birthday Party">Birthday Party</option>
                        <option value="Corporate Event">Corporate Event</option>
                        <option value="Outdoor Event">Outdoor Event</option>
                        <option value="Private party">Private party</option>
                        <option value="Home Function">Home Function</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Guest Volume *</label>
                      <input
                        type="number"
                        min="10"
                        required
                        value={contactGuests}
                        onChange={(e) => setContactGuests(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-slate-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Event Date *</label>
                    <input
                      type="date"
                      required
                      value={contactDate}
                      onChange={(e) => setContactDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Special notes / Menu request</label>
                    <textarea
                      placeholder="e.g., Pure vegetarian recipes, Live tandoor counter details, etc."
                      value={contactNotes}
                      onChange={(e) => setContactNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-slate-950"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md shadow-rose-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Phone className="h-4 w-4" />
                    SEND QUOTE INQUIRY ON WHATSAPP
                  </button>
                </form>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* Trust badging footer - Standard clean style */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 mt-20 py-12 text-center" id="storefront-footer">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-2 font-black text-white text-sm">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span>Premium Cooking Standards</span>
          </div>
          <p className="text-slate-400 font-medium">© 2026 Kwik Bites. Cooked fresh, delivered hot synced directly to WhatsApp.</p>
          <p className="text-slate-600 text-[10px] font-semibold">Bengalurean Home Favorite</p>
        </div>
      </footer>

      {/* DETAILED PRODUCT CUSTOMIZATION MODAL (ZOMATO VIBE) */}
      {selectedProductDetails && (() => {
        const food = selectedProductDetails;
        const pId = food.id || "";
        const cartQty = getItemCartQty(pId, selectedProductPortion);
        const isVegItem = isProductVeg(food.product_name, food.category);
        const activePrice = selectedProductPortion === "half" && food.has_half_plate && food.half_plate_price !== undefined 
          ? food.half_plate_price 
          : food.full_plate_price;

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
              {/* Image Header with close btn */}
              <div className="relative h-44 sm:h-52 w-full bg-slate-100 flex-shrink-0">
                <SafeImage src={food.image_url} alt={food.product_name} />
                <button 
                  onClick={() => setSelectedProductDetails(null)}
                  className="absolute top-3.5 right-3.5 w-8 h-8 bg-slate-900/70 hover:bg-slate-950 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer z-20"
                >
                  ✕
                </button>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2 z-10">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black text-white flex items-center gap-1.5 bg-slate-900/80`}>
                    <span className={`w-2 h-2 rounded-full ${isVegItem ? "bg-emerald-500" : "bg-rose-500"}`} />
                    {isVegItem ? "PURE VEG" : "NON-VEG"}
                  </span>
                  <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                    ★ {food.rating}
                  </span>
                </div>
              </div>

              {/* Scrollable details */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-950">{food.product_name}</h3>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">
                    {food.category}
                  </span>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">{food.description}</p>
                </div>

                {/* 1. Portion Sizing Option */}
                {food.has_half_plate ? (
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Select Portion Size</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedProductPortion("half")}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          selectedProductPortion === "half"
                            ? "bg-rose-500 text-white border-rose-500 font-extrabold shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 font-bold text-xs"
                        }`}
                      >
                        <span className="block text-[10px] uppercase font-bold text-slate-200">Half Plate</span>
                        <span className="font-black text-sm">₹{food.half_plate_price}</span>
                      </button>
                      
                      <button
                        onClick={() => setSelectedProductPortion("full")}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          selectedProductPortion === "full"
                            ? "bg-rose-500 text-white border-rose-500 font-extrabold shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 font-bold text-xs"
                        }`}
                      >
                        <span className="block text-[10px] uppercase font-bold text-slate-200">Full Plate</span>
                        <span className="font-black text-sm">₹{food.full_plate_price}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Available size</span>
                      <span className="text-slate-800 font-black text-xs">Standard Full Portion</span>
                    </div>
                    <span className="font-black text-lg text-slate-950">₹{food.full_plate_price}</span>
                  </div>
                )}

                {/* 2. Spice Level Customizations */}
                <div className="border border-slate-101 rounded-xl p-3 bg-slate-50">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 text-left">Level Customize (Free option)</h4>
                  <div className="flex flex-col gap-1.5">
                    {["Mild Taste (Kids safe)", "Medium Spice (Signature)", "High Sizzling Hot"].map((opt) => (
                      <label 
                        key={opt}
                        onClick={() => setSelectedProductSpice(opt)}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 hover:border-rose-100 transition-colors cursor-pointer text-xs font-bold"
                      >
                        <span className="text-slate-700">{opt}</span>
                        <input 
                          type="radio" 
                          name="spice_details"
                          checked={selectedProductSpice === opt}
                          onChange={() => setSelectedProductSpice(opt)}
                          className="text-rose-505 focus:ring-rose-500 focus:outline-hidden"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Hot Tag Indicator */}
                <div className="text-[10px] text-slate-400 font-bold bg-amber-50 rounded-xl p-2.5 border border-amber-100 flex items-center gap-1.5 self-start">
                  🔥 Custom prepared fresh on order under hygienic certified conditions.
                </div>
              </div>

              {/* Action Footer */}
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between gap-4 flex-shrink-0 font-sans">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Custom Order Total</span>
                  <span className="text-lg font-black text-slate-950">₹{activePrice}</span>
                </div>

                <div className="flex items-center gap-2">
                  {cartQty > 0 ? (
                    <div className="flex items-center bg-rose-500 text-white rounded-xl font-black h-10 border border-rose-600 overflow-hidden shadow-md shadow-rose-200">
                      <button 
                        onClick={() => onUpdateQuantity(food, selectedProductPortion, -1)} 
                        className="px-4 py-1.5 text-xs hover:bg-rose-600 transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-extrabold text-center bg-rose-500 text-white">{cartQty}</span>
                      <button 
                        onClick={() => onUpdateQuantity(food, selectedProductPortion, 1)} 
                        className="px-4 py-1.5 text-xs hover:bg-rose-600 transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        onAddToCart(food, selectedProductPortion);
                      }}
                      className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-rose-200 cursor-pointer"
                    >
                      + ADD TO CART
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
