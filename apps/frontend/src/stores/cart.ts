import { create } from "zustand";

type CartProduct = {
  id: string;
  name: string;
  price: number;
  images: string[];
  stock: number;
};

type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  product: CartProduct;
};

type CartStore = {
  items: CartItem[];
  loading: boolean;
  initialized: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  loading: false,
  initialized: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) {
        set({ items: [], loading: false, initialized: true });
        return;
      }
      const cart = await res.json();
      set({ items: cart.items || [], loading: false, initialized: true });
    } catch {
      set({ items: [], loading: false, initialized: true });
    }
  },

  addItem: async (productId: string, quantity = 1) => {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    if (!res.ok) throw new Error("Failed to add item");
    await get().fetchCart();
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    await fetch(`/api/cart/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    await get().fetchCart();
  },

  removeItem: async (itemId: string) => {
    await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
    await get().fetchCart();
  },

  clearCart: async () => {
    await fetch("/api/cart", { method: "DELETE" });
    set({ items: [] });
  },
}));
