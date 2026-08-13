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
"""
Tests for the personnummer comparison used by the BankID/Freja eID flow.
"""

import pytest

from edusign_webapp.validators import ssns_match


@pytest.mark.parametrize(
    "invited, asserted, match",
    [
        # the IdP returns 12 digits; the invite form may store any of these
        ('199001019876', '199001019876', True),   # same 12-digit
        ('9001019876', '199001019876', True),      # invite 10-digit, assertion 12-digit
        ('19900101-9876', '199001019876', True),   # invite 12-digit hyphenated
        ('900101-9876', '199001019876', True),     # invite 10-digit hyphenated
        ('199001019876', '9001019876', True),      # (defensive) assertion 10-digit
        (' 199001019876 ', '199001019876', True),  # stray spaces
        # genuine mismatches must still be rejected
        ('199001019876', '199001019875', False),   # different check digit
        ('189001019876', '199001019876', False),   # same YYMMDDNNNN, different century (both 12)
        ('199001019876', '198512121212', False),
    ],
)
def test_ssns_match(invited, asserted, match):
    assert ssns_match(invited, asserted) is match
