#  PYTHONPATH=$HOME/LeapApp/LeapRAGAgent/backend python test/a2a_client_test.py
import asyncio
from uuid import uuid4

import asyncclick as click
from common.client import A2AClient, A2ACardResolver
from common.types import TaskState
from common.utils.push_notification_auth import PushNotificationReceiverAuth
from common.utils.push_notification_listener import PushNotificationListener


@click.command()
@click.option('--agent', default='http://localhost:5001/api/rag/agent/3f4daf67-d1fc-4efe-b7af-d2b143342853')
@click.option('--session', default=0)
@click.option('--history', default=False)
async def cli(agent, session, history):
    print("test a2a client ...")
    card_resolver = A2ACardResolver(base_url=agent)
    card = card_resolver.get_agent_card()
    print("======= Agent Card ========")
    print(card.model_dump_json(exclude_none=True))

    use_push_notifications = card.capabilities.pushNotifications
    notification_receiver_host = "localhost"
    notification_receiver_port = 15000
    if use_push_notifications:
        notification_receiver_auth = PushNotificationReceiverAuth()
        await notification_receiver_auth.load_jwks(f"{agent}/.well-known/jwks.json")

        push_notification_listener = PushNotificationListener(
            host=notification_receiver_host,
            port=notification_receiver_port,
            notification_receiver_auth=notification_receiver_auth,
        )
        push_notification_listener.start()

    client = A2AClient(agent_card=card)
    if session == 0:
        sessionId = uuid4().hex
    else:
        sessionId = session
    continue_loop = True
    streaming = card.capabilities.streaming

    while continue_loop:
        taskId = uuid4().hex
        print(f"=========  starting a new task ======== streaming={streaming}")
        continue_loop = await completeTask(client, streaming, use_push_notifications, notification_receiver_host,
                                           notification_receiver_port, taskId, sessionId)

        if history and continue_loop:
            print("========= history ======== ")
            task_response = await client.get_task({"id": taskId, "historyLength": 10})
            print(task_response.model_dump_json(include={"result": {"history": True}}))


async def completeTask(client: A2AClient, streaming, use_push_notifications: bool, notification_receiver_host: str,
                       notification_receiver_port: int, taskId, sessionId):
    prompt = click.prompt(
        "\nWhat do you want to send to the agent? (:q or quit to exit)"
    )
    if prompt == ":q" or prompt == "quit":
        return False

    payload = {
        "id": taskId,
        "sessionId": sessionId,
        "acceptedOutputModes": ["text"],
        "message": {
            "role": "user",
            "parts": [
                {
                    "type": "text",
                    "text": prompt,
                }
            ],
        },
    }
    if use_push_notifications:
        payload["pushNotification"] = {
            "url": f"http://{notification_receiver_host}:{notification_receiver_port}/notify",
            "authentication": {
                "schemes": ["bearer"],
            },
        }
    print(f"send payload={payload}")
    taskResult = None
    if streaming:
        response_stream = client.send_task_streaming(payload)
        async for result in response_stream:
            print(f"stream event => {result.model_dump_json(exclude_none=True)}")
        taskResult = await client.get_task({"id": taskId})
    else:
        taskResult = await client.send_task(payload)
        print(f"non stream result =>\n{taskResult.model_dump_json(exclude_none=True)}")

    ## if the result is that more input is required, loop again.
    state = TaskState(taskResult.result.status.state)
    if state.name == TaskState.INPUT_REQUIRED.name:
        return await completeTask(
            client,
            streaming,
            use_push_notifications,
            notification_receiver_host,
            notification_receiver_port,
            taskId,
            sessionId
        )
    else:
        ## task is complete
        return True


if __name__ == "__main__":
    asyncio.run(cli())
