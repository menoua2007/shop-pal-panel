export const toman = (n: number) => `${Math.round(n).toLocaleString("fa-IR")} تومان`;
export const faNum = (n: number) => n.toLocaleString("fa-IR");
export const finalPrice = (price: number, discount: number) =>
  Math.round(price * (1 - (discount || 0) / 100));

export const statusLabel: Record<string, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت شده",
  processing: "در حال پردازش",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
  failed: "پرداخت ناموفق",
};
