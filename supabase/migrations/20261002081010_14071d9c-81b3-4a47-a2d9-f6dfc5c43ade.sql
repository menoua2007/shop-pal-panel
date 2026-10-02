create type public.app_role as enum ('admin','user');
create type public.order_status as enum ('pending','paid','processing','shipped','delivered','cancelled','failed');

create table public.profiles (
  id uuid primary key,
  full_name text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create policy "own profile read" on public.profiles for select to authenticated using (auth.uid()=id or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid()=id);
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid()=user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  insert into public.user_roles(user_id, role) values (new.id, 'user');
  if (select count(*) from public.user_roles where role='admin') = 0 then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  sort int not null default 0
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "cat read" on public.categories for select to anon, authenticated using (true);
create policy "cat admin" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  brand text,
  description text,
  price bigint not null,
  discount_percent int not null default 0,
  stock int not null default 0,
  image_url text,
  specs jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "prod read" on public.products for select to anon, authenticated using (is_active or public.has_role(auth.uid(),'admin'));
create policy "prod admin" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null,
  author_name text,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon, authenticated;
grant insert, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "rev read" on public.reviews for select to anon, authenticated using (true);
create policy "rev insert" on public.reviews for insert to authenticated with check (auth.uid()=user_id);
create policy "rev delete" on public.reviews for delete to authenticated using (auth.uid()=user_id or public.has_role(auth.uid(),'admin'));

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent int not null check (percent between 1 and 100),
  max_discount bigint,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.coupons to authenticated;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
create policy "coupon admin" on public.coupons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status order_status not null default 'pending',
  subtotal bigint not null,
  discount bigint not null default 0,
  total bigint not null,
  coupon_code text,
  full_name text not null,
  phone text not null,
  address text not null,
  authority text,
  ref_id text,
  created_at timestamptz not null default now()
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "order read" on public.orders for select to authenticated using (auth.uid()=user_id or public.has_role(auth.uid(),'admin'));
create policy "order admin update" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  unit_price bigint not null,
  quantity int not null
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "items read" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.has_role(auth.uid(),'admin'))));

insert into public.categories(name, slug, icon, sort) values
('موبایل','mobile','smartphone',1),('لپ‌تاپ','laptop','laptop',2),('تبلت','tablet','tablet',3),('هدفون','headphone','headphones',4),('ساعت هوشمند','watch','watch',5),('لوازم جانبی','accessory','cable',6);

insert into public.products(category_id,name,brand,description,price,discount_percent,stock,image_url,specs) values
((select id from categories where slug='mobile'),'گوشی سامسونگ Galaxy S24 Ultra ظرفیت ۲۵۶ گیگ','Samsung','پرچمدار سامسونگ با قلم S Pen، دوربین ۲۰۰ مگاپیکسلی و پردازنده اسنپدراگون.',78500000,8,12,'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800','{"صفحه نمایش":"6.8 اینچ","حافظه":"256GB","رم":"12GB","باتری":"5000mAh"}'),
((select id from categories where slug='mobile'),'گوشی اپل iPhone 15 Pro ظرفیت ۱۲۸ گیگ','Apple','بدنه تیتانیومی، تراشه A17 Pro و دوربین حرفه‌ای.',89900000,5,8,'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800','{"صفحه نمایش":"6.1 اینچ","حافظه":"128GB","تراشه":"A17 Pro"}'),
((select id from categories where slug='mobile'),'گوشی شیائومی Redmi Note 13 Pro','Xiaomi','دوربین ۲۰۰ مگاپیکسل و شارژ سریع ۶۷ وات با قیمت مناسب.',18900000,12,30,'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800','{"صفحه نمایش":"6.67 اینچ","حافظه":"256GB","رم":"8GB"}'),
((select id from categories where slug='laptop'),'لپ‌تاپ اپل MacBook Air M3 13 اینچ','Apple','سبک، بی‌صدا و قدرتمند با تراشه M3 و باتری تمام روز.',72000000,0,6,'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800','{"تراشه":"M3","رم":"8GB","حافظه":"256GB SSD"}'),
((select id from categories where slug='laptop'),'لپ‌تاپ ایسوس ROG Strix G16','ASUS','لپ‌تاپ گیمینگ با RTX 4060 و نمایشگر ۱۶۵ هرتز.',95000000,10,4,'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800','{"پردازنده":"Core i7-13650HX","گرافیک":"RTX 4060","رم":"16GB"}'),
((select id from categories where slug='tablet'),'تبلت اپل iPad Air M2','Apple','نمایشگر Liquid Retina و پشتیبانی از Apple Pencil Pro.',48500000,6,10,'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800','{"صفحه نمایش":"11 اینچ","تراشه":"M2","حافظه":"128GB"}'),
((select id from categories where slug='headphone'),'هدفون بی‌سیم سونی WH-1000XM5','Sony','بهترین حذف نویز فعال با ۳۰ ساعت شارژدهی.',21500000,15,20,'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800','{"نوع":"روگوشی","حذف نویز":"دارد","باتری":"30 ساعت"}'),
((select id from categories where slug='headphone'),'هندزفری اپل AirPods Pro 2','Apple','حذف نویز تطبیقی و صدای فضایی.',14900000,7,25,'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800','{"نوع":"توگوشی","کیس":"USB-C"}'),
((select id from categories where slug='watch'),'ساعت هوشمند Galaxy Watch 6','Samsung','پایش سلامت، ضربان قلب و خواب.',12800000,10,15,'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800','{"صفحه":"44mm","ضدآب":"5ATM"}'),
((select id from categories where slug='accessory'),'شارژر انکر ۶۵ وات GaN','Anker','شارژر سه پورت فوق سریع و کوچک.',2400000,20,50,'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800','{"توان":"65W","پورت":"2xUSB-C, 1xUSB-A"}');

insert into public.coupons(code, percent, max_discount) values ('WELCOME10', 10, 2000000);