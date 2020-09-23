# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path

from cool.views.websocket import CoolBFFAPIConsumer


class MeetingConsumer(CoolBFFAPIConsumer):

    def accept(self, subprotocol=None):
        return super().accept('apiview')


application = ProtocolTypeRouter({
    'websocket': AuthMiddlewareStack(
        URLRouter(
            [path('wsapi', MeetingConsumer)],
        )
    ),
})
