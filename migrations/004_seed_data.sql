-- DBMartNG Seed Data
-- Migration: 004_seed_data
-- Sample vendors, listings, and categories for demo

-- ─── CATEGORIES ───
INSERT INTO categories (name, slug, type, description, sort_order) VALUES
  ('Fashion & Style', 'fashion', 'goods', 'Clothing, accessories, and footwear from top Nigerian designers and brands', 1),
  ('Food & Beverages', 'food', 'goods', 'Restaurants, catering services, and food delivery across Nigeria', 2),
  ('Tech & Electronics', 'tech', 'goods', 'Smartphones, laptops, accessories, and smart home devices', 3),
  ('Makeup & Beauty', 'makeup', 'service', 'Professional makeup artistry, skincare, and beauty consulting', 4),
  ('Photography & Videography', 'photography', 'service', 'Professional photography and videography for events and commercial use', 5),
  ('Tailoring & Sewing', 'tailoring', 'service', 'Custom tailoring, native wear designs, and alterations', 6),
  ('Hair Styling', 'hair', 'service', 'Braiding, weaves, styling, and hair care services', 7),
  ('Event Planning', 'events', 'service', 'Event coordination, decor, and party planning services', 8),
  ('Home & Auto Repair', 'repair', 'service', 'Home maintenance, auto repair, and handyman services', 9),
  ('Other', 'other', 'service', 'Other products and services not listed in other categories', 10);

-- ─── SAMPLE VENDOR USERS ───
-- These are created for demo purposes with placeholder auth IDs
-- In production, real users would sign up through the auth flow
INSERT INTO users (id, email, role, full_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'techzone@example.com', 'vendor', 'Chukwudi Okonkwo'),
  ('00000000-0000-0000-0000-000000000002', 'lagosfashion@example.com', 'vendor', 'Zainab Bello'),
  ('00000000-0000-0000-0000-000000000003', 'naijabites@example.com', 'vendor', 'Emeka Okafor'),
  ('00000000-0000-0000-0000-000000000004', 'glamstudios@example.com', 'vendor', 'Tolu Adeyemi'),
  ('00000000-0000-0000-0000-000000000005', 'lenslight@example.com', 'vendor', 'Samuel Eze'),
  ('00000000-0000-0000-0000-000000000006', 'elegancetailoring@example.com', 'vendor', 'Aisha Mohammed');

-- ─── SAMPLE VENDOR PROFILES ───
INSERT INTO vendor_profiles (id, user_id, business_name, slug, description, category_id, city, state, phone, whatsapp_number, website, is_verified, subscription_status, trial_decision_made, trial_decision, average_response_time)
SELECT
  '00000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'TechZone NG', 'techzone-ng',
  'Premium electronics and gadgets retailer offering the latest tech products at competitive prices. We stock smartphones, laptops, accessories, and smart home devices from leading brands.',
  (SELECT id FROM categories WHERE slug = 'tech'), 'Lagos', 'Lagos', '080 1234 5678', '2348012345678', 'https://techzone-ng.com',
  TRUE, 'pro', TRUE, 'pro', 30
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000011'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'Lagos Fashion House', 'lagos-fashion-house',
  'Contemporary African fashion and bespoke tailoring services. We create stunning pieces that blend traditional African aesthetics with modern design.',
  (SELECT id FROM categories WHERE slug = 'fashion'), 'Lagos', 'Lagos', '080 2345 6789', '2348023456789', 'https://lagosfashionhouse.ng',
  TRUE, 'pro', TRUE, 'pro', 15
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000012'::uuid, '00000000-0000-0000-0000-000000000003'::uuid, 'Naija Bites', 'naija-bites',
  'Authentic Nigerian cuisine and catering services for all occasions. From street food favorites to gourmet dishes, we bring the taste of Nigeria to your table.',
  (SELECT id FROM categories WHERE slug = 'food'), 'Abuja', 'FCT', '080 3456 7890', '2348034567890', 'https://naijabites.ng',
  TRUE, 'trial', FALSE, NULL, 45
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000013'::uuid, '00000000-0000-0000-0000-000000000004'::uuid, 'Glam Studios', 'glam-studios',
  'Professional makeup artistry and beauty consulting services. We specialize in bridal, editorial, and event makeup that makes you look and feel your best.',
  (SELECT id FROM categories WHERE slug = 'makeup'), 'Port Harcourt', 'Rivers', '080 4567 8901', '2348045678901', NULL,
  FALSE, 'free', TRUE, 'free', 120
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000014'::uuid, '00000000-0000-0000-0000-000000000005'::uuid, 'Lens & Light Photography', 'lens-light-photography',
  'Professional photography and videography for events and commercial use. Capturing your most precious moments with creativity and precision.',
  (SELECT id FROM categories WHERE slug = 'photography'), 'Asaba', 'Delta', '080 5678 9012', '2348056789012', 'https://lenslight.ng',
  TRUE, 'pro', TRUE, 'pro', 60
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000015'::uuid, '00000000-0000-0000-0000-000000000006'::uuid, 'Elegance Tailoring', 'elegance-tailoring',
  'Custom tailoring and native wear designs for men and women. From agbadas to corporate wear, we bring your style vision to life.',
  (SELECT id FROM categories WHERE slug = 'tailoring'), 'Asaba', 'Delta', '080 6789 0123', '2348067890123', NULL,
  FALSE, 'trial', FALSE, NULL, 90;

