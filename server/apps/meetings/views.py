# encoding: utf-8
from __future__ import absolute_import, unicode_literals

import datetime

from apiview import utility
from apiview.err_code import ErrCode
from apiview.exceptions import CustomError
from apiview.views import ViewSite, fields
from constance import config
from django.db import transaction
from django.db.models import Q

from apps.wechat import biz
from apps.wechat.views import UserBaseView
from core import constants

from . import models, serializer

site = ViewSite(name='meetings', app_name='meetings')


class BaseView(UserBaseView):

    @staticmethod
    def get_room_follow(room_id, user_id):
        follow, _ = models.UserFollowRoom.default_manager.get_or_create(
            room_id=room_id, user_id=user_id
        )
        return follow

    def get_context(self, request, *args, **kwargs):
        raise NotImplementedError

    class Meta:
        path = '/'


@site
class RoomCreate(BaseView):
    name = "创建会议室"

    def get_context(self, request, *args, **kwargs):
        room = models.Room.objects.create(
            name=request.params.name,
            description=request.params.description,
            create_user_id=request.user.pk
        )
        try:
            room.qr_code = biz.get_wxa_code_unlimited_file(
                "room_%d.jpg" % room.pk, scene="room_id=%d" % room.pk, page="pages/room/detail"
            )
            room.save(update_fields=['qr_code', ], force_update=True)
        except Exception:
            utility.reportExceptionByMail("get_wxa_code_unlimited_file")
        self.get_room_follow(room.pk, request.user.pk)
        return serializer.RoomSerializer(room, request=request).data

    class Meta:
        param_fields = (
            ('name', fields.CharField(help_text='名称', max_length=64)),
            ('description', fields.CharField(help_text='描述', max_length=255)),
        )


@site
class RoomEdit(BaseView):
    name = "修改会议室"

    def get_context(self, request, *args, **kwargs):
        room = models.Room.objects.filter(pk=request.params.room_id).first()
        if room is None:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        if room.create_user_id != request.user.pk:
            raise CustomError(ErrCode.ERR_COMMON_PERMISSION)
        room.name = request.params.name
        room.description = request.params.description
        room.save(force_update=True, update_fields=['name', 'description'])
        return serializer.RoomSerializer(room, request=request).data

    class Meta:
        param_fields = (
            ('room_id', fields.IntegerField(help_text='会议室ID')),
            ('name', fields.CharField(help_text='名称', max_length=64)),
            ('description', fields.CharField(help_text='描述', max_length=255, required=False, default="", omit="")),
        )


@site
class RoomDelete(BaseView):
    name = "删除会议室"

    def get_context(self, request, *args, **kwargs):
        room = models.Room.objects.filter(pk=request.params.room_id).first()
        if room is None:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        if room.create_user_id != request.user.pk:
            raise CustomError(ErrCode.ERR_COMMON_PERMISSION)
        room.delete()
        return {}

    class Meta:
        param_fields = (
            ('room_id', fields.IntegerField(help_text='会议室ID')),
        )


@site
class RoomInfo(BaseView):
    name = "会议室信息"

    def get_context(self, request, *args, **kwargs):
        room = models.Room.objects.filter(pk=request.params.room_id).first()
        if room is None:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        return serializer.RoomDetailSerializer(room, request=request).data

    class Meta:
        param_fields = (
            ('room_id', fields.IntegerField(help_text='会议室ID')),
        )


@site
class RoomFollow(BaseView):
    name = "关注会议室"

    def get_context(self, request, *args, **kwargs):
        self.get_room_follow(request.params.room_id, request.user.pk).un_delete()
        return {}

    class Meta:
        param_fields = (
            ('room_id', fields.IntegerField(help_text='会议室ID')),
        )


@site
class RoomUnFollow(BaseView):
    name = "取消关注会议室"

    def get_context(self, request, *args, **kwargs):
        follow = models.UserFollowRoom.objects.filter(room_id=request.params.room_id, user_id=request.user.pk).first()
        if follow is None:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        follow.delete()
        return {}

    class Meta:
        param_fields = (
            ('room_id', fields.IntegerField(help_text='会议室ID')),
        )


@site
class FollowRooms(BaseView):
    name = "已关注会议室列表"

    def get_context(self, request, *args, **kwargs):
        rooms = models.Room.objects.filter(
            follows__user_id=request.user.pk, follows__delete_status=constants.DELETE_CODE.NORMAL.code
        )
        return serializer.RoomSerializer(rooms, request=request, many=True).data


@site
class CreateRooms(BaseView):
    name = "创建会议室列表"

    def get_context(self, request, *args, **kwargs):
        rooms = models.Room.objects.filter(create_user_id=request.user.pk)
        return serializer.RoomSerializer(rooms, request=request, many=True).data


@site
class RoomMeetings(BaseView):
    name = "会议室预约列表"

    def get_context(self, request, *args, **kwargs):
        if len(request.params.room_ids) > 10:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        d = datetime.date.today()
        if request.params.date is not None:
            d = request.params.date
        rooms = list(sorted(models.Room.objects.filter(
            id__in=request.params.room_ids), key=lambda x: request.params.room_ids.index(x.id)
        ))
        meetings = models.Meeting.objects.filter(room_id__in=request.params.room_ids, date=d).order_by('start_time')
        return {
            'rooms': serializer.RoomSerializer(rooms, request=request, many=True).data,
            'meetings': serializer.MeetingSerializer(meetings, request=request, many=True).data,
            'start_time': config.RESERVE_START_TIME,
            'end_time': config.RESERVE_END_TIME,
            'start_date': datetime.date.today(),
            'end_date': datetime.date.today() + datetime.timedelta(days=19)
        }

    class Meta:
        param_fields = (
            ('room_ids', fields.SplitCharField(help_text='会议室ID列表', sep=',', field=fields.IntegerField())),
            ('date', fields.DateField(help_text='日期', required=False, default=None, omit=None)),
        )


