# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from django.db import models

from apps.wechat.models import User
from core import utils, constants


class Room(utils.BaseModel):
    name = models.CharField(verbose_name='名称', default='', max_length=64)
    description = models.CharField(verbose_name='描述', default='', max_length=255)
    create_user = utils.ForeignKey(User, verbose_name='创建人', related_name='create_rooms')
    qr_code = models.ImageField('二维码', upload_to="%Y/%m/%d/", max_length=512, null=False, default='')

    class Meta:
        verbose_name = verbose_name_plural = "会议室"


class UserFollowRoom(utils.BaseModel):
    user = utils.ForeignKey(User, verbose_name='关注人')
    room = utils.ForeignKey(Room, verbose_name='会议室', related_name='follows')

    class Meta:
        unique_together = ('user', 'room')
        verbose_name = verbose_name_plural = "用户关注会议室"


class Meeting(utils.BaseModel):
    name = models.CharField(verbose_name='名称', default='', max_length=64)
    description = models.CharField(verbose_name='描述', default='', max_length=255)
    user = utils.ForeignKey(User, verbose_name='发起人', related_name='reserve_meetings')
    room = utils.ForeignKey(Room, verbose_name='会议室')
    date = models.DateField(verbose_name='会议日期', db_index=True)
    start_time = models.TimeField(verbose_name='开始时间')
    end_time = models.TimeField(verbose_name='结束时间')

    @property
    def attendees(self):
        return User.objects.filter(
            meetingattendee__meeting_id=self.pk, meetingattendee__delete_status=constants.DELETE_CODE.NORMAL.code
        )

    class Meta:
        verbose_name = verbose_name_plural = "会议"


class MeetingAttendee(utils.BaseModel):
    meeting = utils.ForeignKey(Meeting, verbose_name='会议')
    user = utils.ForeignKey(User, verbose_name='参与人')

    class Meta:
        unique_together = ('user', 'meeting')
        verbose_name = verbose_name_plural = "参会人"
