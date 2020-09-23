# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from cool.core import Constants


class DeleteCode(Constants):
    NORMAL = (False, '正常')
    DELETED = (True, '已经删除')


class ChangeLogStatusCode(Constants):
    PROCESSING = (0, '处理中')
    SUCCESS = (10, '成功')
    FAIL = (11, '失败')
