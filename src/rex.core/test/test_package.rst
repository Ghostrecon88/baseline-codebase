************
  Packages
************

.. contents:: Table of Contents


``get_packages()``
==================

Use function ``get_packages()`` to get a collection of packages that form the
active application::

    >>> from rex.core import Rex, get_packages

    >>> demo = Rex('rex.core_demo')
    >>> with demo:
    ...     packages = get_packages()
    >>> packages    # doctest: +ELLIPSIS, +NORMALIZE_WHITESPACE
    PackageCollection([Package('rex.core_demo',
                               modules=set(['rex.core_demo']),
                               static='/.../share/rex/rex.core_demo'),
                       Package('rex.core',
                               modules=set([...]))])

Package collection provides container interface::

    >>> for package in packages:
    ...     print package.name
    rex.core_demo
    rex.core
    >>> for package in reversed(packages):
    ...     print package.name
    rex.core
    rex.core_demo

    >>> len(packages)
    2

    >>> packages[0].name
    'rex.core_demo'
    >>> packages['rex.core_demo'].name
    'rex.core_demo'
    >>> packages.get('rex.core_demo').name
    'rex.core_demo'

    >>> packages['unknown']
    Traceback (most recent call last):
      ...
    KeyError: 'unknown'
    >>> packages.get('unknown')
    >>> packages.get('unknown', packages['rex.core_demo']).name
    'rex.core_demo'

The order of packages in the collection respects package dependencies::

    >>> with Rex('rex.core_demo', 'rex.core'):
    ...     print get_packages()        # doctest: +ELLIPSIS
    PackageCollection([Package('rex.core_demo', ...), Package('rex.core', ...)])
    >>> with Rex('rex.core', 'rex.core_demo'):
    ...     print get_packages()        # doctest: +ELLIPSIS
    PackageCollection([Package('rex.core_demo', ...), Package('rex.core', ...)])

Attribute ``PackageCollection.modules`` is a set of all modules where Rex would
look for extensions::

    >>> packages.modules    # doctest: +ELLIPSIS
    set([..., 'rex.core_demo', ...])


Constructing package collection
===============================

Package collection is constructed from requirements passed to the ``Rex`` constructor.
A requirement could be one of the following:

* a requirement string in format understood by ``setuptools``;
* a module name;
* a directory;
* a ``Package`` object.

::

    >>> with Rex('rex.core_demo>=1.0'):
    ...     for package in get_packages():
    ...         print package       # doctest: +ELLIPSIS
    Package('rex.core_demo', modules=set(['rex.core_demo']), static='/.../share/rex/rex.core_demo')
    Package('rex.core', modules=set([..., 'rex.core', ...]))

    >>> with Rex('__main__'):
    ...     for package in get_packages():
    ...         print package       # doctest: +ELLIPSIS
    ModulePackage('__main__', modules=set(['__main__']))
    Package('rex.core', modules=set([..., 'rex.core', ...]))

    >>> with Rex('./test/data/empty_setting/'):
    ...     for package in get_packages():
    ...         print package       # doctest: +ELLIPSIS
    StaticPackage('empty_setting', static='./test/data/empty_setting/')
    Package('rex.core', modules=set([..., 'rex.core', ...]))

    >>> from rex.core import Package
    >>> with Rex(Package('rex.core_demo', modules=set(['rex.core_demo']),
    ...                                   static='./demo/rex.core_demo/static')):
    ...     for package in get_packages():
    ...         print package       # doctest: +ELLIPSIS
    Package('rex.core_demo', modules=set(['rex.core_demo']), static='./demo/rex.core_demo/static')
    Package('rex.core', modules=set([..., 'rex.core', ...]))

An exception is raised if the package name is ill-formed or unknown::

    >>> Rex('rex.bro ken')
    Traceback (most recent call last):
      ...
    Error: Got ill-formed requirement:
        rex.bro ken
    While initializing Rex application:
        rex.bro ken
    >>> Rex('rex.unknown')
    Traceback (most recent call last):
      ...
    Error: Failed to satisfy requirement:
        rex.unknown
    While initializing Rex application:
        rex.unknown


Resource files
==============

``Package`` objects provide API for accessing package resources::

    >>> with demo:
    ...     core_package = get_packages()['rex.core']
    ...     demo_package = get_packages()['rex.core_demo']

