# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path

from cool.views.websocket import CoolBFFAPIConsumer


class MeetingConsumer(CoolBFFAPIConsumer):

    def accept(self, subprotocol=None):
        return super().accept('apiview')


def get_app():
    if hasattr(MeetingConsumer, 'as_asgi'):
        return MeetingConsumer.as_asgi()
    else:
        return MeetingConsumer


application = ProtocolTypeRouter({
    'websocket': AuthMiddlewareStack(
        URLRouter(
            [path('wsapi', get_app())],
        )
    ),
})