-- ─── SAMPLE LISTINGS ───
-- TechZone NG - Approved listings
INSERT INTO listings (vendor_id, title, slug, description, price, price_period, category_id, status, is_service, tags, view_count)
SELECT
  '00000000-0000-0000-0000-000000000010'::uuid, 'MacBook Pro 14-inch', 'macbook-pro-14',
  'Latest M3 chip, 16GB RAM, 512GB SSD. Perfect for professionals and creators.', 1850000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'tech'), 'approved', FALSE, ARRAY['laptop', 'apple', 'macbook', 'electronics'], 1250
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000010'::uuid, 'iPhone 15 Pro Max', 'iphone-15-pro-max',
  '256GB, Titanium finish, A17 Pro chip. The ultimate smartphone experience.', 1450000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'tech'), 'approved', FALSE, ARRAY['iphone', 'apple', 'smartphone', 'electronics'], 2100
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000010'::uuid, 'Sony WH-1000XM5 Noise Cancelling Headphones', 'sony-wh-1000xm5',
  'Industry-leading noise cancellation with exceptional sound quality. 30-hour battery life.', 350000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'tech'), 'approved', FALSE, ARRAY['headphones', 'sony', 'audio', 'accessories'], 890
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000010'::uuid, 'Laptop Repair Service', 'laptop-repair-service',
  'Professional laptop diagnostics, repair, and upgrade services. We fix all major brands.', 25000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'tech'), 'approved', TRUE, ARRAY['repair', 'laptop', 'service'], 340;

-- Lagos Fashion House - Approved listings
INSERT INTO listings (vendor_id, title, slug, description, price, price_period, category_id, status, is_service, tags, view_count)
SELECT
  '00000000-0000-0000-0000-000000000011'::uuid, 'Custom Agbada Set', 'custom-agbada-set',
  'Handcrafted agbada set with premium Ankara or lace fabric. Fully tailored to your measurements.', 150000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'fashion'), 'approved', FALSE, ARRAY['agbada', 'native wear', 'traditional', 'custom'], 670
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000011'::uuid, 'Corporate Wear Collection', 'corporate-wear-collection',
  'Professional and stylish corporate outfits for men and women. Made with high-quality materials.', 85000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'fashion'), 'approved', FALSE, ARRAY['corporate', 'office wear', 'professional'], 430
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000011'::uuid, 'Styling Consultation', 'styling-consultation',
  'One-on-one personal styling session to help you define and elevate your personal style.', 15000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'fashion'), 'approved', TRUE, ARRAY['consultation', 'styling', 'personal shopper'], 220;

