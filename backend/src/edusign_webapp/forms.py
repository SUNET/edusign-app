from base64 import b64decode, b64encode

import fitz


def _load_b64_pdf(b64_pdf):
    """
    Load to PyMuPDF a base64 encoding of a PDF document
    """
    if ',' in b64_pdf:
        b64_pdf = b64_pdf.split(',')[1]

    b64_bytes = b64_pdf.encode('ascii')
    pdf_bytes = b64decode(b64_bytes)
    return fitz.open(stream=pdf_bytes, filetype='application/pdf')


def get_pdf_form(b64_pdf):
    """
    Check that the provided PDF contains a form,
    and if so, inspect it and extract the schema.
    """
    doc = _load_b64_pdf(b64_pdf)
    nfields = doc.is_form_pdf
    fields = []
    if nfields:
        for page in doc:
            for field in page.widgets():
                fields.append({
                    'name': field.field_name,
                    'label': field.field_label,
                    'value': field.field_value,
                    'type': field.field_type,
                    'choices': field.choice_values,
                })
    return fields


def update_pdf_form(b64_pdf, fields):
    """
    Fill in the PDF form in the provided PDF
    with the values given in the fields param.
    """
    doc = _load_b64_pdf(b64_pdf)
    for page in doc:
        for field in page.widgets():
            for f in fields:
                if field.field_name == f['name']:
                    field.field_value = f['value']
                    break

    newpdf = b64encode(doc.stream)
    return newpdf
