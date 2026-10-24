create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  kicker text not null,
  title text not null,
  subtitle text not null,
  focus_x integer not null default 50,
  focus_y integer not null default 50,
  sort integer not null default 0,
  active boolean not null default true
);
alter table public.promotions enable row level security;
create policy "promotions readable" on public.promotions for select using (active);

insert into public.promotions (kicker, title, subtitle, focus_x, focus_y, sort) values
  ('WEEKEND', 'Double stamps', 'Every Saturday and Sunday', 12, 50, 1),
  ('NEW MENU', 'Seasonal brew is here', 'Try it at Dramaga this month', 80, 40, 2),
  ('BRING YOUR OWN', 'Tumbler day', 'Bring a tumbler, get a free shot', 35, 70, 3),
  ('MEMBERS ONLY', 'Birthday treat', 'Add your birthday to unlock', 65, 20, 4),
  ('COMING SOON', 'New outlet opening', 'Be the first to know', 95, 60, 5);
