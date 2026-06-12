--
-- PostgreSQL database dump
--

\restrict MXcBYAJlbsRoqIfwaaMEeVwP5S5bazpoqIFyGJbIgU518JMAzilzyuYX2IDv65e

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: bid_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bid_status AS ENUM (
    'accepted',
    'rejected',
    'cancelled'
);


--
-- Name: bidding_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bidding_type AS ENUM (
    'price_up',
    'low_start',
    'public'
);


--
-- Name: dispute_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dispute_status AS ENUM (
    'open',
    'in_review',
    'resolved',
    'closed'
);


--
-- Name: interaction_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.interaction_action AS ENUM (
    'view',
    'search',
    'bid',
    'watchlist'
);


--
-- Name: item_condition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_condition AS ENUM (
    'new',
    'used',
    'refurbished'
);


--
-- Name: listing_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.listing_status AS ENUM (
    'draft',
    'pending_review',
    'active',
    'ended',
    'removed'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'topup',
    'bid_hold',
    'bid_release',
    'settlement'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'user',
    'admin'
);


--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'suspended',
    'deleted'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    admin_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auction_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auction_results (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    listing_id uuid NOT NULL,
    winner_id uuid,
    winning_bid_id uuid,
    final_price numeric(12,2) NOT NULL,
    reserve_met boolean DEFAULT false NOT NULL,
    ended_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bids (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    listing_id uuid NOT NULL,
    bidder_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    status public.bid_status DEFAULT 'accepted'::public.bid_status NOT NULL,
    placed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    parent_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disputes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    reporter_id uuid NOT NULL,
    listing_id uuid,
    category character varying(100) NOT NULL,
    description text NOT NULL,
    status public.dispute_status DEFAULT 'open'::public.dispute_status NOT NULL,
    resolved_by uuid,
    resolution_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


--
-- Name: listing_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_images (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    listing_id uuid NOT NULL,
    s3_key character varying(500) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    seller_id uuid NOT NULL,
    category_id uuid,
    title character varying(255) NOT NULL,
    description text,
    condition public.item_condition NOT NULL,
    bidding_type public.bidding_type DEFAULT 'price_up'::public.bidding_type NOT NULL,
    starting_price numeric(12,2) NOT NULL,
    reserve_price numeric(12,2),
    current_price numeric(12,2) NOT NULL,
    min_increment numeric(12,2) DEFAULT 1.00 NOT NULL,
    status public.listing_status DEFAULT 'draft'::public.listing_status NOT NULL,
    is_draft boolean DEFAULT true NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    message text NOT NULL,
    ref_listing_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_interactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    action public.interaction_action NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    full_name character varying(100),
    phone character varying(20),
    address text,
    bio text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
    status public.user_status DEFAULT 'active'::public.user_status NOT NULL,
    balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    avatar_key character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type public.transaction_type NOT NULL,
    amount numeric(12,2) NOT NULL,
    reference character varying(255),
    status character varying(50) DEFAULT 'completed'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: watchlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watchlist (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: auction_results auction_results_listing_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auction_results
    ADD CONSTRAINT auction_results_listing_id_key UNIQUE (listing_id);


--
-- Name: auction_results auction_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auction_results
    ADD CONSTRAINT auction_results_pkey PRIMARY KEY (id);


--
-- Name: bids bids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);


--
-- Name: listing_images listing_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_images
    ADD CONSTRAINT listing_images_pkey PRIMARY KEY (id);


--
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: user_interactions user_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_interactions
    ADD CONSTRAINT user_interactions_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: watchlist watchlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_pkey PRIMARY KEY (id);


--
-- Name: watchlist watchlist_user_id_listing_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_user_id_listing_id_key UNIQUE (user_id, listing_id);


--
-- Name: idx_bids_bidder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bids_bidder ON public.bids USING btree (bidder_id);


--
-- Name: idx_bids_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bids_listing ON public.bids USING btree (listing_id);


--
-- Name: idx_bids_placed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bids_placed_at ON public.bids USING btree (placed_at);


--
-- Name: idx_listings_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_category ON public.listings USING btree (category_id);


--
-- Name: idx_listings_end_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_end_time ON public.listings USING btree (end_time);


--
-- Name: idx_listings_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_seller ON public.listings USING btree (seller_id);


--
-- Name: idx_listings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_status ON public.listings USING btree (status);


--
-- Name: idx_listings_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_title_trgm ON public.listings USING gin (title public.gin_trgm_ops);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id) WHERE (is_read = false);


--
-- Name: idx_user_interactions_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_interactions_listing ON public.user_interactions USING btree (listing_id);


--
-- Name: idx_user_interactions_occurred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_interactions_occurred ON public.user_interactions USING btree (occurred_at);


--
-- Name: idx_user_interactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_interactions_user ON public.user_interactions USING btree (user_id);


--
-- Name: admin_logs admin_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: auction_results auction_results_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auction_results
    ADD CONSTRAINT auction_results_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE RESTRICT;


--
-- Name: auction_results auction_results_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auction_results
    ADD CONSTRAINT auction_results_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: auction_results auction_results_winning_bid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auction_results
    ADD CONSTRAINT auction_results_winning_bid_id_fkey FOREIGN KEY (winning_bid_id) REFERENCES public.bids(id) ON DELETE SET NULL;


--
-- Name: bids bids_bidder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_bidder_id_fkey FOREIGN KEY (bidder_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: bids bids_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE RESTRICT;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: disputes disputes_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;


--
-- Name: disputes disputes_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: disputes disputes_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: listing_images listing_images_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_images
    ADD CONSTRAINT listing_images_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: listings listings_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: listings listings_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: notifications notifications_ref_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_ref_listing_id_fkey FOREIGN KEY (ref_listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_interactions user_interactions_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_interactions
    ADD CONSTRAINT user_interactions_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: user_interactions user_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_interactions
    ADD CONSTRAINT user_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: watchlist watchlist_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: watchlist watchlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict MXcBYAJlbsRoqIfwaaMEeVwP5S5bazpoqIFyGJbIgU518JMAzilzyuYX2IDv65e

