# encoding: utf-8
from __future__ import absolute_import, unicode_literals

from django.conf.urls.static import static

"""meeting URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/dev/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf import settings
from django.urls import include
from django.conf.urls import url
from django.contrib import admin

from core import utils


api_patterns = [
    url(r'^wechat/', include("apps.wechat.views")),
    url(r'^meeting/', include("apps.meetings.views")),
]

urlpatterns = [
    url(r'^grappelli/', include('grappelli.urls')),
    url(r'^sysadmin/', admin.site.urls),
    url(r'^api/', include(api_patterns)),
]
if settings.DEBUG:
    urlpatterns.append(
        url(r'^api.js$', utils.generate_api_js)
    )
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
