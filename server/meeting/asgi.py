# encoding: utf-8
from __future__ import absolute_import, unicode_literals

import os
import channels.asgi

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "meeting.settings")
channel_layer = channels.asgi.get_channel_layer()
