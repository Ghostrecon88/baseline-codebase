#
# Copyright (c) 2014, Prometheus Research, LLC
#


import sys

from cogs import task, argument, option
from cogs.log import fail

from rex.core import get_settings
from rex.ctl.common import make_rex, pair

from .errors import ValidationError
from .interface import Form


__all__ = (
    'FORMS_VALIDATE',
    'FORMS_RETRIEVE',
    'FORMS_STORE',
)


# pylint: disable=C0103


class FormsTaskTools(object):
    """
    This is a mixin class containing utility functions for the rex.forms
    rex.ctl tasks.
    """

    def open_and_validate(self, filename):
        try:
            configuration = open(filename, 'r').read()
        except Exception as exc:
            raise fail('Could not open "%s": %s' % (
                filename,
                str(exc),
            ))

        try:
            Form.validate_configuration(configuration)
        except ValidationError as exc:
            raise fail(exc.message)

        return configuration


@task
class FORMS_VALIDATE(FormsTaskTools):
    """
    validate a Web Form Configuration

    The forms-validate task will validate the structure and content of the
    Web Form Configuration in a JSON file and report back if any errors
    are found.

    The only argument to this task is the filename to validate.
    """

    configuration = argument(str)

    def __init__(self, configuration):
        self.configuration = configuration

    def __call__(self):
        self.open_and_validate(self.configuration)

        print '"%s" contains a valid Web Form Configuration.\n' % (
            self.configuration,
        )


class FormsInstanceTask(object):
    require = option(
        None,
        str,
        default=[],
        plural=True,
        value_name='PACKAGE',
        hint='include an additional package',
    )
    setting = option(
        None,
        pair,
        default={},
        plural=True,
        value_name='PARAM=VALUE',
        hint='set a configuration parameter',
    )

    def __init__(self, project, require, setting):
        self.project = project
        self.require = require
        self.setting = setting

    def get_rex(self):
        return make_rex(
            self.project,
            self.require,
            self.setting,
            False,
            ensure='rex.forms',
        )


@task
class FORMS_RETRIEVE(FormsInstanceTask):
    """
    retrieves a Form from the datastore

    The forms-retrieve task will retrieve a Form from a project's data store
    and return the Web Form Configuration JSON.

    The instrument-uid argument is the UID of the desired Instrument in the
    data store.

    The channel-uid argument is the UID of the Channel that the Form is
    assigned to.
    """

    instrument_uid = argument(str)
    channel_uid = argument(str)
    project = argument(str, default=None)

    version = option(
        None,
        str,
        default=None,
        value_name='VERSION',
        hint='the version of the Instrument to retrieve; if not specified,'
        ' defaults to the latest version',
    )
    output = option(
        None,
        str,
        default=None,
        value_name='OUTPUT_FILE',
        hint='the file to write the JSON to; if not specified, stdout is used',
    )

    def __init__(
            self,
            instrument_uid,
            channel_uid,
            project,
            require,
            setting,
            version,
            output):
        super(FORMS_RETRIEVE, self).__init__(
            project,
            require,
            setting,
        )
        self.instrument_uid = instrument_uid
        self.channel_uid = channel_uid
        self.version = version
        self.output = output

    def __call__(self):
        with self.get_rex():
            instrument_impl = get_settings() \
                .instrument_implementation.instrument
            channel_impl = get_settings().forms_implementation.channel
            form_impl = get_settings().forms_implementation.form

            instrument = instrument_impl.get_by_uid(self.instrument_uid)
            if not instrument:
                raise fail('Instrument "%s" does not exist.' % (
                    self.instrument_uid,
                ))

            if not self.version:
                instrument_version = instrument.get_latest_version()
            else:
                instrument_version = instrument.get_version(self.version)
            if not instrument_version:
                raise fail('The desired version of "%s" does not exist.' % (
                    self.instrument_uid,
                ))

            channel = channel_impl.get_by_uid(self.channel_uid)
            if not channel:
                raise fail('Channel "%s" does not exist.' % (
                    self.channel_uid,
                ))

            form = form_impl.find(
                instrument_version=instrument_version,
                channel=channel,
                limit=1
            )
            if form:
                form = form[0]
            else:
                raise fail(
                    'No Form exists for Instrument "%s", Version %s,'
                    ' Channel "%s"' % (
                        instrument.uid,
                        instrument_version.version,
                        channel.uid,
                    )
                )

            if self.output:
                try:
                    output = open(self.output, 'w')
                except Exception as exc:
                    raise fail('Could not open "%s" for writing: %s' % (
                        self.output,
                        str(exc),
                    ))
            else:
                output = sys.stdout

            output.write(form.configuration_json)
            output.write('\n')


@task
class FORMS_STORE(FormsInstanceTask, FormsTaskTools):
    """
    stores a Form in the data store

    The forms-store task will write a Web Form Configuration JSON file to a
    Form in the project's data store.

    The instrument-uid argument is the UID of the desired Instrument that the
    Form will be associated with.

    The channel-uid argument is the UID of the Channel that the Form will be
    associated with.

    The configuration is the path to the JSON file containing the Web Form
    Configuration to use.
    """

    instrument_uid = argument(str)
    channel_uid = argument(str)
    configuration = argument(str)
    project = argument(str, default=None)

    version = option(
        None,
        str,
        default=None,
        value_name='VERSION',
        hint='the version of the Instrument to associate the Form with; if not'
        ' specified, then the latest version will be used',
    )

    def __init__(
            self,
            instrument_uid,
            channel_uid,
            configuration,
            project,
            require,
            setting,
            version):
        super(FORMS_STORE, self).__init__(
            project,
            require,
            setting,
        )
        self.instrument_uid = instrument_uid
        self.channel_uid = channel_uid
        self.configuration = configuration
        self.version = version

    def __call__(self):
        with self.get_rex():
            instrument_impl = get_settings() \
                .instrument_implementation.instrument
            channel_impl = get_settings().forms_implementation.channel
            form_impl = get_settings().forms_implementation.form

            configuration_json = self.open_and_validate(self.configuration)

            instrument = instrument_impl.get_by_uid(self.instrument_uid)
            if not instrument:
                raise fail('Instrument "%s" does not exist.' % (
                    self.instrument_uid,
                ))
            print 'Using Instrument: %s' % instrument

            if not self.version:
                instrument_version = instrument.get_latest_version()
            else:
                instrument_version = instrument.get_version(self.version)
            if not instrument_version:
                raise fail('The desired version of "%s" does not exist.' % (
                    self.instrument_uid,
                ))
            print 'Instrument Version: %s' % instrument_version.version

            channel = channel_impl.get_by_uid(self.channel_uid)
            if not channel:
                raise fail('Channel "%s" does not exist.' % (
                    self.channel_uid,
                ))
            print 'Using Channel: %s' % channel

            form = form_impl.find(
                instrument_version=instrument_version,
                channel=channel,
                limit=1
            )
            if form:
                form[0].configuration_json = configuration_json
                form[0].save()
                print 'Updated existing Form'
            else:
                form = form_impl.create(
                    channel,
                    instrument_version,
                    configuration_json,
                )
                print 'Created new Form'

