import React, { useState, useEffect } from "react";
import { 
  db, collection, onSnapshot, OperationType, handleFirestoreError, seedDatabaseIfEmpty,
  INITIAL_FOODS, INITIAL_COUPONS
} from "./lib/firebase";
import { FoodProduct, Coupon, CartItem } from "./types";
import Storefront from "./components/Storefront";
import Cart from "./components/Cart";
import AdminPanel from "./components/AdminPanel";
import { ShoppingBag, RefreshCw } from "lucide-react";

export default function App() {
  const [view, setView] = useState<"store" | "admin">("store");
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [foods, setFoods] = useState<FoodProduct[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [databaseLoading, setDatabaseLoading] = useState(true);

  // 1. Seed database if empty and start real-time sync listeners
  useEffect(() => {
    let active = true;

    // Detect URL pathname on refresh or direct load
    if (window.location.pathname === "/wow/bites10admin") {
      setView("admin");
    }

    const handleLocationChange = () => {
      if (window.location.pathname === "/wow/bites10admin") {
        setView("admin");
      } else {
        setView("store");
      }
    };
    window.addEventListener("popstate", handleLocationChange);

    // Automatic Fallback Timer: if Firestore doesn't connect in 2.2 seconds,
    // load local mock data instantly to prevent hanging!
    const fallbackTimer = setTimeout(() => {
      if (active && databaseLoading) {
        console.warn("Firestore connection is warming up. Loading offline-first local catalog...");
        setFoods(INITIAL_FOODS);
        setCoupons(INITIAL_COUPONS);
        setDatabaseLoading(false);
      }
    }, 2200);

    async function initializeAppEngine() {
      try {
        setDatabaseLoading(true);
        // Automatically seed delicious Indian dishes + Swiggy coupons if database is empty!
        await seedDatabaseIfEmpty();
        if (active) {
          clearTimeout(fallbackTimer);
          // Don't mark loading as done if snapshot listener hasn't run, 
          // but if we are in fallback, we've already done so.
        }
      } catch (err) {
        console.error("Failed to seed database: ", err);
        if (active) {
          clearTimeout(fallbackTimer);
          setFoods(INITIAL_FOODS);
          setCoupons(INITIAL_COUPONS);
          setDatabaseLoading(false);
        }
      }
    }
    initializeAppEngine();

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  // 2. Real-time Firebase Firestore Sync for Catalog and Promo Codes
  useEffect(() => {
    const foodsRef = collection(db, "foods");
    const unsubFoods = onSnapshot(foodsRef, (snapshot) => {
      if (snapshot.empty) {
        setFoods([]);
      } else {
        const liveFoods: FoodProduct[] = [];
        snapshot.forEach((snap) => {
          liveFoods.push({ id: snap.id, ...snap.data() } as FoodProduct);
        });
        // Sort by defined order or fall back to rating
        setFoods(liveFoods.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      }
      setDatabaseLoading(false);
    }, (error) => {
      console.warn("Firestore foods listener failed. Relying on offline menu dataset:", error);
      setFoods(prev => prev.length > 0 ? prev : INITIAL_FOODS);
      setDatabaseLoading(false);
    });

    const couponsRef = collection(db, "coupons");
    const unsubCoupons = onSnapshot(couponsRef, (snapshot) => {
      if (snapshot.empty) {
        setCoupons([]);
      } else {
        const liveCoupons: Coupon[] = [];
        snapshot.forEach((snap) => {
          liveCoupons.push({ id: snap.id, ...snap.data() } as Coupon);
        });
        setCoupons(liveCoupons);
      }
    }, (error) => {
      console.warn("Firestore coupons listener failed. Relying on offline coupons dataset:", error);
      setCoupons(prev => prev.length > 0 ? prev : INITIAL_COUPONS);
    });

    return () => {
      unsubFoods();
      unsubCoupons();
    };
  }, []);

  // Cart operations
  const handleAddToCart = (product: FoodProduct, selectedSize: "half" | "full" = "full") => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => 
        item.product.id === product.id && item.selectedSize === selectedSize
      );

      if (existingIndex > -1) {
        // Increment quantity of existing plate configuration
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      } else {
        // Add new selection
        return [...prev, { product, selectedSize, quantity: 1 }];
      }
    });
    // Do not open cart automatically to show additions
  };

  const handleUpdateQuantity = (product: FoodProduct, selectedSize: "half" | "full", delta: number) => {
    setCartItems(prev => {
      const targetIndex = prev.findIndex(item => 
        item.product.id === product.id && item.selectedSize === selectedSize
      );

      if (targetIndex === -1) return prev;

      const updated = [...prev];
      const newQty = updated[targetIndex].quantity + delta;

      if (newQty <= 0) {
        updated.splice(targetIndex, 1);
      } else {
        updated[targetIndex] = {
          ...updated[targetIndex],
          quantity: newQty
        };
      }
      return updated;
    });
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const cartTotalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  if (databaseLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-xs text-center flex flex-col items-center max-w-sm">
          <RefreshCw className="h-10 w-10 text-rose-500 animate-spin mb-4" />
          <h3 className="font-bold text-slate-900 text-lg">Warming up Clay Ovens...</h3>
          <p className="text-sm text-slate-500 mt-1">Connecting to your Firebase Firestore database in real-time...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="cooking-delivery-app-root">
      {view === "store" ? (
        <Storefront
          foods={foods}
          onAddToCart={handleAddToCart}
          cartItemCount={cartTotalCount}
          onOpenCart={() => setCartOpen(true)}
          onOpenAdmin={() => {
            window.history.pushState(null, "", "/wow/bites10admin");
            setView("admin");
          }}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          coupons={coupons}
        />
      ) : (
        <AdminPanel onBackToStore={() => {
          window.history.pushState(null, "", "/");
          setView("store");
        }} />
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <Cart
          cartItems={cartItems}
          foods={foods}
          coupons={coupons}
          onClose={() => setCartOpen(false)}
          onUpdateQuantity={handleUpdateQuantity}
          onClearCart={handleClearCart}
        />
      )}
    </div>
  );
}
