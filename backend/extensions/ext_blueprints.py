from controllers.console import (
    account_rt,
)

from controllers.rag import (
    sys_rt,
    llm_rt,
    kb_rt,
    file_rt,
    f2d_rt,
    document_rt,
    dialog_rt,
    api_rt,
    conversation_rt,
    agent_rt,
    chunk_rt,
)


def init_app(app):
    app.include_router(account_rt, prefix="/api")
    app.include_router(agent_rt, prefix="/api")
    app.include_router(sys_rt, prefix="/api")
    app.include_router(llm_rt, prefix="/api")
    app.include_router(kb_rt, prefix="/api")
    app.include_router(file_rt, prefix="/api")
    app.include_router(f2d_rt, prefix="/api")
    app.include_router(document_rt, prefix="/api")
    app.include_router(dialog_rt, prefix="/api")
    app.include_router(chunk_rt, prefix="/api")
    app.include_router(api_rt, prefix="/api")
    app.include_router(conversation_rt, prefix="/api")
