"""
Fake eduSign API and sign service for the local development environment.

Implements the subset of the eduSign API that the backend's api_client.py
uses (prepare, create, process), the validator's issue-svt, and a stand-in
for the sign service's user-facing step. Documents come back byte-identical,
with no signature: "signed" and "validated" are UI states only. All state is
in memory and lost on restart.

See docker/dev-env-notes.md for the contract.
"""

import os
import time
import uuid
from base64 import b64encode

from flask import Flask, Response, jsonify, request

app = Flask(__name__)

# Where the browser reaches this service, through the dev nginx.
SIGN_BASE_URL = os.environ.get('FAKE_SIGN_BASE_URL', 'http://sp.edusign.docker')

# content reference -> {'content': base64 str, 'mimeType': str}
prepared = {}
# relayState -> {'returnUrl': str, 'documents': [{'id', 'content', 'mimeType'}]}
sign_requests = {}


@app.post('/v1/prepare/<profile>')
def prepare(profile):
    """Store the PDF under a new reference; the backend asks for a reference."""
    data = request.get_json()
    ref = str(uuid.uuid4())
    prepared[ref] = {'content': data['pdfDocument'], 'mimeType': 'application/pdf'}
    return jsonify({'updatedPdfDocumentReference': ref, 'visiblePdfSignatureRequirement': {}})


@app.post('/v1/create/<profile>')
def create(profile):
    """Remember the documents and the return URL under a new relayState."""
    data = request.get_json()
    documents = []
    for doc in data['tbsDocuments']:
        if 'contentReference' in doc:
            stored = prepared[doc['contentReference']]
            documents.append({'id': doc['id'], 'content': stored['content'], 'mimeType': stored['mimeType']})
        else:
            documents.append({'id': doc['id'], 'content': doc['content'], 'mimeType': doc['mimeType']})
    relay_state = str(uuid.uuid4())
    sign_requests[relay_state] = {'returnUrl': data['returnUrl'], 'documents': documents}
    return jsonify(
        {
            'relayState': relay_state,
            'signRequest': b64encode(b'<fake-sign-request/>').decode(),
            'binding': 'POST/XML/1.0',
            'destinationUrl': f'{SIGN_BASE_URL}/fake-sign/{relay_state}',
        }
    )


@app.post('/fake-sign/<relay_state>')
def fake_sign(relay_state):
    """
    The browser posts the sign request here, as it would to the sign service.
    Answer a page that posts the "sign response" straight back to the app.
    """
    if relay_state not in sign_requests:
        return Response('Unknown relay state', status=404, mimetype='text/plain')
    return_url = sign_requests[relay_state]['returnUrl']
    sign_response = b64encode(b'<fake-sign-response/>').decode()
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Fake sign service</title></head>
<body onload="document.forms[0].submit()">
<p>Signing with the fake sign service...</p>
<form method="post" action="{return_url}">
<input type="hidden" name="EidSignResponse" value="{sign_response}">
<input type="hidden" name="RelayState" value="{relay_state}">
<noscript><button type="submit">Continue</button></noscript>
</form>
</body></html>"""
    return Response(page, mimetype='text/html')


@app.post('/v1/process')
def process():
    """Hand back the documents of the relayState as "signed"."""
    data = request.get_json()
    sign_request = sign_requests.get(data['relayState'])
    if sign_request is None:
        return jsonify({'errorCode': 'unknown-relay-state', 'message': 'Unknown relay state'})
    return jsonify(
        {
            'signedDocuments': [
                {'id': doc['id'], 'signedContent': doc['content'], 'mimeType': doc['mimeType']}
                for doc in sign_request['documents']
            ],
            'signerAssertionInformation': {'authnInstant': int(time.time() * 1000)},
        }
    )


@app.post('/issue-svt')
def issue_svt():
    """The validator: a 200 with the document unchanged marks it validated."""
    return Response(request.get_data(), status=200, mimetype=request.content_type or 'application/octet-stream')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
