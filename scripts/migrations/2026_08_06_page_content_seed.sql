-- Migration: Seed site_content rows for the Privacy Policy and Terms of Service pages.
-- Date: 2026-08-06
--
-- These pages are DB-driven from the reusable `site_content` table (one row per page,
-- keyed by slug). Each row's `content` JSONB holds an array of sections:
--   { "sections": [ { "id": <uuid>, "title": str, "body": str (one bullet per line),
--                    "sortOrder": int, "isActive": bool } ] }
--
-- Only seeds if the slug row does not already exist, so existing/manual content and
-- the `landing` CMS page are left untouched. Apply once on each environment's
-- Postgres instance. Safe to re-run (idempotent).

BEGIN;

INSERT INTO site_content (slug, content, updated_at)
VALUES
  ('privacy', '{
    "sections": [
      {
        "id": "11111111-1111-1111-1111-1111111111a1",
        "title": "Information We Collect",
        "body": "Account information you provide when registering, such as your name, username, email address, phone number, and profile details.\nListing and auction information you submit when selling items, including item titles, descriptions, images, and pricing.\nTransaction and bidding records, including bid amounts, winning bids, wallet top-ups, and settlement history.\nUsage data such as pages visited, search queries, watchlisted items, and interactions used to tailor recommendations.",
        "sortOrder": 1,
        "isActive": true
      },
      {
        "id": "11111111-1111-1111-1111-1111111111a2",
        "title": "How We Use Your Information",
        "body": "To operate and maintain your account, process bids and transactions, and manage auction listings.\nTo personalise your experience, including showing relevant auction recommendations.\nTo send notifications and emails about bids, auctions, and account activity you have opted into.\nTo provide customer support, resolve disputes, and fulfill our legal and regulatory obligations.",
        "sortOrder": 2,
        "isActive": true
      },
      {
        "id": "11111111-1111-1111-1111-1111111111a3",
        "title": "Sharing of Information",
        "body": "We do not sell your personal information to third parties.\nYour public profile, listings, and bidding activity may be visible to other users of the platform as necessary for auctions to function.\nWe may share limited information with service providers that help operate the platform, such as payment, storage, and hosting providers, only as needed to provide our services.\nWe may disclose information where required by law or to protect the rights, property, or safety of AuctionHub, our users, or the public.",
        "sortOrder": 3,
        "isActive": true
      },
      {
        "id": "11111111-1111-1111-1111-1111111111a4",
        "title": "Data Retention and Your Rights",
        "body": "We retain your data for as long as your account is active or as needed to provide our services and meet our legal obligations.\nYou may access, update, or correct your personal information through your profile settings.\nYou may request account deletion at any time. This permanently removes your profile and personal data, subject to records we are legally required to keep.\nIn compliance with the Personal Data Protection Act (PDPA) of Singapore, you may submit a request to access or withdraw consent for the use of your data by contacting us at the address below.",
        "sortOrder": 4,
        "isActive": true
      },
      {
        "id": "11111111-1111-1111-1111-1111111111a5",
        "title": "Security",
        "body": "We protect your information using appropriate technical and organisational measures, including encrypted passwords and secure connections.\nWhile we strive to protect your data, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
        "sortOrder": 5,
        "isActive": true
      },
      {
        "id": "11111111-1111-1111-1111-1111111111a6",
        "title": "Cookies and Local Storage",
        "body": "We use cookies and local browser storage to keep you signed in, remember your preferences, and provide core functionality.\nYou can control cookies through your browser settings, but disabling them may affect parts of the platform that require authentication.",
        "sortOrder": 6,
        "isActive": true
      }
    ]
  }'::jsonb, NOW())
  ,('terms', '{
    "sections": [
      {
        "id": "22222222-2222-2222-2222-2222222222b1",
        "title": "Acceptance of Terms",
        "body": "By accessing or using AuctionHub, you agree to be bound by these Terms of Service and our Privacy Policy.\nIf you do not agree with any part of these terms, you should not use the platform.",
        "sortOrder": 1,
        "isActive": true
      },
      {
        "id": "22222222-2222-2222-2222-2222222222b2",
        "title": "User Accounts",
        "body": "You must provide accurate and complete information when creating an account and keep your login credentials secure.\nYou are responsible for all activity that occurs under your account. Notify us immediately if you suspect unauthorised use.\nYou must be at least the age of legal majority in your jurisdiction to create an account and participate in auctions.",
        "sortOrder": 2,
        "isActive": true
      },
      {
        "id": "22222222-2222-2222-2222-2222222222b3",
        "title": "Auctions and Bidding",
        "body": "By placing a bid, you enter into a legally binding commitment to purchase the item if you are the winning bidder, subject to any reserve price.\nBids are final once accepted and cannot be withdrawn, except in cases of clear error or as permitted by applicable law.\nYou must have sufficient funds in your wallet to cover your bids. We may hold funds for active bids and release or settle them according to auction outcomes.\nShill bidding, bid manipulation, or any attempt to artificially inflate prices is strictly prohibited.",
        "sortOrder": 3,
        "isActive": true
      },
      {
        "id": "22222222-2222-2222-2222-2222222222b4",
        "title": "Seller Obligations",
        "body": "Sellers are responsible for the accuracy and lawfulness of their listings, including item descriptions, images, condition, and pricing.\nListings must not contain prohibited, illegal, or misleading content and must comply with our moderation guidelines.\nSellers must complete the sale and deliver the item to the winning bidder in the agreed condition and timeframe.",
        "sortOrder": 4,
        "isActive": true
      },
      {
        "id": "22222222-2222-2222-2222-2222222222b5",
        "title": "Payments and Wallet",
        "body": "The platform uses a virtual wallet to manage deposits, bid holds, releases, and settlements.\nWallet top-ups are processed through supported payment methods and are subject to the terms of those providers.\nWe are not a bank. Funds held in your wallet are managed for the purpose of participating in auctions on this platform.",
        "sortOrder": 5,
        "isActive": true
      },
      {
        "id": "22222222-2222-2222-2222-2222222222b6",
        "title": "Prohibited Conduct",
        "body": "You agree not to misuse the platform, including engaging in fraud, harassment, infringement of others rights, or any illegal activity.\nYou must not attempt to gain unauthorised access to the platform, its systems, or other users accounts.\nYou must not interfere with the normal operation of the platform or place undue load on its infrastructure.",
        "sortOrder": 6,
        "isActive": true
      },
      {
        "id": "22222222-2222-2222-2222-2222222222b7",
        "title": "Intellectual Property",
        "body": "The AuctionHub name, logo, and platform design are owned by AuctionHub and its licensors.\nYou retain ownership of the content you submit, and you grant AuctionHub a limited license to host and display that content in connection with your use of the platform.",
        "sortOrder": 7,
        "isActive": true
      },
      {
        "id": "22222222-2222-2222-2222-2222222222b8",
        "title": "Limitation of Liability",
        "body": "The platform is provided on an as is and as available basis without warranties of any kind.\nAuctionHub facilitates transactions between users and is not a party to, nor liable for, the underlying sale of goods between buyers and sellers.\nTo the maximum extent permitted by law, AuctionHub shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.",
        "sortOrder": 8,
        "isActive": true
      },
      {
        "id": "22222222-2222-2222-2222-2222222222b9",
        "title": "Termination",
        "body": "We may suspend or terminate your account if you violate these Terms or applicable law.\nYou may delete your account at any time. Upon termination, your right to use the platform ceases, subject to outstanding auction obligations and records we are required to retain.",
        "sortOrder": 9,
        "isActive": true
      }
    ]
  }'::jsonb, NOW())
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- Verify
SELECT slug, jsonb_array_length(content->'sections') AS section_count
FROM site_content
WHERE slug IN ('privacy', 'terms')
ORDER BY slug;
