********
Commands
********

.. contents:: Table of Contents


Set up the environment::

    >>> from rex.core import Rex
    >>> from webob import Request
    >>> rex = Rex('rex.i18n', i18n_supported_locales=['en', 'fr', 'fil'])
    >>> rex.on()

Make sure all the Commands are available::

    >>> from rex.web import Command
    >>> for signature, impl in Command.mapped().items():
    ...     if signature.startswith('i18n'):
    ...         print '%s: %s' % (signature, impl)
    i18n_cldr_common: rex.i18n.commands.GetLocaleCommonCommand
    i18n_cldr_locale: rex.i18n.commands.GetLocaleDetailCommand
    i18n_switch_locale: rex.i18n.commands.SwitchLocaleCommand
    i18n_locales: rex.i18n.commands.GetActiveLocalesCommand
    i18n_translations: rex.i18n.commands.GetTranslationsCommand


SwitchLocale
============

This command requires that you provide a ``locale`` parameter::

    >>> req = Request.blank('/switch')
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    400 Bad Request
    ...

When you provide a valid ``locale`` parameter, it will redirect you to the root
of the current server::

    >>> req = Request.blank('/switch', method='POST')
    >>> req.POST['locale'] = 'fr'
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    302 Found
    X-RexI18N-Locale: fr
    ...
    Location: http://localhost/
    ...

If you provide a locale that is not registered in the
``i18n_supported_locales`` setting, you get an error::

    >>> req = Request.blank('/switch', method='POST')
    >>> req.POST['locale'] = 'es'
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    400 Bad Request
    ...

You can provide a ``redirect`` parameter to tell it where to redirect you to::

    >>> req = Request.blank('/switch', method='POST')
    >>> req.POST['locale'] = 'fr'
    >>> req.POST['redirect'] = 'http://google.com'
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    302 Found
    X-RexI18N-Locale: fr
    ...
    Location: http://google.com
    ...

If you don't provide a ``redirect`` parameter, it will send you back to the URL
noted in your Referer header::

    >>> req = Request.blank('/switch', method='POST', referer='http://yahoo.com')
    >>> req.POST['locale'] = 'fr'
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    302 Found
    X-RexI18N-Locale: fr
    ...
    Location: http://yahoo.com
    ...

In addition to POST, this Command can operate via GET::

    >>> req = Request.blank('/switch?locale=fr&redirect=http://google.com')
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    302 Found
    X-RexI18N-Locale: fr
    ...
    Location: http://google.com
    ...


GetTranslations
===============

The GetTranslations command will return the JSON-ified gettext configuration
for the "frontend" domain for the given locale::

    >>> req = Request.blank('/translations/en')
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    200 OK
    Content-type: application/json
    Content-Length: ...
    Set-Cookie: ...
    <BLANKLINE>
    {"frontend": {"": {"lang": "en", "domain": "frontend", "plural_forms": "nplurals=2; plural=(n != 1)"}}}

If you specify a locale that is not configured in the system, you will receive
a 400 error::

    >>> req = Request.blank('/translations/ar')
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    400 Bad Request
    ...


GetLocaleCommon
===============

The GetLocaleCommon command will return a JSON array containing the common
portions of the CLDR data used by all locales::

    >>> req = Request.blank('/locale')
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    200 OK
    Content-type: application/json
    Content-Length: ...
    Set-Cookie: ...
    <BLANKLINE>
    ...


GetLocaleDetail
===============

The GetLocaleDetail command will return a JSON array containing the
locale-specific portions of the CLDR data::

    >>> req = Request.blank('/locale/en')
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    200 OK
    Content-type: application/json
    Content-Length: ...
    Set-Cookie: ...
    <BLANKLINE>
    ...

If you specify a locale that is not configured in the system, you will receive
a 400 error::

    >>> req = Request.blank('/locale/ar')
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    400 Bad Request
    ...

If you specify a locale that *is* configured in the system, but does not have
CLDR data available, you will receive the CLDR data for English::

    >>> req = Request.blank('/locale/fil')
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    200 OK
    Content-type: application/json
    Content-Length: ...
    Last-Modified: ...
    Set-Cookie: ...
    <BLANKLINE>
    [{
      "main": {
        "en": {
    ...


GetActiveLocales
================

The GetActiveLocales command will return a JSON object containing the
locales supported by the application::

    >>> req = Request.blank('/locale/active')
    >>> print req.get_response(rex)  # doctest: +ELLIPSIS
    200 OK
    Content-type: application/json
    Content-Length: ...
    Set-Cookie: ...
    <BLANKLINE>
    {"active": "en", "default": "en", "available": [{"id": "en", "name": {"default": "English", "current": "English", "native": "English"}}, {"id": "fr", "name": {"default": "French", "current": "French", "native": "français"}}, {"id": "fil", "name": {"default": "Filipino", "current": "Filipino", "native": "Filipino"}}]}



    >>> rex.off()

