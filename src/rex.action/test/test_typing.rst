Typing
======

Currently active application domain is accessible through ``Domain.current()``::

  >>> from rex.action.typing import Domain

  >>> Domain.current() # doctest: +ELLIPSIS
  <Domain default>

  >>> dom = Domain(name='custom', entity_types=[])

  >>> with dom:
  ...   Domain.current() is dom
  True

  >>> with dom:
  ...   Domain.current()
  <Domain custom>

  >>> Domain.current() # doctest: +ELLIPSIS
  <Domain default>

Parsing types::

  >>> from rex.action.typing import Domain, EntityType, EntityTypeState

  >>> dom = Domain(entity_types=[
  ...   EntityType('individual', state=EntityTypeState('recruited', None)),
  ...   EntityType('individual', state=EntityTypeState('enrolled', None)),
  ... ])

  >>> dom.on()

  >>> from rex.action.typing import TypeVal

  >>> validate = TypeVal()

  >>> validate('any')
  AnyType()

  >>> validate('text')
  ValueType(name='text')

  >>> validate('individual')
  EntityType(name='individual', state=None)

  >>> validate('study')
  EntityType(name='study', state=None)

  >>> validate('individual[recruited]') # doctest: +NORMALIZE_WHITESPACE
  EntityType(name='individual',
             state=EntityTypeState(name='recruited', title=None, expression=None, input=None))

  >>> validate('individual[enrolled]') # doctest: +NORMALIZE_WHITESPACE
  EntityType(name='individual',
             state=EntityTypeState(name='enrolled', title=None, expression=None, input=None))

  >>> validate('individual[unknown]') # doctest: +ELLIPSIS
  Traceback (most recent call last):
  ...
  Error: Expected a string matching:
      /[a-zA-Z_][a-zA-Z_\-0-9]*/
  Got:
      'individual[unknown]'

  >>> dom.off()

Parse composite types
---------------------

::

  >>> dom = Domain(entity_types=[
  ...   EntityType('individual', state=EntityTypeState('recruited', None)),
  ...   EntityType('individual', state=EntityTypeState('enrolled', None)),
  ... ])

  >>> dom.on()

Row type::

  >>> from rex.action.typing import RowTypeVal

  >>> validate = RowTypeVal()

  >>> validate.parse("""
  ... individual
  ... """) # doctest: +NORMALIZE_WHITESPACE
  RowType(name='individual',
          type=EntityType(name='individual',
                          state=None))

  >>> validate.parse("""
  ... mother: individual
  ... """) # doctest: +NORMALIZE_WHITESPACE
  RowType(name='mother',
          type=EntityType(name='individual',
                          state=None))

  >>> validate.parse("""
  ... individual[recruited]
  ... """) # doctest: +NORMALIZE_WHITESPACE
  RowType(name='individual',
          type=EntityType(name='individual',
                          state=EntityTypeState(name='recruited', title=None, expression=None, input=None)))

  >>> validate.parse("""
  ... mother: individual[recruited]
  ... """) # doctest: +NORMALIZE_WHITESPACE
  RowType(name='mother',
          type=EntityType(name='individual',
                          state=EntityTypeState(name='recruited', title=None, expression=None, input=None)))

  >>> validate.parse("""
  ... mother: individual[recruited]
  ... x: y
  ... """) # doctest: +ELLIPSIS
  Traceback (most recent call last):
  ...
  Error: Row type expects a single definition
  While parsing:
      "<string>", line 2

Record type::

  >>> from rex.action.typing import RecordTypeVal

  >>> validate = RecordTypeVal()

  >>> validate.parse("""
  ... - individual
  ... """) # doctest: +NORMALIZE_WHITESPACE
  RecordType(rows={'individual': RowType(name='individual',
                                         type=EntityType(name='individual',
                                                         state=None))},
             open=True)

  >>> validate.parse("""
  ... - mother: individual
  ... """) # doctest: +NORMALIZE_WHITESPACE
  RecordType(rows={'mother': RowType(name='mother',
                                     type=EntityType(name='individual',
                                                     state=None))},
             open=True)

  >>> validate.parse("""
  ... - individual[recruited]
  ... """) # doctest: +NORMALIZE_WHITESPACE
  RecordType(rows={'individual': RowType(name='individual',
                                         type=EntityType(name='individual',
                                                         state=EntityTypeState(name='recruited', title=None, expression=None, input=None)))},
             open=True)

  >>> validate.parse("""
  ... - mother: individual[recruited]
  ... """) # doctest: +NORMALIZE_WHITESPACE
  RecordType(rows={'mother': RowType(name='mother',
                                     type=EntityType(name='individual',
                                                     state=EntityTypeState(name='recruited', title=None, expression=None, input=None)))},
             open=True)

  >>> validate.parse("""
  ... - individual
  ... - mother: individual
  ... """) # doctest: +NORMALIZE_WHITESPACE
  RecordType(rows={'individual': RowType(name='individual',
                                         type=EntityType(name='individual',
                                                         state=None)),
                   'mother': RowType(name='mother',
                                     type=EntityType(name='individual',
                                                     state=None))},
             open=True)

  >>> validate.parse("""
  ... - individual
  ... - individual: study
  ... """) # doctest: +ELLIPSIS
  Traceback (most recent call last):
  ...
  Error: Duplicate row name in type:
      individual
  While parsing:
      "<string>", line 2

::

  >>> dom.off()

Annotate port with type information
-----------------------------------

::

  >>> from rex.core import Rex
  >>> app = Rex('-', 'rex.action_demo')

  >>> dom = Domain(entity_types=[
  ...   EntityType('individual', state=EntityTypeState('recruited', 'true()')),
  ...   EntityType('individual', state=EntityTypeState('enrolled', 'false()')),
  ... ])

  >>> app.on()
  >>> dom.on()

::

  >>> from rex.action.typing import annotate_port
  >>> from rex.port import Port
  
  >>> port = Port("""
  ... entity: individual
  ... with:
  ... - entity: identity
  ... """)

  >>> annotate_port(dom, port)
  Port('''
  entity: individual
  select: [code, sex, mother, father, adopted_mother, adopted_father]
  with:
  - entity: identity
    select: [fullname, givenname, middle, preferred_name, middle_name, surname, birthdate,
      notes, deathdate, deceased]
    with:
    - calculation: meta:type
      expression: '''identity'''
  - calculation: meta:type
    expression: '''individual'''
  - calculation: meta:state:recruited
    expression: true()
  - calculation: meta:state:enrolled
    expression: false()
  ''')

::

  >>> app.off()
  >>> dom.off()
