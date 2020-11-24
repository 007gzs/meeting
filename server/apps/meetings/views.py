# encoding: utf-8
from __future__ import absolute_import, unicode_literals

import datetime
import json

from cool.views import ViewSite, CoolAPIException, ErrorCode
from cool.views.fields import SplitCharField
from rest_framework import fields
from constance import config
from django.db import transaction
from django.db.models import Q

from apps.wechat import biz
from apps.wechat.views import UserBaseView
from core import utils, constants as core_constants

from . import models, serializer, constants


site = ViewSite(name='meetings', app_name='meetings')


class BaseView(UserBaseView):

    @staticmethod
    def get_room_follow(room_id, user_id):
        follow, _ = models.UserFollowRoom.default_manager.get_or_create(
            room_id=room_id, user_id=user_id
        )
        return follow

    @classmethod
    def response_info_date_time_settings(cls):
        return {
            'start_time': '开始时间',
            'end_time': '结束时间',
            'start_date': '开始日期',
            'end_date': '结束日期',
            'history_start_date': '历史开始日期',
            'history_end_date': '历史结束日期'
        }

    @staticmethod
    def get_date_time_settings():
        today = datetime.date.today()
        return {
            'start_time': config.RESERVE_START_TIME,
            'end_time': config.RESERVE_END_TIME,
            'start_date': today,
            'end_date': today + datetime.timedelta(days=config.SELECT_DATE_DAYS),
            'history_start_date': today - datetime.timedelta(days=config.MAX_HISTORY_DAYS),
            'history_end_date': today
        }

    def get_context(self, request, *args, **kwargs):
        raise NotImplementedError

    class Meta:
        path = '/'


@site
class Config(BaseView):
    name = "配置信息"

    def get_context(self, request, *args, **kwargs):
        return {
            'reserve_start_time': config.RESERVE_START_TIME,
            'reserve_end_time': config.RESERVE_END_TIME,
            'select_date_days': config.SELECT_DATE_DAYS
        }


@site
class RoomCreate(BaseView):
    name = "创建会议室"
    response_info_serializer_class = serializer.RoomSerializer

    def get_context(self, request, *args, **kwargs):
        room = models.Room.objects.create(
            name=request.params.name,
            description=request.params.description,
            create_user_id=request.user.pk,
            create_user_manager=request.params.create_user_manager
        )
        try:
            room.qr_code = biz.get_wxa_code_unlimited_file(
                "room_%d.jpg" % room.pk, scene="room_id=%d" % room.pk, page="pages/room/detail"
            )
            room.save(update_fields=['qr_code', ], force_update=True)
        except Exception:
            utils.exception_logging.exception("get_wxa_code_unlimited_file", extra={'request': request})
        self.get_room_follow(room.pk, request.user.pk)
        return room

    class Meta:
        param_fields = (
            ('name', fields.CharField(label='名称', max_length=64)),
            ('description', fields.CharField(label='描述', max_length=255, allow_blank=True, default="")),
            ('create_user_manager', fields.BooleanField(label='创建人管理权限', default=False)),
        )


class RoomBase(BaseView):
    check_manager = False

    def check_api_permissions(self, request, *args, **kwargs):
        super(RoomBase, self).check_api_permissions(request, *args, **kwargs)
        room = models.Room.get_obj_by_pk_from_cache(request.params.room_id)
        if room is None:
            raise CoolAPIException(ErrorCode.ERR_MEETING_ROOM_NOT_FOUND)
        setattr(self, 'room', room)
        if self.check_manager:
            if room.create_user_id != request.user.pk:
                raise CoolAPIException(ErrorCode.ERROR_PERMISSION)

    def get_context(self, request, *args, **kwargs):
        raise NotImplementedError

    class Meta:
        path = '/'
        param_fields = (
            ('room_id', fields.IntegerField(label='会议室ID')),
        )


