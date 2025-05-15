from typing import Any, Callable, Dict, List, Optional
from threading import Thread
import logging
from typing_extensions import Protocol
from enum import StrEnum

from extensions.ext_redis import redis_client
from libs.helper import object_to_json, json_to_object

logger = logging.getLogger(__name__)


class EventType(StrEnum):
    TENANT_WAS_CREATED = "tenant.was_created"
    TENANT_WAS_UPDATED = "tenant.was_updated"
    TENANT_WAS_DELETED = "tenant.was_deleted"
    TENANT_MEMBER_WAS_ADDED = "tenant.member_was_added"
    TENANT_MEMBER_WAS_REMOVED = "tenant.member_was_removed"


class Event(Protocol):
    event_type: str
    data: Any


class EventHandler(Protocol):
    def __call__(self, event: Event) -> None: ...


class RedisEventBus:

    def init_app(self, app):
        self.redis = redis_client
        self.pubsub = self.redis.pubsub()
        self.handlers: Dict[str, List[EventHandler]] = {}
        self.listener_thread: Optional[Thread] = None
        self._running = False

    def publish(self, event_type: str, data: Any) -> None:
        """
        发布事件
        :param event_type: 事件类型
        :param data: 事件数据
        """
        try:
            event = {
                'event_type': event_type,
                'data': data
            }
            self.redis.publish(event_type, object_to_json(event))
            logger.debug(f"Published event: {event_type}")
        except Exception as e:
            logger.error(f"Error publishing event {event_type}: {e}")

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        """
        订阅事件
        :param event_type: 事件类型
        :param handler: 事件处理函数
        """
        if event_type not in self.handlers:
            self.handlers[event_type] = []
            self.pubsub.subscribe(event_type)

        self.handlers[event_type].append(handler)
        logger.debug(f"Subscribed to event: {event_type}")

    def unsubscribe(self, event_type: str, handler: EventHandler) -> None:
        """
        取消订阅事件
        :param event_type: 事件类型
        :param handler: 事件处理函数
        """
        if event_type in self.handlers:
            self.handlers[event_type].remove(handler)
            if not self.handlers[event_type]:
                del self.handlers[event_type]
                self.pubsub.unsubscribe(event_type)
                logger.debug(f"Unsubscribed from event: {event_type}")

    def start(self) -> None:
        """启动事件监听"""
        if self.listener_thread is not None:
            return

        self._running = True
        self.listener_thread = Thread(target=self._listen, daemon=True)
        self.listener_thread.start()
        logger.info("Event bus started")

    def stop(self) -> None:
        """停止事件监听"""
        self._running = False
        if self.listener_thread:
            self.listener_thread.join()
            self.listener_thread = None
        self.pubsub.close()
        logger.info("Event bus stopped")

    def _listen(self) -> None:
        """监听事件的内部方法"""
        while self._running:
            try:
                message = self.pubsub.get_message()
                if message and message['type'] == 'message':
                    event_type = message['channel']
                    event_data = json_to_object(message['data'])

                    if event_type in self.handlers:
                        for handler in self.handlers[event_type]:
                            try:
                                handler(event_data)
                            except Exception as e:
                                logger.error(f"Error handling event {event_type}: {e}")
            except Exception as e:
                logger.error(f"Error in event listener: {e}")


# 创建单例实例
event_bus = RedisEventBus()


def init_app(app):
    event_bus.init_app(app)
    event_bus.start()
