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
from importlib import import_module
from typing import Optional

from flask import Flask, request
from flask_babel import Babel
from flask_cors import CORS
from flask_mail import Mail
from flask_misaka import Misaka
import redis
from rq import Worker, Queue, Connection

from edusign_webapp.api_client import APIClient
from edusign_webapp.doc_store import DocStore


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

    def is_whitelisted(self, eppn: str) -> bool:
        """
        Check whether a given email address is whitelisted for starting sign processes

        :param eppn: the eduPersonPrincipalName
        :return: whether it is whitelisted
        """
        if eppn in self.config['USER_BLACKLIST']:
            return False

        elif eppn in self.config['USER_WHITELIST']:
            return True

        return eppn.split('@')[1] in self.config['SCOPE_WHITELIST']


def edusign_init_app(name: str, config: Optional[dict] = None) -> EduSignApp:
    """
    Create an instance of an edusign data app.

    :param name: Name for the Flask app
    :param config: To update the config, mainly used in tests
    :return: The Flask app.
    """
    app = EduSignApp(name)

    CORS(app, origins=[])
    Misaka(app)

    app.config.from_object('edusign_webapp.config')
    if config is not None:
        app.config.update(config)

    app.api_client = APIClient(app.config)

    app.babel = Babel(app)

    app.doc_store = DocStore(app)

    app.mailer = Mail(app)

    from edusign_webapp.views import anon_edusign_views, edusign_views

    app.register_blueprint(anon_edusign_views)
    app.register_blueprint(edusign_views)

    to_tear_down = app.config['TO_TEAR_DOWN_WITH_APP_CONTEXT']
    for func_path in to_tear_down:
        module_path, func_name = func_path.rsplit('.', 1)
        func = getattr(import_module(module_path), func_name)

        app.teardown_appcontext(func)

    app.logger.info(f'Init {name} app...')

    app.mail_queue = get_mail_queue()

    return app


redis_conn = None


def get_redis_conn():
    global redis_conn
    if redis_conn is None:
        from edusign_webapp import config
        redis_url = getattr(config, 'REDIS_URL', 'redis://localhost:6379/0')
        redis_conn = redis.from_url(redis_url)

    return redis_conn


def get_mail_queue():
    redis_conn = get_redis_conn()
    mail_queue = Queue(connection=redis_conn)
    return mail_queue


app = edusign_init_app('edusign')


@app.babel.localeselector
def get_locale():
    """
    get locale, from cookie or from config
    """
    if 'lang' in request.cookies:
        return request.cookies.get('lang')
    return request.accept_languages.best_match(app.config.get('SUPPORTED_LANGUAGES'))
