# encoding: utf-8
from __future__ import absolute_import, unicode_literals

import logging
import os
import tempfile
import hashlib

from django import forms
from django.db import models
from django.contrib.auth import models as auth_models
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from rest_framework import fields
from rest_framework.response import Response

from cool import model, admin
from cool.views import CoolBFFAPIView, serializer, ErrorCode, CoolAPIException, ResponseData, get_api_doc

from . import constants, renderers


exception_logging = logging.getLogger('exception')


class DeletedManager(models.Manager):

    def get_queryset(self):
        queryset = super(DeletedManager, self).get_queryset()
        return queryset.filter(delete_status=constants.DeleteCode.NORMAL.code)

    def get_all_queryset(self):
        return super(DeletedManager, self).get_queryset()


class BaseModel(model.BaseModel):
    id = models.BigAutoField('主键ID', primary_key=True)
    create_time = models.DateTimeField('创建时间', auto_now_add=True, db_index=True, editable=False)
    modify_time = models.DateTimeField('修改时间', auto_now=True, db_index=True, editable=False)
    delete_status = models.BooleanField('删除状态', choices=constants.DeleteCode.get_choices_list(),
                                        default=constants.DeleteCode.NORMAL.code, null=False, db_index=True)
    remark = models.TextField('备注说明', null=True, blank=True, default='')

    default_manager = models.Manager()
    objects = DeletedManager()

    def __str__(self):
        if hasattr(self, 'name'):
            return self.name
        else:
            return super(BaseModel, self).__str__()

    class Meta:
        abstract = True

    @classmethod
    def ex_search_fields(cls):
        ret = set()
        for field in cls._meta.fields:
            if field.name == 'name' and isinstance(field, models.CharField):
                ret.add(field.name)
        return ret

    @classmethod
    def get_search_fields(cls):
        ret = super(BaseModel, cls).get_search_fields()
        return ret.union(cls.ex_search_fields())

    def delete(self, using=None, keep_parents=False):
        if self.delete_status == constants.DeleteCode.DELETED.code:
            return
        self.delete_status = constants.DeleteCode.DELETED.code
        return self.save(using=using, force_update=True, update_fields=['delete_status', ])
        # return super(BaseModel, self).delete(using=using, keep_parents=keep_parents)

    def un_delete(self, using=None):
        if self.delete_status == constants.DeleteCode.NORMAL.code:
            return
        self.delete_status = constants.DeleteCode.NORMAL.code
        return self.save(using=using, force_update=True, update_fields=['delete_status', ])


class ChangeLogBase(BaseModel):
    status = models.IntegerField('状态', choices=constants.ChangeLogStatusCode.get_choices_list(),
                                 default=constants.ChangeLogStatusCode.PROCESSING.code, null=False, db_index=True)
    reason = models.CharField('原因', max_length=255, null=False, blank=True, default='')
    reason_type = models.CharField('关联表类型', max_length=32, null=False, blank=True, default='')
    reason_id = models.BigIntegerField('关联表ID', null=False, blank=True, default=0)
    change_value = models.DecimalField('变化数值', max_digits=12, decimal_places=2,
                                       null=False, default=0, help_text='正加负减')

    class Meta:
        index_together = ('reason_id', 'reason_type')
        abstract = True


class ForeignKey(model.ForeignKey):

    def __init__(self, to, on_delete=models.DO_NOTHING, **kwargs):
        kwargs.setdefault('db_constraint', False)
        super().__init__(to, on_delete, **kwargs)


class BaseAdmin(admin.BaseModelAdmin):
    extend_normal_fields = True
    exclude_list_display = ['remark', 'modify_time']
    list_display = []
    heads = ['id']
    tails = ['create_time', 'delete_status', 'remark']
    readonly_fields = ['create_time', 'modify_time']
    change_view_readonly_fields = []
    editable_fields = forms.ALL_FIELDS
    list_filter = ['create_time', ]
    limits = None
    advanced_filter_fields = []

    def __init__(self, *args, **kwargs):
        super(BaseAdmin, self).__init__(*args, **kwargs)

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        db_field.remote_field.through._meta.auto_created = True
        return super(BaseAdmin, self).formfield_for_manytomany(db_field, request, **kwargs)

    def delete_queryset(self, request, queryset):
        # 单独调用每个model的delete，可以同时清空缓存
        for obj in queryset:
            self.delete_model(request, obj)


def handle_options(dismiss_create_time=False, **options):
    if 'list_filter' in options and not dismiss_create_time and 'create_time' not in options['list_filter']:
        options['list_filter'] = ['create_time', ] + list(options['list_filter'])
    return options


