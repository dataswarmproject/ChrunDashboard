from app.config import Settings


def test_postgres_credentials_are_url_encoded_when_building_connection_url():
    settings = Settings(postgres_host="db", postgres_password="a@b/c:demo")

    assert settings.resolved_database_url == (
        "postgresql+psycopg://ltt_churn:a%40b%2Fc%3Ademo@db:5432/ltt_churn"
    )
