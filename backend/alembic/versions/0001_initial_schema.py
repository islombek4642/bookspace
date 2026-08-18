"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-16

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("telegram_id", sa.BigInteger, unique=True, nullable=False, index=True),
        sa.Column("username", sa.String(255), nullable=True),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(1024), nullable=True),
        sa.Column("bio", sa.Text, nullable=True),
        sa.Column("reading_since", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "genres",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("key", sa.String(64), unique=True, nullable=False),
    )

    op.create_table(
        "user_favorite_genres",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("genre_id", sa.Integer, sa.ForeignKey("genres.id"), primary_key=True),
    )

    op.create_table(
        "books",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("external_id", sa.String(255), unique=True, nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("author", sa.String(500), nullable=True),
        sa.Column("cover_url", sa.String(1024), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_by_user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "entries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("book_id", sa.Integer, sa.ForeignKey("books.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="planned"),
        sa.Column("started_at", sa.Date, nullable=True),
        sa.Column("finished_at", sa.Date, nullable=True),
        sa.Column("characters_notes", sa.Text, nullable=True),
        sa.Column("personal_thoughts", sa.Text, nullable=True),
        sa.Column("rating", sa.Integer, nullable=True),
        sa.Column("is_favorite", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "quotes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("entry_id", sa.Integer, sa.ForeignKey("entries.id"), nullable=False, index=True),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("quotes")
    op.drop_table("entries")
    op.drop_table("books")
    op.drop_table("user_favorite_genres")
    op.drop_table("genres")
    op.drop_table("users")
