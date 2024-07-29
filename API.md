
# API

## Signing a document

To sign a document, an external app has to take 3 steps:

1. Create sign request using this API
2. Use sign request to sign the document via the sign service
3. Use the sign response obtained from the sign service to retrieve the signed document via this API

### Create sign request

POST to `/api/v1/create-sign-request` with a JSON body with the form of the following example:

```json
    {
      "api_key": "dummy",
      "personal_data": {
        "idp": "https://login.idp.eduid.se/idp.xml",
        "display_name": "ENRIQUE PABLO PEREZ ARNAUD",
        "mail": ["enrique@cazalla.net"],
        "authn_context": "https://refeds.org/profile/mfa",
        "organization": "eduID Sweden",
        "assurance": ["http://www.swamid.se/policy/assurance/al1"],
        "registration_authority": "http://www.swamid.se/",
        "saml_attr_schema": "20",
        "return_url": "https://dev.drive.sunet.se/edusign-test-api-callback",
        "authn_attr_name": "urn:oid:1.3.6.1.4.1.5923.1.1.1.6",
        "authn_attr_value": "pugoj-hutat@eduid.se",
      },
      "payload": {
        "documents": {
          "invited": [],
          "owned": [],
          "local": [
            {
              "name": "test.pdf",
              "size": "1503",
              "type": "application/pdf",
              "key": "ca954d99-29c9-405f-ae35-ddd93e61f00d",
              "blob": "data:application/pdf;base64,JVBERi0xLjQKJZOMi [...] CjEwNzYKJSVFT0YK"
            }
          ]
        }
      }
    }
```

An example curl request (setting the above JSON in a file `create.json`):

```bash
  $ curl --data '@create.json' -H "Content-type: application/json" -H "Accept: application/json" -X POST https://dev.edusign.sunet.se/api/v1/create-sign-request
```

Keys in the JSON sent to the `create-sign-request` endpoint:

- `api_key`: Secret shared between the API and the client app.
- `personal_data.idp`: entityID of the SAML IdP that the user will use to sign the document.
- `personal_data.display_name`: displayName of the signing party in the IdP, provided in the AttributeStatement in the SAML authentication assertion. It will be required to coincide with the attribute value in the SAML authn assertion for the signature.
- `personal_data.mail`: List of emails known to be controlled by the signing party. Used for communication with them.
- `personal_data.authn_context`: Authentication context class in the SAML authn assertion issued by the chosen IdP for the signing party. It will be required to be the same as the one in the authn assertion for the signature.
- `personal_data.organization`: String that will appear in the PDF in the image representation of the signature as reference to the signing party's organization.
- `personal_data.assurance`: eduPersonAssurance of the signing party in the IdP, provided in the AttributeStatement in the SAML authentication assertion. It will be used in the invitations to sign, in which the inviter can require an assurance level for the signatures, to check whether the invitee meets the requirement.
- `personal_data.registration_authority`: registrationAuthority in the SAML metadata of the chosen IdP. This is used in invitations to sign, in which the inviter can require an assurance level for the signatures. The inviter can specify low, medium, or high assurance, and depending on the registrationAuthority, these values are transated to actual assurance values.
- `personal_data.saml_attr_schema`: Some (very few) IdPs do not release attributes in the SAML2.0 format (`urn:oid:` followed by some numbers) but in the SAML1.1 format (`urn:mace:dir:attribute-def:` followed by the friendly name of the attribute). If the chosen IdP releases the attributes in the SAML2.0 format, this key should be set as "20", otherwise it should be set as "11". This will almost always be "20".
- `personal_data.return_url`: URL in the app using the API to which the sign service will send the user once it has signed the document.
- `personal_data.authn_attr_name`: Attribute used as unique identifier of the signing party in the chosen IdP, provided in the AttributeStatement in the SAML authentication assertion. In the example we use the eppn, `urn:oid:1.3.6.1.4.1.5923.1.1.1.6`.
- `personal_data.authn_attr_name`: Value of the attribute used as unique identifier of the signing party in the chosen IdP, provided in the AttributeStatement in the SAML authentication assertion. It will be required to coincide with the attribute value in the SAML authn assertion for the signature.
- `payload.documents.local`: List of documents to be signed. Each document is characterized by the following keys:
  - `name`: Name of the document.
  - `type`: MIME type of the document. Either `application/pdf` or `application/xml`.
  - `size`: Size of document in bytes.
  - `key`: A unique identifier for the document.
  - `blob`: Contents of the document base64 encoded.
- `payload.documents.owned`: Reserved for future use when the API allows to make invitation to sign.
- `payload.documents.invited`: Reserved for future use when the API allows to make invitation to sign.


In case of success creating the sign request, the API will return JSON document with the form of the following example:

```json
    {
        "error": false,
        "payload": {
            "relay_state": "c289b5bc-67e7-4a9e-b633-a865293a3813",
            "sign_request": "PD94bWwgdmVyc2lvbj0iMS4w [...] lNpZ25SZXF1ZXN0Pg==",
            "binding": "POST/XML/1.0",
            "destination_url": "https://signservice.test.edusign.sunet.se/sign/idsectest/signrequest",
            "documents": [
                {
                    "key": "ca954d99-29c9-405f-ae35-ddd93e61f00d",
                    "name": "test.pdf"
                }
            ],
            "failed": [
            ]
        }
    }
```

Keys in the JSON response for a successful request:

- `error`: Whether this is an error or a success response.
- `payload.relay_state`: State to be relayed back to the sign service.
- `payload.sign_request`: The constructed sign request, this is a base64 encoded XML document.
- `payload.binding`: Binding, again to be relayed back to the sign service.
- `payload.destination_url`: Endpoint at the sign service to which the sign request must be sent to trigger the signing procedure.
- `payload.documents`: List of documents that have successfully been prepared for signing, identified by a name (`name`) and a unique identifier (`key`).
- `payload.failed`: List of documents that have failed to be prepared for signing, identified by a name (`name`) and a unique identifier (`key`).