def site_register(model_or_iterable, admin_class=BaseAdmin, site=None, dismiss_create_time=False, **options):
    options = handle_options(dismiss_create_time=dismiss_create_time, **options)
    admin.site_register(model_or_iterable, admin_class, site, **options)


def admin_register(func=None, *, admin_class=BaseAdmin, site=None, dismiss_create_time=False, **options):
    options = handle_options(dismiss_create_time=dismiss_create_time, **options)
    return admin.admin_register(func=func, admin_class=admin_class, site=site, **options)


class DateField(fields.DateField):

    def validate_empty_values(self, data):
        (is_empty_value, data) = super().validate_empty_values(data)
        if not is_empty_value and data == '':
            is_empty_value = True
            data = self.get_default()
        return is_empty_value, data


class APIBase(CoolBFFAPIView):

    def get_context(self, request, *args, **kwargs):
        raise NotImplementedError

    @staticmethod
    def get_req_body(request):
        return request.body if request.method == 'POST' else None

    @staticmethod
    def get_appid(request):
        host = request.get_host()
        if not host.startswith("wx"):
            return None
        return host[:host.find('.')]

    class Meta:
        path = '/'
        param_fields = (
            ('channel', fields.CharField(label='渠道码', required=False)),
            ('version', fields.CharField(label='版本号', required=False)),
        )


class AdminApi(APIBase):

    need_superuser = True

    def get_context(self, request, *args, **kwargs):
        raise NotImplementedError

    def check_api_permissions(self, request, *args, **kwargs):
        if not isinstance(request.user, auth_models.AbstractUser):
            raise CoolAPIException(ErrorCode.ERR_AUTH_NOLOGIN)
        if not request.user.is_active or not request.user.is_staff:
            raise CoolAPIException(ErrorCode.ERR_AUTH_PERMISSION)
        if self.need_superuser:
            if not request.user.is_superuser:
                raise CoolAPIException(ErrorCode.ERR_AUTH_PERMISSION)

    class Meta:
        path = '/'


class TextApiView(APIBase):

    def __init__(self, *args, **kwargs):
        super(TextApiView, self).__init__(*args, **kwargs)
        self.renderer_classes = (renderers.PlainTextRenderer, )

    def get_response(self, context):
        status_code = 200
        if isinstance(context, HttpResponse):
            return context
        elif isinstance(context, ResponseData):
            status_code = context.status_code
            if context.code != ErrorCode.SUCCESS:
                context = 'error: %d %s' % (context.code, context.message)
            else:
                context = context.data
        return Response(context, status=status_code)

    def get_context(self, request, *args, **kwargs):
        raise NotImplementedError

    class Meta:
        path = '/'


class HtmlApiView(APIBase):

    error_template = 'error.html'

    def __init__(self, *args, **kwargs):
        super(HtmlApiView, self).__init__(*args, **kwargs)
        self.renderer_classes = (renderers.PlainHtmlRenderer, )

    def get_context(self, request, *args, **kwargs):
        raise NotImplementedError

    def get_response(self, context):
        status_code = 200
        if isinstance(context, HttpResponse):
            return context
        elif isinstance(context, ResponseData):
            status_code = context.status_code
            if context.code != ErrorCode.SUCCESS:
                if self.error_template:
                    context = render_to_string(self.request, self.error_template, context)
                else:
                    context = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>出错了</title>
</head>
<body>
    {message}
</body>
</html>
""".format(message=context.message)
            else:
                context = context.data
        return Response(context, status=status_code)

    class Meta:
        path = '/'


class BaseSerializer(serializer.BaseSerializer):
    pass


def get_temp_file(content):
    content = force_bytes(content)
    m = hashlib.md5()
    m.update(content)
    filename = "%s.tmp" % m.hexdigest()
    filename = os.path.join(tempfile.gettempdir(), filename)
    if not os.path.exists(filename):
        with open(filename, 'wb') as f:
            f.write(content)
    return filename


def get_api_js(
    request,
    *args,
    base_view=APIBase,
    exclude_params=(),
    exclude_base_view_params=True,
    exclude_views=(),
    **kwargs
):
    return HttpResponse(get_api_doc(
        request=request,
        template_name='cool/views/api.js',
        base_view=base_view,
        exclude_params=exclude_params,
        exclude_base_view_params=exclude_base_view_params,
        exclude_views=exclude_views
    ), 'application/javascript; charset=utf-8', 200)
