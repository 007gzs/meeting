# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from apiview.consumers import ApiViewConsumer

channel_routing = [
    ApiViewConsumer.as_route(path="^/wsapi")
]
