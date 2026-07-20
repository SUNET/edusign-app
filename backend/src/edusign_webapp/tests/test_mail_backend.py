# -*- coding: utf-8 -*-
#
# Copyright (c) 2026 SUNET
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
from unittest import mock

from edusign_webapp.mail_backend import ParallelEmailBackend
from edusign_webapp.utils import compose_message


def _get_connection(app):
    return app.extensions['mailer'].get_connection(backend=ParallelEmailBackend)


def _get_message(recipient='recipient@example.org'):
    return compose_message([recipient], 'Test subject', 'text body', '<p>html body</p>')


def test_send_no_messages(app):
    _, app = app
    with app.test_request_context():
        conn = _get_connection(app)
        assert conn.send_messages_in_parallel([]) == 0


def test_send_no_connection(app):
    _, app = app
    with app.test_request_context():
        conn = _get_connection(app)
        msg = _get_message()
        with mock.patch.object(conn, 'open', return_value=None):
            assert conn.send_messages_in_parallel([msg]) == 0


def test_send_messages_in_parallel(app):
    _, app = app
    with app.test_request_context():
        conn = _get_connection(app)
        msgs = [_get_message(), _get_message('recipient2@example.org')]

        sent = []

        def fake_open():
            conn.connection = object()
            return True

        with mock.patch.object(conn, 'open', side_effect=fake_open):
            with mock.patch.object(conn, '_send', side_effect=sent.append):
                with mock.patch.object(conn, 'close'):
                    result = conn.send_messages_in_parallel(msgs)

        assert len(sent) == 2
        done, pending = result
        assert len(done) == 2
        assert len(pending) == 0
