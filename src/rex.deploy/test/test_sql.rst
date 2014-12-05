*********************
  SQL Serialization
*********************

.. contents:: Table of Contents


Name mangling
=============

Use function ``mangle()`` to assemble a valid SQL name from one or more
fragments::

    >>> from rex.deploy import mangle

    >>> mangle(u'individual')
    u'individual'
    >>> mangle([u'individual', u'mother'])
    u'individual_mother'

You can specify a suffix::

    >>> mangle([u'individual', u'mother'], u'fk')
    u'individual_mother_fk'

The separator is always large enough so that it is not contained in any of the
fragments::

    >>> mangle([u'individual', u'adopted_father'])
    u'individual__adopted_father'

Names which could collide with some other generated name are mangled::

    >>> mangle(u'remote_id')
    u'remote_id__161172'

Names that are too long are truncated and mangled as well::

    >>> mangle([u'very']+[u'long']*100+[u'name'])
    u'very_long_long___long_long_long_long_long_long_long_name_6c78ff'
    >>> len(_)
    63


Quoting names and values
========================

Use function ``sql_name()`` to quote SQL identifiers::

    >>> from rex.deploy import sql_name

    >>> print sql_name(u'individual')
    "individual"

The ``"`` character is properly escaped::

    >>> print sql_name('"name in quotes"')
    """name in quotes"""

``sql_name()`` also accepts a list of identifiers and produces a
comma-separated sequence::

    >>> print sql_name([u'code', u'title'])
    "code", "title"

Use function ``sql_value()`` to make a SQL literal::

    >>> from rex.deploy import sql_value

    >>> print sql_value(u'Hello World!')
    'Hello World!'

``sql_value()`` converts ``None``, ``True`` and ``False`` to appropriate SQL
constants::

    >>> print sql_value(None)
    NULL
    >>> print sql_value(True)
    TRUE
    >>> print sql_value(False)
    FALSE

``sql_value()`` accepts numeric values of different types::

    >>> print sql_value(3)
    3
    >>> print sql_value(3.0)
    3.0
    >>> import decimal
    >>> print sql_value(decimal.Decimal('3.0'))
    3.0

Date, time and datetime values are also accepted::

    >>> import datetime
    >>> print sql_value(datetime.date(2010, 4, 15))
    '2010-04-15'
    >>> print sql_value(datetime.time(20, 13))
    '20:13:00'
    >>> print sql_value(datetime.datetime(2010, 4, 15, 20, 13))
    '2010-04-15 20:13:00'

You can also generate a SQL expression for the current date and timestamp::

    >>> print sql_value(datetime.date.today)
    'now'::text::date
    >>> print sql_value(datetime.datetime.now)
    'now'::text::timestamp

Text values are escaped properly::

    >>> print sql_value(u'RexDB')
    'RexDB'
    >>> print sql_value(u'O\'Rex')
    'O''Rex'
    >>> print sql_value(u'\\Rex')
    E'\\Rex'

A list is converted to a comma-separated sequence::

    >>> print sql_value([u'male', u'female', u'intersex'])
    'male', 'female', 'intersex'

Values of any other type are rejected::

    >>> print sql_value({})
    Traceback (most recent call last):
      ...
    NotImplementedError: sql_value() is not implemented for value {} of type dict


