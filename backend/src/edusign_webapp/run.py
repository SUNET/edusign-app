#
# Copyright (c) 2020 SUNET
# All rights reserved.
#
#   Redistribution and use in source and binary forms, with or
#   without modification, are permitted provided that the following
#   conditions are met:
#
#     1. Redistributions of source code must retain the above copyright
#        notice, this list of conditions and the following disclaimer.
#     2. Redistributions in binary form must reproduce the above
#        copyright notice, this list of conditions and the following
#        disclaimer in the documentation and/or other materials provided
#        with the distribution.
#     3. Neither the name of the SUNET nor the names of its
#        contributors may be used to endorse or promote products derived
#        from this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
# FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
# COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
# INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
# BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
# LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
# ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
#
import pprint
from typing import Callable

from flask import Flask
from flask_babel import Babel
from werkzeug.wrappers import Response

from edusign_webapp.api_client import APIClient


class EduSignApp(Flask):
    """
    Edusign's Flask app, with blueprint with the views needed by the eduSign app.
    """

    def __init__(self, name: str, **kwargs):
        """
        :param name: Name for the Flask app
        """
        super().__init__(name, **kwargs)

        if not self.testing:
            self.url_map.host_matching = False

        from edusign_webapp.views import edusign_views

        self.register_blueprint(edusign_views)

        self.config.from_object('edusign_webapp.config')

        self.api_client = APIClient(self.config)

        self.babel = Babel(self)

    def is_whitelisted(self, address: str) -> bool:
        """
        Check whether a given email address is whitelisted for starting sign processes

        :param address: the email address
        :return: whether it is whitelisted
        """
        return address.split('@')[1] in self.config['SCOPE_WHITELIST']


def edusign_init_app(name: str) -> EduSignApp:
    """
    Create an instance of an edusign data app.

    :param name: Name for the Flask app
    :return: The Flask app.
    """
    app = EduSignApp(name)

    app.logger.info(f'Init {name} app...')

    return app


app = edusign_init_app('edusign')


class LoggingMiddleware(object):
    """
    Flask middleware to log every request and response,
    activated in debug mode.
    """

    def __init__(self, app: EduSignApp):
        """
        :param app: The Flask app
        """
        self._app = app

    def __call__(self, env: dict, resp: Callable) -> Response:
        """
        WSGI Call.

        :param env: the WSGI environ
        :param resp: The WSGI start_response callback
        :return: Response
        """
        errorlog = env['wsgi.errors']
        pprint.pprint(('REQUEST', env), stream=errorlog)

        def log_response(status, headers, *args):
            pprint.pprint(('RESPONSE', status, headers), stream=errorlog)
            return resp(status, headers, *args)

        return self._app(env, log_response)


if __name__ == '__main__':
    app.logger.info('Starting edusign app...')

    if app.config['DEBUG']:
        app.wsgi_app = LoggingMiddleware(app.wsgi_app)  # type: ignore

    app.run()
