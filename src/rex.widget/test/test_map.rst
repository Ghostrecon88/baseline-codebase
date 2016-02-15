Test rex.widget.map
===================

::

  >>> from webob import Request, Response
  >>> from rex.core import Rex, SandboxPackage
  >>> from rex.widget import Widget, responder

  >>> class MappedWidget(Widget):
  ...     name = 'MappedWidget'
  ...     js_type = 'mapped-widget'
  ...
  ...     @responder()
  ...     def respond(self, req):
  ...         return Response(json='ok')

  >>> pkg = SandboxPackage('main')

  >>> pkg.rewrite('/urlmap/base.yaml', '''
  ... paths: {}
  ... ''')
  >>> pkg.rewrite('/urlmap.yaml', '''
  ... paths:
  ...   /w:
  ...     widget: !<MappedWidget>
  ...     access: anybody
  ... ''')

  >>> rex = Rex(pkg, '-', 'rex.widget_demo')
  >>> rex.on()

::

  >>> print Request.blank(
  ...   '/w',
  ...   accept='application/json').get_response(rex) # doctest: +ELLIPSIS
  200 OK
  Content-Type: application/json; charset=UTF-8
  Content-Length: ...
  <BLANKLINE>
  ["~#widget", ["rex-widget/lib/Chrome", {...}]]

  >>> print Request.blank(
  ...   '/w/@@/1.content.1.respond',
  ...   accept='application/json').get_response(rex) # doctest: +ELLIPSIS
  200 OK
  Content-Type: application/json; charset=UTF-8
  Content-Length: ...
  <BLANKLINE>
  "ok"

Overrides
---------

::

  >>> pkg.rewrite('/urlmap/base.yaml', '''
  ... paths:
  ...   /w:
  ...     widget: !<MappedWidget>
  ...     access: anybody
  ... ''')

  >>> pkg.rewrite('/urlmap.yaml', '''
  ... include:
  ... - /urlmap/base.yaml
  ... paths:
  ...   /w: !override
  ...     no_chrome: true
  ... ''')

  >>> print Request.blank(
  ...   '/w',
  ...   accept='application/json').get_response(rex) # doctest: +ELLIPSIS
  200 OK
  Content-Type: application/json; charset=UTF-8
  Content-Length: ...
  <BLANKLINE>
  ["~#widget", ["mapped-widget", {...}]]

  >>> pkg.rewrite('/urlmap.yaml', '''
  ... include:
  ... - /urlmap/base.yaml
  ... paths:
  ...   /w: !override
  ...     access: nobody
  ... ''')

  >>> print Request.blank(
  ...   '/w',
  ...   accept='application/json').get_response(rex) # doctest: +ELLIPSIS
  401 Unauthorized
  ...

  >>> pkg.rewrite('/urlmap.yaml', '''
  ... include:
  ... - /urlmap/base.yaml
  ... paths:
  ...   /w: !override
  ...     title: NEWTITLE
  ... ''')

  >>> print Request.blank(
  ...   '/w',
  ...   accept='application/json').get_response(rex) # doctest: +ELLIPSIS
  200 OK
  Content-Type: application/json; charset=UTF-8
  Content-Length: 171
  <BLANKLINE>
  ["~#widget", ["rex-widget/lib/Chrome", {..., "title": "NEWTITLE"}]]

::

  >>> rex.off()
