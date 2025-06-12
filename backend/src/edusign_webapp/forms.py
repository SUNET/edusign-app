import os.path
from base64 import b64decode
from tempfile import TemporaryDirectory

import fitz
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
