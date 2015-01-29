**********
Assessment
**********


Set up the environment::

    >>> from rex.core import Rex
    >>> from datetime import datetime
    >>> rex = Rex('__main__', 'rex.instrument_demo')
    >>> rex.on()


The semi-abstract base Assessment class only implements a simple constructor
and string-rendering methods::

    >>> from rex.instrument.interface import User, Subject, Instrument, InstrumentVersion, Assessment
    >>> subject = Subject('subject1')
    >>> instrument = Instrument('fake123', 'fake123', 'My Instrument Title')
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
    >>> assessment.get_display_name()
    u'fake123'
    >>> unicode(assessment)
    u'fake123'
    >>> str(assessment)
    'fake123'
    >>> repr(assessment)
    "Assessment(u'fake123', Subject(u'subject1'), InstrumentVersion(u'notreal456', Instrument(u'fake123', u'My Instrument Title'), 1))"

    >>> assessment.as_dict()
    {'instrument_version': {'instrument': {'status': u'active', 'code': u'fake123', 'uid': u'fake123', 'title': u'My Instrument Title'}, 'published_by': u'jay', 'version': 1, 'uid': u'notreal456', 'date_published': datetime.datetime(2014, 5, 22, 0, 0)}, 'status': u'in-progress', 'uid': u'fake123', 'evaluation_date': None, 'subject': {'uid': u'subject1'}}
    >>> assessment.as_json()
    u'{"instrument_version": {"instrument": {"status": "active", "code": "fake123", "uid": "fake123", "title": "My Instrument Title"}, "published_by": "jay", "version": 1, "uid": "notreal456", "date_published": "2014-05-22T00:00:00"}, "status": "in-progress", "uid": "fake123", "evaluation_date": null, "subject": {"uid": "subject1"}}'


The Subjects and InstrumentVersions passed to the constructor must actually be
instances of those classes or strings containing UIDs::

    >>> assessment = Assessment('fake123', object(), iv, ASSESSMENT)
    Traceback (most recent call last):
      ...
    ValueError: subject must be an instance of Subject or a UID of one
    >>> assessment = Assessment('fake123', subject, object(), ASSESSMENT)
    Traceback (most recent call last):
      ...
    ValueError: instrument_version must be an instance of InstrumentVersion or a UID of one

    >>> assessment = Assessment('fake123', 'subject1', 'simple1', ASSESSMENT)
    >>> assessment.subject
    DemoSubject(u'subject1')
    >>> assessment.instrument_version
    DemoInstrumentVersion(u'simple1', DemoInstrument(u'simple', u'Simple Instrument'), 1)


The Evaluation Date must actually be a date (or datetime)::

    >>> assessment = Assessment('fake123', subject, iv, ASSESSMENT, evaluation_date='1980-05-22')
    Traceback (most recent call last):
        ...
    ValueError: "1980-05-22" is not a valid date

    >>> from datetime import date, datetime
    >>> assessment = Assessment('fake123', subject, iv, ASSESSMENT, evaluation_date=date(1980, 5, 22))
    >>> assessment.evaluation_date
    datetime.date(1980, 5, 22)
    >>> assessment = Assessment('fake123', subject, iv, ASSESSMENT, evaluation_date=datetime(1980, 5, 22, 12, 34, 56))
    >>> assessment.evaluation_date
    datetime.date(1980, 5, 22)


The data can be passed to the contructor as either a JSON-encoded string
or the dict equivalent::

    >>> assessment = Assessment('fake123', subject, iv, '{"instrument": {"id": "urn:test-instrument", "version": "1.1"}, "values": {"q_fake": {"value": "my answer"}}}')
    >>> assessment.validate()


The data can be set or retrieved as either a JSON-encoded string or a dict
equivalent::

    >>> assessment.data
    {u'instrument': {u'version': u'1.1', u'id': u'urn:test-instrument'}, u'values': {u'q_fake': {u'value': u'my answer'}}}
    >>> assessment.data = {u'instrument': {u'version': u'1.1', u'id': u'urn:test-instrument'}, u'values': {u'q_fake': {u'value': u'a different answer'}}}

    >>> assessment.data_json
    u'{"instrument": {"version": "1.1", "id": "urn:test-instrument"}, "values": {"q_fake": {"value": "a different answer"}}}'
    >>> assessment.data_json = u'{"instrument": {"version": "1.1", "id": "urn:test-instrument"}, "values": {"q_fake": {"value": "something completely different"}}}'

    >>> assessment.data = None
    >>> assessment.data is None
    True
    >>> assessment.data_json is None
    True


