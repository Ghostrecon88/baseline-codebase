*******************
  Deploying links
*******************

.. contents:: Table of Contents


Parsing link record
===================

Start with creating a test database and a driver::

    >>> from rex.deploy import Cluster
    >>> cluster = Cluster('pgsql:deploy_demo_link')
    >>> cluster.overwrite()
    >>> driver = cluster.drive(logging=True)

Link facts are denoted by field ``link``::

    >>> driver.parse("""{ link: sample.individual }""")
    LinkFact(u'sample', u'individual', u'individual')

The origin of the link could be set as a prefix of the ``link`` field
or as a separate ``of`` field::

    >>> driver.parse("""{ link: individual, of: sample }""")
    LinkFact(u'sample', u'individual', u'individual')

It is an error if ``link`` has no prefix and ``of`` is not specified.
It is also an error if they are both specified::

    >>> driver.parse("""{ link: individual }""")
    Traceback (most recent call last):
      ...
    Error: Got missing table name
    While parsing link fact:
        "<byte string>", line 1

    >>> driver.parse("""{ link: sample.individual, of: measure }""")
    Traceback (most recent call last):
      ...
    Error: Got mismatched table names:
        sample, measure
    While parsing link fact:
        "<byte string>", line 1

The target of the link could be omitted if its name coincides with
the link name.  Otherwise, it could be set using ``to`` field::

    >>> driver.parse("""{ link: individual.mother, to: individual }""")
    LinkFact(u'individual', u'mother', u'individual')

You can indicate any old names of the link using ``was`` clause::

    >>> driver.parse("""{ link: measure.individual, was: subject }""")
    LinkFact(u'measure', u'individual', u'individual', former_labels=[u'subject'])

    >>> driver.parse("""{ link: individual.birth_mother, was: [parent, mother], to: individual }""")
    LinkFact(u'individual', u'birth_mother', u'individual', former_labels=[u'parent', u'mother'])

By default, a link does not permit ``NULL`` values.  Turn off flag
``required`` to allow ``NULL`` values::

    >>> driver.parse("""{ link: sample.individual, required: false }""")
    LinkFact(u'sample', u'individual', u'individual', is_required=False)

You can explicitly specify the link title::

    >>> driver.parse("""{ link: sample.individual, title: Subject }""")
    LinkFact(u'sample', u'individual', u'individual', title=u'Subject')

Turn off flag ``present`` to indicate that the link should not exist::

    >>> driver.parse("""{ link: individual.code, present: false }""")
    LinkFact(u'individual', u'code', is_present=False)

Field ``present: false`` cannot coexist with other link parameters::

    >>> driver.parse("""{ link: individual.mother, to: individual, present: false }""")
    Traceback (most recent call last):
      ...
    Error: Got unexpected clause:
        to
    While parsing link fact:
        "<byte string>", line 1


Creating the link
=================

Deploying a link fact creates a column and a foreign key::

    >>> driver("""
    ... - { table: individual }
    ... - { table: sample }
    ... - { link: sample.individual }
    ... - { column: sample.code, type: text }
    ... - { identity: [sample.individual, sample.code: offset] }
    ... """)                                            # doctest: +ELLIPSIS
    CREATE TABLE "individual" ...
    CREATE TABLE "sample" ...
    ALTER TABLE "sample" ADD COLUMN "individual_id" "int4" NOT NULL;
    ALTER TABLE "sample" ADD CONSTRAINT "sample_individual_fk" FOREIGN KEY ("individual_id") REFERENCES "individual" ("id") ON DELETE SET DEFAULT;
    CREATE INDEX "sample_individual_fk" ON "sample" ("individual_id");
    ...

    >>> schema = driver.get_schema()
    >>> sample_table = schema[u'sample']
    >>> u'individual_id' in sample_table
    True

Deploying the same fact the second time has no effect::

    >>> driver("""{ link: sample.individual }""")

The title of the link is stored in the column comment::

    >>> driver("""{ link: sample.individual, title: Subject }""")
    COMMENT ON COLUMN "sample"."individual_id" IS '---
    title: Subject
    ';

You can specify the default value for a link field.  For this to work,
the target table must have an identity::

    >>> driver("""
    ... - { table: site }
    ... - { column: site.code, type: text }
    ... - { link: individual.site, default: main }
    ... """)                                            # doctest: +ELLIPSIS
    Traceback (most recent call last):
      ...
    Error: Got ill-formed link value:
        site[main]
    While deploying link fact:
        "<byte string>", line 4

As well as the target row must exist::

    >>> driver("""
    ... - { identity: [site.code] }
    ... - { link: individual.site, default: main }
    ... """)                                            # doctest: +ELLIPSIS
    Traceback (most recent call last):
      ...
    Error: Cannot find link:
        site[main]
    While deploying link fact:
        "<byte string>", line 3

It is an error if the link value is malformed::

    >>> driver("""
    ... - { data: { code: main }, of: site }
    ... - { link: individual.site, default: main.1 }
    ... """)                                            # doctest: +ELLIPSIS
    Traceback (most recent call last):
      ...
    Error: Got ill-formed link value:
        site[main.1]
    While deploying link fact:
        "<byte string>", line 3

