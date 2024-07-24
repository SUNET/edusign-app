# Configuration for the metadata endpoint


MD_ENTITY_ID::
    EntityID of the service
    default="https://edusign.sunet.se/shibboleth")

MD_ENTITY_CATEGORIES::
    Entity categories the SP adheres to
    default="http://www.geant.net/uri/dataprotection-code-of-conduct/v1,https://refeds.org/category/code-of-conduct/v2,http://refeds.org/category/research-and-scholarship"

MD_DISPLAY_NAMES::
    mdui:UIInfo display names
    default="sv,SUNET eduSIGN - tjänst för e-signaturer;en,SUNET eduSIGN Service"

MD_DESCRIPTIONS::
    mdui:UIInfo descriptions
    default="sv,SUNET eduSIGN gör det enkelt att arbeta med e-signaturer;en,SUNET eduSIGN Service makes it easy to electronically sign documents"

MD_INFORMATION_URLS::
    mdui:UIInfo information urls
    default="sv,https://www.sunet.se/services/sakerhet/edusign/;en,https://www.sunet.se/services/sakerhet/edusign/"

MD_PRIVACY_STATEMENT_URLS::
    mdui:UIInfo statement urls
    default="sv,https://wiki.sunet.se/display/info/eduSign+Privacy+Policy?showLanguage=sv_SE;en,https://wiki.sunet.se/display/info/eduSign+Privacy+Policy?showLanguage=en_GB"

MD_SHIBBOLETH_LOCATION::
    Prefix for the shibboleth endpoints
    default="https://edusign.sunet.se/Shibboleth.sso"

MD_SIGNING_CERTIFICATE::
    public key for signing certificate
    default: the key for the service at edusign.sunet.se

MD_ENCRYPTION_CERTIFICATE::
    public key for encryption certificate
    default: the key for the service at edusign.sunet.se

MD_SERVICE_NAMES::
    Attribute consuming service - service names
    default="sv,SUNET eduSIGN - tjänst för e-signaturer;en,SUNET eduSIGN Service"

MD_ATTRIBUTES::
    Attribute consuming service - Required attributes
    default='eduPersonPrincipalName,urn:oid:1.3.6.1.4.1.5923.1.1.1.6;sn,urn:oid:2.5.4.4;givenName,urn:oid:2.5.4.42;displayName,urn:oid:2.16.840.1.113730.3.1.241;eduPersonAssurance,urn:oid:1.3.6.1.4.1.5923.1.1.1.11;mail,urn:oid:0.9.2342.19200300.100.1.3;mailLocalAddress,urn:oid:2.16.840.1.113730.3.1.13',

MD_ORGANIZATION_NAMES::
    Organization - organization names
    default="sv,Vetenskapsrådet;en,The Swedish Research Council"

MD_ORGANIZATION_DISPLAY_NAMES::
    Organization - display names
    default="sv,Sunet;en,Sunet"

MD_ORGANIZATION_URLS::
    Organization - urls
    default="sv,https://www.sunet.se;en,https://www.sunet.se"

MD_TECHNICAL_CONTACT_NAME::
    Contact name, technical
    default="SUNET"

MD_TECHNICAL_CONTACT_EMAIL::
    Contact email, technical
    default="mailto:noc@sunet.se"

MD_ADMINISTRATIVE_CONTACT_NAME::
    Contact name, administrative
    default="SUNET"

MD_ADMINISTRATIVE_CONTACT_EMAIL::
    Contact email, administrative
    default="mailto:noc@sunet.se"

MD_SUPPORT_CONTACT_NAME::
    Contact name, support
    default="SUNET"

MD_SUPPORT_CONTACT_EMAIL::
    Contact email, support
    default="mailto:noc@sunet.se"

MD_SECURITY_CONTACT_NAME::
    Contact name, security
    default="SUNET"

MD_SECURITY_CONTACT_EMAIL::
    Contact email, security
    default="mailto:cert@cert.sunet.se"