@site
class RoomEdit(RoomBase):
    name = "修改会议室"
    check_manager = True
    response_info_serializer_class = serializer.RoomSerializer

    def get_context(self, request, *args, **kwargs):
        self.room.name = request.params.name
        self.room.description = request.params.description
        update_fields = ['name', 'description']
        if request.params.create_user_manager is not None:
            self.room.create_user_manager = request.params.create_user_manager
            update_fields.append('create_user_manager')
        self.room.save(force_update=True, update_fields=update_fields)
        return self.room

    class Meta:
        param_fields = (
            ('name', fields.CharField(label='名称', max_length=64)),
            ('description', fields.CharField(label='描述', max_length=255, allow_blank=True, default="")),
            ('create_user_manager', fields.NullBooleanField(label='创建人管理权限', default=None)),
        )


@site
class RoomDelete(RoomBase):
    name = "删除会议室"
    check_manager = True

    def get_context(self, request, *args, **kwargs):
        self.room.delete()
        return {}


@site
class RoomInfo(RoomBase):
    name = "会议室信息"
    response_info_serializer_class = serializer.RoomDetailSerializer

    def get_context(self, request, *args, **kwargs):
        return self.room


@site
class RoomFollow(BaseView):
    name = "关注会议室"

    def get_context(self, request, *args, **kwargs):
        if len(request.params.room_id) > 50:
            raise CoolAPIException(ErrorCode.ERROR_BAD_PARAMETER)
        for room_id in request.params.room_id:
            self.get_room_follow(room_id, request.user.pk).un_delete()
        return {}

    class Meta:
        param_fields = (
            ('room_id', SplitCharField(label='会议室ID列表', sep=',', child=fields.IntegerField())),
        )


@site
class RoomUnFollow(BaseView):
    name = "取消关注会议室"

    def get_context(self, request, *args, **kwargs):
        follow = models.UserFollowRoom.objects.filter(room_id=request.params.room_id, user_id=request.user.pk).first()
        if follow is None:
            raise CoolAPIException(ErrorCode.ERROR_BAD_PARAMETER)
        follow.delete()
        return {}

    class Meta:
        param_fields = (
            ('room_id', fields.IntegerField(label='会议室ID')),
        )


@site
class FollowRooms(BaseView):
    name = "已关注会议室列表"
    response_info_serializer_class = serializer.RoomSerializer
    response_many = True

    def get_context(self, request, *args, **kwargs):
        return models.Room.objects.filter(
            follows__user_id=request.user.pk, follows__delete_status=core_constants.DeleteCode.NORMAL.code
        )


@site
class CreateRooms(BaseView):
    name = "创建会议室列表"
    response_info_serializer_class = serializer.RoomSerializer
    response_many = True

    def get_context(self, request, *args, **kwargs):
        return models.Room.objects.filter(create_user_id=request.user.pk)


@site
class RoomMeetings(BaseView):
    name = "会议室预约列表"

    @classmethod
    def response_info_data(cls):
        from cool.views.utils import get_serializer_info
        ret = cls.response_info_date_time_settings()
        ret.update({
            'rooms': get_serializer_info(serializer.RoomSerializer(), True),
            'meetings': get_serializer_info(serializer.MeetingSerializer(), True)
        })
        return ret

    def get_context(self, request, *args, **kwargs):
        if len(request.params.room_ids) > 10:
            raise CoolAPIException(ErrorCode.ERROR_BAD_PARAMETER)
        d = datetime.date.today()
        if request.params.date is not None:
            d = request.params.date
        rooms = list(sorted(models.Room.objects.filter(
            id__in=request.params.room_ids), key=lambda x: request.params.room_ids.index(x.id)
        ))
        meetings = models.Meeting.objects.filter(room_id__in=request.params.room_ids, date=d).order_by('start_time')
        ret = self.get_date_time_settings()
        ret.update({
            'rooms': serializer.RoomSerializer(rooms, request=request, many=True).data,
            'meetings': serializer.MeetingSerializer(meetings, request=request, many=True).data
        })
        return ret

    class Meta:
        param_fields = (
            ('room_ids', SplitCharField(label='会议室ID列表', sep=',', child=fields.IntegerField())),
            ('date', utils.DateField(label='日期', default=None)),
        )


