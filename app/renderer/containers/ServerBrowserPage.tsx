import React, { Component } from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { IReactReduxProps } from 'types/redux';

import { IAppState } from 'renderer/reducers';

import { ServerBrowser } from 'renderer/components/ServerBrowser';
import { requestLobbies } from 'renderer/actions/lobby';
import { NetworkState } from 'types/network';
import { ILobbySession } from 'renderer/platform/types';

interface IProps extends RouteComponentProps<void> {}

interface IConnectedProps {
  network: NetworkState;
  lobbies?: ILobbySession[];
}

function mapStateToProps(state: IAppState): IConnectedProps {
  return {
    network: state.lobby.network,
    lobbies: state.lobby.list
  };
}

type PrivateProps = IProps & IConnectedProps & IReactReduxProps;

export class _ServerBrowserPage extends Component<PrivateProps> {
  componentDidMount(): void {
    if (this.props.network === NetworkState.Uninitialized) {
      this.refresh();
    }
  }

  render() {
    const { network, lobbies } = this.props;
    return <ServerBrowser network={network} list={lobbies} refresh={this.refresh} />;
  }

  private refresh = () => {
    this.props.dispatch(requestLobbies());
  };
}

export const ServerBrowserPage = connect<IConnectedProps, {}, IProps, IAppState>(mapStateToProps)(
  _ServerBrowserPage
);
