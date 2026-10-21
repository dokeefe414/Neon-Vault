"""Authentication: salted Argon2id passwords and random, hashed, revocable bearer sessions."""
import hashlib
import hmac
import os
import re
import secrets
import time
from datetime import timedelta
from fastapi import Depends, HTTPException, Header, Request, status
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession
from .db import get_db, User, Session, utcnow

hasher=PasswordHasher(time_cost=3,memory_cost=65536,parallelism=2)
USERNAME=re.compile(r"^[a-z][a-z0-9_]{2,23}$")
SESSION_DAYS=7

def normalize_username(value:str)->str:
    username=value.strip().lower()
    if not USERNAME.fullmatch(username):raise HTTPException(422,"Use 3–24 lowercase letters, digits, or underscores; start with a letter.")
    return username

def validate_password(value:str)->str:
    if len(value)<12 or len(value)>128 or len(value.encode("utf-8"))>512:
        raise HTTPException(422,"Password must be between 12 and 128 characters.")
    return value

def digest(token:str)->str:
    return hashlib.sha256(token.encode()).hexdigest()

def new_session(db:DbSession,user:User)->str:
    token=secrets.token_urlsafe(48)
    db.add(Session(user_id=user.id,token_hash=digest(token),expires_at=utcnow()+timedelta(days=SESSION_DAYS)))
    return token

def check_password(stored:str,submitted:str)->bool:
    try:return hasher.verify(stored,submitted)
    except (VerifyMismatchError,VerificationError,ValueError):return False

def current_user(authorization:str|None=Header(default=None),db:DbSession=Depends(get_db))->User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED,"Authentication required",headers={"WWW-Authenticate":"Bearer"})
    token=authorization[7:]
    if len(token)<40 or len(token)>200:
        raise HTTPException(401,"Invalid session")
    record=db.scalar(select(Session).where(Session.token_hash==digest(token),Session.revoked.is_(False)))
    if not record or record.expires_at.replace(tzinfo=record.expires_at.tzinfo or utcnow().tzinfo)<=utcnow():
        raise HTTPException(401,"Session expired or revoked")
    user=db.get(User,record.user_id)
    if not user:raise HTTPException(401,"Account unavailable")
    return user

def session_from_token(db:DbSession,authorization:str|None):
    if not authorization or not authorization.startswith("Bearer "):return None
    return db.scalar(select(Session).where(Session.token_hash==digest(authorization[7:])))
