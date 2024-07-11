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
from importlib import import_module
from typing import Callable, Optional

from flask import Flask, current_app, request
from flask_babel import Babel
from flask_cors import CORS
from flask_mailman import Mail
from flask_misaka import Misaka
from werkzeug.wrappers import Request, Response

from edusign_webapp.api_client import APIClient
from edusign_webapp.doc_store import DocStore


def get_locale():
    """
    get locale, from cookie or from config
    """
    if 'lang' in request.cookies:
        return request.cookies.get('lang')
    return request.accept_languages.best_match(app.config.get('SUPPORTED_LANGUAGES'))


class EduSignApp(Flask):
    """
    Edusign's Flask app, with blueprints with the views needed by the eduSign app.
    """

    def __init__(self, name: str, config: Optional[dict] = None, **kwargs):
        """
        :param name: Name for the Flask app
        """
        super().__init__(name, **kwargs)

        if not self.testing:
            self.url_map.host_matching = False

        CORS(self, origins=[])
        Misaka(self)

        self.config.from_object('edusign_webapp.config')
        if config is not None:
            self.config.update(config)

        self.extensions['api_client'] = APIClient(self.config)

        Babel(self, locale_selector=get_locale)

        self.extensions['doc_store'] = DocStore(self)

        self.extensions['mailer'] = Mail(self)

        if self.config['ENVIRONMENT'] == 'e2e':
            self.extensions['email_msgs'] = {}

        from edusign_webapp.views import admin_edusign_views, anon_edusign_views, edusign_views, edusign_api_views

        self.register_blueprint(admin_edusign_views)
        self.register_blueprint(anon_edusign_views)
        self.register_blueprint(edusign_views)
        self.register_blueprint(edusign_api_views)

        if self.config['APP_IN_TWO_PATHS']:
            from edusign_webapp.views import edusign_views2

            self.register_blueprint(edusign_views2)


def edusign_init_app(name: str, config: Optional[dict] = None) -> EduSignApp:
    """
    Create an instance of EduSignApp.
    This will a few facilities to the app instance as attributes:
    * api_client: an instance of the ApiClient class, to communicate with the API.
    * babel: flask-babel instance for internationalization
    * doc_store: an instance of the DocStore class, to manage invitations to sign
    * mailer: an instance of flask-mail, for sending emails

    :param name: Name for the Flask app
    :param config: To update the config, mainly used in tests
    :return: The Flask app.
    """
    if config is not None:
        app = EduSignApp(name, config)
    else:
        app = EduSignApp(name)

    to_tear_down = app.config['TO_TEAR_DOWN_WITH_APP_CONTEXT']
    for func_path in to_tear_down:
        module_path, func_name = func_path.rsplit('.', 1)
        func = getattr(import_module(module_path), func_name)

        app.teardown_appcontext(func)

    app.logger.info(f'Init {name} app...')

    return app


app: EduSignApp = edusign_init_app('edusign')


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


@app.before_request
def set_cookie_path():
    segment1 = request.path.split('/')[1]
    current_app.config["SESSION_COOKIE_PATH"] = f"/{segment1}"
    current_app.logger.debug(f"SESSION COOKIE PATH set to {segment1} from {request.path}")


if __name__ == '__main__':
    app.logger.info('Starting edusign app...')

    if app.config['DEBUG']:
        app.wsgi_app = LoggingMiddleware(app.wsgi_app)  # type: ignore

    app.run()
