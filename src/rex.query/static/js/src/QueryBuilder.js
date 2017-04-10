/**
 * @flow
 */

import type {Query, QueryPipeline, Domain} from './model';
import type {SearchCallback} from './ui';

import createLogger from 'debug';
import invariant from 'invariant';
import React from 'react';
import * as ReactUI from '@prometheusresearch/react-ui';
import {css, style, VBox, HBox} from 'react-stylesheet';

import AddChartDialogue from './chart/AddChartDialogue';
import * as ChartModel from './chart/model';
import Chart from './chart/Chart';
import * as Icon from './ui/Icon';
import * as ui from './ui';
import * as State from './state';

type QueryBuilderProps = {
  domain: Domain,
  api: string,
  initialQuery: ?QueryPipeline,
  limitSelectQuery: number,
  onQuery: (query?: ?Query) => *,
  onSearch?: SearchCallback,
  toolbar?: ?React.Element<*>,
};

let log = createLogger('rex-query:ui:main');

export default class QueryBuilder extends React.Component<*, QueryBuilderProps, *> {
  state: State.State;
  props: QueryBuilderProps;
  actions: State.Actions;
  container: State.StateContainer;

  static defaultProps = {
    onQuery: (query?: ?Query) => {},
    limitSelectQuery: 10000,
  };

  static childContextTypes = {
    actions: React.PropTypes.object,
  };

  constructor(props: QueryBuilderProps) {
    super(props);

    let {domain, initialQuery, api, limitSelectQuery} = props;

    this.container = State.createContainer(
      {domain, api, initialQuery, translateOptions: {limitSelect: limitSelectQuery}},
      (state, onStateUpdated) => {
        this.setState(state, () => {
          invariant(this.state != null, 'State is not ready');
          onStateUpdated(this.state);
          if (this.props.onQuery) {
            this.props.onQuery(state.query);
          }
        });
      },
    );

    this.state = this.container.getState();
    this.actions = this.container.actions;
  }

  render() {
    let {
      domain,
      toolbar,
    } = this.props;
    let {
      query,
      selected,
      activeQueryPipeline,
      queryInvalid,
      queryLoading,
      data,
      showPanel,
      focusedSeq,
      chartList,
      activeTab,
    } = this.state;

    log('render', this.state);

    let disablePanelClose = false;

    // FIXME: we should maintain this invariant in the state container
    if (isEmptyQuery(query)) {
      activeQueryPipeline = query;
      disablePanelClose = true;
      showPanel = true;
    }

    const tabList = [
      {
        id: '__dataset__',
        label: 'Table',
        children: (
          <ui.DataTable
            query={query}
            loading={queryLoading}
            data={data}
            focusedSeq={focusedSeq}
            onFocusedSeq={this.onFocusedSeq}
          />
        ),
      },
      ...chartList.map(chart => ({
        id: chart.id,
        label: chart.label || ChartModel.getChartTitle(chart.chart, query),
        children: (
          <Chart query={query} loading={queryLoading} data={data} chartSpec={chart} />
        ),
      })),
    ];

    const tabListAlt = [
      {
        id: '__addplot__',
        label: '＋ Add Chart',
        children: <AddChartDialogue onAddChart={this.actions.addChart} />,
      },
    ];

    return (
      <VBox height="100%">
        <QueryBuilderToolbar width="100%" padding={5} height={35}>
          <ReactUI.QuietButton
            disabled={this.state.undoStack.length < 1}
            onClick={this.container.actions.undo}
            icon={<Icon.IconArrowLeft />}
            size="small"
            groupHorizontally>
            Undo
          </ReactUI.QuietButton>
          <ReactUI.QuietButton
            disabled={this.state.redoStack.length < 1}
            onClick={this.actions.redo}
            iconAlt={<Icon.IconArrowRight />}
            size="small"
            groupHorizontally>
            Redo
          </ReactUI.QuietButton>
          {toolbar &&
            <HBox flexGrow={1} padding={{horizontal: 10}}>
              {toolbar}
            </HBox>}
          <HBox marginLeft="auto">
            <ReactUI.QuietButton
              onClick={this.actions.exportDataset}
              icon={<Icon.IconDownload />}
              size="small">
              Export as .csv
            </ReactUI.QuietButton>
          </HBox>
        </QueryBuilderToolbar>
        <HBox flexGrow={1} overflow="hidden" height="calc(100% - 35px)" width="100%">
          <LeftPanelWrapper>
            <ui.QueryVis
              domain={domain}
              pipeline={query}
              selected={selected}
              activeQueryPipeline={activeQueryPipeline}
              showPanel={showPanel}
              onShowSelect={this.actions.showSelect}
            />
            {query.context.hasInvalidType && <InvalidQueryNotice />}
          </LeftPanelWrapper>
          {(selected || activeQueryPipeline) &&
            showPanel &&
            (activeQueryPipeline
              ? <CenterPanelWrapper>
                  <ui.AddQueryPanel
                    title="Pick a starting relationship"
                    onClose={this.actions.hidePanel}
                    pipeline={activeQueryPipeline}
                    onSearch={this.props.onSearch}
                    disableClose={disablePanelClose}
                  />
                </CenterPanelWrapper>
              : selected
                  ? <CenterPanelWrapper>
                      <ui.QueryPanel
                        key={selected.id}
                        onClose={this.actions.hidePanel}
                        onSearch={this.props.onSearch}
                        query={selected}
                        disableClose={disablePanelClose}
                      />
                    </CenterPanelWrapper>
                  : null)}
          <RightPanelWrapper>
            {isEmptyQueryPipeline(query)
              ? null
              : queryInvalid
                  ? <InvalidQueryMessage onUndo={this.actions.undo} />
                  : data != null
                      ? <ui.TabContainer
                          activeTab={activeTab}
                          onActiveTab={activeTab =>
                            this.actions.setActiveTab({activeTab})}
                          tabList={tabList}
                          tabListAlt={tabListAlt}
                        />
                      : null}
          </RightPanelWrapper>
        </HBox>
      </VBox>
    );
  }

