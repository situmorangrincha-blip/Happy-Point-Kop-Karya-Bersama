-- Jalankan sekali di Supabase: SQL Editor > New query > paste > Run
create extension if not exists pgcrypto;

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nama text not null,
  hp text not null,
  tgl_belanja date not null,
  foto_path text not null,
  status text not null default 'baru',   -- baru | ok | no
  belanja bigint not null default 0,      -- total belanja produk Garudafood + Dilan (diisi admin)
  kacang boolean not null default false,  -- ada Kacang Atom/Kulit 1000 min 1 Ball (diisi admin)
  verified_by text,
  verified_at timestamptz
);
create index if not exists submissions_hp on submissions (hp);

create table if not exists redemptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  hp text not null,
  poin int not null,
  hadiah text not null,
  by_name text
);

create table if not exists recipients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null unique
);

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  username text not null unique,
  name text not null,
  role text not null default 'admin',     -- owner | admin
  pass_hash text not null
);

-- Semua akses lewat API server (service key), jadi RLS dinyalakan tanpa policy
alter table submissions enable row level security;
alter table redemptions enable row level security;
alter table recipients enable row level security;
alter table admins enable row level security;

-- Bucket foto faktur (privat)
insert into storage.buckets (id, name, public) values ('faktur', 'faktur', false) on conflict (id) do nothing;
