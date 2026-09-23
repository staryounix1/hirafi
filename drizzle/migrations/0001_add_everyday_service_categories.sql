INSERT INTO service_categories (slug, name_ar, icon, sort_order)
VALUES
  ('grocery', 'قضاء الأغراض', 'ShoppingBasket', 12),
  ('queue', 'الوقوف فالطابور', 'ListChecks', 13),
  ('rental', 'الكراء', 'KeyRound', 14)
ON CONFLICT (slug) DO UPDATE
SET name_ar = EXCLUDED.name_ar,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;
