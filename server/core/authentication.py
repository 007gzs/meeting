# encoding: utf-8
from rest_framework.authentication import SessionAuthentication


class SessionAuthenticationWithOutCSRF(SessionAuthentication):

    def enforce_csrf(self, request):
        pass
