# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from core import utils

from . import models


class UserSerializer(utils.BaseSerializer):

    class Meta:
        model = models.User
        fields = ('id', 'nickname', 'avatarurl', 'need_refresh')
