# Central import point that registers every SQLAlchemy model with Base's
# metadata. Each module's models get imported here as they're added, so
# Base.metadata.create_all() and Alembic autogenerate can see all tables.
