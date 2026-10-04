-- Kodi: rentals for tenants, owners and brokers (Dar es Salaam)
-- Run this once in Supabase → SQL Editor, or with `supabase db push`.

create extension if not exists pgcrypto;

-- ---------- Types ----------
create type public.user_role      as enum ('tenant', 'owner', 'broker');
create type public.listing_type   as enum ('apartment', 'house', 'studio', 'room');
create type public.listing_status as enum ('available', 'occupied', 'paused');
create type public.inquiry_kind   as enum ('viewing', 'reservation');
create type public.inquiry_status as enum ('open', 'confirmed', 'declined', 'cancelled');
create type public.client_stage   as enum ('lead', 'viewing', 'agreed', 'moved');
create type public.payment_status as enum ('pending', 'paid', 'failed');

-- ---------- Profiles ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'tenant',
  full_name   text not null default '',
  phone       text,
  broker_code text unique,
  created_at  timestamptz not null default now()
);

-- Create a profile whenever someone signs up. Role, name and phone come from sign-up metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r      public.user_role;
  letters text;
  code    text;
begin
  r := case new.raw_user_meta_data ->> 'role'
         when 'owner'  then 'owner'::public.user_role
         when 'broker' then 'broker'::public.user_role
         else 'tenant'::public.user_role
       end;

  if r = 'broker' then
    letters := upper(substr(regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', ''), '[^A-Za-z]', '', 'g'), 1, 6));
    if letters = '' then letters := 'DALALI'; end if;
    loop
      code := letters || lpad((floor(random() * 10000))::int::text, 4, '0');
      exit when not exists (select 1 from public.profiles p where p.broker_code = code);
    end loop;
  end if;

  insert into public.profiles (id, role, full_name, phone, broker_code)
  values (
    new.id,
    r,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    code
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Listings ----------
create table public.listings (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid references public.profiles (id) on delete set null,
  broker_id      uuid references public.profiles (id) on delete set null,
  owner_name     text,
  title          text not null check (length(title) between 3 and 120),
  type           public.listing_type not null,
  area           text not null,
  rent           integer not null check (rent > 0),
  advance_months smallint not null default 6 check (advance_months between 1 and 24),
  bedrooms       smallint not null default 1 check (bedrooms between 0 and 20),
  bathrooms      smallint not null default 1 check (bathrooms between 0 and 20),
  furnished      boolean not null default false,
  amenities      text[] not null default '{}',
  description    text not null default '',
  status         public.listing_status not null default 'available',
  verified       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint listings_has_manager check (owner_id is not null or broker_id is not null)
);
create index listings_status_area_idx on public.listings (status, area);
create index listings_owner_idx  on public.listings (owner_id);
create index listings_broker_idx on public.listings (broker_id);

create table public.listing_photos (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  path       text not null,
  caption    text not null default 'photo',
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index listing_photos_listing_idx on public.listing_photos (listing_id, position);

-- True when the signed-in user owns or manages the listing.
create or replace function public.manages_listing(l_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.listings l
    where l.id = l_id and (l.owner_id = auth.uid() or l.broker_id = auth.uid())
  );
$$;

-- ---------- Inquiries (viewing requests and reservations) ----------
create table public.inquiries (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings (id) on delete cascade,
  tenant_id      uuid not null references public.profiles (id) on delete cascade,
  name           text not null,
  phone          text not null,
  kind           public.inquiry_kind not null,
  preferred_date date,
  message        text,
  broker_id      uuid references public.profiles (id) on delete set null,
  status         public.inquiry_status not null default 'open',
  created_at     timestamptz not null default now()
);
create index inquiries_listing_idx on public.inquiries (listing_id);
create index inquiries_tenant_idx  on public.inquiries (tenant_id);
create index inquiries_broker_idx  on public.inquiries (broker_id);

-- ---------- Broker clients (pipeline) ----------
create table public.broker_clients (
  id         uuid primary key default gen_random_uuid(),
  broker_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  tenant_id  uuid references public.profiles (id) on delete set null,
  name       text not null,
  phone      text not null,
  wants      text not null default '',
  listing_id uuid references public.listings (id) on delete set null,
  stage      public.client_stage not null default 'lead',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (broker_id, phone)
);

-- ---------- Payments ----------
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  inquiry_id   uuid not null references public.inquiries (id) on delete cascade,
  payer_id     uuid references public.profiles (id) on delete set null,
  amount       integer not null check (amount > 0),
  currency     text not null default 'TZS',
  provider     text not null,
  phone        text not null,
  status       public.payment_status not null default 'pending',
  provider_ref text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index payments_inquiry_idx on public.payments (inquiry_id);

-- ---------- Commissions (one month's rent, paid by the owner when the client moves in) ----------
-- Runs with the view owner's rights so a broker keeps seeing a commission after the home is marked occupied;
-- the WHERE clause limits rows to the signed-in broker.
create view public.broker_commissions as
select
  c.id,
  c.broker_id,
  c.name       as client_name,
  c.stage,
  l.id         as listing_id,
  l.title,
  l.area,
  l.rent       as commission,
  case when c.stage = 'moved' then 'earned' else 'pending' end as state,
  c.updated_at
from public.broker_clients c
join public.listings l on l.id = c.listing_id
where c.stage in ('agreed', 'moved')
  and c.broker_id = auth.uid();

-- ---------- updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

create trigger listings_touch       before update on public.listings       for each row execute function public.touch_updated_at();
create trigger broker_clients_touch before update on public.broker_clients for each row execute function public.touch_updated_at();
create trigger payments_touch       before update on public.payments       for each row execute function public.touch_updated_at();

-- ---------- Create an inquiry (resolves the broker code, updates the broker's pipeline) ----------
create or replace function public.create_inquiry(
  p_listing     uuid,
  p_kind        public.inquiry_kind,
  p_name        text,
  p_phone       text,
  p_date        date default null,
  p_message     text default null,
  p_broker_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings;
  v_broker  uuid;
  v_id      uuid;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;
  if coalesce(trim(p_name), '') = '' or p_phone !~ '^255[67][0-9]{8}$' then
    raise exception 'Enter your name and a valid Tanzanian phone number';
  end if;

  select * into v_listing from public.listings where id = p_listing and status = 'available';
  if not found then
    raise exception 'This property is no longer available';
  end if;

  if coalesce(trim(p_broker_code), '') <> '' then
    select id into v_broker from public.profiles
     where broker_code = upper(trim(p_broker_code)) and role = 'broker';
    if v_broker is null then
      raise exception 'Broker code not found';
    end if;
  end if;

  insert into public.inquiries (listing_id, tenant_id, name, phone, kind, preferred_date, message, broker_id)
  values (p_listing, auth.uid(), trim(p_name), p_phone, p_kind, p_date, nullif(trim(p_message), ''), v_broker)
  returning id into v_id;

  if v_broker is not null then
    insert into public.broker_clients (broker_id, tenant_id, name, phone, wants, listing_id, stage)
    values (v_broker, auth.uid(), trim(p_name), p_phone, v_listing.title || ', ' || v_listing.area, p_listing, 'viewing')
    on conflict (broker_id, phone) do update
      set listing_id = excluded.listing_id,
          tenant_id  = excluded.tenant_id,
          stage      = case when public.broker_clients.stage = 'lead' then 'viewing'::public.client_stage
                            else public.broker_clients.stage end;
  end if;

  return v_id;
end;
$$;

-- When a reservation is paid: confirm it and move the referred client to "agreed".
create or replace function public.on_payment_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inq public.inquiries;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    update public.inquiries set status = 'confirmed' where id = new.inquiry_id
    returning * into v_inq;
    if v_inq.broker_id is not null then
      update public.broker_clients
         set stage = 'agreed', listing_id = v_inq.listing_id
       where broker_id = v_inq.broker_id and phone = v_inq.phone and stage in ('lead', 'viewing');
    end if;
  end if;
  return new;
end;
$$;

create trigger payments_paid after update on public.payments
  for each row execute function public.on_payment_paid();

-- The signed-in user's role (helper used by security rules; avoids rules that loop between tables).
create or replace function public.my_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- True when the signed-in user may see another person's name (a broker on an available listing,
-- or a broker linked to one of your inquiries or listings).
create or replace function public.can_see_profile(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.listings l where l.broker_id = p_id and l.status = 'available')
      or exists (select 1 from public.inquiries i
                 where i.broker_id = p_id
                   and (i.tenant_id = auth.uid()
                        or exists (select 1 from public.listings l
                                   where l.id = i.listing_id
                                     and (l.owner_id = auth.uid() or l.broker_id = auth.uid()))));
$$;

-- True when the signed-in user has an inquiry on the listing or is a broker with a client linked to it,
-- so tenants and brokers keep seeing a home after it is taken.
create or replace function public.has_listing_link(l_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.inquiries i
            where i.listing_id = l_id and (i.tenant_id = auth.uid() or i.broker_id = auth.uid()))
    or exists (select 1 from public.broker_clients c
               where c.listing_id = l_id and c.broker_id = auth.uid())
  );
$$;

-- ---------- Row-level security ----------
alter table public.profiles       enable row level security;
alter table public.listings       enable row level security;
alter table public.listing_photos enable row level security;
alter table public.inquiries      enable row level security;
alter table public.broker_clients enable row level security;
alter table public.payments       enable row level security;

-- Profiles: you can read your own profile, and the names of people connected to your listings or inquiries.
create policy "read own profile" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "read related profiles" on public.profiles for select to authenticated
  using (public.can_see_profile(id));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Listings: anyone can browse available homes; managers see and edit their own.
create policy "browse available" on public.listings for select to anon, authenticated
  using (
    status = 'available'
    or owner_id = auth.uid()
    or broker_id = auth.uid()
    or public.has_listing_link(id)
  );
create policy "owners and brokers add listings" on public.listings for insert to authenticated
  with check (
    (owner_id = auth.uid() and broker_id is null
       and public.my_role() = 'owner')
    or
    (broker_id = auth.uid() and owner_id is null
       and public.my_role() = 'broker')
  );
create policy "managers edit listings" on public.listings for update to authenticated
  using (owner_id = auth.uid() or broker_id = auth.uid())
  with check (owner_id = auth.uid() or broker_id = auth.uid());
create policy "managers delete listings" on public.listings for delete to authenticated
  using (owner_id = auth.uid() or broker_id = auth.uid());

-- Photos follow their listing.
create policy "see photos of visible listings" on public.listing_photos for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_photos.listing_id));
create policy "managers add photos" on public.listing_photos for insert to authenticated
  with check (public.manages_listing(listing_id));
create policy "managers edit photos" on public.listing_photos for update to authenticated
  using (public.manages_listing(listing_id)) with check (public.manages_listing(listing_id));
create policy "managers delete photos" on public.listing_photos for delete to authenticated
  using (public.manages_listing(listing_id));

-- Inquiries: created only through create_inquiry(). Tenants see theirs; owners/brokers see the ones on their listings; referring brokers see theirs.
create policy "see related inquiries" on public.inquiries for select to authenticated
  using (tenant_id = auth.uid() or broker_id = auth.uid() or public.manages_listing(listing_id));
create policy "managers answer inquiries" on public.inquiries for update to authenticated
  using (public.manages_listing(listing_id)) with check (public.manages_listing(listing_id));
create policy "tenants cancel inquiries" on public.inquiries for update to authenticated
  using (tenant_id = auth.uid()) with check (tenant_id = auth.uid() and status = 'cancelled');

-- Broker clients: private to each broker.
create policy "brokers manage their clients" on public.broker_clients for all to authenticated
  using (broker_id = auth.uid())
  with check (
    broker_id = auth.uid()
    and public.my_role() = 'broker'
  );

-- Payments: written only by the payment functions (service role).
create policy "see related payments" on public.payments for select to authenticated
  using (
    payer_id = auth.uid()
    or exists (select 1 from public.inquiries i where i.id = payments.inquiry_id and public.manages_listing(i.listing_id))
  );

-- Column-level limits: people cannot change their own role or broker code, mark listings verified, or move listings between managers.
revoke all on public.profiles, public.listings, public.listing_photos, public.inquiries, public.broker_clients, public.payments from anon;
grant select on public.listings, public.listing_photos to anon;

revoke insert, update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

revoke insert, update on public.listings from authenticated;
grant insert (owner_id, broker_id, owner_name, title, type, area, rent, advance_months, bedrooms, bathrooms,
              furnished, amenities, description, status) on public.listings to authenticated;
grant update (owner_name, title, type, area, rent, advance_months, bedrooms, bathrooms,
              furnished, amenities, description, status) on public.listings to authenticated;

revoke insert, update on public.inquiries from authenticated;
grant update (status) on public.inquiries to authenticated;

revoke insert, update, delete on public.payments from authenticated;

revoke all on function public.create_inquiry(uuid, public.inquiry_kind, text, text, date, text, text) from public, anon;
grant execute on function public.create_inquiry(uuid, public.inquiry_kind, text, text, date, text, text) to authenticated;

revoke all on public.broker_commissions from anon;
grant select on public.broker_commissions to authenticated;

-- ---------- Photo storage ----------
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- Files live at  listing-photos/<listing id>/<file name>
create policy "managers upload listing photos" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and public.manages_listing(((storage.foldername(name))[1])::uuid)
  );
create policy "managers delete listing photos" on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and public.manages_listing(((storage.foldername(name))[1])::uuid)
  );
