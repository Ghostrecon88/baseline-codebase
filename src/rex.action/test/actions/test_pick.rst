Pick action
===========

::

  >>> from webob import Request

  >>> from rex.core import Rex
  >>> from rex.widget import render_widget
  >>> from rex.action import Action

Init
----

::

  >>> rex = Rex('-', 'rex.action_demo')
  >>> rex.on()

In case fields are not specified, they are generated from port::

  >>> pick = Action.parse("""
  ... type: pick
  ... id: pick-individual
  ... entity: individual
  ... """)

  >>> pick.fields # doctest: +NORMALIZE_WHITESPACE +ELLIPSIS
  [StringFormField(value_key=['code'], label=u'Code'),
   EnumFormField(value_key=['sex'], label=u'Sex', options=[...]),
   EntityFormField(value_key=['mother'], ...),
   EntityFormField(value_key=['father'], ...),
   EntityFormField(value_key=['adopted_mother'], ...),
   EntityFormField(value_key=['adopted_father'], ...)]

  >>> input, output = pick.context_types

  >>> input
  RecordType(rows={}, open=True)

  >>> output
  RecordType(rows={'individual': RowType(name='individual', type=EntityType(name='individual', state=None))}, open=True)

  >>> pick.port
  Port('''
  entity: individual
  select: [code, sex, mother, father, adopted_mother, adopted_father]
  with:
  - calculation: meta:type
    expression: '''individual'''
  - calculation: meta:title
    expression: id()
  ''')

  >>> req = Request.blank('/', accept='application/json')
  >>> print render_widget(pick, req) # doctest: +ELLIPSIS +NORMALIZE_WHITESPACE
  200 OK
  Content-Type: application/json; charset=UTF-8
  Content-Length: ...
  ...

  >>> req = Request.blank('/?__to__=1.content.1.data', accept='application/json')
  >>> print render_widget(pick, req) # doctest: +ELLIPSIS
  200 OK
  Content-Type: application/javascript
  Content-Disposition: inline; filename="_.js"
  Vary: Accept
  Content-Length: ...
  <BLANKLINE>
  {
    "individual": [...]
  }
  <BLANKLINE>

If we provide ``search`` HTSQL expression then we have port generated with
corresponding filtera and ``data`` data spec automatically bind ``search`` state
var to this filter::

  >>> pick = Action.parse("""
  ... type: pick
  ... id: pick-individual-search
  ... entity: individual
  ... search: identity.givename~$search
  ... """)

  >>> req = Request.blank('/', accept='application/json')
  >>> print render_widget(pick, req) # doctest: +ELLIPSIS +NORMALIZE_WHITESPACE
  200 OK
  Content-Type: application/json; charset=UTF-8
  Content-Length: ...
  ...

  >>> pick.port
  Port('''
  entity: individual
  filters: ['__search__($search) := identity.givename~$search']
  select: [code, sex, mother, father, adopted_mother, adopted_father]
  with:
  - calculation: meta:type
    expression: '''individual'''
  - calculation: meta:title
    expression: id()
  ''')

  >>> req = Request.blank('/?__to__=1.content.1.data', accept='application/json')
  >>> print render_widget(pick, req) # doctest: +NORMALIZE_WHITESPACE +ELLIPSIS
  200 OK
  Content-Type: application/javascript
  Content-Disposition: inline; filename="_.js"
  Vary: Accept
  Content-Length: ...
  <BLANKLINE>
  {
    "individual": [...]
  }
  <BLANKLINE>

If we provide ``mask`` HTSQL expression it is compiled into port's filter::


  >>> pick = Action.parse("""
  ... type: pick
  ... id: pick-male
  ... entity: individual
  ... mask: sex = 'male'
  ... """)

  >>> pick.port
  Port('''
  entity: individual
  mask: (sex='male')
  select: [code, sex, mother, father, adopted_mother, adopted_father]
  with:
  - calculation: meta:type
    expression: '''individual'''
  - calculation: meta:title
    expression: id()
  ''')

If we provide ``input`` fields with context requirements then ``mask`` can refer
to those input variables::

  >>> pick = Action.parse("""
  ... type: pick
  ... id: pick-study-enrollment
  ... entity: study_enrollment
  ... mask: individual = $individual
  ... input:
  ... - individual: individual
  ... """)

  >>> req = Request.blank('/', accept='application/json')
  >>> print render_widget(pick, req) # doctest: +ELLIPSIS +NORMALIZE_WHITESPACE
  200 OK
  Content-Type: application/json; charset=UTF-8
  Content-Length: ...
  ...

  >>> pick.port # doctest: +NORMALIZE_WHITESPACE
  Port('''
  - parameter: individual
  - entity: study_enrollment
    mask: (individual=$individual)
    select: [study, individual, code, enrollment_date, participant_group]
    with:
    - calculation: meta:type
      expression: '''study_enrollment'''
    - calculation: meta:title
      expression: id()
  ''')

  >>> req = Request.blank('/?__to__=1.content.1.data', accept='application/json')
  >>> print render_widget(pick, req) # doctest: +NORMALIZE_WHITESPACE +ELLIPSIS
  200 OK
  Content-Type: application/javascript
  Content-Disposition: inline; filename="_.js"
  Vary: Accept
  Content-Length: ...
  <BLANKLINE>
  {
    "study_enrollment": []
  }
  <BLANKLINE>

We can specify an entity indexed by state, then pick will use state's filter as
a mask::

  >>> from rex.action.typing import Domain, EntityType, EntityTypeState
  >>> dom = Domain(entity_types=[
  ...   EntityType(name='individual', state=EntityTypeState(name='editable', expression='true()')),
  ... ])

  >>> with dom:
  ...   action = Action.parse('''
  ... type: pick
  ... id: pick-individual
  ... entity: individual[editable]
  ... ''')

  >>> action.port
  Port('''
  entity: individual
  mask: (true())
  select: [code, sex, mother, father, adopted_mother, adopted_father]
  with:
  - calculation: meta:type
    expression: '''individual'''
  - calculation: meta:title
    expression: id()
  - calculation: meta:state:editable
    expression: true()
  ''')

Cleanup
-------

::

  >>> rex.off()