  getChildContext() {
    return {actions: this.actions};
  }

  componentDidMount() {
    this.actions.init();
  }

  componentWillUnmount() {
    this.container.dispose();
  }

  onFocusedSeq = (focusedSeq: Array<string>) => {
    this.actions.focusOnSeq({focusedSeq});
  };
}

function isEmptyQueryPipeline(query: QueryPipeline) {
  return query.pipeline.length === 1 && query.pipeline[0].name === 'here';
}

function InvalidQueryMessage({onUndo}) {
  return (
    <ui.Message>
      Query is invalid. You need to either fix it or
      <ReactUI.Button
        onClick={onUndo}
        style={{verticalAlign: 'middle', margin: 4, marginTop: 2}}
        icon={<Icon.ArrowLeftIcon />}
        size="small">
        return back
      </ReactUI.Button>
      to the previous state.
    </ui.Message>
  );
}

function InvalidQueryNotice() {
  return (
    <ui.ErrorPanel borderTop>
      The query is not valid, please either fix it or remove invalid query
      combinators.
    </ui.ErrorPanel>
  );
}

let QueryBuilderToolbar = style(HBox, {
  base: {
    zIndex: 2,
    boxShadow: css.boxShadow(0, 0, 3, 0, '#666'),
  },
});

let CenterPanelWrapper = style(VBox, {
  base: {
    flexBasis: '200px',
    flexGrow: 1,
    height: '100%',
    overflow: 'auto',
    boxShadow: css.boxShadow(0, 0, 3, 0, '#aaa'),
  },
});

let RightPanelWrapper = style(VBox, {
  base: {
    flexBasis: '400px',
    flexGrow: 4,
    borderLeft: css.border(1, '#ccc'),
  },
});

let LeftPanelWrapper = style(VBox, {
  base: {
    flexBasis: '300px',
    overflow: 'auto',
    height: '100%',
    boxShadow: css.boxShadow(0, 0, 3, 0, '#666'),
  },
});

function isEmptyQuery(query) {
  if (query.pipeline.length === 1) {
    return true;
  }
  if (query.pipeline.length === 2 && query.pipeline[1].name === 'select') {
    return true;
  }
  return false;
}
