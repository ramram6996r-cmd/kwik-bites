import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, writeBatch, doc } from "firebase/firestore";
import { FoodProduct, Coupon } from "../types";

import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase with the dynamically provisioned config
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: Must specify the custom databaseId */
export const auth = getAuth(app);

// Authentication helper
export { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
export {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  setDoc,
} from "firebase/firestore";

// Error Handlers mandated by Skill rules
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial dataset to seed Firestore if empty
export const INITIAL_FOODS: FoodProduct[] = [
  {
    product_name: "Special Chicken Biryani",
    category: "Biryani",
    full_plate_price: 320,
    half_plate_price: 180,
    has_half_plate: true,
    description: "Premium aromatic basmati rice cooked with succulent chicken pieces and traditional Hyderabadi spices. Served with raita.",
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=700",
    rating: 4.8,
    stock_status: "instock",
    is_popular: true,
    is_featured: true,
    is_bogo: false,
    display_order: 1,
    product_tag: "#101"
  },
  {
    product_name: "Paneer Butter Masala",
    category: "Main Course",
    full_plate_price: 240,
    half_plate_price: 140,
    has_half_plate: true,
    description: "Fresh cottage cheese cubes cooked in a rich, creamy, and mildly sweet onion-tomato gravy with butter and malai.",
    image_url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=700",
    rating: 4.5,
    stock_status: "instock",
    is_popular: true,
    is_featured: false,
    is_bogo: false,
    display_order: 2
  },
  {
    product_name: "Crispy Chicken Kebab",
    category: "Starters",
    full_plate_price: 260,
    has_half_plate: false,
    description: "Spicy and crisp chicken skewers flavored with pepper, garlic, and fresh herbs. Perfect appetizer for gatherings.",
    image_url: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=700",
    rating: 4.6,
    stock_status: "instock",
    is_popular: false,
    is_featured: true,
    is_bogo: true,
    display_order: 3
  },
  {
    product_name: "Double Ka Meetha #101",
    category: "Desserts",
    full_plate_price: 120,
    has_half_plate: false,
    description: "Traditional bread pudding dessert of fried bread slices soaked in saffron, cardamom milk, topped with crispy almonds.",
    image_url: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=700",
    rating: 4.9,
    stock_status: "instock",
    is_popular: true,
    is_featured: true,
    is_bogo: false,
    display_order: 4,
    product_tag: "#101"
  },
  {
    product_name: "Veg Samosa Platter",
    category: "Starters",
    full_plate_price: 110,
    has_half_plate: false,
    description: "Three pieces of crispy golden samosas packed with seasoned potatoes and sweet peas, served with sweet mint chutney.",
    image_url: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=700",
    rating: 4.4,
    stock_status: "instock",
    is_popular: false,
    is_featured: false,
    is_bogo: true,
    display_order: 5
  },
  {
    product_name: "Authentic Butter Chicken",
    category: "Main Course",
    full_plate_price: 340,
    half_plate_price: 200,
    has_half_plate: true,
    description: "Tender tandoori chicken shreds simmered in smooth velvety tomato, cashew, and rich butter gravy.",
    image_url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&q=80&w=700",
    rating: 4.9,
    stock_status: "instock",
    is_popular: true,
    is_featured: true,
    is_bogo: false,
    display_order: 6
  },
  {
    product_name: "Tandoori Roti Butter",
    category: "Breads",
    full_plate_price: 40,
    has_half_plate: false,
    description: "Whole wheat round Indian flatbread cooked in a rustic clay oven smeared with melted Amul butter.",
    image_url: "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&q=80&w=700",
    rating: 4.3,
    stock_status: "instock",
    is_popular: false,
    is_featured: false,
    is_bogo: true,
    display_order: 7
  },
  {
    product_name: "Garlic Naan Basket",
    category: "Breads",
    full_plate_price: 80,
    has_half_plate: false,
    description: "Delectable leavened flatbread garnished with minced garlic, fresh cilantro, baked perfectly in the tandoor.",
    image_url: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=700",
    rating: 4.7,
    stock_status: "instock",
    is_popular: true,
    is_featured: false,
    is_bogo: true,
    display_order: 8
  },
  {
    product_name: "Spiced Mango Lassi",
    category: "Drinks",
    full_plate_price: 90,
    half_plate_price: 50,
    has_half_plate: true,
    description: "Traditional refreshing beverage made by blending sweet mango pulp with thick yogurt, cardamoms, and saffron toppings.",
    image_url: "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&q=80&w=700",
    rating: 4.6,
    stock_status: "instock",
    is_popular: false,
    is_featured: false,
    is_bogo: true,
    display_order: 9
  },
  {
    product_name: "Gobi Manchurian Dry",
    category: "Starters",
    full_plate_price: 180,
    half_plate_price: 100,
    has_half_plate: true,
    description: "Crispy fried cauliflower florets tossed with onions, bell peppers, soy sauce, and aromatic Indo-Chinese spices.",
    image_url: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&q=80&w=700",
    rating: 4.3,
    stock_status: "instock",
    is_popular: false,
    is_featured: false,
    is_bogo: true,
    display_order: 10
  },
  {
    product_name: "Slow-cooked Dal Makhani",
    category: "Main Course",
    full_plate_price: 220,
    half_plate_price: 120,
    has_half_plate: true,
    description: "Whole black lentils and red kidney beans simmered overnight with tomatoes, onions, clarified butter, and pure cream.",
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=700",
    rating: 4.7,
    stock_status: "instock",
    is_popular: true,
    is_featured: false,
    is_bogo: false,
    display_order: 11
  },
  {
    product_name: "Nawabi Mutton Biryani",
    category: "Biryani",
    full_plate_price: 390,
    half_plate_price: 220,
    has_half_plate: true,
    description: "Royal blend of marinated tender goat meat, basmati rice, mint, fried onions, and pure ghee baked on slow steam.",
    image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=700",
    rating: 4.9,
    stock_status: "instock",
    is_popular: true,
    is_featured: true,
    is_bogo: false,
    display_order: 12,
    product_tag: "#101"
  },
  {
    product_name: "Saffron Rasgulla Cup",
    category: "Desserts",
    full_plate_price: 100,
    has_half_plate: false,
    description: "Soft cottage cheese dumplings soaked in light syrup infused with premium Kashmiri saffron filaments.",
    image_url: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=700",
    rating: 4.5,
    stock_status: "instock",
    is_popular: false,
    is_featured: false,
    is_bogo: true,
    display_order: 13
  },
  {
    product_name: "Sizzling Chili Paneer",
    category: "Starters",
    full_plate_price: 210,
    has_half_plate: false,
    description: "Pan-fried cubes of paneer tossed in spicy chili sauce, sweet and sour vinegar, capsicum, green chillies.",
    image_url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=700",
    rating: 4.5,
    stock_status: "instock",
    is_popular: false,
    is_featured: true,
    is_bogo: false,
    display_order: 14
  },
  {
    product_name: "Crisp Tandoori Roti",
    category: "Breads",
    full_plate_price: 30,
    has_half_plate: false,
    description: "Pristine whole wheat tandoor baked healthy flatbread without any butter. Pure and rustic.",
    image_url: "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&q=80&w=700",
    rating: 4.1,
    stock_status: "instock",
    is_popular: false,
    is_featured: false,
    is_bogo: false,
    display_order: 15
  },
  {
    product_name: "Royal Falooda Mix",
    category: "Drinks",
    full_plate_price: 150,
    half_plate_price: 90,
    has_half_plate: true,
    description: "Grand cold dessert beverage with rose syrup, vermicelli, sweet basil seeds, premium nuts, vanilla ice cream scoop.",
    image_url: "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&q=80&w=700",
    rating: 4.8,
    stock_status: "instock",
    is_popular: true,
    is_featured: true,
    is_bogo: false,
    display_order: 16,
    product_tag: "#101"
  },
  {
    product_name: "Golden Gulab Jamun",
    category: "Desserts",
    full_plate_price: 90,
    has_half_plate: false,
    description: "Golden fried khoya milk spheres soaked in cardamom flavored sugar syrup. Melt in the mouth goodness.",
    image_url: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=700",
    rating: 4.7,
    stock_status: "instock",
    is_popular: true,
    is_featured: false,
    is_bogo: true,
    display_order: 17
  },
  {
    product_name: "Veg Dum Hyderabadi Biryani",
    category: "Biryani",
    full_plate_price: 250,
    half_plate_price: 140,
    has_half_plate: true,
    description: "An authentic dum-style vegetable biryani layered with long basmati grains, fresh beans, carrots, spices, and curd.",
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=700",
    rating: 4.6,
    stock_status: "instock",
    is_popular: true,
    is_featured: false,
    is_bogo: false,
    display_order: 18
  },
  {
    product_name: "Special Masala Fish Fry",
    category: "Starters",
    full_plate_price: 280,
    has_half_plate: false,
    description: "Kingfish steaks rubbed with home-ground spicy coastal masala paste, fried to perfection on cast iron griddle.",
    image_url: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=700",
    rating: 4.7,
    stock_status: "instock",
    is_popular: true,
    is_featured: false,
    is_bogo: false,
    display_order: 19
  },
  {
    product_name: "Creamy Malai Kofta",
    category: "Main Course",
    full_plate_price: 260,
    half_plate_price: 150,
    has_half_plate: true,
    description: "Soft paneer and potato dumplings simmered gently inside rich creamy cashew-almond sauce. Sweet flavored feast.",
    image_url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=700",
    rating: 4.5,
    stock_status: "instock",
    is_popular: false,
    is_featured: false,
    is_bogo: false,
    display_order: 20
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    code: "WELCOME200",
    description: "Flat ₹200 Off on orders above ₹500",
    discount_type: "fixed_amount",
    discount_value: 200,
    min_order_amount: 500,
    active_status: true,
  },
  {
    code: "CODE101",
    description: "Special ₹101 Off on the signature Double Ka Meetha #101",
    discount_type: "fixed_amount",
    discount_value: 101,
    min_order_amount: 120,
    product_specific: "#101",
    active_status: true,
  },
  {
    code: "FEAST30",
    description: "Save 30% on delicious meals above ₹300",
    discount_type: "percentage",
    discount_value: 30,
    min_order_amount: 300,
    active_status: true,
  },
];

// Seed function to prepopulate Firestore with elegant items on first boot
export async function seedDatabaseIfEmpty() {
  try {
    const foodsRef = collection(db, "foods");
    const foodsSnap = await getDocs(foodsRef);

    // Only configure initial database if we are in first-boot state (no foods registered)
    if (foodsSnap.empty) {
      console.log("Seeding initial foods to Firestore...");
      for (const food of INITIAL_FOODS) {
        await addDoc(foodsRef, food);
      }

      const couponsRef = collection(db, "coupons");
      const couponsSnap = await getDocs(couponsRef);

      if (couponsSnap.empty) {
        console.log("Seeding initial coupons to Firestore...");
        for (const coupon of INITIAL_COUPONS) {
          await addDoc(couponsRef, coupon);
        }
      }
    }
  } catch (error) {
    console.error("Error seeding database: ", error);
  }
}