@site
class HistoryMeetings(BaseView):
    name = "会议室预约历史"

    @classmethod
    def response_info_data(cls):
        from cool.views.utils import get_serializer_info
        ret = cls.response_info_date_time_settings()
        ret.update({'meetings': get_serializer_info(serializer.MeetingSerializer(), True)})
        return ret

    def get_context(self, request, *args, **kwargs):
        meetings = models.Meeting.objects.filter(
            room_id=request.params.room_id,
            date__gte=request.params.start_date,
            date__lte=request.params.end_date
        ).order_by('date', 'start_time')
        ret = self.get_date_time_settings()
        ret.update({'meetings': serializer.MeetingSerializer(meetings, request=request, many=True).data})
        return ret

    class Meta:
        param_fields = (
            ('room_id', fields.IntegerField(label='会议室ID')),
            ('start_date', utils.DateField(label='开始日期')),
            ('end_date', utils.DateField(label='结束日期')),
        )


@site
class MyMeetings(BaseView):
    name = "我参与的会议列表"

    @classmethod
    def response_info_data(cls):
        from cool.views.utils import get_serializer_info
        ret = cls.response_info_date_time_settings()
        ret.update({
            'rooms': get_serializer_info(serializer.RoomSerializer(), True),
            'meetings': get_serializer_info(serializer.MeetingSerializer(), True)
        })
        return ret

    def get_context(self, request, *args, **kwargs):
        d = datetime.date.today()
        if request.params.date is not None:
            d = request.params.date
        meetings = list(models.Meeting.objects.filter(
            id__in=models.MeetingAttendee.objects.filter(
                user_id=request.user.pk, meeting__date=d
            ).values_list('meeting', flat=True)
        ))
        rooms = list(models.Room.objects.filter(id__in=set(map(lambda x: x.room_id, meetings))))
        ret = self.get_date_time_settings()
        ret.update({
            'rooms': serializer.RoomSerializer(rooms, request=request, many=True).data,
            'meetings': serializer.MeetingSerializer(meetings, request=request, many=True).data
        })
        return ret

    class Meta:
        param_fields = (
            ('date', utils.DateField(label='日期', default=None)),
        )


@site
class Reserve(BaseView):
    name = "预约会议"
    response_info_serializer_class = serializer.MeetingDetailSerializer

    @staticmethod
    def time_ok(t):
        return t.second == 0 and t.microsecond == 0 and t.minute in (0, 30)

    def get_context(self, request, *args, **kwargs):
        if request.params.start_time >= request.params.end_time:
            raise CoolAPIException(ErrorCode.ERROR_BAD_PARAMETER)
        if not self.time_ok(request.params.start_time) or not self.time_ok(request.params.end_time):
            raise CoolAPIException(ErrorCode.ERROR_BAD_PARAMETER)
        now = datetime.datetime.now()
        if request.params.date == now.date() and request.params.start_time < now.time():
            raise CoolAPIException(ErrorCode.ERR_MEETING_ROOM_TIMEOVER)

        with transaction.atomic():
            if models.Meeting.objects.filter(room_id=request.params.room_id, date=request.params.date).filter(
                    (Q(start_time__lte=request.params.start_time) & Q(end_time__gt=request.params.start_time))
                    | (Q(start_time__lt=request.params.end_time) & Q(end_time__gte=request.params.end_time))
                    | (Q(start_time__lte=request.params.start_time) & Q(start_time__gt=request.params.end_time))
                    | (Q(end_time__lt=request.params.start_time) & Q(end_time__gte=request.params.end_time))
            ).select_for_update().exists():
                raise CoolAPIException(ErrorCode.ERR_MEETING_ROOM_INUSE)
            meeting = models.Meeting.objects.create(
                user_id=request.user.pk,
                room_id=request.params.room_id,
                name=request.params.name,
                description=request.params.description,
                date=request.params.date,
                start_time=request.params.start_time,
                end_time=request.params.end_time,
            )
            models.MeetingAttendee.objects.create(
                user_id=request.user.pk,
                meeting_id=meeting.pk
            )
        self.get_room_follow(request.params.room_id, request.user.pk)
        return meeting

    class Meta:
        param_fields = (
            ('room_id', fields.IntegerField(label='会议室ID')),
            ('name', fields.CharField(label='名称', max_length=64)),
            ('description', fields.CharField(label='描述', max_length=255, allow_blank=True, default="")),
            ('date', fields.DateField(label='预定日期')),
            ('start_time', fields.TimeField(label='开始时间')),
            ('end_time', fields.TimeField(label='结束时间')),
        )


