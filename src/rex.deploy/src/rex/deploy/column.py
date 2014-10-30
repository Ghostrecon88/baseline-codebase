#
# Copyright (c) 2013, Prometheus Research, LLC
#


from rex.core import (Error, AnyVal, BoolVal, UStrVal, UChoiceVal, SeqVal,
        OneOrSeqVal, UnionVal, OnSeq)
from .fact import Fact, LabelVal, QLabelVal, TitleVal
from .model import model, ColumnModel
from htsql.core.domain import (UntypedDomain, BooleanDomain, IntegerDomain,
        DecimalDomain, FloatDomain, TextDomain, DateDomain, TimeDomain,
        DateTimeDomain, EnumDomain)
import datetime


class ColumnFact(Fact):
    """
    Describes a table column.

    `table_label`: ``unicode``
        Table name.
    `label`: ``unicode``
        The name of the column.
    `type`: *type name* or [``unicode``]
        The type of the column; one of: *boolean*, *integer*,
        *decimal*, *float*, *text*, *date*, *time*, *datetime*.
        For an ``ENUM`` type, specify a list of ``ENUM`` labels.
    `default`: literal value compatible with the column type
        Column default value.
    `former_labels`: [``unicode``]
        Names that the column may had in the past.
    `is_required`: ``bool``
        Indicates if ``NULL`` values are not allowed.
    `is_unique`: ``bool``
        Indicates that each value must be unique across all rows in the table.
    `title`: ``unicode`` or ``None``
        The title of the column.  If not set, generated from the label.
    `is_present`: ``bool``
        Indicates whether the column exists.
    """

    TYPE_MAP = ColumnModel.data.TYPE_MAP
    DOMAIN_MAP = ColumnModel.data.DOMAIN_MAP

    fields = [
            ('column', QLabelVal),
            ('of', LabelVal, None),
            ('was', OneOrSeqVal(LabelVal), None),
            ('after', OneOrSeqVal(LabelVal), None),
            ('type', UnionVal((OnSeq, SeqVal(UStrVal(r'[0-9A-Za-z_-]+'))),
                              UChoiceVal(*sorted(TYPE_MAP))), None),
            ('default', AnyVal, None),
            ('required', BoolVal, None),
            ('unique', BoolVal, None),
            ('title', TitleVal, None),
            ('present', BoolVal, True),
    ]

    @classmethod
    def build(cls, driver, spec):
        if not spec.present:
            for field in ['was', 'after', 'type', 'default',
                          'required', 'unique', 'title']:
                if getattr(spec, field) is not None:
                    raise Error("Got unexpected clause:", field)
        if u'.' in spec.column:
            table_label, label = spec.column.split(u'.')
            if spec.of is not None and spec.of != table_label:
                raise Error("Got mismatched table names:",
                            ", ".join((table_label, spec.of)))
        else:
            label = spec.column
            table_label = spec.of
            if spec.of is None:
                raise Error("Got missing table name")
        is_present = spec.present
        if isinstance(spec.was, list):
            former_labels = spec.was
        elif spec.was:
            former_labels = [spec.was]
        else:
            former_labels = []
        type = spec.type
        domain = UntypedDomain()
        if isinstance(type, list):
            domain = EnumDomain(type)
        elif type is not None:
            domain = cls.DOMAIN_MAP[type]
        default = spec.default
        if isinstance(default, str):
            default = default.decode('utf-8', 'replace')
        if isinstance(default, unicode):
            try:
                default = domain.parse(default)
            except ValueError:
                pass
        title = spec.title
        if is_present:
            if type is None:
                raise Error("Got missing clause:", "type")
            if isinstance(type, list):
                if len(type) == 0:
                    raise Error("Got missing enum labels")
                if len(set(type)) < len(type):
                    raise Error("Got duplicate enum labels:",
                                ", ".join(type))
            if not (default is None or
                    (type == u'boolean' and
                        isinstance(default, bool)) or
                    (type == u'integer' and
                        isinstance(default, (int, long))) or
                    (type in (u'decimal', u'float') and
                        isinstance(default, (int, long,
                                             decimal.Decimal, float))) or
                    (type == u'text' and
                        isinstance(default, unicode)) or
                    (type == u'date' and
                        isinstance(default, datetime.date)) or
                    (type == u'date' and
                        default == u'today()') or
                    (type == u'time' and
                        isinstance(default, datetime.time)) or
                    (type == u'datetime' and
                        isinstance(default, datetime.datetime)) or
                    (type == u'datetime' and
                        default == u'now()') or
                    (isinstance(type, list) and
                        isinstance(default, unicode) and default in type)):
                raise Error("Got ill-typed default value:", default)
        is_required = spec.required
        is_unique = spec.unique
        return cls(table_label, label, former_labels=former_labels,
                   title=title, type=type, default=default,
                   is_required=is_required, is_unique=is_unique,
                   is_present=is_present)

    def __init__(self, table_label, label, type=None, default=None,
                 former_labels=[], is_required=None, is_unique=None,
                 title=None, is_present=True):
        assert isinstance(table_label, unicode) and len(table_label) > 0
        assert isinstance(label, unicode) and len(label) > 0
        assert isinstance(is_present, bool)
        if is_present:
            assert (isinstance(former_labels, list) and
                    all(isinstance(former_label, unicode)
                        for former_label in former_labels))
            assert (isinstance(type, unicode) and type in self.TYPE_MAP or
                    isinstance(type, list) and len(type) > 0 and
                    all(isinstance(label, unicode) and len(label) > 0
                        for label in type) and
                    len(set(type)) == len(type))
            if is_required is None:
                is_required = True
            assert isinstance(is_required, bool)
            if is_unique is None:
                is_unique = False
            assert isinstance(is_unique, bool)
            assert (title is None or
                    (isinstance(title, unicode) and len(title) > 0))
        else:
            assert former_labels == []
            assert type is None
            assert default is None
            assert is_required is None
            assert is_unique is None
            assert title is None
        self.table_label = table_label
        self.label = label
        self.type = type
        self.default = default
        self.former_labels = former_labels
        self.is_required = is_required
        self.is_unique = is_unique
        self.title = title
        self.is_present = is_present

    def __repr__(self):
        args = []
        args.append(repr(self.table_label))
        args.append(repr(self.label))
        if self.type is not None:
            args.append(repr(self.type))
        if self.default is not None:
            args.append("default=%r" % self.default)
        if self.former_labels:
            args.append("former_labels=%r" % self.former_labels)
        if self.is_required is not None and self.is_required is not True:
            args.append("is_required=%r" % self.is_required)
        if self.is_unique is not None and self.is_unique is not False:
            args.append("is_unique=%r" % self.is_unique)
        if self.title is not None:
            args.append("title=%r" % self.title)
        if not self.is_present:
            args.append("is_present=%r" % self.is_present)
        return "%s(%s)" % (self.__class__.__name__, ", ".join(args))

    def __call__(self, driver):
        schema = model(driver)
        table = schema.table(self.table_label)
        if not table:
            if self.is_present:
                raise Error("Discovered missing table:", self.table_label)
            return
        column = table.column(self.label)
        if not column:
            if table.link(self.label):
                raise Error("Discovered link with the same name:", self.label)
            for former_label in self.former_labels:
                column = table.column(former_label)
                if column:
                    break
        if self.is_present:
            if column:
                column.modify(
                        label=self.label,
                        type=self.type,
                        default=self.default,
                        is_required=self.is_required,
                        is_unique=self.is_unique,
                        title=self.title)
            else:
                table.build_column(
                        label=self.label,
                        type=self.type,
                        default=self.default,
                        is_required=self.is_required,
                        is_unique=self.is_unique,
                        title=self.title)
        else:
            if column:
                column.erase()


