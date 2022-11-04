from base64 import b64decode, b64encode

import fitz
from flask import current_app


def _load_b64_pdf(b64_pdf):
    """
    Load to PyMuPDF a base64 encoding of a PDF document
    """
    if ',' in b64_pdf:
        b64_pdf = b64_pdf.split(',')[1]

    b64_bytes = b64_pdf.encode('ascii')
    pdf_bytes = b64decode(b64_bytes)
    return fitz.open(stream=pdf_bytes, filetype='application/pdf')


def has_pdf_form(b64_pdf):
    """
    Check that the provided PDF contains a form.
    """
    doc = _load_b64_pdf(b64_pdf)
    return doc.is_form_pdf


def update_pdf_form(b64_pdf, fields):
    """
    Fill in the PDF form in the provided PDF
    with the values given in the fields param.
    """
    doc = _load_b64_pdf(b64_pdf)
    for page in doc:
        for field in page.widgets():
            for f in fields:
                current_app.logger.warn(f"Field name: {field.field_name}")
                if field.field_name == f['name']:
                    field.field_value = f['value']
                    field.field_flags = fitz.PDF_FIELD_IS_READ_ONLY
                    field.update()
                    break

    doc_bytes = doc.tobytes()
    newpdf = b64encode(doc_bytes)
    doc.save('/tmp/filled.pdf')
    return newpdf
