# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from rest_framework import renderers


class PlainHtmlRenderer(renderers.BaseRenderer):
    media_type = 'text/html'
    format = 'html'

    def render(self, data, media_type=None, renderer_context=None):
        return data.encode(self.charset)


class PlainTextRenderer(renderers.BaseRenderer):
    media_type = 'text/plain'
    format = 'txt'

    def render(self, data, media_type=None, renderer_context=None):
        if not isinstance(data, str):
            data = str(data)
        return data.encode(self.charset)
