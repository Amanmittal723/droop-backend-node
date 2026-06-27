CREATE TABLE "story_view" (
    "story_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "viewed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_view_pkey" PRIMARY KEY ("story_id","user_id")
);

CREATE INDEX "story_view_user_id_idx" ON "story_view"("user_id");
