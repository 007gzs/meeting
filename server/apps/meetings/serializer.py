# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from rest_framework import serializers

from apps.wechat.models import User
from apps.wechat.serializer import UserSerializer
from core import utils

from . import models


class RoomSerializer(utils.BaseSerializer):
    class Meta:
        model = models.Room
        fields = ('id', 'name', 'description')


class RoomDetailSerializer(utils.BaseSerializer):
    is_follow = serializers.SerializerMethodField("func_is_follow")

    def func_is_follow(self, obj):
        assert isinstance(self.request.user, User)
        return models.UserFollowRoom.objects.filter(user_id=self.request.user.pk, room_id=obj.pk).exists()

    class Meta:
        model = models.Room
        fields = ('id', 'name', 'description', 'qr_code', 'create_user', 'is_follow', 'create_user_manager')


class MeetingSerializer(utils.BaseSerializer):
    class Meta:
        model = models.Meeting
        fields = ('id', 'user', 'room', 'date', 'start_time', 'end_time', 'name', 'description')


class MeetingDetailSerializer(utils.BaseSerializer):
    user = UserSerializer(many=False, read_only=True)
    room = RoomSerializer(many=False, read_only=True)
    attendees = UserSerializer(many=True, read_only=True)
    is_manager = serializers.SerializerMethodField("func_is_manager")

    def func_is_manager(self, obj):
        if self.request is None or not isinstance(self.request.user, User):
            return False
        return self.request.user.pk == obj.user_id or (
                obj.room.create_user_manager and self.request.user.pk == obj.room.create_user_id
        )

    class Meta:
        model = models.Meeting
        fields = (
            'id', 'user', 'room', 'date', 'start_time', 'end_time', 'attendees', 'name', 'description', 'is_manager'
        )
