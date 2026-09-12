import { create } from "zustand";
import { apiFetch, handleApiError } from "@/lib/apiFetch";

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
      const cart = await apiFetch<{ items?: CartItem[] }>("/api/cart");
      set({ items: cart.items || [], loading: false, initialized: true });
    } catch {
      set({ items: [], loading: false, initialized: true });
    }
  },

  addItem: async (productId: string, quantity = 1) => {
    try {
      await apiFetch("/api/cart", {
        method: "POST",
        body: { productId, quantity },
      });
      await get().fetchCart();
    } catch (err) {
      const { retryResult } = await handleApiError(err, "add the item to your cart", false, true, () =>
        apiFetch("/api/cart", { method: "POST", body: { productId, quantity } }),
      );
      if (retryResult !== undefined) {
        await get().fetchCart();
      }
    }
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    try {
      await apiFetch(`/api/cart/items/${itemId}`, {
        method: "PATCH",
        body: { quantity },
      });
      await get().fetchCart();
    } catch (err) {
      const { retryResult } = await handleApiError(err, "update the item quantity", false, true, () =>
        apiFetch(`/api/cart/items/${itemId}`, { method: "PATCH", body: { quantity } }),
      );
      if (retryResult !== undefined) {
        await get().fetchCart();
      }
    }
  },

  removeItem: async (itemId: string) => {
    try {
      await apiFetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
      await get().fetchCart();
    } catch (err) {
      const { retryResult } = await handleApiError(err, "remove the item from your cart", false, true, () =>
        apiFetch(`/api/cart/items/${itemId}`, { method: "DELETE" }),
      );
      if (retryResult !== undefined) {
        await get().fetchCart();
      }
    }
  },

  clearCart: async () => {
    try {
      await apiFetch("/api/cart", { method: "DELETE" });
      set({ items: [] });
    } catch (err) {
      const { retryResult } = await handleApiError(err, "clear your cart", false, true, () =>
        apiFetch("/api/cart", { method: "DELETE" }),
      );
      if (retryResult !== undefined) {
        set({ items: [] });
      }
    }
  },
}));