Assessments have a status property which is readable and writable::

    >>> assessment.status
    u'in-progress'
    >>> assessment.is_done
    False
    >>> assessment.status = Assessment.STATUS_COMPLETE
    >>> assessment.status
    u'completed'
    >>> assessment.is_done
    True
    >>> assessment.status = 'something else'
    Traceback (most recent call last):
      ...
    ValueError: "something else" is not a valid Assessment status
    >>> assessment.status = Assessment.STATUS_IN_PROGRESS
    >>> assessment.status
    u'in-progress'


Assessments have a `complete()` method that performs some end-of-data-collection
tasks on the Assessment and its Document::

    >>> user = User('fakeuser', 'fakelogin')
    >>> assessment = Assessment('fake123', subject, iv, '{"instrument": {"id": "urn:test-instrument", "version": "1.1"}, "values": {"q_fake": {"value": "my answer"}}}')

    >>> assessment.status
    u'in-progress'
    >>> assessment.get_meta('application') is None
    True
    >>> assessment.get_meta('dateCompleted') is None
    True
    >>> assessment.complete(user)
    >>> assessment.status
    u'completed'
    >>> 'rex.instrument' in assessment.get_meta('application')
    True
    >>> assessment.get_meta('dateCompleted') is None
    False

    >>> assessment.complete(user)
    Traceback (most recent call last):
        ...
    InstrumentError: Cannot complete an Assessment that is already in a terminal state.


Assessments have some convenience methods for setting and retrieving metadata
properties on the Assessment Document::

    >>> assessment = Assessment('fake123', subject, iv, '{"instrument": {"id": "urn:test-instrument", "version": "1.1"}, "values": {"q_fake": {"value": "my answer"}}}')

    >>> assessment.get_meta('foo') is None
    True
    >>> assessment.set_meta('foo', 'bar')
    >>> assessment.get_meta('foo')
    u'bar'

    >>> assessment.get_meta('application') is None
    True
    >>> assessment.set_application_token('coolapp', '1.0')
    u'coolapp/1.0'
    >>> assessment.set_application_token('helper')
    u'coolapp/1.0 helper/?'
    >>> assessment.set_application_token('coolapp', '2.0')
    u'coolapp/2.0 helper/?'
    >>> assessment.get_meta('application')
    u'coolapp/2.0 helper/?'


There's a static method on Assessment named `generate_empty_data()` that will
create an Assessment Document that contains no response data, but is in the
structure expected for the specified InstrumentVersion::

    >>> Assessment.generate_empty_data(iv)
    {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_fake': {'value': None}}}
    >>> Assessment.validate_data(Assessment.generate_empty_data(iv))

    >>> from copy import deepcopy
    >>> MATRIX_INSTRUMENT = deepcopy(INSTRUMENT)
    >>> MATRIX_INSTRUMENT['record'].append({
    ...     'id': 'q_matrix',
    ...     'type': {
    ...         'base': 'matrix',
    ...         'columns': [
    ...             {
    ...                 'id': 'col1',
    ...                 'type': 'text',
    ...             },
    ...             {
    ...                 'id': 'col2',
    ...                 'type': 'text',
    ...             },
    ...         ],
    ...         'rows': [
    ...             {
    ...                 'id': 'row1',
    ...             },
    ...             {
    ...                 'id': 'row2',
    ...             },
    ...         ]
    ...     }
    ... })
    >>> iv2 = InstrumentVersion('notreal456', instrument, MATRIX_INSTRUMENT, 1, 'jay', datetime(2014, 5, 22))
    >>> Assessment.generate_empty_data(iv2)
    {'instrument': {'version': '1.1', 'id': 'urn:test-instrument'}, 'values': {'q_fake': {'value': None}, 'q_matrix': {'value': {'row1': {'col2': {'value': None}, 'col1': {'value': None}}, 'row2': {'col2': {'value': None}, 'col1': {'value': None}}}}}}
    >>> Assessment.validate_data(Assessment.generate_empty_data(iv2))


Assessments can be checked for equality. Note that equality is only defined as
being the same class with the same UID::

    >>> assessment1 = Assessment('fake123', subject, iv, ASSESSMENT)
    >>> assessment2 = Assessment('fake456', subject, iv, ASSESSMENT)
    >>> subject2 = Subject('foobar')
    >>> assessment3 = Assessment('fake123', subject2, iv, ASSESSMENT)
    >>> assessment1 == assessment2
    False
    >>> assessment1 == assessment3
    True
    >>> assessment1 != assessment2
    True
    >>> assessment1 != assessment3
    False
    >>> mylist = [assessment1]
    >>> assessment1 in mylist
    True
    >>> assessment2 in mylist
    False
    >>> assessment3 in mylist
    True
    >>> myset = set(mylist)
    >>> assessment1 in myset
    True
    >>> assessment2 in myset
    False
    >>> assessment3 in myset
    True

    >>> assessment1 < assessment2
    True
    >>> assessment1 <= assessment3
    True
    >>> assessment2 > assessment1
    True
    >>> assessment3 >= assessment1
    True

