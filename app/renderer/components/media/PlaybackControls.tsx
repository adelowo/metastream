import React, { Component } from 'react'
import cx from 'classnames'

import styles from './PlaybackControls.css'

import {
  PlaybackState,
  IMediaItem,
  IMediaPlayerState,
  RepeatMode
} from 'renderer/lobby/reducers/mediaPlayer'
import { VolumeSlider } from 'renderer/components/media/VolumeSlider'
import { DispatchProp, connect } from 'react-redux'
import {
  server_requestPlayPause,
  server_requestNextMedia,
  server_requestSeek,
  server_requestRepeatMedia
} from 'renderer/lobby/actions/mediaPlayer'
import { setVolume, setMute } from 'renderer/actions/settings'
import { Timeline } from 'renderer/components/media/Timeline'
import { push } from 'react-router-redux'
import { parseCuePoints, copyMediaLink, openMediaInBrowser } from 'renderer/media/utils'
import { MoreButton } from 'renderer/components/media/MoreButton'
import { IAppState } from 'renderer/reducers'
import { IconButton } from 'renderer/components/common/button'
import { hasPlaybackPermissions } from 'renderer/lobby/reducers/mediaPlayer.helpers'
import { absoluteUrl } from 'utils/appUrl'
import { BrowserActionList } from '../browser/BrowserActionList'
import { isDeveloper } from '../../reducers/settings'
import { t } from 'locale'

const EXTENSIONS_URL = absoluteUrl('./browser/resources/extensions.html')

const Button: React.SFC<{
  className?: string
  icon: string
  title?: string

  /** Highlight button as turned on */
  enabled?: boolean

  /** Disable button interaction */
  disabled?: boolean

  onClick?: React.MouseEventHandler<HTMLButtonElement>
}> = props => {
  return (
    <IconButton
      icon={props.icon}
      disabled={props.disabled}
      className={cx(props.className, styles.button, {
        [styles.buttonEnabled]: props.enabled
      })}
      title={props.title}
      onClick={props.onClick}
    >
      {props.children}
    </IconButton>
  )
}

const ButtonListItem: React.SFC<{
  icon: string
  title?: string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}> = props => {
  return (
    <IconButton
      icon={props.icon}
      className={styles.buttonListItem}
      title={props.title}
      onClick={props.onClick}
    >
      {props.children}
    </IconButton>
  )
}

interface IProps {
  className?: string
  reload?: React.MouseEventHandler<HTMLButtonElement>
  debug?: React.MouseEventHandler<HTMLButtonElement>
  openBrowser: (url?: string) => void
  showInfo: Function
}

interface IConnectedProps extends IMediaPlayerState {
  mute: boolean
  volume: number
  developer: boolean

  /** Has permission to change playback state */
  dj: boolean
}

const mapStateToProps = (state: IAppState): IConnectedProps => {
  return {
    ...state.mediaPlayer,
    mute: state.settings.mute,
    volume: state.settings.volume,
    developer: isDeveloper(state),
    dj: hasPlaybackPermissions(state)
  }
}

type PrivateProps = IProps & IConnectedProps & DispatchProp<IAppState>

class _PlaybackControls extends Component<PrivateProps> {
  private getCuePoints() {
    const { current: media } = this.props
    if (media) {
      let cuePoints = parseCuePoints(media)
      return cuePoints
    }
  }

