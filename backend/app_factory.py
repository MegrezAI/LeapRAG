from fastapi import FastAPI
from dotenv import load_dotenv


def init_extensions(app):
    from extensions import (
        ext_blueprints,
        ext_mail,
        ext_redis,
        ext_login,
        ext_storage,
    )

    extensions = [
        ext_blueprints,
        ext_mail,
        ext_redis,
        ext_login,
        ext_storage,
    ]

    for ext in extensions:
        ext.init_app(app)


def create_app(lifespan):
    load_dotenv()

    app = FastAPI(docs_url="/api/docs", lifespan=lifespan)

    init_extensions(app)

    return app
