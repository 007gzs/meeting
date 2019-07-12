# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from apiview import utility
from apiview.err_code import ErrCode
from apiview.exceptions import CustomError
from apiview.views import ViewSite, fields
from django.contrib.auth import authenticate, login

from core import utils

from . import biz, models, serializer


site = ViewSite(name='wechat', app_name='wechat')


@site
class Login(utils.APIBase):
    name = "小程序登录"

    def get_context(self, request, *args, **kwargs):
        session = biz.wechat.wxa.code_to_session(request.params.js_code)
        wxa_user, new = models.User.objects.get_or_create(openid=session['openid'])
        wxa_user.set_info(session)
        login_user = authenticate(request, openid=wxa_user.openid)
        if login_user is None:
            raise CustomError(ErrCode.ERR_COMMON_BAD_PARAM)
        login(request, login_user)
        return serializer.UserSerializer(wxa_user, request=request).data

    class Meta:
        param_fields = (
            ('js_code', fields.CharField(help_text='小程序登录code', required=True)),
        )


class UserBaseView(utils.APIBase):

    def check_api_permissions(self, request, *args, **kwargs):
        super(UserBaseView, self).check_api_permissions(request, *args, **kwargs)
        if not isinstance(request.user, models.User):
            raise CustomError(ErrCode.ERR_WECHAT_LOGIN)

    def get_context(self, request, *args, **kwargs):
        raise NotImplementedError

    class Meta:
        path = '/'


@site
class UserInfo(UserBaseView):
    name = "小程序用户信息"

    def get_context(self, request, *args, **kwargs):
        if request.params.encrypted_data or request.params.iv:
            try:
                data = biz.decrypt_message(request.user.session_key, request.params.iv, request.params.encrypted_data)
            except Exception:
                utility.reportExceptionByMail("decrypt_message")
                raise CustomError(ErrCode.ERR_SYS_ERROR)
            request.user.set_info(data)
        return serializer.UserSerializer(request.user, request=request).data

    class Meta:
        param_fields = (
            ('encrypted_data', fields.CharField(
                help_text='完整用户信息的加密数据', required=False, default=None, omit=None
            )),
            ('iv', fields.CharField(help_text='加密算法的初始向量', required=False, default=None, omit=None)),
        )


urlpatterns = site.urlpatterns