class MeetingBase(BaseView):
    check_manager = False
    response_info_serializer_class = serializer.MeetingDetailSerializer

    def check_api_permissions(self, request, *args, **kwargs):
        super(MeetingBase, self).check_api_permissions(request, *args, **kwargs)
        meeting = models.Meeting.get_obj_by_pk_from_cache(request.params.meeting_id)
        if meeting is None:
            raise CoolAPIException(ErrorCode.ERR_MEETING_NOT_FOUND)
        setattr(self, 'meeting', meeting)
        if self.check_manager:
            if meeting.user_id != request.user.pk and (
                    not meeting.room.create_user_manager or request.user.pk != meeting.room.create_user_id
            ):
                raise CoolAPIException(ErrorCode.ERROR_PERMISSION)

    def get_context(self, request, *args, **kwargs):
        raise NotImplementedError

    class Meta:
        path = '/'
        param_fields = (
            ('meeting_id', fields.IntegerField(label='会议ID')),
        )


@site
class Info(MeetingBase):
    name = "会议详情"

    def get_context(self, request, *args, **kwargs):
        return self.meeting


@site
class Edit(MeetingBase):
    name = "会议修改"
    check_manager = True

    def get_context(self, request, *args, **kwargs):
        data = dict()
        update_fields = list()
        if self.meeting.name != request.params.name:
            data['name'] = {'from': self.meeting.name, 'to': request.params.name}
            update_fields.append('name')
            self.meeting.name = request.params.name
        if self.meeting.description != request.params.description:
            data['description'] = {'from': self.meeting.description, 'to': request.params.description}
            update_fields.append('description')
            self.meeting.description = request.params.description
        if update_fields:
            with transaction.atomic():
                self.meeting.save(force_update=True, update_fields=update_fields)
                models.MeetingTrace.objects.create(
                    meeting_id=self.meeting.pk,
                    user_id=request.user.pk,
                    owner=request.user.pk == self.meeting.user_id,
                    type=constants.MeetingTraceTypeCode.EDIT.code,
                    data=json.dumps(data, ensure_ascii=False)
                )
        return self.meeting

    class Meta:
        param_fields = (
            ('name', fields.CharField(label='名称', max_length=64)),
            ('description', fields.CharField(label='描述', max_length=255, allow_blank=True, default="")),
        )


@site
class Cancel(MeetingBase):
    name = "取消会议"
    check_manager = True
    response_info_serializer_class = None

    def get_context(self, request, *args, **kwargs):
        with transaction.atomic():
            self.meeting.delete()
            models.MeetingTrace.objects.create(
                meeting_id=self.meeting.pk,
                user_id=request.user.pk,
                owner=request.user.pk == self.meeting.user_id,
                type=constants.MeetingTraceTypeCode.DELETE.code
            )
        return {}


@site
class Join(MeetingBase):
    name = "参加会议"

    def get_context(self, request, *args, **kwargs):
        attendee, _ = models.MeetingAttendee.default_manager.get_or_create(
            meeting_id=request.params.meeting_id,
            user_id=request.user.pk
        )
        attendee.un_delete()
        self.get_room_follow(self.meeting.room_id, request.user.pk)
        return self.meeting


@site
class Leave(MeetingBase):
    name = "取消参加会议"

    def get_context(self, request, *args, **kwargs):
        attendee = models.MeetingAttendee.objects.filter(
            meeting_id=request.params.meeting_id,
            user_id=request.user.pk
        )
        if attendee is None:
            raise CoolAPIException(ErrorCode.ERROR_BAD_PARAMETER)
        attendee.delete()
        return self.meeting


urlpatterns = site.urlpatterns
app_name = site.app_name
