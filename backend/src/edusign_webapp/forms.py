import os.path
from base64 import b64decode, b64encode
from tempfile import TemporaryDirectory

import fitz
from flask import current_app
from ocrmypdf import ocr
from ocrmypdf.pdfa import file_claims_pdfa


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
        radio = {}
        for field in page.widgets():
            for f in fields:
                if field.field_name == f['name']:
                    if field.field_type == 2:  # checkbox
                        field.field_value = True if f['value'] == 'on' else False
                    elif field.field_type == 5:  # radio button
                        if field.field_name in radio:
                            radio[field.field_name] += 1
                        else:
                            radio[field.field_name] = 1
                        if radio[field.field_name] == f['value']:
                            field.field_value = True
                    else:
                        field.field_value = f['value']

                    break

            field.field_flags = fitz.PDF_FIELD_IS_READ_ONLY
            field.update()

    orig_doc = _load_b64_pdf(b64_pdf)

    try:
        doc = try_pdfa(orig_doc, doc)
    except Exception as e:
        current_app.logger.info(f"Problem ensuring PDF/A: {e}")

    doc_bytes = doc.tobytes()
    newpdf = b64encode(doc_bytes)
    return newpdf


def try_pdfa(orig_doc, doc):
    with TemporaryDirectory() as dirname:
        orig_fname = os.path.join(dirname, 'orig.pdf')
        orig_doc.save(orig_fname)
        if file_claims_pdfa(orig_fname):
            fname = os.path.join(dirname, 'filled.pdf')
            doc.save(fname)
            fname_a = os.path.join(dirname, 'filled-a.pdf')
            ocr(input_file=fname, output_file=fname_a, output_type='pdfa', skip_text=True)
            new_doc = fitz.open(fname_a)
            return new_doc
    return doc
