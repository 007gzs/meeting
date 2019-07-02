# encoding: utf-8
from __future__ import absolute_import, unicode_literals
import os
from celery import Celery, signals
from django.utils.log import configure_logging


# set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'meeting.settings')


def configure_logger(conf=None, **kwargs):
    from django.conf import settings
    configure_logging(settings.LOGGING_CONFIG, settings.LOGGING)


signals.worker_process_init.connect(configure_logger)
signals.beat_init.connect(configure_logger)

app = Celery('meeting')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()


@app.task(bind=True)
def _async_call(self, func, args, kwargs):
    return func(*args, **kwargs)


def async_call(func, *args, **kwargs):
    return _async_call.apply_async((func, args, kwargs), time_limit=3600, soft_time_limit=3600)
