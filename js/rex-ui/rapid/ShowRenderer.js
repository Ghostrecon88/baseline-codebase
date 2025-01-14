/**
 * @flow
 */

import * as React from "react";
import invariant from "invariant";
import classNames from "classnames";

import { makeStyles, useTheme } from "../Theme.js";

import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";

import {
  type Resource,
  unstable_useResource as useResource,
} from "rex-graphql/Resource";
import { RenderValue } from "./RenderValue.js";
import * as Field from "./Field.js";
import * as QueryPath from "./QueryPath.js";

export type ShowRenderTitle = React.AbstractComponent<{| data: any |}>;

export type ShowRendererConfigProps = {|
  RenderTitle?: ?ShowRenderTitle,
  RenderToolbar?: ?RenderToolbar,
|};

export type RenderToolbarProps = {|
  data: any,
  onAdd?: () => void,
  onRemove?: () => void,
|};

export type RenderToolbar = React.AbstractComponent<RenderToolbarProps>;

export type ShowRendererProps = {|
  resource: Resource<any, any>,
  path: QueryPath.QueryPath,
  args?: { [key: string]: any },
  catcher?: (err: Error) => void,
  fieldSpecs: { [name: string]: Field.FieldSpec },
  titleField?: ?Field.FieldConfig,
  onClick?: (row: any) => void,
  onAdd?: () => void,
  onRemove?: () => void,

  ...ShowRendererConfigProps,
|};

export let ShowRenderer = (props: ShowRendererProps) => {
  let {
    resource,
    path,
    args = {},
    RenderTitle,
    fieldSpecs,
    titleField,
    onClick,
    RenderToolbar,
    onAdd,
    onRemove,
  } = props;

  let resourceData = useResource(resource, { ...args });

  if (resourceData == null) {
    return <ShowCard404 />;
  }

  let data = resourceData;
  for (let seg of QueryPath.toArray(path)) {
    data = data[seg];
    if (data == null) {
      return <ShowCard404 />;
    }
  }

  let title = null;
  if (RenderTitle != null) {
    title = <RenderTitle data={data} />;
  }

  return (
    <ShowCard
      onClick={onClick}
      title={title}
      data={data}
      fieldSpecs={fieldSpecs}
      titleField={titleField}
      toolbar={
        RenderToolbar != null ? (
          <RenderToolbar data={data} onAdd={onAdd} onRemove={onRemove} />
        ) : null
      }
    />
  );
};

let useStyles = makeStyles(theme => ({
  root: {
    width: "100%",
    marginTop: theme.spacing.unit,
    overflowX: "auto",
  },
  cardClickable: {
    cursor: "pointer",
    "&:hover": {
      opacity: 0.9,
    },
  },
  title: {
    marginBottom: theme.spacing.unit * 2,
  },
  titleSmall: {
    fontSize: 16,
  },
  contentWrapper: {
    marginBottom: "16px",
    wordBreak: "break-word",
  },
}));

export const ShowCard404 = () => {
  let classes = useStyles();

  return (
    <Grid>
      <Grid item xs={12}>
        <Paper className={classes.root}>
          <Card raised={false}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                className={classes.titleSmall}
              >
                Not found
              </Typography>
            </CardContent>
          </Card>
        </Paper>
      </Grid>
    </Grid>
  );
};

export let ShowCard = ({
  data,
  title,
  fieldSpecs,
  titleField,
  onClick,
  toolbar,
}: {|
  data: any,
  title: React.Node,
  fieldSpecs: { [name: string]: Field.FieldSpec },
  titleField?: ?Field.FieldConfig,

  onClick?: () => void,
  toolbar?: React.Node,
|}) => {
  let classes = useStyles();

  let titleFieldName: string | null = null;
  if (titleField != null) {
    // Flow couldn't resolve switch/case types
    if (typeof titleField === "object") {
      titleFieldName = titleField.require.field;
    }
    if (typeof titleField === "string") {
      titleFieldName = titleField;
    }
  }

  let content = [];
  for (let name in fieldSpecs) {
    if (name === titleFieldName) {
      continue;
    }

    let spec = fieldSpecs[name];
    let key = spec.require.field;
    let value = data[key];
    content.push(
      <div key={key} className={classes.contentWrapper}>
        <Typography variant={"caption"}>
          {(spec && spec.title) || key}
        </Typography>
        <Typography component="p">
          {spec && spec.render ? (
            <spec.render value={value} />
          ) : (
            <RenderValue value={value} />
          )}
        </Typography>
      </div>,
    );
  }

  let titleRender = null;
  if (title != null) {
    titleRender = title;
  }
  if (titleFieldName != null) {
    let fieldSpec = fieldSpecs[titleFieldName];
    titleRender = data[fieldSpec.require.field];
  }

  return (
    <Grid container>
      <Grid item xs={12}>
        <Paper className={classes.root}>
          <Card
            raised={false}
            onClick={onClick}
            className={classNames({
              [classes.cardClickable]: onClick != null,
            })}
          >
            <CardContent>
              <Typography variant="h5" gutterBottom className={classes.title}>
                {titleRender}
              </Typography>
              {content}
              {toolbar != null ? <div>{toolbar}</div> : null}
            </CardContent>
          </Card>
        </Paper>
      </Grid>
    </Grid>
  );
};
