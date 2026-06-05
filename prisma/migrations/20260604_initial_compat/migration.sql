-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('text', 'image');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Complete', 'Cancel');

-- CreateTable
CREATE TABLE "blocks_master" (
    "user_id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,

    CONSTRAINT "blocks_master_pkey" PRIMARY KEY ("user_id","block_id")
);

-- CreateTable
CREATE TABLE "business_master" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "business_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories_master" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "image" VARCHAR(255) NOT NULL,

    CONSTRAINT "categories_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments_master" (
    "comment_id" SERIAL NOT NULL,
    "comment_by" VARCHAR(255) NOT NULL,
    "comment_txt" VARCHAR(255) NOT NULL,
    "broadcast_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "comments_master_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "dualpost_category" (
    "dual_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "dualpost_category_pkey" PRIMARY KEY ("dual_id","category_id")
);

-- CreateTable
CREATE TABLE "dualpost_comment" (
    "comment_id" BIGSERIAL NOT NULL,
    "dual_id" BIGINT NOT NULL,
    "parent_id" BIGINT,
    "thread_id" BIGINT,
    "comment_by" BIGINT NOT NULL,
    "comment_type" "CommentType" NOT NULL,
    "comment" BYTEA NOT NULL,
    "created_date" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "dualpost_comment_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "dualpost_comment_love" (
    "loved_by" BIGINT NOT NULL,
    "comment_id" BIGINT NOT NULL,
    "created_date" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "dualpost_comment_love_pkey" PRIMARY KEY ("loved_by","comment_id")
);

-- CreateTable
CREATE TABLE "dualpost_interest" (
    "dual_id" INTEGER NOT NULL,
    "interest_id" INTEGER NOT NULL,

    CONSTRAINT "dualpost_interest_pkey" PRIMARY KEY ("dual_id","interest_id")
);

-- CreateTable
CREATE TABLE "dualpost_master" (
    "dual_id" SERIAL NOT NULL,
    "dual_image" VARCHAR(255) NOT NULL,
    "dual_posted_by" VARCHAR(255) NOT NULL,
    "dual_linked_to" INTEGER NOT NULL,
    "dual_linked_name" VARCHAR(255) NOT NULL,
    "dual_linked_profile_pic" VARCHAR(255) NOT NULL,
    "dual_caption" TEXT NOT NULL,
    "video_url" VARCHAR(255) NOT NULL DEFAULT '',
    "video_cost" VARCHAR(255),
    "dual_posted_name" VARCHAR(255) NOT NULL,
    "dual_posted_pic" VARCHAR(255) NOT NULL,
    "dual_date" VARCHAR(255) NOT NULL,
    "dual_time" VARCHAR(255) NOT NULL,
    "is_reported" VARCHAR(255) NOT NULL DEFAULT 'NO',
    "date_time" TIMESTAMP(6) NOT NULL,
    "dual_type" INTEGER NOT NULL DEFAULT 1,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "receiver_notes" TEXT,
    "receiver_user_status" INTEGER NOT NULL DEFAULT 0,
    "payment_intent_id" VARCHAR(255),
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'Complete',
    "collab_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "card_id" VARCHAR(255),
    "tagged_users" VARCHAR(255) NOT NULL,

    CONSTRAINT "dualpost_master_pkey" PRIMARY KEY ("dual_id")
);

-- CreateTable
CREATE TABLE "dualpost_tag" (
    "id" SERIAL NOT NULL,
    "dual_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "dualpost_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dualpost_view" (
    "dual_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "dualpost_view_pkey" PRIMARY KEY ("dual_id","user_id")
);

-- CreateTable
CREATE TABLE "followers_master" (
    "id" SERIAL NOT NULL,
    "followed_by" VARCHAR(255) NOT NULL,
    "following_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "followers_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interest_master" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "image" VARCHAR(255) NOT NULL,

    CONSTRAINT "interest_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liveStream_master" (
    "live_id" SERIAL NOT NULL,
    "live_by" VARCHAR(255) NOT NULL,
    "live_streamname" VARCHAR(255) NOT NULL,
    "live_thumb" VARCHAR(255) NOT NULL,
    "live_title" VARCHAR(255) NOT NULL,
    "live_cost" VARCHAR(255) NOT NULL,
    "viewersCount" VARCHAR(255) NOT NULL DEFAULT '0',
    "is_reported" VARCHAR(255) NOT NULL DEFAULT 'NO',
    "pool_id" INTEGER NOT NULL,
    "last_checked_time" TIMESTAMP(6),

    CONSTRAINT "liveStream_master_pkey" PRIMARY KEY ("live_id")
);

-- CreateTable
CREATE TABLE "love_master" (
    "loved_by" INTEGER NOT NULL,
    "dual_id" INTEGER NOT NULL,
    "date_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "love_master_pkey" PRIMARY KEY ("loved_by","dual_id")
);

-- CreateTable
CREATE TABLE "messages_master" (
    "message_id" SERIAL NOT NULL,
    "message_sender" VARCHAR(255) NOT NULL,
    "message_receiver" VARCHAR(255) NOT NULL,
    "message_type" INTEGER NOT NULL DEFAULT 0,
    "message_url" VARCHAR(500) NOT NULL,
    "thumb_url" VARCHAR(500) NOT NULL,
    "dual_id" INTEGER NOT NULL,
    "message_content" VARCHAR(1024) NOT NULL,
    "is_deleted" VARCHAR(255) NOT NULL DEFAULT 'NO',
    "date_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "messages_master_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "message_thread" (
    "message_thread_id" SERIAL NOT NULL,
    "message_sender" VARCHAR(255) NOT NULL,
    "message_receiver" VARCHAR(255) NOT NULL,
    "message_content" VARCHAR(1024) NOT NULL,
    "isunread" VARCHAR(255) NOT NULL DEFAULT 'YES',
    "is_deleted" VARCHAR(255) NOT NULL DEFAULT 'NO',
    "date_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "message_thread_pkey" PRIMARY KEY ("message_thread_id")
);

-- CreateTable
CREATE TABLE "mute_master" (
    "user_id" INTEGER NOT NULL,
    "mute_id" INTEGER NOT NULL,

    CONSTRAINT "mute_master_pkey" PRIMARY KEY ("user_id","mute_id")
);

-- CreateTable
CREATE TABLE "notifications_master" (
    "notification_id" SERIAL NOT NULL,
    "notification_txt" VARCHAR(255) NOT NULL,
    "notification_type" INTEGER NOT NULL DEFAULT 0,
    "notification_sent_to" VARCHAR(255) NOT NULL,
    "notification_dual" VARCHAR(255) NOT NULL DEFAULT 'NO',
    "notification_venture" VARCHAR(255) NOT NULL DEFAULT 'NO',
    "notification_dual_id" VARCHAR(255),
    "notification_comment_id" BIGINT,
    "notification_venture_id" VARCHAR(255),
    "shared_by" VARCHAR(255),
    "isunread" VARCHAR(255) NOT NULL DEFAULT 'YES',
    "date_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "notifications_master_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "save_master" (
    "saved_by" INTEGER NOT NULL,
    "dual_id" INTEGER NOT NULL,
    "date_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "save_master_pkey" PRIMARY KEY ("saved_by","dual_id")
);

-- CreateTable
CREATE TABLE "story_master" (
    "story_id" SERIAL NOT NULL,
    "story_image" VARCHAR(255) NOT NULL DEFAULT '',
    "story_posted_by" INTEGER NOT NULL,
    "story_video" VARCHAR(255) NOT NULL DEFAULT '',
    "story_type" INTEGER NOT NULL,
    "story_date" VARCHAR(30) NOT NULL,
    "story_time" VARCHAR(30) NOT NULL,
    "is_reported" SMALLINT NOT NULL DEFAULT 0,
    "date_time" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "view_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "story_master_pkey" PRIMARY KEY ("story_id")
);

-- CreateTable
CREATE TABLE "user_business" (
    "user_id" INTEGER NOT NULL,
    "business_id" INTEGER NOT NULL,

    CONSTRAINT "user_business_pkey" PRIMARY KEY ("user_id","business_id")
);

-- CreateTable
CREATE TABLE "user_category" (
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "user_category_pkey" PRIMARY KEY ("user_id","category_id")
);

-- CreateTable
CREATE TABLE "user_contact" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,

    CONSTRAINT "user_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interest" (
    "user_id" INTEGER NOT NULL,
    "interest_id" INTEGER NOT NULL,

    CONSTRAINT "user_interest_pkey" PRIMARY KEY ("user_id","interest_id")
);

-- CreateTable
CREATE TABLE "user_master" (
    "user_id" SERIAL NOT NULL,
    "user_pic" VARCHAR(255),
    "user_email" VARCHAR(255) NOT NULL,
    "user_full_name" VARCHAR(255) NOT NULL,
    "user_name" VARCHAR(255) NOT NULL,
    "user_pass" VARCHAR(255) NOT NULL,
    "user_location" VARCHAR(255) NOT NULL DEFAULT 'NA',
    "user_views" VARCHAR(255) NOT NULL DEFAULT '0',
    "user_bio" TEXT NOT NULL DEFAULT '',
    "user_state" VARCHAR(50) NOT NULL,
    "device_token" VARCHAR(255) NOT NULL DEFAULT 'NA',
    "device_type" VARCHAR(255) NOT NULL DEFAULT 'NA',
    "fb_id" VARCHAR(50) NOT NULL,
    "user_type" SMALLINT NOT NULL DEFAULT 1,
    "hide_audience" SMALLINT NOT NULL DEFAULT 0,
    "stripe_customer_id" VARCHAR(255),
    "stripe_account_id" VARCHAR(255),
    "story_price" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "image_price" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "video_price" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "is_free_promo" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "user_master_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "venture_master" (
    "venture_id" SERIAL NOT NULL,
    "venture_url" VARCHAR(255) NOT NULL,
    "venture_posted_by" VARCHAR(255) NOT NULL,
    "venture_thumb" VARCHAR(255) NOT NULL,
    "venture_title" VARCHAR(255) NOT NULL,
    "views_count" VARCHAR(255) NOT NULL DEFAULT '0',
    "is_reported" VARCHAR(255) NOT NULL DEFAULT 'NO',

    CONSTRAINT "venture_master_pkey" PRIMARY KEY ("venture_id")
);

-- CreateTable
CREATE TABLE "videos_master" (
    "video_id" SERIAL NOT NULL,
    "video_by" INTEGER NOT NULL,
    "video_thumb" VARCHAR(255) NOT NULL,
    "video_title" VARCHAR(255) NOT NULL,
    "video_url" VARCHAR(255) NOT NULL,
    "video_cost" VARCHAR(255) NOT NULL,
    "viewersCount" INTEGER NOT NULL,
    "is_reported" VARCHAR(5) NOT NULL DEFAULT 'NO',
    "date_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "videos_master_pkey" PRIMARY KEY ("video_id")
);

-- CreateTable
CREATE TABLE "wowza_stream_master" (
    "pool_id" SERIAL NOT NULL,
    "stream_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "primary_server" VARCHAR(255) NOT NULL,
    "host_port" VARCHAR(255) NOT NULL,
    "application" VARCHAR(255) NOT NULL,
    "stream_name" VARCHAR(255) NOT NULL,
    "player_hls_playback_url" VARCHAR(255) NOT NULL,
    "info" TEXT NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "is_used" SMALLINT NOT NULL DEFAULT 0,
    "status" VARCHAR(255) NOT NULL,
    "start_time" TIMESTAMP(6),
    "stop_time" TIMESTAMP(6),
    "last_checked_time" TIMESTAMP(6),

    CONSTRAINT "wowza_stream_master_pkey" PRIMARY KEY ("pool_id")
);

-- CreateIndex
CREATE INDEX "DateTime" ON "dualpost_master"("date_time");

-- CreateIndex
CREATE INDEX "dual_linked_to_index" ON "dualpost_master"("dual_linked_to");

-- CreateIndex
CREATE UNIQUE INDEX "dualpost_tag_dual_id_user_id_key" ON "dualpost_tag"("dual_id", "user_id");

-- CreateIndex
CREATE INDEX "followers_master_followed_by_idx" ON "followers_master"("followed_by");

-- CreateIndex
CREATE UNIQUE INDEX "user_contact_user_id_email_key" ON "user_contact"("user_id", "email");

