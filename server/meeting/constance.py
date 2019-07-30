# encoding: utf-8
from __future__ import absolute_import, unicode_literals

import datetime
from collections import OrderedDict


CONSTANCE_CONFIG = OrderedDict((
    ('IS_PRODUCTION', (False, '是否生产环境')),
    ('RESERVE_START_TIME', (datetime.time(7, 0), '预约起始时间')),
    ('RESERVE_END_TIME', (datetime.time(22, 30), '预约结束时间')),
    ('SELECT_DATE_DAYS', (19, '日期选项今天之后可选天数')),
))