``Package.abspath()`` returns real absolute path for a static resource.  The
file does not have to exist, but must reside in the static directory of the
package::

    >>> demo_package.abspath('www/index.html')      # doctest: +ELLIPSIS
    '/.../share/rex/rex.core_demo/www/index.html'
    >>> demo_package.abspath('/www/index.html')     # doctest: +ELLIPSIS
    '/.../share/rex/rex.core_demo/www/index.html'
    >>> demo_package.abspath('missing.txt')         # doctest: +ELLIPSIS
    '/.../share/rex/rex.core_demo/missing.txt'
    >>> demo_package.abspath('../../../../etc/passwd') is None
    True
    >>> core_package.abspath('missing.txt') is None
    True

``Package.exists()`` returns ``True`` if the path refers to an existing file or
directory::

    >>> demo_package.exists('www')
    True
    >>> demo_package.exists('www/index.html')
    True
    >>> demo_package.exists('missing.txt')
    False
    >>> demo_package.exists('../../../../etc/passwd')
    False

``Package.open()`` opens a static resource::

    >>> demo_package.open('www/index.html')         # doctest: +ELLIPSIS
    <open file '/.../share/rex/rex.core_demo/www/index.html', mode 'r' at ...>
    >>> demo_package.open('missing.txt')            # doctest: +ELLIPSIS
    Traceback (most recent call last):
      ...
    IOError: [Errno 2] No such file or directory: '/.../share/rex/rex.core_demo/missing.txt'
    >>> demo_package.open('../README')
    Traceback (most recent call last):
      ...
    AssertionError: ../README

``Package.walk()`` iterates over a directory tree::

    >>> for root, directories, files in demo_package.walk('/'):
    ...     print "%s:" % root
    ...     for directory in directories:
    ...         print "  %s/" % directory
    ...     for file in files:
    ...         print "  %s" % file                 # doctest: +ELLIPSIS
    /.../share/rex/rex.core_demo:
      www/
    /.../share/rex/rex.core_demo/www:
      index.html

Package collection supports similar API, but expects the package name included
with the path::

    >>> packages.abspath('rex.core_demo:www/index.html')    # doctest: +ELLIPSIS
    '/.../share/rex/rex.core_demo/www/index.html'
    >>> packages.abspath('rex.core_demo:/www/index.html')   # doctest: +ELLIPSIS
    '/.../share/rex/rex.core_demo/www/index.html'
    >>> packages.abspath('rex.core_demo:missing.txt')       # doctest: +ELLIPSIS
    '/.../share/rex/rex.core_demo/missing.txt'
    >>> packages.abspath('rex.core_demo:/../../../../etc/passwd') is None
    True
    >>> packages.abspath('rex.core:missing.txt') is None
    True
    >>> packages.abspath('rex.unknown:missing.txt')
    Traceback (most recent call last):
      ...
    AssertionError: unknown package name in path: 'rex.unknown:missing.txt'
    >>> packages.abspath('ill-formed.txt')
    Traceback (most recent call last):
      ...
    AssertionError: missing package name in path: 'ill-formed.txt'

    >>> packages.exists('rex.core_demo:/www')
    True
    >>> packages.exists('rex.core_demo:/www/index.html')
    True
    >>> packages.exists('rex.core_demo:missing.txt')
    False
    >>> packages.exists('rex.core_demo:/../../../../etc/passwd')
    False

    >>> packages.open('rex.core_demo:/www/index.html')  # doctest: +ELLIPSIS
    <open file '/.../share/rex/rex.core_demo/www/index.html', mode 'r' at ...>
    >>> packages.open('rex.core_demo:missing.txt')      # doctest: +ELLIPSIS
    Traceback (most recent call last):
      ...
    IOError: [Errno 2] No such file or directory: '/.../share/rex/rex.core_demo/missing.txt'
    >>> packages.open('rex.core_demo:../README')
    Traceback (most recent call last):
      ...
    AssertionError: ../README

    >>> for root, directories, files in packages.walk('rex.core_demo:'):
    ...     print "%s:" % root
    ...     for directory in directories:
    ...         print "  %s/" % directory
    ...     for file in files:
    ...         print "  %s" % file                 # doctest: +ELLIPSIS
    /.../share/rex/rex.core_demo:
      www/
    /.../share/rex/rex.core_demo/www:
      index.html


