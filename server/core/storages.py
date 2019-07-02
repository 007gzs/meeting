# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from django.core.files.storage import FileSystemStorage


class EnableUrlFileSystemStorage(FileSystemStorage):
    def url(self, name):
        if name.startswith("https://") or name.startswith("http://"):
            return name
        return super(EnableUrlFileSystemStorage, self).url(name)
