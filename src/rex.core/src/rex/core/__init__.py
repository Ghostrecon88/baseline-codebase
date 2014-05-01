#
# Copyright (c) 2013-2014, Prometheus Research, LLC
#


"""
This package provides the foundation of the RexDB platform: initialization,
extension mechanism, configuration management, base exception object,
validating utilities.
"""


from .application import Rex, LatentRex, Initialize
from .cache import cached, autoreload
from .context import get_rex
from .error import Error, guard
from .extension import Extension
from .package import (
    Package, ModulePackage, StaticPackage, SandboxPackage, PackageCollection,
    get_packages)
from .setting import Setting, SettingCollection, get_settings
from .validate import (
    ValidatingLoader, Validate, AnyVal, ProxyVal, MaybeVal, OneOfVal, StrVal,
    UStrVal, ChoiceVal, UChoiceVal, BoolVal, IntVal, UIntVal, PIntVal, SeqVal,
    OneOrSeqVal, MapVal, OMapVal, RecordVal, SwitchVal, UnionVal, OnMatch,
    OnScalar, OnSeq, OnMap, OnField, Record, Location, set_location, locate)
from .wsgi import WSGI, get_wsgi


