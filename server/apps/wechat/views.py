# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from cool.views import ViewSite, CoolAPIException, ErrorCode
from rest_framework import fields
from django.contrib.auth import authenticate, login

from core import utils

from . import biz, models, serializer


site = ViewSite(name='wechat', app_name='wechat')


@site
class Login(utils.APIBase):
    name = "小程序登录"
    response_info_serializer_class = serializer.UserSerializer

    def get_context(self, request, *args, **kwargs):
        session = biz.wechat.wxa.code_to_session(request.params.js_code)
        wxa_user, new = models.User.objects.get_or_create(openid=session['openid'])
        wxa_user.set_info(session)
        login_user = authenticate(request, openid=wxa_user.openid)
        if login_user is None:
            raise CoolAPIException(ErrorCode.ERROR_BAD_PARAMETER)
        login(request, login_user)
        return wxa_user

    class Meta:
        param_fields = (
            ('js_code', fields.CharField(label='小程序登录code', required=True)),
        )


class UserBaseView(utils.APIBase):

    def check_api_permissions(self, request, *args, **kwargs):
        super(UserBaseView, self).check_api_permissions(request, *args, **kwargs)
        if not isinstance(request.user, models.User):
            raise CoolAPIException(ErrorCode.ERR_WECHAT_LOGIN)

    def get_context(self, request, *args, **kwargs):
        raise NotImplementedError

    class Meta:
        path = '/'


@site
class UserInfo(UserBaseView):
    name = "小程序用户信息"
    response_info_serializer_class = serializer.UserSerializer

    def get_context(self, request, *args, **kwargs):
        if request.params.encrypted_data or request.params.iv:
            try:
                data = biz.decrypt_message(request.user.session_key, request.params.iv, request.params.encrypted_data)
            except Exception:
                utils.exception_logging.exception("decrypt_message", extra={'request': request})
                raise CoolAPIException(ErrorCode.ERROR_SYSTEM)
            request.user.set_info(data)
        return request.user

    class Meta:
        param_fields = (
            ('encrypted_data', fields.CharField(label='完整用户信息的加密数据', required=False, default=None)),
            ('iv', fields.CharField(label='加密算法的初始向量', required=False, default=None)),
        )


urlpatterns = site.urlpatterns
app_name = site.app_name
