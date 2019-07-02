# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from core import utils

from . import models

utils.site_register(models.User, editable=False, addable=False, changeable=False)
