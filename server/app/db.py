"""Database and schema. Postgres in deployment; SQLite for isolated tests."""
import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, Integer, BigInteger, String, DateTime, ForeignKey, JSON, UniqueConstraint, Index, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker
from sqlalchemy.pool import StaticPool

def utcnow():
    return datetime.now(timezone.utc)

def build_engine(url=None):
    url=url or os.getenv("DATABASE_URL","sqlite:///./neon_vault_dev.db")
    if url.startswith("postgres://"):url="postgresql+psycopg://"+url[len("postgres://"):]
    kwargs={"pool_pre_ping":True}
    if url.startswith("sqlite"):
        kwargs["connect_args"]={"check_same_thread":False}
        if ":memory:" in url:kwargs["poolclass"]=StaticPool
    return create_engine(url,**kwargs)

engine=build_engine()
SessionLocal=sessionmaker(bind=engine,autoflush=False,expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__="users"
    id:Mapped[int]=mapped_column(Integer,primary_key=True)
    username:Mapped[str]=mapped_column(String(24),unique=True,index=True,nullable=False)
    password_hash:Mapped[str]=mapped_column(String(256),nullable=False)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
    balance:Mapped[int]=mapped_column(BigInteger,default=100_000,nullable=False)
    xp:Mapped[int]=mapped_column(BigInteger,default=0,nullable=False)
    style_tokens:Mapped[int]=mapped_column(BigInteger,default=0,nullable=False)
    display_name:Mapped[str]=mapped_column(String(36),default="Vault Player")
    avatar:Mapped[str]=mapped_column(String(16),default="◆")
    theme:Mapped[str]=mapped_column(String(16),default="mint")
    profile:Mapped[dict]=mapped_column(JSON,default=dict)
    slots_state:Mapped[dict]=mapped_column(JSON,default=dict)

class Session(Base):
    __tablename__="sessions"
    id:Mapped[int]=mapped_column(Integer,primary_key=True)
    user_id:Mapped[int]=mapped_column(ForeignKey("users.id",ondelete="CASCADE"),index=True)
    token_hash:Mapped[str]=mapped_column(String(64),unique=True,index=True)
    expires_at:Mapped[datetime]=mapped_column(DateTime(timezone=True))
    revoked:Mapped[bool]=mapped_column(Boolean,default=False)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)

class Journal(Base):
    __tablename__="journal"
    id:Mapped[int]=mapped_column(Integer,primary_key=True)
    user_id:Mapped[int]=mapped_column(ForeignKey("users.id",ondelete="CASCADE"),index=True)
    round_id:Mapped[int|None]=mapped_column(ForeignKey("rounds.id"),nullable=True)
    reason:Mapped[str]=mapped_column(String(48))
    delta:Mapped[int]=mapped_column(BigInteger)
    balance_after:Mapped[int]=mapped_column(BigInteger)
    at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
    __table_args__=(Index("ix_journal_user_at","user_id","at"),)

class Round(Base):
    __tablename__="rounds"
    id:Mapped[int]=mapped_column(Integer,primary_key=True)
    user_id:Mapped[int]=mapped_column(ForeignKey("users.id",ondelete="CASCADE"),index=True)
    game:Mapped[str]=mapped_column(String(24))
    status:Mapped[str]=mapped_column(String(12),default="active")
    wager:Mapped[int]=mapped_column(BigInteger)
    payout:Mapped[int]=mapped_column(BigInteger,default=0)
    state:Mapped[dict]=mapped_column(JSON,default=dict)
    result:Mapped[dict]=mapped_column(JSON,default=dict)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow,onupdate=utcnow)
    __table_args__=(Index("ix_rounds_user_game","user_id","game"),)

class Idempotency(Base):
    __tablename__="idempotency"
    id:Mapped[int]=mapped_column(Integer,primary_key=True)
    user_id:Mapped[int]=mapped_column(ForeignKey("users.id",ondelete="CASCADE"))
    key:Mapped[str]=mapped_column(String(100))
    fingerprint:Mapped[str]=mapped_column(String(64))
    response:Mapped[dict]=mapped_column(JSON)
    __table_args__=(UniqueConstraint("user_id","key",name="uq_user_idempotency"),)

class RewardClaim(Base):
    __tablename__="reward_claims"
    id:Mapped[int]=mapped_column(Integer,primary_key=True)
    user_id:Mapped[int]=mapped_column(ForeignKey("users.id",ondelete="CASCADE"))
    key:Mapped[str]=mapped_column(String(50))
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
    __table_args__=(UniqueConstraint("user_id","key",name="uq_user_claim"),)

def get_db():
    with SessionLocal() as db:
        yield db