-- Naija Bites - Approved listings
INSERT INTO listings (vendor_id, title, slug, description, price, price_period, category_id, status, is_service, tags, view_count)
SELECT
  '00000000-0000-0000-0000-000000000012'::uuid, 'Event Catering Package', 'event-catering-package',
  'Full catering services for weddings, birthdays, and corporate events. Traditional and continental dishes available.', 250000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'food'), 'approved', TRUE, ARRAY['catering', 'events', 'wedding', 'party'], 780
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000012'::uuid, 'Jollof Rice Party Pack', 'jollof-rice-party-pack',
  'Our famous party jollof rice served with your choice of protein. Feeds 20 people.', 45000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'food'), 'approved', FALSE, ARRAY['jollof', 'party pack', 'rice', 'traditional'], 1560;

-- Lens & Light Photography - Approved listings
INSERT INTO listings (vendor_id, title, slug, description, price, price_period, category_id, status, is_service, tags, view_count)
SELECT
  '00000000-0000-0000-0000-000000000014'::uuid, 'Wedding Photography Package', 'wedding-photography-package',
  'Full-day wedding photography coverage with two photographers, edited digital gallery, and photo album.', 350000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'photography'), 'approved', TRUE, ARRAY['wedding', 'photography', 'events'], 920
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000014'::uuid, 'Product Photography Session', 'product-photography-session',
  'Professional product photography for your online store or catalog. 20 edited photos per session.', 75000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'photography'), 'approved', TRUE, ARRAY['product', 'ecommerce', 'commercial'], 510;

-- Elegance Tailoring - Pending review listings
INSERT INTO listings (vendor_id, title, slug, description, price, price_period, category_id, status, is_service, tags, view_count)
SELECT
  '00000000-0000-0000-0000-000000000015'::uuid, 'Custom Kaftan', 'custom-kaftan',
  'Beautifully tailored kaftan in your choice of fabric and color. Perfect for casual and formal occasions.', 65000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'tailoring'), 'pending_review', FALSE, ARRAY['kaftan', 'native', 'casual', 'formal'], 0
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000015'::uuid, 'Suit Tailoring Service', 'suit-tailoring-service',
  'Made-to-measure suits with premium fabric. Includes fitting sessions and alterations.', 180000, 'one_time',
  (SELECT id FROM categories WHERE slug = 'tailoring'), 'pending_review', TRUE, ARRAY['suit', 'formal', 'tailoring', 'bespoke'], 0;

-- ─── SAMPLE REVIEWS ───
INSERT INTO reviews (buyer_id, vendor_id, rating, body)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000010'::uuid, 5, 'Excellent service! Got my MacBook within 24 hours. Will definitely buy from TechZone again.'
UNION ALL SELECT '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000010'::uuid, 4, 'Great prices and genuine products. The staff was very helpful in helping me choose the right laptop.'
UNION ALL SELECT '00000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000010'::uuid, 5, 'Fast delivery and authentic products. Highly recommended for anyone looking for tech gadgets in Lagos.'
UNION ALL SELECT '00000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000011'::uuid, 5, 'My agbada set was absolutely stunning! The attention to detail was incredible. Will be ordering again.'
UNION ALL SELECT '00000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000011'::uuid, 4, 'Great quality corporate wear. The fabric was premium and the fit was perfect.'
UNION ALL SELECT '00000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000014'::uuid, 5, 'Lens & Light captured our wedding beautifully. Every photo told a story. Highly recommended!';

-- ─── SAMPLE COMPANY ADS ───
INSERT INTO company_ads (id, title, banner_url, destination_url, created_by, starts_at, ends_at, is_active)
SELECT
  '00000000-0000-0000-0000-000000000020'::uuid, 'Summer Sale 2026', NULL, 'https://dbmart.ng/browse',
  '00000000-0000-0000-0000-000000000001'::uuid, NOW(), NOW() + INTERVAL '90 days', TRUE;
