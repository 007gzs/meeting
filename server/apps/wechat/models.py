# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from apiview import model
from django.db import models
from django.utils import timezone

from core import utils

from . import constants


class User(utils.BaseModel, model.AbstractUserMixin):
    openid = models.CharField('openId', max_length=64, null=False, default='', unique=True)
    unionid = models.CharField('unionId', max_length=64, null=False, default='', db_index=True)
    session_key = models.CharField(verbose_name='session_key', max_length=256)
    nickname = models.CharField('昵称', max_length=64, null=False, default='')
    gender = models.IntegerField('性别', choices=constants.GENDER_CODE.get_list(),
                                 default=constants.GENDER_CODE.UNKOWN.code, null=False)
    language = models.CharField('语言', max_length=64, null=False, default='')
    country = models.CharField('国家', max_length=64, null=False, default='')
    province = models.CharField('省份', max_length=64, null=False, default='')
    city = models.CharField('城市', max_length=64, null=False, default='')
    avatarurl = models.ImageField('头像', max_length=512, null=False, default='')
    mobile = models.CharField(verbose_name='小程序授权手机号', max_length=32)

    def __str__(self):
        return self.nickname

    @classmethod
    def ex_search_fields(cls):
        ret = super(User, cls).ex_search_fields()
        ret.add('nickname')
        return ret

    def set_info(self, user_info, save=True):
        for k, v in user_info.items():
            k = k.lower()
            if k in ('subscribe', 'unionid', 'nickname', 'gender', 'language',
                     'country', 'province', 'city', 'avatarurl', 'session_key', 'mobile'):
                self.__setattr__(k, v)
        if save:
            self.save_changed()

    @property
    def need_refresh(self):
        return (timezone.now() - self.modify_time).total_seconds() > 86400

    class Meta:
        verbose_name = verbose_name_plural = "用户"
