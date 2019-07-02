# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from . import models


class WechatBackend(object):
    def authenticate(self, request, openid=None, **kwargs):
        if openid is None:
            return None
        user = models.User.get_obj_by_unique_key_from_cache(openid=openid)
        return user

    def get_user(self, user_id):
        user = models.User.get_obj_by_pk_from_cache(user_id)
        return user
