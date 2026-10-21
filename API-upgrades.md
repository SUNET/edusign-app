
# API upgrades

This guide lists the changes to the API described in `API.md` that
require changes in client apps, by eduSign version. Each section tells
what changed, what a client has to do, and how to detect a client that
has not been updated.

The version of an eduSign release is the `version` in `backend/setup.py`
and in `frontend/package.json`, kept in step by `tbump.toml`.

## Version 1.5.2

### `payload.invite_key` is required in `create-sign-request`

The endpoint `/api/v1/create-sign-request` shares its request schema with
the eduSign web app, which gained a key `invite_key` in the payload to
tell signatures of invitations through an eID apart. The key is required
by the schema, so a request without it fails validation. For now the value
should be the empty string, this is in preparation to adding
the ability to send invitations to sign.

What to do: add `"invite_key": ""` to the `payload` object. The value is
aat this point always the empty string for API clients. Example:

```json
    {
      "api_key": "...",
      "personal_data": { "..." : "..." },
      "payload": {
        "documents": {
          "invited": [],
          "owned": [],
          "local": [ { "..." : "..." } ]
        },
        "invite_key": ""
      }
    }
```

How a missing key shows: the API answers with HTTP 200 and the generic
error document

```json
    {
        "error": true,
        "message": "There was an error. Please try again, or contact the site administrator."
    }
```

and the backend log has a line `Errors Unmarshaling data:` naming
`invite_key`.

### No other changes

The request and response bodies of `/api/v1/get-signed` are unchanged.
The `personal_data` object is unchanged for both endpoints.
