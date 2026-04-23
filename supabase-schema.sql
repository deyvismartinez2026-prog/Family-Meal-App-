-- ============================================================
-- FAMILY MEAL OS — Supabase Schema
-- Run this in Supabase SQL Editor: https://app.supabase.com
-- Project Settings → SQL Editor → New Query → paste → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('adult', 'kid')),
  portion_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  protein_target_g INTEGER,
  emoji TEXT NOT NULL DEFAULT '👤'
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🍽️',
  thumbnail_url TEXT,
  active_time_min INTEGER NOT NULL DEFAULT 20,
  total_time_min INTEGER NOT NULL DEFAULT 30,
  base_servings NUMERIC NOT NULL DEFAULT 3.5,
  kid_version_notes TEXT,
  make_ahead_notes TEXT,
  cost_per_serving_est NUMERIC,
  source_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  calories_per_serving INTEGER,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  nutrition_confidence TEXT NOT NULL DEFAULT 'med' CHECK (nutrition_confidence IN ('high', 'med', 'low')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🥄',
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  store_preference TEXT NOT NULL DEFAULT 'any' CHECK (store_preference IN ('target', 'walmart', 'bjs', 'amazon', 'any')),
  trip_type TEXT NOT NULL DEFAULT 'any' CHECK (trip_type IN ('weekly', 'bulk', 'subscribe', 'any'))
);

CREATE TABLE IF NOT EXISTS recipe_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  timer_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS meal_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  is_leftover BOOLEAN NOT NULL DEFAULT FALSE,
  leftover_source_plan_id UUID REFERENCES meal_plan(id) ON DELETE SET NULL,
  notes TEXT,
  chef_night_off BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (family_id, date, meal_type)
);

CREATE TABLE IF NOT EXISTS shopping_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  week_of DATE NOT NULL,
  item_name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🛒',
  qty NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  store TEXT NOT NULL DEFAULT 'target' CHECK (store IN ('target', 'walmart', 'bjs', 'amazon', 'any')),
  trip_type TEXT NOT NULL DEFAULT 'weekly' CHECK (trip_type IN ('weekly', 'bulk', 'subscribe', 'any')),
  linked_recipe_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'needed' CHECK (status IN ('needed', 'bought', 'skipped')),
  est_cost NUMERIC,
  checked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pantry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🥫',
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  expires_on DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exclusions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  meal_plan_id UUID NOT NULL REFERENCES meal_plan(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kid_food_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  kid_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  date_tried DATE NOT NULL,
  acceptance TEXT NOT NULL CHECK (acceptance IN ('loved', 'ate', 'rejected', 'spat')),
  retry_queue BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS meal_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES meal_plan(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🍽️',
  cuisine TEXT NOT NULL,
  price_tier TEXT NOT NULL DEFAULT '$' CHECK (price_tier IN ('$', '$$', '$$$')),
  typical_dish TEXT NOT NULL DEFAULT '',
  delivery_apps TEXT[] NOT NULL DEFAULT '{}',
  avg_delivery_min INTEGER,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS takeout_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  picked_by TEXT NOT NULL,
  dish_ordered TEXT,
  est_cost NUMERIC,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry ENABLE ROW LEVEL SECURITY;
ALTER TABLE exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE kid_food_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE takeout_history ENABLE ROW LEVEL SECURITY;

-- Families: anyone can read (needed for join-by-code), insert for creating
CREATE POLICY "Anyone can read families" ON families FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can create family" ON families FOR INSERT WITH CHECK (TRUE);

-- For all family-scoped tables: use a helper function
-- The client stores family_id in a request header or we use anon key with no user auth.
-- Since we're using the anon key (no user auth), we open up access by family_id.
-- The app sends the family_id it stored. We trust it (simple model, no sensitive data).

CREATE POLICY "Family members access" ON family_members FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Recipes access" ON recipes FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Ingredients access" ON ingredients FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Recipe steps access" ON recipe_steps FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Meal plan access" ON meal_plan FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Shopping list access" ON shopping_list FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Pantry access" ON pantry FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Exclusions access" ON exclusions FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Feedback access" ON feedback FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Kid food log access" ON kid_food_log FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Meal photos access" ON meal_photos FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Restaurants access" ON restaurants FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Takeout history access" ON takeout_history FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- REAL-TIME
-- Enable real-time for live sync between devices
-- ============================================================

-- Run these in Supabase Dashboard → Database → Replication
-- Or use the Supabase CLI. The SQL approach:

ALTER PUBLICATION supabase_realtime ADD TABLE meal_plan;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list;
ALTER PUBLICATION supabase_realtime ADD TABLE pantry;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE takeout_history;

-- ============================================================
-- INDEXES (for performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_recipes_family_id ON recipes(family_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_family_date ON meal_plan(family_id, date);
CREATE INDEX IF NOT EXISTS idx_shopping_list_family_week ON shopping_list(family_id, week_of);
CREATE INDEX IF NOT EXISTS idx_pantry_family_id ON pantry(family_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_family_id ON restaurants(family_id);
CREATE INDEX IF NOT EXISTS idx_takeout_history_family_date ON takeout_history(family_id, date);