  render(): JSX.Element | null {
    const { current: media, playback, startTime, pauseTime, dj } = this.props
    const playbackIcon = playback === PlaybackState.Playing ? 'pause' : 'play'

    const isIdle = playback === PlaybackState.Idle
    const isPaused = playback === PlaybackState.Paused
    const duration = (media && media.duration) || 0
    const isTimed = duration > 0

    const addMediaBtn = (
      <Button
        className={styles.addMediaButton}
        icon="plus"
        onClick={e => {
          this.props.openBrowser()
        }}
      >
        {t('addMedia')}
      </Button>
    )

    const permTitle = 'Requires DJ permissions'

    const playPauseBtn = (
      <Button
        key="playpause"
        icon={playbackIcon}
        title={dj ? undefined : permTitle}
        disabled={isIdle}
        onClick={this.playPause}
      />
    )

    const nextBtn = (
      <Button
        key="next"
        icon="skip-forward"
        title={dj ? t('next') : permTitle}
        disabled={isIdle}
        onClick={this.next}
      />
    )

    const repeatBtn = (
      <Button
        icon="repeat"
        title={dj ? t('repeat') : permTitle}
        enabled={this.props.repeatMode === RepeatMode.On}
        disabled={isIdle}
        onClick={this.repeat}
      />
    )

    const timeline =
      isIdle || !isTimed ? (
        <span className={styles.spacer} />
      ) : (
        <Timeline
          className={styles.spacer}
          time={(isPaused ? pauseTime : startTime! + this.props.serverClockSkew) || 0}
          paused={isPaused}
          duration={media && media.duration}
          onSeek={this.seek}
          cuePoints={this.getCuePoints()}
        />
      )

    const volumeSlider = (
      <VolumeSlider
        mute={this.props.mute}
        volume={this.props.volume}
        onChange={this.setVolume}
        onMute={this.toggleMute}
      />
    )

    const infoBtn = media &&
      media.description && (
        <Button icon="info" title={t('info')} onClick={() => this.props.showInfo()} />
      )

    return (
      <div className={cx(this.props.className, styles.container)}>
        {isIdle ? addMediaBtn : [playPauseBtn, nextBtn]}
        {repeatBtn}
        {timeline}
        {volumeSlider}
        {infoBtn}
        {this.renderMenu()}
      </div>
    )
  }

  private renderMenu() {
    const { current: media } = this.props

    const debugBtn = this.props.developer && (
      <ButtonListItem icon="settings" onClick={this.props.debug}>
        {t('debug')}
      </ButtonListItem>
    )

    const extensionsBtn = (
      <ButtonListItem icon="package" onClick={() => this.props.openBrowser(EXTENSIONS_URL)}>
        {t('extensions')}
      </ButtonListItem>
    )

    const mediaButtons = media && (
      <>
        <ButtonListItem icon="external-link" onClick={this.openLink}>
          {t('openInBrowser')}
        </ButtonListItem>

        <ButtonListItem icon="clipboard" onClick={this.copyLink}>
          {t('copyLink')}
        </ButtonListItem>

        <ButtonListItem icon="rotate-cw" onClick={this.props.reload}>
          {t('reload')}
        </ButtonListItem>

        <hr className={styles.menuDivider} />
      </>
    )

    return (
      <MoreButton buttonClassName={styles.button}>
        <BrowserActionList tabId={(window as any).__PLAYER_TAB_ID__}>
          <hr className={styles.menuDivider} />
        </BrowserActionList>
        {mediaButtons}
        {extensionsBtn}
        {debugBtn}
      </MoreButton>
    )
  }

  private playPause = () => {
    this.props.dispatch!(server_requestPlayPause())
  }

  private next = () => {
    this.props.dispatch!(server_requestNextMedia())
  }

  private repeat = () => {
    this.props.dispatch!(server_requestRepeatMedia())
  }

  private seek = (time: number) => {
    this.props.dispatch!(server_requestSeek(time))
  }

  private setVolume = (volume: number) => {
    this.props.dispatch!(setVolume(volume))
  }

  private toggleMute = () => {
    const mute = !this.props.mute
    this.props.dispatch!(setMute(mute))
  }

  private openLink = () => {
    const { current: media } = this.props
    if (media) {
      openMediaInBrowser(media)
    }
  }

  private copyLink = () => {
    const { current: media } = this.props
    if (media) {
      copyMediaLink(media)
    }
  }
}

export const PlaybackControls = connect(mapStateToProps)(_PlaybackControls) as React.ComponentClass<
  IProps
>
