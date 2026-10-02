import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = { id: string; name: string; price: number; image: string | null; qty: number; stock: number };

type Ctx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "mp-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);

  const add: Ctx["add"] = (item) =>
    setItems((prev) => {
      const ex = prev.find((p) => p.id === item.id);
      if (ex) return prev.map((p) => (p.id === item.id ? { ...p, qty: Math.min(p.qty + 1, item.stock) } : p));
      return [...prev, { ...item, qty: 1 }];
    });
  const setQty: Ctx["setQty"] = (id, qty) =>
    setItems((prev) =>
      qty <= 0 ? prev.filter((p) => p.id !== id) : prev.map((p) => (p.id === id ? { ...p, qty: Math.min(qty, p.stock) } : p)),
    );
  const remove = (id: string) => setItems((prev) => prev.filter((p) => p.id !== id));
  const clear = () => setItems([]);

  return (
    <CartCtx.Provider
      value={{
        items,
        add,
        setQty,
        remove,
        clear,
        count: items.reduce((s, i) => s + i.qty, 0),
        subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside provider");
  return c;
}
