# Central import point that registers every SQLAlchemy model with Base's
# metadata. Each module's models get imported here as they're added, so
# Base.metadata.create_all() and Alembic autogenerate can see all tables.
from app.modules.catalog.models import Book  # noqa: F401
from app.modules.entries.models import Entry  # noqa: F401
from app.modules.quotes.models import Quote  # noqa: F401
from app.modules.users.models import Genre, User, UserFavoriteGenre  # noqa: F401