If the target row exists, the default value can be set::

    >>> driver("""
    ... { link: individual.site, default: main }
    ... """)                                            # doctest: +ELLIPSIS
    ALTER TABLE "individual" ADD COLUMN "site_id" "int4" NOT NULL DEFAULT 1;
    ...
    COMMENT ON COLUMN "individual"."site_id" IS '---
    default: main
    ';

Unsetting the default value removes it::

    >>> driver("""{ link: individual.site }""")
    ALTER TABLE "individual" ALTER COLUMN "site_id" DROP DEFAULT;
    COMMENT ON COLUMN "individual"."site_id" IS NULL;

The driver cannot create the link if either the origin or the target
table does not exist::

    >>> driver("""{ link: measure.individual }""")
    Traceback (most recent call last):
      ...
    Error: Discovered missing table:
        measure
    While deploying link fact:
        "<byte string>", line 1

    >>> driver("""{ link: individual.family }""")
    Traceback (most recent call last):
      ...
    Error: Discovered missing table:
        family
    While deploying link fact:
        "<byte string>", line 1

An error is raised if the target table has no ``id`` column::

    >>> driver.submit("""CREATE TABLE family (familyid int4 NOT NULL);""")
    CREATE TABLE family (familyid int4 NOT NULL);
    >>> driver.reset()
    >>> driver("""{ link: individual.family }""")
    Traceback (most recent call last):
      ...
    Error: Discovered table without surrogate key:
        family
    While deploying link fact:
        "<byte string>", line 1

If the link column exists, the driver verifies that is has a correct type and
``NOT NULL`` constraint and, if necessary, changes them::

    >>> driver("""{ link: sample.individual, title: Subject, required: false }""")
    ALTER TABLE "sample" DROP CONSTRAINT "sample_pk";
    DROP TRIGGER "sample_pk" ON "sample";
    DROP FUNCTION "sample_pk"();
    ALTER TABLE "sample" DROP CONSTRAINT "sample_individual_fk";
    ALTER TABLE "sample" ADD CONSTRAINT "sample_individual_fk" FOREIGN KEY ("individual_id") REFERENCES "individual" ("id") ON DELETE SET DEFAULT;
    ALTER TABLE "sample" ALTER COLUMN "individual_id" DROP NOT NULL;


Similarly, it may apply a ``UNIQUE`` constraint::

    >>> driver("""{ link: sample.individual, title: Subject, unique: true }""")
    ALTER TABLE "sample" ALTER COLUMN "individual_id" SET NOT NULL;
    DROP INDEX "sample_individual_fk";
    ALTER TABLE "sample" ADD CONSTRAINT "sample_individual_uk" UNIQUE ("individual_id");

    >>> driver("""{ link: sample.individual, title: Subject, unique: false }""")
    ALTER TABLE "sample" DROP CONSTRAINT "sample_individual_uk";
    CREATE INDEX "sample_individual_fk" ON "sample" ("individual_id");

You cannot create a link if there is a regular column with the same name::

    >>> driver("""
    ... - { table: identity }
    ... - { column: identity.individual, type: text }
    ... - { link: identity.individual }
    ... """)
    Traceback (most recent call last):
      ...
    Error: Discovered column with the same name:
        individual
    While deploying link fact:
        "<byte string>", line 4


Renaming the link
=================

To rename a link, specify the current name as ``was`` field and the new name as
``link`` field::

    >>> driver("""{ link: sample.subject, to: individual, was: individual }""")
    ALTER TABLE "sample" RENAME COLUMN "individual_id" TO "subject_id";
    ALTER TABLE "sample" RENAME CONSTRAINT "sample_individual_fk" TO "sample_subject_fk";
    ALTER INDEX "sample_individual_fk" RENAME TO "sample_subject_fk";
    COMMENT ON COLUMN "sample"."subject_id" IS NULL;

Applying the same fact second time will have no effect::

    >>> driver("""{ link: sample.subject, to: individual, was: individual }""")


Dropping the link
=================

We can use link facts to drop a ``FOREIGN KEY`` constraint and associated
column::

    >>> driver("""{ link: sample.subject, present: false }""")
    ALTER TABLE "sample" DROP COLUMN "subject_id";

    >>> schema = driver.get_schema()
    >>> sample_table = schema[u'sample']
    >>> u'individual_id' in sample_table
    False

Deploing the same fact again has no effect::

    >>> driver("""{ link: sample.subject, present: false }""")

Deleting a link from a table which does not exist is NOOP::

    >>> driver("""{ link: measure.subject, present: false }""")

You cannot delete a link if there is a regular column with the same name::

    >>> driver("""{ link: identity.individual, present: false }""")
    Traceback (most recent call last):
      ...
    Error: Discovered column with the same name:
        individual
    While deploying link fact:
        "<byte string>", line 1

Finally, we drop the test database::

    >>> driver.close()
    >>> cluster.drop()


