# -*- coding: utf-8 -*-
#
# Copyright (c) 2021 SUNET
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
import json
import os

import yaml


def test_config(client):
    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    response = client.get('/sign/config')

    assert response.status == '200 OK'

    data = json.loads(response.data)

    assert data['payload']['signer_attributes']['name'] == "Tëster Kid"
    assert data['payload']['signer_attributes']['mail'] == "tester@example.org"
    assert data['payload']['signer_attributes']['eppn'] == "dummy-eppn@example.org"


def test_config_custom(client_custom):
    config_dict = {'https://idp': {'send_signed': True, 'skip_final': True}}

    custom_yaml = '/tmp/edusign-forms.yaml'
    with open(custom_yaml, 'w') as f:
        f.write(yaml.dump(config_dict))

    response1 = client_custom.get('/sign/')

    assert response1.status == '200 OK'

    response = client_custom.get('/sign/config')

    assert response.status == '200 OK'

    data = json.loads(response.data)

    assert data['payload']['ui_defaults']['skip_final']
    assert data['payload']['ui_defaults']['send_signed']

    os.unlink(custom_yaml)


def test_no_config_custom(client_custom):
    config_dict = {'https://idp2': {'send_signed': True, 'skip_final': True}}

    custom_yaml = '/tmp/edusign-forms.yaml'
    with open(custom_yaml, 'w') as f:
        f.write(yaml.dump(config_dict))

    response1 = client_custom.get('/sign/')

    assert response1.status == '200 OK'

    response = client_custom.get('/sign/config')

    assert response.status == '200 OK'

    data = json.loads(response.data)

    assert not data['payload']['ui_defaults']['skip_final']
    assert not data['payload']['ui_defaults']['send_signed']

    os.unlink(custom_yaml)
