import React, { useState, useEffect } from "react";
import { 
  Plus, Edit2, Trash2, CheckCircle, XCircle, Search, Tag, 
  Settings, ShoppingBag, PlusCircle, Database, Package, RefreshCw, AlertCircle,
  Lock, BarChart2, UploadCloud, Download, LogOut, Coins, TrendingUp, HelpCircle
} from "lucide-react";
import * as XLSX from "xlsx";
import { 
  db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, OperationType, handleFirestoreError 
} from "../lib/firebase";
import { FoodProduct, Coupon, Order } from "../types";
import SafeImage from "./SafeImage";

interface AdminPanelProps {
  onBackToStore: () => void;
}

export default function AdminPanel({ onBackToStore }: AdminPanelProps) {
  // Navigation & Login Credentials
  const [activeTab, setActiveTab] = useState<"dashboard" | "foods" | "coupons" | "orders">("dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Excel Upload states
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelSuccessMsg, setExcelSuccessMsg] = useState("");

  const [foods, setFoods] = useState<FoodProduct[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Inline Custom Delete Confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState<"food" | "coupon" | "order" | null>(null);

  // Search and Filters
  const [foodSearch, setFoodSearch] = useState("");
  const [foodCategoryFilter, setFoodCategoryFilter] = useState("all");

  // Foods Dialog / State
  const [editingFood, setEditingFood] = useState<FoodProduct | null>(null);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [foodForm, setFoodForm] = useState<Partial<FoodProduct>>({
    product_name: "",
    category: "Biryani",
    full_plate_price: 150,
    half_plate_price: 90,
    has_half_plate: false,
    description: "",
    image_url: "",
    rating: 4.5,
    stock_status: "instock",
    is_popular: false,
    is_featured: false,
    is_bogo: false,
    display_order: 10,
    product_tag: ""
  });

  // Coupons Dialog / State
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({
    code: "",
    description: "",
    discount_type: "fixed_amount",
    discount_value: 50,
    min_order_amount: 300,
    product_specific: "",
    active_status: true
  });

  // Fetch foods, coupons, and orders from Firestore with real-time sync
  useEffect(() => {
    setLoading(true);
    
    const unsubscribeFoods = onSnapshot(collection(db, "foods"), (snapshot) => {
      const items: FoodProduct[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as FoodProduct);
      });
      setFoods(items.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "foods");
      setErrorMessage("Error reading foods: " + error.message);
    });

    const unsubscribeCoupons = onSnapshot(collection(db, "coupons"), (snapshot) => {
      const items: Coupon[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Coupon);
      });
      setCoupons(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "coupons");
    });

    const unsubscribeOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      const items: Order[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });
      // Sort orders descending by date if available
      setOrders(items.sort((a, b) => b.created_at && a.created_at ? b.created_at.localeCompare(a.created_at) : 0));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "orders");
    });

    return () => {
      unsubscribeFoods();
      unsubscribeCoupons();
      unsubscribeOrders();
    };
  }, []);

  const handleOpenFoodForm = (food: FoodProduct | null) => {
    if (food) {
      setEditingFood(food);
      setFoodForm(food);
    } else {
      setEditingFood(null);
      setFoodForm({
        product_name: "",
        category: "Biryani",
        full_plate_price: 150,
        half_plate_price: 90,
        has_half_plate: false,
        description: "",
        image_url: "",
        rating: 4.5,
        stock_status: "instock",
        is_popular: false,
        is_featured: false,
        is_bogo: false,
        display_order: 10,
        product_tag: ""
      });
    }
    setShowFoodModal(true);
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const path = "foods";
      const cleanedData = {
        product_name: foodForm.product_name || "New Dish",
        category: foodForm.category || "Biryani",
        full_plate_price: Number(foodForm.full_plate_price) || 0,
        has_half_plate: !!foodForm.has_half_plate,
        half_plate_price: foodForm.has_half_plate ? (Number(foodForm.half_plate_price) || 0) : null,
        description: foodForm.description || "",
        image_url: foodForm.image_url || "",
        rating: Number(foodForm.rating) || 4.5,
        stock_status: foodForm.stock_status || "instock",
        is_popular: !!foodForm.is_popular,
        is_featured: !!foodForm.is_featured,
        is_bogo: !!foodForm.is_bogo,
        display_order: Number(foodForm.display_order) || 10,
        product_tag: foodForm.product_tag || ""
      };

      if (editingFood && editingFood.id) {
        await updateDoc(doc(db, path, editingFood.id), cleanedData);
      } else {
        await addDoc(collection(db, path), cleanedData);
      }
      setShowFoodModal(false);
    } catch (error: any) {
      setErrorMessage("Failed to save food: " + error.message);
      handleFirestoreError(error, editingFood ? OperationType.UPDATE : OperationType.CREATE, "foods");
    }
  };

  const handleDeleteFood = (id: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmType("food");
  };

  const executeDeleteFood = async (id: string) => {
    try {
      await deleteDoc(doc(db, "foods", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `foods/${id}`);
    }
  };

  // Coupons operations
  const handleOpenCouponForm = (coupon: Coupon | null) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm(coupon);
    } else {
      setEditingCoupon(null);
      setCouponForm({
        code: "",
        description: "",
        discount_type: "fixed_amount",
        discount_value: 50,
        min_order_amount: 300,
        product_specific: "",
        active_status: true
      });
    }
    setShowCouponModal(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const codeClean = (couponForm.code || "").toUpperCase().trim();
      if (!codeClean) {
        setErrorMessage("Coupon code is required");
        return;
      }

      const path = "coupons";
      const cleanedData = {
        code: codeClean,
        description: couponForm.description || "",
        discount_type: couponForm.discount_type || "fixed_amount",
        discount_value: Number(couponForm.discount_value) || 0,
        min_order_amount: Number(couponForm.min_order_amount) || 0,
        product_specific: couponForm.product_specific ? couponForm.product_specific.trim() : null,
        active_status: !!couponForm.active_status
      };

      if (editingCoupon && editingCoupon.id) {
        await updateDoc(doc(db, path, editingCoupon.id), cleanedData);
      } else {
        await addDoc(collection(db, path), cleanedData);
      }
      setShowCouponModal(false);
    } catch (error: any) {
      setErrorMessage("Failed to save coupon: " + error.message);
      handleFirestoreError(error, editingCoupon ? OperationType.UPDATE : OperationType.CREATE, "coupons");
    }
  };

  const handleDeleteCoupon = (id: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmType("coupon");
  };

  const executeDeleteCoupon = async (id: string) => {
    try {
      await deleteDoc(doc(db, "coupons", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `coupons/${id}`);
    }
  };

  const handleDeleteOrder = (id: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmType("order");
  };

  const executeDeleteOrder = async (id: string) => {
    try {
      await deleteDoc(doc(db, "orders", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
    }
  };

  const filteredFoods = foods.filter(food => {
    const matchesSearch = food.product_name.toLowerCase().includes(foodSearch.toLowerCase()) || 
                          food.category.toLowerCase().includes(foodSearch.toLowerCase()) ||
                          food.description.toLowerCase().includes(foodSearch.toLowerCase());
    const matchesCategory = foodCategoryFilter === "all" || food.category === foodCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = Array.from(new Set(foods.map(f => f.category)));

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const userClean = loginUsername.trim();
    const passClean = loginPassword;

    if (userClean === "kwik@10Bites27" && passClean === "getyourfood@499%") {
      setIsLoggedIn(true);
      sessionStorage.setItem("10bites_admin_session", "authorized");
    } else {
      setLoginError("Invalid Administrator credentials. Please try again.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem("10bites_admin_session");
  };

  const handleDownloadTemplate = () => {
    try {
      const sampleData = [
        {
          "Product Name": "Special Chicken Biryani",
          "Category": "Biryani",
          "Full Plate Price": 320,
          "Has Half Plate": "TRUE",
          "Half Plate Price": 180,
          "Description": "Premium aromatic basmati rice cooked with succulent chicken pieces and traditional Hyderabadi spices. Served with raita.",
          "Image URL": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=700",
          "Rating": 4.8,
          "Stock Status": "instock",
          "Is Popular": "TRUE",
          "Is Featured": "TRUE",
          "Is BOGO": "FALSE",
          "Display Order": 1,
          "Product Tag": "#101"
        },
        {
          "Product Name": "Paneer Butter Masala",
          "Category": "Main Course",
          "Full Plate Price": 240,
          "Has Half Plate": "TRUE",
          "Half Plate Price": 140,
          "Description": "Fresh cottage cheese cubes cooked in a rich, creamy, and mildly sweet onion-tomato gravy with butter and malai.",
          "Image URL": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=700",
          "Rating": 4.5,
          "Stock Status": "instock",
          "Is Popular": "TRUE",
          "Is Featured": "FALSE",
          "Is BOGO": "FALSE",
          "Display Order": 2,
          "Product Tag": ""
        },
        {
          "Product Name": "Crispy Chicken Kebab",
          "Category": "Starters",
          "Full Plate Price": 260,
          "Has Half Plate": "FALSE",
          "Half Plate Price": "",
          "Description": "Spicy and crisp chicken skewers flavored with pepper, garlic, and fresh herbs. Perfect appetizer for gatherings.",
          "Image URL": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=700",
          "Rating": 4.6,
          "Stock Status": "instock",
          "Is Popular": "FALSE",
          "Is Featured": "TRUE",
          "Is BOGO": "TRUE",
          "Display Order": 3,
          "Product Tag": ""
        },
        {
          "Product Name": "Double Ka Meetha #101",
          "Category": "Desserts",
          "Full Plate Price": 120,
          "Has Half Plate": "FALSE",
          "Half Plate Price": "",
          "Description": "Traditional bread pudding dessert of fried bread slices soaked in saffron, cardamom milk, topped with crispy almonds.",
          "Image URL": "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=700",
          "Rating": 4.9,
          "Stock Status": "instock",
          "Is Popular": "TRUE",
          "Is Featured": "TRUE",
          "Is BOGO": "FALSE",
          "Display Order": 4,
          "Product Tag": "#101"
        },
        {
          "Product Name": "Veg Samosa Platter",
          "Category": "Starters",
          "Full Plate Price": 110,
          "Has Half Plate": "FALSE",
          "Half Plate Price": "",
          "Description": "Three pieces of crispy golden samosas packed with seasoned potatoes and sweet peas, served with sweet mint chutney.",
          "Image URL": "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=700",
          "Rating": 4.4,
          "Stock Status": "instock",
          "Is Popular": "FALSE",
          "Is Featured": "FALSE",
          "Is BOGO": "TRUE",
          "Display Order": 5,
          "Product Tag": ""
        },
        {
          "Product Name": "Authentic Butter Chicken",
          "Category": "Main Course",
          "Full Plate Price": 340,
          "Has Half Plate": "TRUE",
          "Half Plate Price": 200,
          "Description": "Tender tandoori chicken shreds simmered in smooth velvety tomato, cashew, and rich butter gravy.",
          "Image URL": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=700",
          "Rating": 4.9,
          "Stock Status": "instock",
          "Is Popular": "TRUE",
          "Is Featured": "TRUE",
          "Is BOGO": "FALSE",
          "Display Order": 6,
          "Product Tag": ""
        },
        {
          "Product Name": "Tandoori Roti Butter",
          "Category": "Breads",
          "Full Plate Price": 40,
          "Has Half Plate": "FALSE",
          "Half Plate Price": "",
          "Description": "Whole wheat round Indian flatbread cooked in a rustic clay oven smeared with melted Amul butter.",
          "Image URL": "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=700",
          "Rating": 4.3,
          "Stock Status": "instock",
          "Is Popular": "FALSE",
          "Is Featured": "FALSE",
          "Is BOGO": "TRUE",
          "Display Order": 7,
          "Product Tag": ""
        },
        {
          "Product Name": "Garlic Naan Basket",
          "Category": "Breads",
          "Full Plate Price": 80,
          "Has Half Plate": "FALSE",
          "Half Plate Price": "",
          "Description": "Delectable leavened flatbread garnished with minced garlic, fresh cilantro, baked perfectly in the tandoor.",
          "Image URL": "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=700",
          "Rating": 4.7,
          "Stock Status": "instock",
          "Is Popular": "TRUE",
          "Is Featured": "FALSE",
          "Is BOGO": "TRUE",
          "Display Order": 8,
          "Product Tag": ""
        },
        {
          "Product Name": "Spiced Mango Lassi",
          "Category": "Drinks",
          "Full Plate Price": 90,
          "Has Half Plate": "TRUE",
          "Half Plate Price": 50,
          "Description": "Traditional refreshing beverage made by blending sweet mango pulp with thick yogurt, cardamoms, and saffron toppings.",
          "Image URL": "https://images.unsplash.com/photo-1546173159-315724a31696?w=700",
          "Rating": 4.6,
          "Stock Status": "instock",
          "Is Popular": "FALSE",
          "Is Featured": "FALSE",
          "Is BOGO": "TRUE",
          "Display Order": 9,
          "Product Tag": ""
        },
        {
          "Product Name": "Gobi Manchurian Dry",
          "Category": "Starters",
          "Full Plate Price": 180,
          "Has Half Plate": "TRUE",
          "Half Plate Price": 100,
          "Description": "Crispy fried cauliflower florets tossed with onions, bell peppers, soy sauce, and aromatic Indo-Chinese spices.",
          "Image URL": "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=700",
          "Rating": 4.3,
          "Stock Status": "instock",
          "Is Popular": "FALSE",
          "Is Featured": "FALSE",
          "Is BOGO": "TRUE",
          "Display Order": 10,
          "Product Tag": ""
        },
        {
          "Product Name": "Slow-cooked Dal Makhani",
          "Category": "Main Course",
          "Full Plate Price": 220,
          "Has Half Plate": "TRUE",
          "Half Plate Price": 120,
          "Description": "Whole black lentils and red kidney beans simmered overnight with tomatoes, onions, clarified butter, and pure cream.",
          "Image URL": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
          "Rating": 4.7,
          "Stock Status": "instock",
          "Is Popular": "TRUE",
          "Is Featured": "FALSE",
          "Is BOGO": "FALSE",
          "Display Order": 11,
          "Product Tag": ""
        },
        {
          "Product Name": "Nawabi Mutton Biryani",
          "Category": "Biryani",
          "Full Plate Price": 390,
          "Has Half Plate": "TRUE",
          "Half Plate Price": 220,
          "Description": "Royal blend of marinated tender goat meat, basmati rice, mint, fried onions, and pure ghee baked on slow steam.",
          "Image URL": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=700",
          "Rating": 4.9,
          "Stock Status": "instock",
          "Is Popular": "TRUE",
          "Is Featured": "TRUE",
          "Is BOGO": "FALSE",
          "Display Order": 12,
          "Product Tag": "#101"
        },
        {
          "Product Name": "Saffron Rasgulla Cup",
          "Category": "Desserts",
          "Full Plate Price": 100,
          "Has Half Plate": "FALSE",
          "Half Plate Price": "",
          "Description": "Soft cottage cheese dumplings soaked in light syrup infused with premium Kashmiri saffron filaments.",
          "Image URL": "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=700",
          "Rating": 4.5,
          "Stock Status": "instock",
          "Is Popular": "FALSE",
          "Is Featured": "FALSE",
          "Is BOGO": "TRUE",
          "Display Order": 13,
          "Product Tag": ""
        },
        {
          "Product Name": "Sizzling Chili Paneer",
          "Category": "Starters",
          "Full Plate Price": 210,
          "Has Half Plate": "FALSE",
          "Half Plate Price": "",
          "Description": "Pan-fried cubes of paneer tossed in spicy chili sauce, sweet and sour vinegar, capsicum, green chillies.",
          "Image URL": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=700",
          "Rating": 4.5,
          "Stock Status": "instock",
          "Is Popular": "FALSE",
          "Is Featured": "TRUE",
          "Is BOGO": "FALSE",
          "Display Order": 14,
          "Product Tag": ""
        },
        {
          "Product Name": "Crisp Tandoori Roti",
          "Category": "Breads",
          "Full Plate Price": 30,
          "Has Half Plate": "FALSE",
          "Half Plate Price": "",
          "Description": "Pristine whole wheat tandoor baked healthy flatbread without any butter. Pure and rustic.",
          "Image URL": "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=700",
          "Rating": 4.1,
          "Stock Status": "instock",
          "Is Popular": "FALSE",
          "Is Featured": "FALSE",
          "Is BOGO": "FALSE",
          "Display Order": 15,
          "Product Tag": ""
        },
        {
          "Product Name": "Royal Falooda Mix",
          "Category": "Drinks",
          "Full Plate Price": 150,
          "Has Half Plate": "TRUE",
          "Half Plate Price": 90,
          "Description": "Grand cold dessert beverage with rose syrup, vermicelli, sweet basil seeds, premium nuts, vanilla ice cream scoop.",
          "Image URL": "https://images.unsplash.com/photo-1546173159-315724a31696?w=700",
          "Rating": 4.8,
          "Stock Status": "instock",
          "Is Popular": "TRUE",
          "Is Featured": "TRUE",
          "Is BOGO": "FALSE",
          "Display Order": 16,
          "Product Tag": "#101"
        },
        {
          "Product Name": "Golden Gulab Jamun",
          "Category": "Desserts",
          "Full Plate Price": 90,
          "Has Half Plate": "FALSE",
          "Half Plate Price": "",
          "Description": "Golden fried khoya milk spheres soaked in cardamom flavored sugar syrup. Melt in the mouth goodness.",
          "Image URL": "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=700",
          "Rating": 4.7,
          "Stock Status": "instock",
          "Is Popular": "TRUE",
          "Is Featured": "FALSE",
          "Is BOGO": "TRUE",
          "Display Order": 17,
          "Product Tag": ""
        },
        {
          "Product Name": "Veg Dum Hyderabadi Biryani",
          "Category": "Biryani",
          "Full Plate Price": 250,
          "Has Half Plate": "TRUE",
          "Half Plate Price": 140,
          "Description": "An authentic dum-style vegetable biryani layered with long basmati grains, fresh beans, carrots, spices, and curd.",
          "Image URL": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=700",
          "Rating": 4.6,
          "Stock Status": "instock",
          "Is Popular": "TRUE",
          "Is Featured": "FALSE",
          "Is BOGO": "FALSE",
          "Display Order": 18,
          "Product Tag": ""
        },
        {
          "Product Name": "Special Masala Fish Fry",
          "Category": "Starters",
          "Full Plate Price": 280,
          "Has Half Plate": "FALSE",
          "Half Plate Price": "",
          "Description": "Kingfish steaks rubbed with home-ground spicy coastal masala paste, fried to perfection on cast iron griddle.",
          "Image URL": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=700",
          "Rating": 4.7,
          "Stock Status": "instock",
          "Is Popular": "TRUE",
          "Is Featured": "FALSE",
          "Is BOGO": "FALSE",
          "Display Order": 19,
          "Product Tag": ""
        },
        {
          "Product Name": "Creamy Malai Kofta",
          "Category": "Main Course",
          "Full Plate Price": 260,
          "Has Half Plate": "TRUE",
          "Half Plate Price": 150,
          "Description": "Soft paneer and potato dumplings simmered gently inside rich creamy cashew-almond sauce. Sweet flavored feast.",
          "Image URL": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=700",
          "Rating": 4.5,
          "Stock Status": "instock",
          "Is Popular": "FALSE",
          "Is Featured": "FALSE",
          "Is BOGO": "FALSE",
          "Display Order": 20,
          "Product Tag": ""
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Menu Template");
      XLSX.writeFile(workbook, "10Bites_Menu_Template.xlsx");
    } catch (err: any) {
      setErrorMessage("Failed to generate download template: " + err.message);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingExcel(true);
    setExcelSuccessMsg("");
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        if (!data) throw new Error("Could not read uploaded file content");
        
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonRaw = XLSX.utils.sheet_to_json(sheet);

        if (!jsonRaw || jsonRaw.length === 0) {
          throw new Error("Excel sheet appears empty or invalid. Please check layout.");
        }

        const mapRowToFood = (row: any): Partial<FoodProduct> => {
          const getVal = (keys: string[], defaultVal: any = "") => {
            for (const key of keys) {
              const foundKey = Object.keys(row).find(k => k.toLowerCase().replace(/[\s_-]/g, "") === key.toLowerCase().replace(/[\s_-]/g, ""));
              if (foundKey !== undefined) return row[foundKey];
            }
            return defaultVal;
          };

          const product_name = String(getVal(["product_name", "productname", "name", "title"], "New Dish")).trim();
          const category = String(getVal(["category", "cat"], "Biryani")).trim();
          const full_plate_price = Number(getVal(["full_plate_price", "fullplateprice", "price", "full_price", "fullprice"], 150));
          const has_half_plate_val = getVal(["has_half_plate", "hashalfplate", "half_plate", "halfplate"], false);
          const has_half_plate = has_half_plate_val === true || String(has_half_plate_val).toLowerCase() === "true" || String(has_half_plate_val).toLowerCase() === "yes" || String(has_half_plate_val) === "1";
          
          const half_plate_price_raw = getVal(["half_plate_price", "halfplateprice", "half_price", "halfprice"], null);
          const half_plate_price = half_plate_price_raw !== null && half_plate_price_raw !== "" ? Number(half_plate_price_raw) : null;

          const description = String(getVal(["description", "desc", "about"], "")).trim();
          const image_url = String(getVal(["image_url", "imageurl", "image", "photo", "img"], "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4")).trim();
          const rating = Number(getVal(["rating", "stars", "rate"], 4.5));
          
          const stock_status_val = String(getVal(["stock_status", "stockstatus", "status", "stock"], "instock")).toLowerCase().trim();
          const stock_status = (stock_status_val === "out" || stock_status_val === "sold_out" || stock_status_val === "out_of_stock") ? "out_of_stock" : "instock";

          const is_popular_val = getVal(["is_popular", "ispopular", "popular", "fav", "favorite"], false);
          const is_popular = is_popular_val === true || String(is_popular_val).toLowerCase() === "true" || String(is_popular_val).toLowerCase() === "yes" || String(is_popular_val) === "1";

          const is_featured_val = getVal(["is_featured", "isfeatured", "featured"], false);
          const is_featured = is_featured_val === true || String(is_featured_val).toLowerCase() === "true" || String(is_featured_val).toLowerCase() === "yes" || String(is_featured_val) === "1";

          const is_bogo_val = getVal(["is_bogo", "isbogo", "bogo"], false);
          const is_bogo = is_bogo_val === true || String(is_bogo_val).toLowerCase() === "true" || String(is_bogo_val).toLowerCase() === "yes" || String(is_bogo_val) === "1";

          const display_order = Number(getVal(["display_order", "displayorder", "order", "sort"], 10));
          const product_tag = String(getVal(["product_tag", "producttag", "tag", "promotag", "promo_tag", "custom_tag", "customtag"], "")).trim();

          return {
            product_name,
            category,
            full_plate_price,
            has_half_plate,
            half_plate_price,
            description,
            image_url,
            rating,
            stock_status,
            is_popular,
            is_featured,
            is_bogo,
            display_order,
            product_tag
          };
        };

        const parsedFoods = jsonRaw.map(r => mapRowToFood(r));

        // Delete currently loaded foods
        const snapshot = await getDocs(collection(db, "foods"));
        const deletePromises = snapshot.docs.map(docSnap => 
          deleteDoc(doc(db, "foods", docSnap.id))
        );
        await Promise.all(deletePromises);

        // Upload new parsed foods
        const addPromises = parsedFoods.map(food => 
          addDoc(collection(db, "foods"), food)
        );
        await Promise.all(addPromises);

        setExcelSuccessMsg(`Successfully imported ${parsedFoods.length} foods from spreadsheet! Overwrote current menu.`);
      } catch (err: any) {
        console.error(err);
        setErrorMessage("Excel import failure: " + err.message);
      } finally {
        setUploadingExcel(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden" id="admin-login-screen">
        {/* Subtle glowing backgrounds */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl -translate-y-12" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl translate-y-12" />

        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 flex flex-col gap-6 relative z-10">
          <div className="text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-950">Kwik Bites Backend</h2>
            <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">Kitchen Administrators Gate</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            {loginError && (
              <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle className="h-4.5 w-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Admin Username</label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="e.g. kwik@..."
                className="w-full h-11 px-3.5 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Admin Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-11 px-3.5 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-xl text-sm"
              />
            </div>

            <button
              type="submit"
              className="h-11 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-rose-200 mt-2 flex items-center justify-center gap-2"
            >
              <span>Verify & Unlock Panel</span>
            </button>
          </form>

          <div className="border-t border-slate-100 pt-4 text-center">
            <button
              onClick={onBackToStore}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← Back to Customer Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-calculate dashboard insights
  const totalRevenue = orders.reduce((acc, order) => acc + (order.grand_total || 0), 0);
  const totalOrdersCount = orders.length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
  const activeCouponsCount = coupons.filter(c => c.active_status).length;
  const popularFoodCount = foods.filter(f => f.is_popular).length;
  const bogoFoodCount = foods.filter(f => f.is_bogo).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="admin-panel-container">
      {/* Admin header rail */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 sticky top-0 z-20 shadow-xs flex items-center justify-between" id="admin-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950 flex items-center gap-2">
              Kitchen Backend <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full font-semibold">Admin Panel</span>
            </h1>
            <p className="text-xs text-slate-500">Manage Menu Food Items, Dishes, Coupons, and Order logs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onBackToStore}
            className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors font-semibold text-sm cursor-pointer shadow-sm active:transform active:scale-95"
            id="btn-back-to-store"
          >
            Customer Storefront →
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg hover:text-rose-700 transition-colors cursor-pointer border border-rose-100"
            title="Log Out Administrator"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Admin sub-menu navigation */}
      <div className="max-w-7xl w-full mx-auto px-6 py-6 flex-grow flex flex-col gap-6" id="admin-main-body">
        {errorMessage && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3" id="admin-error-notice">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between border-b border-slate-200 pb-4" id="admin-nav-tabs">
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit flex-wrap gap-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === "dashboard" 
                  ? "bg-white text-slate-950 shadow-xs" 
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <span className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                Dashboard Insights
              </span>
            </button>
            <button
              onClick={() => setActiveTab("foods")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === "foods" 
                  ? "bg-white text-slate-950 shadow-xs" 
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Foods Menu ({foods.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("coupons")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === "coupons" 
                  ? "bg-white text-slate-950 shadow-xs" 
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Coupons/Offers ({coupons.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === "orders" 
                  ? "bg-white text-slate-950 shadow-xs" 
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Orders List ({orders.length})
              </span>
            </button>
          </div>

          <div>
            {activeTab === "foods" && (
              <button
                onClick={() => handleOpenFoodForm(null)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors flex items-center gap-2 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Add Food Dish
              </button>
            )}
            {activeTab === "coupons" && (
              <button
                onClick={() => handleOpenCouponForm(null)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors flex items-center gap-2 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Create Coupon
              </button>
            )}
          </div>
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xs" id="admin-loader">
            <RefreshCw className="h-10 w-10 text-rose-500 animate-spin mb-4" />
            <span className="text-sm text-slate-600 font-medium">Syncing database changes from Firestore...</span>
          </div>
        ) : (
          <>
            {/* DASHBOARD TAB */}
            {activeTab === "dashboard" && (
              <div className="flex-grow flex flex-col gap-6" id="dashboard-tab-panel">
                {/* Statistics Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Revenue</span>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">₹{totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Coins className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Checkouts</span>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">{totalOrdersCount} orders</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Average Order (AOV)</span>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">₹{avgOrderValue}</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Active Kwik Bites Coupons</span>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">{activeCouponsCount} live</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Tag className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Main Dashboard Rows */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Excel Upload Area */}
                  <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-150 shadow-xs flex flex-col gap-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                        <UploadCloud className="h-5 w-5 text-rose-500" />
                        Excel Spreadsheet Bulk Loader
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Completely overwrite and update dishes using a formatted spreadsheet list.
                      </p>
                    </div>

                    {/* Drag & drop mock screen */}
                    <div className="border-2 border-dashed border-slate-200 hover:border-rose-500 rounded-2xl p-6 text-center select-none bg-slate-50 hover:bg-rose-50/10 transition-colors relative flex flex-col items-center justify-center">
                      <UploadCloud className="h-10 w-10 text-slate-400 mb-2.5 animate-pulse" />
                      
                      {uploadingExcel ? (
                        <div className="flex flex-col items-center gap-1.5 py-4">
                          <RefreshCw className="h-6 w-6 text-rose-500 animate-spin" />
                          <span className="text-xs font-bold text-slate-800">Parsing excel rows & overwriting Firestore...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-800 block">Click to choose spreadsheet file</span>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">Accepts .xlsx or .xls documents only</span>
                          
                          <label className="mt-4 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs">
                            Select File
                            <input 
                              type="file" 
                              accept=".xlsx, .xls"
                              onChange={handleExcelUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {excelSuccessMsg && (
                      <div className="p-3.5 bg-emerald-50 text-emerald-850 border border-emerald-250 rounded-xl text-xs font-bold flex items-start gap-2.5">
                        <CheckCircle className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{excelSuccessMsg}</span>
                      </div>
                    )}

                    {/* Template Downloader */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-950 block">Excel Structure Template</span>
                        <span className="text-[10px] text-slate-500 block">Contains standard headers: Product Name, Category, Full Plate Price, etc.</span>
                      </div>
                      <button
                        onClick={handleDownloadTemplate}
                        className="p-2 py-1.5 px-3.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-100/50 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ml-auto"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Get Template (.xlsx)
                      </button>
                    </div>
                  </div>

                  {/* Quick helper tips and counts info */}
                  <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-150 shadow-xs flex flex-col gap-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-indigo-500" />
                        Administrators Guidebook
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Quick lookup rules for managing foods and offers</p>
                    </div>

                    <div className="flex flex-col gap-3.5">
                      <div className="text-xs flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="p-1 px-1.5 bg-rose-100 text-rose-700 rounded-md font-bold mt-0.5 font-mono">1</span>
                        <div>
                          <strong className="text-slate-900 block font-bold">Special Promo Tags (#101)</strong>
                          <span className="text-slate-500 block text-[11px] mt-0.5 leading-relaxed">
                            To configure special item coupons (e.g., Buy Biryani (#101) and Kabab (#101) for 10% flat), simply tag those food items with <code className="text-rose-600 font-mono">#101</code> in the excel sheets or via individual edit. Then configure a coupon lock with <code className="text-rose-600 font-mono">#101</code> target product match.
                          </span>
                        </div>
                      </div>

                      <div className="text-xs flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="p-1 px-1.5 bg-amber-100 text-amber-700 rounded-md font-bold mt-0.5 font-mono">2</span>
                        <div>
                          <strong className="text-slate-900 block font-bold">Favorites of City & BOGO List</strong>
                          <span className="text-slate-500 block text-[11px] mt-0.5 leading-relaxed">
                            Favorites are marked when <code className="text-amber-600 font-mono">Is Popular</code> is true, while Buy-1-Get-1 items are activated when <code className="text-rose-600 font-mono">is_bogo</code> is set inside excel files.
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-center mt-1">
                        <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100/50">
                          <span className="text-[10px] text-amber-700 font-bold block uppercase tracking-wide">Featured Favorites</span>
                          <span className="text-lg font-black text-amber-950 mt-0.5 block">{popularFoodCount} dishes</span>
                        </div>
                        <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/50">
                          <span className="text-[10px] text-rose-700 font-bold block uppercase tracking-wide">BOGO Hot Deals</span>
                          <span className="text-lg font-black text-rose-950 mt-0.5 block">{bogoFoodCount} dishes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FOODS TAB */}
            {activeTab === "foods" && (
              <div className="flex-grow flex flex-col gap-4">
                {/* Search & filters */}
                <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search foods by name, category, or description..."
                      value={foodSearch}
                      onChange={(e) => setFoodSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-rose-500 text-sm h-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={foodCategoryFilter}
                      onChange={(e) => setFoodCategoryFilter(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-hidden bg-white h-10 cursor-pointer min-w-40"
                    >
                      <option value="all">All Categories</option>
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredFoods.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xs">
                    <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-950">No food products found</h3>
                    <p className="text-slate-500 text-sm mt-1">Try resetting filters or click "Add Food Dish" to create one.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFoods.map((food) => (
                      <div key={food.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-md transition-shadow relative flex flex-col">
                        <div className="relative h-44">
                          <SafeImage 
                            src={food.image_url} 
                            alt={food.product_name} 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                            <span className="bg-slate-950/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {food.category}
                            </span>
                            {food.is_popular && (
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                ★ Favorites of City
                              </span>
                            )}
                            {food.is_bogo && (
                              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                BOGO Deal
                              </span>
                            )}
                            {food.product_tag && (
                              <span className="bg-cyan-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Tag className="h-2.5 w-2.5" />
                                Tag {food.product_tag}
                              </span>
                            )}
                          </div>
                          
                          <div className="absolute top-2 right-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              food.stock_status === "instock" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            }`}>
                              {food.stock_status === "instock" ? "Available" : "Sold Out"}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 flex-grow flex flex-col gap-2">
                          <div className="flex items-start justify-between">
                            <h4 className="font-bold text-slate-950 text-base line-clamp-1">{food.product_name}</h4>
                            <span className="text-xs font-mono text-slate-500">#{food.display_order}</span>
                          </div>
                          
                          <p className="text-xs text-slate-500 line-clamp-2 min-h-8">{food.description || "No description provided."}</p>
                          
                          <div className="border-t border-slate-100 pt-3 mt-2 flex flex-col gap-1.5 bg-slate-50 p-3 rounded-xl">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500 font-medium">Full Plate Price:</span>
                              <span className="font-bold text-slate-950">₹{food.full_plate_price}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500 font-medium font-sans">Has Half Plate:</span>
                              <span className="font-bold text-slate-950 text-right">
                                {food.has_half_plate ? `Yes (₹${food.half_plate_price})` : "No"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-500 font-medium">Rating: {food.rating} ★</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenFoodForm(food)}
                              className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Edit product info"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => food.id && handleDeleteFood(food.id)}
                              className="p-1.5 text-red-600 hover:text-white hover:bg-red-500 rounded-md transition-colors cursor-pointer"
                              title="Delete product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COUPONS TAB */}
            {activeTab === "coupons" && (
              <div className="flex-grow flex flex-col gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Active Promo Codes</h3>
                    <p className="text-xs text-slate-500">Configure automated and specific coupons applied synchronously on checkout</p>
                  </div>
                </div>

                {coupons.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xs">
                    <Tag className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-950">No coupon codes registered</h3>
                    <p className="text-slate-500 text-sm mt-1">Create coupons like WELCOME200 or specialized item codes like CODE101 manually.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coupons.map((coupon) => (
                      <div key={coupon.id} className={`bg-white rounded-2xl border ${
                        coupon.active_status ? "border-slate-100" : "border-slate-200 bg-dashed"
                      } p-5 shadow-xs relative flex flex-col gap-4`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md font-mono font-bold tracking-wider text-sm">
                              {coupon.code}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            coupon.active_status ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                          }`}>
                            {coupon.active_status ? "Active" : "Disabled"}
                          </span>
                        </div>

                        <div className="flex-grow flex flex-col gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{coupon.description || "Discount code"}</h4>
                          
                          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl mt-2 font-medium">
                            <div>
                              <span className="text-slate-500 block">Offer Discount</span>
                              <span className="text-slate-950 font-bold text-base">
                                {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Min Cart Value</span>
                              <span className="text-slate-950 font-bold text-sm">₹{coupon.min_order_amount}</span>
                            </div>
                          </div>

                          {coupon.product_specific ? (
                            <div className="mt-2 text-xs flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 font-medium">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>Requires Dish name with Tag: {coupon.product_specific}</span>
                            </div>
                          ) : (
                            <div className="mt-2 text-xs flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                              <CheckCircle className="h-3.5 w-3.5 text-slate-500" />
                              <span>Valid on overall foods cart</span>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-slate-100 pt-3 flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenCouponForm(coupon)}
                            className="p-1 px-2.5 text-xs text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1.5 font-semibold cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => coupon.id && handleDeleteCoupon(coupon.id)}
                            className="p-1 px-2.5 text-xs text-red-600 hover:text-white hover:bg-red-500 rounded-md transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ORDERS LOG TAB */}
            {activeTab === "orders" && (
              <div className="flex-grow flex flex-col gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Client Checkout Audit Log</h3>
                    <p className="text-xs text-slate-500">History of customer checkouts compiled and synchronized from your Firebase DB</p>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xs">
                    <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-950">No checkout history</h3>
                    <p className="text-slate-500 text-sm mt-1">Customer checkouts from the cart will show up here as audit records.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs flex flex-col gap-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-700 text-xs font-semibold uppercase font-sans">
                            <th className="py-3.5 px-6">Customer / Contact</th>
                            <th className="py-3.5 px-6">Delivery Address</th>
                            <th className="py-3.5 px-6">Items Configured</th>
                            < th className="py-3.5 px-6">Summary / Promo</th>
                            <th className="py-3.5 px-6">Grand Total</th>
                            <th className="py-3.5 px-6 text-center">Delete Log</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                          {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-slate-50/50">
                              <td className="py-4 px-6 border-b border-slate-100">
                                <div className="font-bold text-slate-950">{order.customer_name}</div>
                                <div className="text-xs text-slate-500 font-semibold font-mono mt-0.5">{order.customer_phone}</div>
                                <div className="text-[10px] text-slate-400 mt-1">{order.created_at ? new Date(order.created_at).toLocaleString() : "Just now"}</div>
                              </td>
                              <td className="py-4 px-6 border-b border-slate-100 max-w-xs">
                                <span className="line-clamp-2 text-xs font-medium text-slate-700">{order.delivery_address}</span>
                              </td>
                              <td className="py-4 px-6 border-b border-slate-100">
                                <div className="flex flex-col gap-1 max-w-xs">
                                  {order.items?.map((item, index) => (
                                    <span key={index} className="text-xs bg-emerald-50 text-emerald-900 border border-emerald-100 px-2 py-0.5 rounded w-fit inline-flex items-center gap-1">
                                      {item.product_name} 
                                      <span className="text-slate-500 italic">({item.selectedSize})</span> 
                                      <span className="font-bold">x{item.quantity}</span>
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-4 px-6 border-b border-slate-100 text-xs">
                                <div>Subtotal: ₹{order.total_before_discount}</div>
                                {order.applied_coupon && (
                                  <div className="text-rose-600 font-semibold">
                                    Code: {order.applied_coupon} (-₹{order.discount_amount})
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-6 border-b border-slate-100 font-extrabold text-slate-950 text-base">
                                ₹{order.grand_total}
                              </td>
                              <td className="py-4 px-6 border-b border-slate-100 text-center">
                                <button
                                  onClick={() => order.id && handleDeleteOrder(order.id)}
                                  className="p-1 px-2 text-red-500 hover:text-white hover:bg-red-500 rounded-md transition-all text-xs cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* FOOD MODAL DIALOG */}
      {showFoodModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="food-editor-modal">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-100 shadow-xl overflow-hidden my-8">
            <div className="bg-slate-950 text-white py-4 px-6 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editingFood ? "Edit Food Menu Dish" : "Create New Food Dish"}</h3>
              <button 
                onClick={() => setShowFoodModal(false)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSaveFood} className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={foodForm.product_name}
                  onChange={(e) => setFoodForm({ ...foodForm, product_name: e.target.value })}
                  placeholder="e.g. Special Mutton Biryani"
                  className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm"
                />
              </div>

              {/* Grid: Category & Display Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category *</label>
                  <select
                    value={foodForm.category}
                    onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm bg-white cursor-pointer"
                  >
                    <option value="Biryani">Biryani</option>
                    <option value="Starters">Starters</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Display Order Badge *</label>
                  <input
                    type="number"
                    required
                    value={foodForm.display_order}
                    onChange={(e) => setFoodForm({ ...foodForm, display_order: Number(e.target.value) })}
                    placeholder="10"
                    className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Grid: Plates Configuration */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col gap-3">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Plates Options Config</span>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="has_half_plate"
                    checked={foodForm.has_half_plate}
                    onChange={(e) => setFoodForm({ 
                      ...foodForm, 
                      has_half_plate: e.target.checked,
                      // auto initialize half-plate price to 60% of full if checking
                      half_plate_price: e.target.checked ? (foodForm.half_plate_price || Math.round((foodForm.full_plate_price || 150) * 0.6)) : undefined
                    })}
                    className="h-4.5 w-4.5 text-rose-500 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                  />
                  <label htmlFor="has_half_plate" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    Enable Double Options (Both Half Portion and Full Portion prices)
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Full Plate Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={foodForm.full_plate_price || ""}
                      onChange={(e) => setFoodForm({ ...foodForm, full_plate_price: Number(e.target.value) })}
                      placeholder="e.g. 260"
                      className="w-full px-3 py-1.5 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1 ${
                      foodForm.has_half_plate ? "text-slate-600" : "text-slate-400"
                    }`}>
                      Half Plate Price (₹) {foodForm.has_half_plate ? "*" : "(Deactivated)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={!foodForm.has_half_plate}
                      required={foodForm.has_half_plate}
                      value={foodForm.has_half_plate ? (foodForm.half_plate_price || "") : ""}
                      onChange={(e) => setFoodForm({ ...foodForm, half_plate_price: Number(e.target.value) })}
                      placeholder="e.g. 150"
                      className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-hidden ${
                        foodForm.has_half_plate 
                          ? "border-slate-200 focus:border-rose-500 bg-white" 
                          : "border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Layout Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-150 p-4 rounded-xl text-xs font-semibold text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer p-1">
                  <input
                    type="checkbox"
                    checked={foodForm.is_popular}
                    onChange={(e) => setFoodForm({ ...foodForm, is_popular: e.target.checked })}
                    className="h-4 w-4 text-rose-500 rounded"
                  />
                  <span>Favorites of the City</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-1">
                  <input
                    type="checkbox"
                    checked={foodForm.is_featured}
                    onChange={(e) => setFoodForm({ ...foodForm, is_featured: e.target.checked })}
                    className="h-4 w-4 text-rose-500 rounded"
                  />
                  <span>Featured Product</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-1">
                  <input
                    type="checkbox"
                    checked={foodForm.is_bogo}
                    onChange={(e) => setFoodForm({ ...foodForm, is_bogo: e.target.checked })}
                    className="h-4 w-4 text-rose-500 rounded"
                  />
                  <span className="text-rose-600 font-extrabold">BUY 1 GET 1 (BOGO) Deal</span>
                </label>
              </div>

              {/* Image URL & Stock State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Image URL (HTTPS or HTTP) *</label>
                  <input
                    type="text"
                    required
                    value={foodForm.image_url}
                    onChange={(e) => setFoodForm({ ...foodForm, image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/... or http://"
                    className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Stock Status *</label>
                  <select
                    value={foodForm.stock_status}
                    onChange={(e) => setFoodForm({ ...foodForm, stock_status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm bg-white cursor-pointer"
                  >
                    <option value="instock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Rating & Product Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rating Value (1.0 - 5.0) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    required
                    value={foodForm.rating}
                    onChange={(e) => setFoodForm({ ...foodForm, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Tag (e.g. #101)</label>
                  <input
                    type="text"
                    value={foodForm.product_tag || ""}
                    onChange={(e) => setFoodForm({ ...foodForm, product_tag: e.target.value })}
                    placeholder="e.g. #101"
                    className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dish Description *</label>
                <textarea
                  rows={3}
                  required
                  value={foodForm.description}
                  onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
                  placeholder="Describe your delicious recipe, spice level, servings, etc."
                  className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFoodModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COUPON MODAL DIALOG */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="coupon-editor-modal">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-xl overflow-hidden my-8">
            <div className="bg-slate-950 text-white py-4 px-6 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editingCoupon ? "Modify Coupon Code" : "Create New Coupon Code"}</h3>
              <button 
                onClick={() => setShowCouponModal(false)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="p-6 flex flex-col gap-4">
              {/* Coupon Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Coupon Code (Alphanumeric uppercase) *</label>
                <input
                  type="text"
                  required
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                  placeholder="e.g. WELCOME150, CODE101"
                  className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm font-mono uppercase"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Offer Rules Description *</label>
                <input
                  type="text"
                  required
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  placeholder="e.g. Save flat ₹150 on delicious biryani orders!"
                  className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm"
                />
              </div>

              {/* Grid: Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Discount Style *</label>
                  <select
                    value={couponForm.discount_type}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm bg-white cursor-pointer"
                  >
                    <option value="fixed_amount">Fixed rate discount (₹)</option>
                    <option value="percentage">Percentage Off (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={couponForm.discount_value || ""}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_value: Number(e.target.value) })}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Grid: Min Order & Target Product lock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Minimum Order Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={couponForm.min_order_amount || ""}
                    onChange={(e) => setCouponForm({ ...couponForm, min_order_amount: Number(e.target.value) })}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Product Match Lock</label>
                  <input
                    type="text"
                    value={couponForm.product_specific || ""}
                    onChange={(e) => setCouponForm({ ...couponForm, product_specific: e.target.value })}
                    placeholder="e.g. #101"
                    className="w-full px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-rose-500 rounded-lg text-sm"
                    title="If provided, this coupon only activates when a food containing this keyword/code (e.g., #101) is added to the cart."
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">e.g. #101 for CODE #101 trigger</span>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg mt-1 border border-slate-100">
                <input
                  type="checkbox"
                  id="active_status"
                  checked={couponForm.active_status}
                  onChange={(e) => setCouponForm({ ...couponForm, active_status: e.target.checked })}
                  className="h-4.5 w-4.5 text-rose-500 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="active_status" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Activate and publish this Coupon immediately
                </label>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Custom Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-150" id="delete-confirmation-custom-modal">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-150 flex flex-col gap-5 relative">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100/50">
              <AlertCircle className="h-6 w-6" />
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-950">Confirm Delete</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete this {deleteConfirmType === "food" ? "food product" : deleteConfirmType === "coupon" ? "coupon offer" : "order log"}? This action is permanent and cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 mt-1">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmId(null);
                  setDeleteConfirmType(null);
                }}
                className="flex-1 h-10 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cancel, Keep
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmId;
                  const type = deleteConfirmType;
                  // reset state immediately
                  setDeleteConfirmId(null);
                  setDeleteConfirmType(null);
                  
                  if (type === "food") {
                    await executeDeleteFood(id);
                  } else if (type === "coupon") {
                    await executeDeleteCoupon(id);
                  } else if (type === "order") {
                    await executeDeleteOrder(id);
                  }
                }}
                className="flex-1 h-10 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-md shadow-rose-200"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