@site
class Reserve(BaseView):
    name = "预约会议"

    @staticmethod
    def time_ok(t):
        return t.second == 0 and t.microsecond == 0 and t.minute in (0, 30)

    def get_context(self, request, *args, **kwargs):
        if request.params.start_time >= request.params.end_time:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        if not self.time_ok(request.params.start_time) or not self.time_ok(request.params.end_time):
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        now = datetime.datetime.now()
        if request.params.date == now.date() and request.params.start_time < now.time():
            raise CustomError(ErrCode.ERR_MEETING_ROOM_TIMEOVER)

        with transaction.atomic():
            if models.Meeting.objects.filter(room_id=request.params.room_id, date=request.params.date).filter(
                    (Q(start_time__lte=request.params.start_time) & Q(end_time__gt=request.params.start_time))
                    | (Q(start_time__lt=request.params.end_time) & Q(end_time__gte=request.params.end_time))
                    | (Q(start_time__lte=request.params.start_time) & Q(start_time__gt=request.params.end_time))
                    | (Q(end_time__lt=request.params.start_time) & Q(end_time__gte=request.params.end_time))
            ).select_for_update().exists():
                raise CustomError(ErrCode.ERR_MEETING_ROOM_INUSE)
            meeting = models.Meeting.objects.create(
                user_id=request.user.pk,
                room_id=request.params.room_id,
                name=request.params.name,
                description=request.params.description,
                date=request.params.date,
                start_time=request.params.start_time,
                end_time=request.params.end_time,
            )
        self.get_room_follow(request.params.room_id, request.user.pk)
        return serializer.MeetingDetailSerializer(meeting, request=request).data

    class Meta:
        param_fields = (
            ('room_id', fields.IntegerField(help_text='会议室ID')),
            ('name', fields.CharField(help_text='名称', max_length=64)),
            ('description', fields.CharField(help_text='描述', max_length=255, required=False, default="", omit="")),
            ('date', fields.DateField(help_text='预定日期')),
            ('start_time', fields.TimeField(help_text='开始时间')),
            ('end_time', fields.TimeField(help_text='结束时间')),
        )


@site
class Info(BaseView):
    name = "会议详情"

    def get_context(self, request, *args, **kwargs):
        meeting = models.Meeting.objects.filter(pk=request.params.meeting_id).first()
        if meeting is None:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        return serializer.MeetingDetailSerializer(meeting, request=request).data

    class Meta:
        param_fields = (
            ('meeting_id', fields.IntegerField(help_text='会议ID')),
        )


@site
class Edit(BaseView):
    name = "会议修改"

    def get_context(self, request, *args, **kwargs):
        meeting = models.Meeting.objects.filter(pk=request.params.meeting_id).first()
        if meeting is None:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        if meeting.user_id != request.user.pk:
            raise CustomError(ErrCode.ERR_COMMON_PERMISSION)
        meeting.name = request.params.name
        meeting.description = request.params.description
        meeting.save(force_update=True, update_fields=['name', 'description'])
        return serializer.MeetingDetailSerializer(meeting, request=request).data

    class Meta:
        param_fields = (
            ('meeting_id', fields.IntegerField(help_text='会议ID')),
            ('name', fields.CharField(help_text='名称', max_length=64)),
            ('description', fields.CharField(help_text='描述', max_length=255, required=False, default="", omit="")),
        )


@site
class Cancel(BaseView):
    name = "取消会议"

    def get_context(self, request, *args, **kwargs):
        meeting = models.Meeting.objects.filter(pk=request.params.meeting_id).first()
        if meeting is None:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        if meeting.user_id != request.user.pk:
            raise CustomError(ErrCode.ERR_COMMON_PERMISSION)
        meeting.delete()
        return {}

    class Meta:
        param_fields = (
            ('meeting_id', fields.IntegerField(help_text='会议ID')),
        )


@site
class Join(BaseView):
    name = "参加会议"

    def get_context(self, request, *args, **kwargs):
        meeting = models.Meeting.objects.filter(pk=request.params.meeting_id).first()
        if meeting is None:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        attendee, _ = models.MeetingAttendee.default_manager.get_or_create(
            meeting_id=request.params.meeting_id,
            user_id=request.user.pk
        )
        attendee.un_delete()
        self.get_room_follow(meeting.room_id, request.user.pk)
        return serializer.MeetingDetailSerializer(meeting, request=request).data

    class Meta:
        param_fields = (
            ('meeting_id', fields.IntegerField(help_text='会议ID')),
        )


@site
class Leave(BaseView):
    name = "取消参加会议"

    def get_context(self, request, *args, **kwargs):
        meeting = models.Meeting.objects.filter(pk=request.params.meeting_id).first()
        if meeting is None:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        attendee = models.MeetingAttendee.objects.filter(
            meeting_id=request.params.meeting_id,
            user_id=request.user.pk
        )
        if attendee is None:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        attendee.delete()
        return serializer.MeetingDetailSerializer(meeting, request=request).data

    class Meta:
        param_fields = (
            ('meeting_id', fields.IntegerField(help_text='会议ID')),
        )


urlpatterns = site.urlpatterns
