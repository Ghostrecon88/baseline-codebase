****
Task
****

.. contents:: Table of Contents


Set up the environment::

    >>> from rex.instrument.interface import Subject, Instrument, InstrumentVersion, Assessment
    >>> from datetime import datetime
    >>> from rex.forms.interface import Entry, Task
    >>> from datetime import datetime
    >>> from copy import deepcopy
    >>> from rex.core import Rex
    >>> rex = Rex('__main__', 'rex.forms_demo')
    >>> rex.on()

The semi-abstract base Task class only implements a simple constructor
and string-rendering methods::

    >>> subject = Subject('fake123')
    >>> instrument = Instrument('fake123', 'My Instrument Title')
    >>> INSTRUMENT = {
    ...     'id': 'urn:test-instrument',
    ...     'version': '1.1',
    ...     'title': 'The InstrumentVersion Title',
    ...     'record': [
    ...         {
    ...             'id': 'q_fake',
    ...             'type': 'text'
    ...         }
    ...     ]
    ... }
    >>> iv = InstrumentVersion('notreal456', instrument, INSTRUMENT, 1, 'jay', datetime(2014, 5, 22))
    >>> ASSESSMENT = {
    ...     'instrument': {
    ...         'id': 'urn:test-instrument',
    ...         'version': '1.1'
    ...     },
    ...     'values': {
    ...         'q_fake': {
    ...             'value': 'my answer'
    ...         }
    ...     }
    ... }
    >>> assessment = Assessment('fake123', subject, iv, ASSESSMENT)

    >>> task = Task('bar999', subject, instrument, 100, assessment)
    >>> task.get_display_name()
    u'bar999'
    >>> unicode(task)
    u'bar999'
    >>> str(task)
    'bar999'
    >>> repr(task)
    "Task(u'bar999', Subject(u'fake123'), Instrument(u'fake123', u'My Instrument Title'))"
    >>> task.priority
    100
    >>> task.subject
    Subject(u'fake123')
    >>> task.assessment
    Assessment(u'fake123', Subject(u'fake123'), InstrumentVersion(u'notreal456', Instrument(u'fake123', u'My Instrument Title'), 1))
    >>> task.instrument
    Instrument(u'fake123', u'My Instrument Title')

    >>> task.as_dict()
    {'priority': 100, 'instrument': {'status': u'active', 'uid': u'fake123', 'title': u'My Instrument Title'}, 'status': u'not-started', 'uid': u'bar999', 'subject': {'uid': u'fake123'}}
    >>> task.as_json()
    u'{"priority": 100, "instrument": {"status": "active", "uid": "fake123", "title": "My Instrument Title"}, "status": "not-started", "uid": "bar999", "subject": {"uid": "fake123"}}'


The Subjects, Instruments, and Assessments passed to the constructor must
actually be instances of those classes or strings containing UIDs::

    >>> task = Task('bar999', object(), instrument, 100)
    Traceback (most recent call last):
      ...
    ValueError: subject must be an instance of Subject or a UID of one
    >>> task = Task('bar999', subject, object(), 100)
    Traceback (most recent call last):
      ...
    ValueError: instrument must be an instance of Instrument or a UID of one
    >>> task = Task('bar999', subject, instrument, 100, 6)
    Traceback (most recent call last):
      ...
    ValueError: assessment must be an instance of Assessment or a UID of one

    >>> task = Task('bar999', 'subject1', 'instrument1', 100, assessment='assessment1')
    >>> task.subject
    MySubject(u'subject1')
    >>> task.instrument
    MyInstrument(u'instrument1', u'Title for instrument1')
    >>> task.assessment
    MyAssessment(u'assessment1', MySubject(u'fake_subject_1a'), MyInstrumentVersion(u'fake_instrument_version_1a', MyInstrument(u'fake_instrument_1iv', u'Title for fake_instrument_1iv'), 1))


The priority passed to the constructor must be an integer::

    >>> task = Task('bar999', subject, instrument, 'foo')
    Traceback (most recent call last):
      ...
    ValueError: priority must be an integer


