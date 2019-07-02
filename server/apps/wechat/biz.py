# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile
from redis import Redis
from six import BytesIO
from wechatpy import WeChatClient
from wechatpy.crypto import WeChatWxaCrypto
from wechatpy.session.redisstorage import RedisStorage

redis_client = Redis.from_url(settings.REDIS_CACHE_URL)
wechat = WeChatClient(settings.WECHAT_APPID, settings.WECHAT_APPSECRET, session=RedisStorage(
    redis_client, prefix="wechat_session::%s" % settings.WECHAT_APPID
))


def decrypt_message(session_key, iv, encrypted_data):
    crypto = WeChatWxaCrypto(session_key, iv, settings.WECHAT_APPID)
    return crypto.decrypt_message(encrypted_data)


def get_wxa_code_unlimited_file(file_name, scene, **kwargs):
    file = BytesIO()
    kw = dict()
    for k in ('width', 'auto_color', 'line_color', 'page', 'is_hyaline'):
        if k in kwargs:
            kw[k] = kwargs[k]
    content = wechat.wxa.get_wxa_code_unlimited(scene, **kw)
    file.write(content.content)
    file.seek(0)
    return InMemoryUploadedFile(
        file=file,
        field_name="",
        name=file_name,
        content_type="image/jpeg",
        size=0,
        charset="",
        content_type_extra=""
    )