In case of success creating the sign request, the API will return JSON document with the form of the following example:

```json
    {
        "error": true,
        "message": "There was an error signing docs: unsupported MIME type."
    }
```

Keys in the JSON response for a failed request:

- `error`: Whether this is an error or a success response.
- `massage`: Massage stating the reason for the failure.


### Using the sign request

To use the sign request produced in the previous step, the app needs to direct the user to the sign service, carrying the sign request.
At this point, the user has selected some document and requested the app to sign it, and the app has obtained a sign request to that effect.
So once the app has the sign request, it will send a response to the user, consisting on a page with a form that is to be POSTed to the sign service,
possibly automatically in the onload event for the page with the form.

The form has to be POSTed to the endpoint indicated in the key `payload.destination_url` of a successful request,
and must have a form as in the following example:

```html
    <?xml version='1.0' encoding='UTF-8'?>
    <!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.1//EN' 'http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd'>
    <html xmlns='http://www.w3.org/1999/xhtml' xml:lang='en'>
    <body onload='document.forms[0].submit()'>
      <noscript>
        <p><strong>Note:</strong> Since your browser does not support JavaScript,
        you must press the Continue button once to proceed.</p>
      </noscript>
      <form action='https://signservice.test.edusign.sunet.se/sign/idsectest/signrequest' method='post'>
        <div>
          <input type='hidden' name='Binding' value='POST/XML/1.0'/>
          <input type='hidden' name='RelayState' value='c289b5bc-67e7-4a9e-b633-a865293a3813'/>
          <input type='hidden' name='EidSignRequest' value='PD94bWwgdmVyc2lvbj0iMS4w [...] lNpZ25SZXF1ZXN0Pg=='/>
        </div>
        <noscript>
          <div>
            <input type='submit' value='Continue'/>
          </div>
        </noscript>
      </form>
    </body>
```

- The form action must point to the endpoint indicated in the `payload.destination_url` key of the JSON response to a successful request for a sign request.
- The fields in the form must carry the values provided as `payload.binding`, `payload.relay_state` and `payload.sign_request` in the said JSON response.

Once the sign service receives such a POST request, it will redirect the user to the chosen IdP, where the user will authenticate themself.
If the data in the resulting authentication assertion from the IdP matches what the sign service expects, according to the data present in the sign request,
the sign service will use the assertion to sign the document.
It will keep the signed document, and finalize the procedure by providing the user with a form, to be POSTed to the endpoint in the app
that was specified as `personal_data.return_url` in the request to construct the sign request. This form will be similar to the following example:

```html
    <?xml version='1.0' encoding='UTF-8'?>
    <!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.1//EN' 'http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd'>
    <html xmlns='http://www.w3.org/1999/xhtml' xml:lang='en'>
    <body onload='document.forms[0].submit()'>
      <noscript>
        <p><strong>Note:</strong> Since your browser does not support JavaScript,
        you must press the Continue button once to proceed.</p>
      </noscript>
      <form action='https://dev.drive.sunet.se/edusign-test-api-callback' method='post'>
        <div>
          <input type='hidden' name='Binding' value='POST/XML/1.0'/>
          <input type='hidden' name='RelayState' value='2f725211-d572-4979-8fd4-678918136103'/>
          <input type='hidden' name='EidSignResponse' value='PD94bWwgdmV [...] c3BvbnNlPg=='/>
        </div>
        <noscript>
          <div>
            <input type='submit' value='Continue'/>
          </div>
        </noscript>
      </form>
    </body>
```

So the endpoint that receives this last POST will obtain the sign response (a base64 encoded XML document) resulting from the sign request.


### Obtaining the signed document.

Once the app has the sign response, it can use it to retrieve the signed document from the API.
To achieve that, it has to POST to `/api/v1/get-signed` with a JSON body with the form of the following example:

```json
    {
      "api_key": "dummy",
      "personal_data": {
        "idp": "https://login.idp.eduid.se/idp.xml",
        "eppn": "pugoj-hutat@eduid.se",
        "display_name": "ENRIQUE PABLO PEREZ ARNAUD",
        "mail": ["enrique@cazalla.net"],
        "authn_context": "https://refeds.org/profile/mfa",
        "organization": "eduID Sweden",
        "assurance": ["http://www.swamid.se/policy/assurance/al1"],
        "registration_authority": "http://www.swamid.se/",
        "saml_attr_schema": "20",
        "return_url": "https://dev.drive.sunet.se/edusign-test-api-callback"
      },
      "payload": {
        "sign_response": "PD94bWwgdmV [...] c3BvbnNlPg==",
        "relay_state": "2f725211-d572-4979-8fd4-678918136103"
      }
    }
```

The response from the API will have the form of the following example:

```json
    {
        "error": false,
        "payload": {
            "documents": [
                {
                    "id": "ca954d99-29c9-405f-ae35-ddd93e61f00d",
                    "signed_content": "JVBERi0xLjQKJZOMi [...] CjEwNzYKJSVFT0YK",
                    "validated": true,
                    "pprinted": "[...]"
                }
            ]
        }
    }
```

For each signed document, the keys in the response are:

- `id`: unique identifier for the document.
- `signed_content`: the base64 encoded signed document.
- `validated`: whether the document has been validated by the validator configured in the API.
- `pprinted`: In the case of an XML document, this key carries an HTML representation of the document.

In case of error, the response from the API would be someting like:

```json
    {
        "error": true,
        "message": "User identity does not match requested identity attributes"
    }
```
