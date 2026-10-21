"""An independent in-memory database for every API integration test."""
import os
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
os.environ["DATABASE_URL"]="sqlite+pysqlite:///:memory:"
os.environ["CORS_ORIGINS"]="https://dokeefe414.github.io,http://localhost:4173"
os.environ["ENVIRONMENT"]="test"
import pytest
from fastapi.testclient import TestClient
from app.db import Base,engine
from app.main import app

@pytest.fixture
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
