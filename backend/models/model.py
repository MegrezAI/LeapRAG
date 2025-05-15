from sqlalchemy.orm import Mapped, mapped_column, declared_attr
from models.database import Base
from datetime import datetime
from sqlalchemy.sql import func
from sqlalchemy.types import String
from sqlalchemy.types import DateTime


class DictMixin(object):
    def __init__(self):
        self.__table__ = None

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class LeapSetup(Base):
    __tablename__ = "leap_setups"

    version: Mapped[str] = mapped_column(String(255), primary_key=True, nullable=False)
    setup_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.current_timestamp())