Tasks have a property to retrieve the InstrumentVersion they're associated with::

    >>> task = Task('bar999', subject, instrument, 100, assessment)
    >>> task.instrument_version
    InstrumentVersion(u'notreal456', Instrument(u'fake123', u'My Instrument Title'), 1)


Tasks have a status property which is readable and writable::

    >>> task = Task('bar999', subject, instrument, 100)
    >>> task.status
    u'not-started'
    >>> task.is_done
    False
    >>> task.can_reconcile
    False
    >>> task.status = Task.STATUS_VALIDATING
    >>> task.is_done
    False
    >>> task.can_reconcile
    True
    >>> task.status = Task.STATUS_COMPLETE
    >>> task.status
    u'complete'
    >>> task.is_done
    True
    >>> task.can_reconcile
    False
    >>> task.status = 'something else'
    Traceback (most recent call last):
      ...
    ValueError: "something else" is not a valid Task status


After a Task has collected a series of Entries, the ``get_discrepancies()``
method can be used to generate a dictionary describing the differences in
Assessment Data collected for each Entry. The ``solve_discrepancies()``
method can then be used to merge the Assessment Data in the Entries together::

    >>> INSTRUMENT = {
    ...     'id': 'urn:test-instrument',
    ...     'version': '1.1',
    ...     'title': 'The InstrumentVersion Title',
    ...     'record': [
    ...         {
    ...             'id': 'q_fake',
    ...             'type': 'text'
    ...         },
    ...         {
    ...             'id': 'q_foo',
    ...             'type': 'integer'
    ...         }
    ...     ]
    ... }
    >>> DATA = {
    ...     'instrument': {
    ...         'id': 'urn:test-instrument',
    ...         'version': '1.1'
    ...     },
    ...     'values': {
    ...         'q_fake': {
    ...             'value': 'my answer'
    ...         },
    ...         'q_foo': {
    ...             'value': 45
    ...         }
    ...     }
    ... }

    >>> instrument = Instrument('fake123', 'My Instrument Title')
    >>> iv = InstrumentVersion('notreal456', instrument, INSTRUMENT, 1, 'jay', datetime(2014, 5, 22))
    >>> assessment = Assessment('fake123', subject, iv, DATA)
    >>> task = Task('bar999', subject, instrument, 100, assessment)
    >>> entry1 = Entry('entry333', assessment, Entry.TYPE_PRELIMINARY, DATA, 'bob', datetime(2014, 5, 22, 12, 34, 56))
    >>> entry2 = Entry('entry444', assessment, Entry.TYPE_PRELIMINARY, DATA, 'joe', datetime(2014, 5, 22, 12, 34, 56))
    >>> entry3 = Entry('entry555', assessment, Entry.TYPE_PRELIMINARY, DATA, 'jim', datetime(2014, 5, 22, 12, 34, 56))
    >>> entries = [entry1, entry2, entry3]

    >>> task.get_discrepancies(entries=entries)
    {}
    >>> task.solve_discrepancies({}, entries=entries)
    {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_fake': {'explanation': None, 'annotation': None, 'value': 'my answer'}, 'q_foo': {'explanation': None, 'annotation': None, 'value': 45}}}

    >>> entry3.data['values']['q_fake']['value'] = 'a different answer'
    >>> task.get_discrepancies(entries=entries)
    {'q_fake': {u'entry444': 'my answer', u'entry333': 'my answer', u'entry555': 'a different answer'}}
    >>> task.solve_discrepancies({}, entries=entries)
    {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_fake': {'explanation': None, 'annotation': None, 'value': 'my answer'}, 'q_foo': {'explanation': None, 'annotation': None, 'value': 45}}}
    >>> task.solve_discrepancies({'q_fake': 'the answer'}, entries=entries)
    {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_fake': {'explanation': None, 'annotation': None, 'value': 'the answer'}, 'q_foo': {'explanation': None, 'annotation': None, 'value': 45}}}
    >>> task.solve_discrepancies({'q_fake': None}, entries=entries)
    {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_fake': {'explanation': None, 'annotation': None, 'value': None}, 'q_foo': {'explanation': None, 'annotation': None, 'value': 45}}}

    >>> entry2.data['values']['q_fake']['explanation'] = 'Because I said so.'
    >>> task.solve_discrepancies({}, entries=entries)
    {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_fake': {'explanation': 'Because I said so.', 'annotation': None, 'value': 'my answer'}, 'q_foo': {'explanation': None, 'annotation': None, 'value': 45}}}
    >>> entry3.data['values']['q_fake']['explanation'] = 'Why not?'
    >>> task.solve_discrepancies({}, entries=entries)
    {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_fake': {'explanation': u'2014-05-22 12:34:56 / joe: Because I said so.\n\n2014-05-22 12:34:56 / jim: Why not?', 'annotation': None, 'value': 'my answer'}, 'q_foo': {'explanation': None, 'annotation': None, 'value': 45}}}

    >>> del iv.definition['record'][0]
    >>> del iv.definition['record'][0]
    >>> iv.definition['record'].append({
    ...     'id': 'q_rec',
    ...     'type': {
    ...         'base': 'recordList',
    ...         'record': [
    ...             {
    ...                 'id': 'dink',
    ...                 'type': 'text'
    ...             },
    ...             {
    ...                 'id': 'donk',
    ...                 'type': 'boolean'
    ...             }
    ...         ]
    ...     }
    ... })
    >>> RECORD_VALUES = {
    ...     'q_rec': {
    ...         'value': [
    ...             {
    ...                 'dink': {
    ...                     'value': 'hello'
    ...                 },
    ...                 'donk': {
    ...                     'value': False
    ...                 }
    ...             },
    ...             {
    ...                 'dink': {
    ...                     'value': 'goodbye'
    ...                 },
    ...                 'donk': {
    ...                     'value': True
    ...                 }
    ...             }
    ...         ]
    ...     }
    ... }
    >>> entry1.data['values'] = deepcopy(RECORD_VALUES)
    >>> entry2.data['values'] = deepcopy(RECORD_VALUES)
    >>> entry3.data['values'] = deepcopy(RECORD_VALUES)
    >>> entry3.data['values']['q_rec']['value'][0]['dink']['value'] = 'bonjour'
    >>> task.get_discrepancies(entries=entries)
    {'q_rec': {'0': {'dink': {u'entry444': 'hello', u'entry333': 'hello', u'entry555': 'bonjour'}}}}
    >>> task.solve_discrepancies({}, entries=entries)
    {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_rec': [{'donk': {'explanation': None, 'annotation': None, 'value': False}, 'dink': {'explanation': None, 'annotation': None, 'value': 'hello'}}, {'donk': {'explanation': None, 'annotation': None, 'value': True}, 'dink': {'explanation': None, 'annotation': None, 'value': 'goodbye'}}]}}
    >>> task.solve_discrepancies({'q_rec': {'0': {'dink': 'hi'}}}, entries=entries)
    {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_rec': [{'donk': {'explanation': None, 'annotation': None, 'value': False}, 'dink': {'explanation': None, 'annotation': None, 'value': 'hi'}}, {'donk': {'explanation': None, 'annotation': None, 'value': True}, 'dink': {'explanation': None, 'annotation': None, 'value': 'goodbye'}}]}}

    >>> del entry3.data['values']['q_rec']['value'][0]
    >>> expected_discrepancies = {'q_rec': {'0': {'donk': {u'entry444': False, u'entry333': False, u'entry555': True}, 'dink': {u'entry444': 'hello', u'entry333': 'hello', u'entry555': 'goodbye'}}, '1': {'donk': {u'entry444': True, u'entry333': True, u'entry555': None}, 'dink': {u'entry444': 'goodbye', u'entry333': 'goodbye', u'entry555': None}}}}
    >>> task.get_discrepancies(entries=entries) == expected_discrepancies
    True
    >>> task.solve_discrepancies({}, entries=entries)
    {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_rec': [{'donk': {'explanation': None, 'annotation': None, 'value': False}, 'dink': {'explanation': None, 'annotation': None, 'value': 'hello'}}, {'donk': {'explanation': None, 'annotation': None, 'value': True}, 'dink': {'explanation': None, 'annotation': None, 'value': 'goodbye'}}]}}
    >>> task.solve_discrepancies({'q_rec': {'1': {'dink': 'bye'}}}, entries=entries)
    {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_rec': [{'donk': {'explanation': None, 'annotation': None, 'value': False}, 'dink': {'explanation': None, 'annotation': None, 'value': 'hello'}}, {'donk': {'explanation': None, 'annotation': None, 'value': True}, 'dink': {'explanation': None, 'annotation': None, 'value': 'bye'}}]}}

    >>> del iv.definition['record'][0]
    >>> iv.definition['record'].append({
    ...     'id': 'q_matrix',
    ...     'type': {
    ...         'base': 'matrix',
    ...         'columns': [
    ...             {
    ...                 'id': 'doo',
    ...                 'type': 'float'
    ...             },
    ...             {
    ...                 'id': 'dah',
    ...                 'type': 'text'
    ...             }
    ...         ],
    ...         'rows': [
    ...             {
    ...                 'id': 'row1'
    ...             },
    ...             {
    ...                 'id': 'row2'
    ...             }
    ...         ]
    ...     }
    ... })
    >>> MATRIX_VALUES = {
    ...     'q_matrix': {
    ...         'value': {
    ...             'row1': {
    ...                 'doo': {
    ...                     'value': 42.1
    ...                 },
    ...                 'dah': {
    ...                     'value': 'hello'
    ...                 }
    ...             },
    ...             'row2': {
    ...                 'doo': {
    ...                     'value': 63
    ...                 },
    ...                 'dah': {
    ...                     'value': 'goodbye'
    ...                 }
    ...             }
    ...         }
    ...     }
    ... }
    >>> entry1.data['values'] = deepcopy(MATRIX_VALUES)
    >>> entry2.data['values'] = deepcopy(MATRIX_VALUES)
    >>> entry3.data['values'] = deepcopy(MATRIX_VALUES)
    >>> entry3.data['values']['q_matrix']['value']['row1']['dah']['value'] = 'hi'
    >>> task.get_discrepancies(entries=entries)
    {'q_matrix': {'row1': {'dah': {u'entry444': 'hello', u'entry333': 'hello', u'entry555': 'hi'}}}}
    >>> expected_solution = {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_matrix': {'row1': {'dah': {'explanation': None, 'annotation': None, 'value': 'hello'}, 'doo': {'explanation': None, 'annotation': None, 'value': 42.1}}, 'row2': {'dah': {'explanation': None, 'annotation': None, 'value': 'goodbye'}, 'doo': {'explanation': None, 'annotation': None, 'value': 63}}}}}
    >>> task.solve_discrepancies({}, entries=entries) == expected_solution
    True
    >>> expected_solution = {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_matrix': {'row1': {'dah': {'explanation': None, 'annotation': None, 'value': 'hey'}, 'doo': {'explanation': None, 'annotation': None, 'value': 42.1}}, 'row2': {'dah': {'explanation': None, 'annotation': None, 'value': 'goodbye'}, 'doo': {'explanation': None, 'annotation': None, 'value': 63}}}}}
    >>> task.solve_discrepancies({'q_matrix': {'row1': {'dah': 'hey'}}}, entries=entries) == expected_solution
    True


Tasks can be checked for equality. Note that equality is only defined as
being the same class with the same UID::

    >>> task1 = Task('bar888', subject, instrument, 100, assessment)
    >>> task2 = Task('bar999', subject, instrument, 100, assessment)
    >>> task3 = Task('bar888', subject, instrument, 345)
    >>> task1 == task2
    False
    >>> task1 == task3
    True
    >>> task1 != task2
    True
    >>> task1 != task3
    False
    >>> mylist = [task1]
    >>> task1 in mylist
    True
    >>> task2 in mylist
    False
    >>> task3 in mylist
    True
    >>> myset = set(mylist)
    >>> task1 in myset
    True
    >>> task2 in myset
    False
    >>> task3 in myset
    True

    >>> task1 < task2
    True
    >>> task1 <= task3
    True
    >>> task2 > task1
    True
    >>> task3 >= task1
    True

