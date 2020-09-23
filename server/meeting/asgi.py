# encoding: utf-8
from __future__ import absolute_import, unicode_literals

import os
import django
from channels.routing import get_default_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "meeting.settings")
django.setup()
application = get_default_application()
