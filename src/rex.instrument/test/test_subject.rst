*******
Subject
*******

.. contents:: Table of Contents


The semi-abstract base Subject class only implements a simple constructor and
string-rendering methods::

    >>> from rex.instrument.interface import Subject
    >>> subject = Subject('fake123')
    >>> subject.get_display_name()
    u'fake123'
    >>> unicode(subject)
    u'fake123'
    >>> str(subject)
    'fake123'
    >>> repr(subject)
    "Subject(u'fake123')"

    >>> subject.as_dict()
    {'uid': u'fake123'}
    >>> subject.as_json()
    u'{"uid": "fake123"}'


Subjects can be checked for equality. Note that equality is only defined as
being the same class with the same UID::

    >>> subject1 = Subject('fake123')
    >>> subject2 = Subject('fake456')
    >>> subject3 = Subject('fake123')
    >>> subject1 == subject2
    False
    >>> subject1 == subject3
    True
    >>> subject1 != subject2
    True
    >>> subject1 != subject3
    False
    >>> mylist = [subject1]
    >>> subject1 in mylist
    True
    >>> subject2 in mylist
    False
    >>> subject3 in mylist
    True
    >>> myset = set(mylist)
    >>> subject1 in myset
    True
    >>> subject2 in myset
    False
    >>> subject3 in myset
    True

    >>> subject1 < subject2
    True
    >>> subject1 <= subject3
    True
    >>> subject2 > subject1
    True
    >>> subject3 >= subject1
    True

