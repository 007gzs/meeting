# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from apiview import filters

from core import utils

from . import models

utils.site_register(models.Room, addable=False, changeable=False,
                    list_display=['create_user', ])
utils.site_register(models.UserFollowRoom, addable=False, changeable=False,
                    list_display=['room', 'user'], list_filter=['room', ])
utils.site_register(models.Meeting, addable=False, changeable=False,
                    list_display=['room', 'user'], list_filter=[('date', filters.DateFieldListFilter), 'room'])
utils.site_register(models.MeetingAttendee, addable=False, changeable=False,
                    list_display=['meeting', 'user'])
utils.site_register(models.MeetingTrace, addable=False, changeable=False,
                    list_display=['meeting', 'user'], list_filter=['owner', 'type'])
