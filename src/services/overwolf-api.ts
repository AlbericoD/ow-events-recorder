import { EventEmitter } from 'ow-libs';

import { isRecordingGameLaunched, isRecordingGameInfo, isRecordingGameEvent, isRecordingGameEventError, isRecordingInfoUpdate, isRecordingLauncherLaunched, isRecordingLauncherUpdated, isRecordingLauncherTerminated, isRecordingLauncherInfoUpdate, isRecordingLauncherEvent } from '../constants/type-guards';
import { RecordingEvent } from '../constants/types';

enum kEvents {
  'getRunningGameInfo' = 'getRunningGameInfo',
  'getRunningGameInfo2' = 'getRunningGameInfo2',
  'getRunningLaunchersInfo' = 'getRunningLaunchersInfo',
  'onGameLaunched' = 'onGameLaunched',
  'onGameUpdated' = 'onGameUpdated',
  'onGameInfoUpdated' = 'onGameInfoUpdated',
  'onInfoUpdates2' = 'onInfoUpdates2',
  'onNewEvents' = 'onNewEvents',
  'onError' = 'onError',
  'onLauncherLaunched' = 'onLauncherLaunched',
  'onLauncherUpdated' = 'onLauncherUpdated',
  'onLauncherTerminated' = 'onLauncherTerminated',
  'onLauncherInfoUpdates' = 'onLauncherInfoUpdates',
  'onLauncherEvents' = 'onLauncherEvent',
  'setGameRequiredFeatures' = 'setGameRequiredFeatures',
  'setLauncherRequiredFeatures' = 'setLauncherRequiredFeatures',
  'getInfo' = 'getInfo'
}

interface OverwolfAPIEvents {
  [kEvents.getRunningGameInfo]: overwolf.CallbackFunction<
    overwolf.games.GetRunningGameInfoResult
  >
  [kEvents.getRunningGameInfo2]: overwolf.CallbackFunction<
    overwolf.games.GetRunningGameInfoResult2
  >
  [kEvents.getRunningLaunchersInfo]: overwolf.CallbackFunction<
    overwolf.games.launchers.GetRunningLaunchersInfoResult
  >
  [kEvents.onGameLaunched]: overwolf.games.RunningGameInfo
  [kEvents.onGameInfoUpdated]: overwolf.games.GameInfoUpdatedEvent
  [kEvents.setGameRequiredFeatures]: overwolf.CallbackFunction<
    overwolf.games.events.SetRequiredFeaturesResult
  >
  [kEvents.setLauncherRequiredFeatures]: overwolf.CallbackFunction<
    overwolf.games.launchers.events.SetRequiredFeaturesResult
  >
  [kEvents.onInfoUpdates2]: overwolf.games.events.InfoUpdates2Event<
    string,
    overwolf.games.events.InfoUpdate2
  >
  [kEvents.onNewEvents]: overwolf.games.events.NewGameEvents
  [kEvents.onError]: overwolf.games.events.ErrorEvent
  [kEvents.onLauncherLaunched]: overwolf.games.launchers.LauncherInfo
  [kEvents.onLauncherUpdated]: overwolf.games.launchers.UpdatedEvent
  [kEvents.onLauncherTerminated]: overwolf.games.launchers.LauncherInfo
  [kEvents.onLauncherInfoUpdates]: unknown
  [kEvents.onLauncherEvents]: unknown,
  [kEvents.getInfo]: overwolf.CallbackFunction<overwolf.games.events.GetInfoResult>
}

export class OverwolfAPI extends EventEmitter<OverwolfAPIEvents> {
  replace() {
    overwolf.games.onGameLaunched.addListener = cb => {
      this.addListener(kEvents.onGameLaunched, cb);
    };
    overwolf.games.onGameLaunched.removeListener = cb => {
      this.removeListener(kEvents.onGameLaunched, cb);
    };

    overwolf.games.onGameInfoUpdated.addListener = cb => {
      this.addListener(kEvents.onGameInfoUpdated, cb);
    };
    overwolf.games.onGameInfoUpdated.removeListener = cb => {
      this.removeListener(kEvents.onGameInfoUpdated, cb);
    };

    overwolf.games.events.onInfoUpdates2.addListener = cb => {
      this.addListener(kEvents.onInfoUpdates2, cb);
    };
    overwolf.games.events.onInfoUpdates2.removeListener = cb => {
      this.removeListener(kEvents.onInfoUpdates2, cb);
    };

    overwolf.games.events.onNewEvents.addListener = cb => {
      this.addListener(kEvents.onNewEvents, cb);
    };
    overwolf.games.events.onNewEvents.removeListener = cb => {
      this.removeListener(kEvents.onNewEvents, cb);
    };

    overwolf.games.events.onError.addListener = cb => {
      this.addListener(kEvents.onError, cb);
    };
    overwolf.games.events.onError.removeListener = cb => {
      this.removeListener(kEvents.onError, cb);
    };

    overwolf.games.launchers.onLaunched.addListener = cb => {
      this.addListener(kEvents.onLauncherLaunched, cb);
    };
    overwolf.games.launchers.onLaunched.removeListener = cb => {
      this.removeListener(kEvents.onLauncherLaunched, cb);
    };

    overwolf.games.launchers.onUpdated.addListener = cb => {
      this.addListener(kEvents.onLauncherUpdated, cb);
    };
    overwolf.games.launchers.onUpdated.removeListener = cb => {
      this.removeListener(kEvents.onLauncherUpdated, cb);
    };

    overwolf.games.launchers.onTerminated.addListener = cb => {
      this.addListener(kEvents.onLauncherTerminated, cb);
    };
    overwolf.games.launchers.onTerminated.removeListener = cb => {
      this.removeListener(kEvents.onLauncherTerminated, cb);
    };

    overwolf.games.launchers.events.onInfoUpdates.addListener = cb => {
      this.addListener(kEvents.onLauncherInfoUpdates, cb);
    };
    overwolf.games.launchers.events.onInfoUpdates.removeListener = cb => {
      this.removeListener(kEvents.onLauncherInfoUpdates, cb);
    };

    overwolf.games.launchers.events.onNewEvents.addListener = cb => {
      this.addListener(kEvents.onLauncherEvents, cb);
    };
    overwolf.games.launchers.events.onNewEvents.removeListener = cb => {
      this.removeListener(kEvents.onLauncherEvents, cb);
    };

    overwolf.games.getRunningGameInfo = (
      callback: OverwolfAPIEvents[kEvents.getRunningGameInfo]
    ) => this.emit(kEvents.getRunningGameInfo, callback);

    overwolf.games.getRunningGameInfo2 = (
      callback: OverwolfAPIEvents[kEvents.getRunningGameInfo2]
    ) => this.emit(kEvents.getRunningGameInfo2, callback);

    overwolf.games.launchers.getRunningLaunchersInfo = (
      callback: OverwolfAPIEvents[kEvents.getRunningLaunchersInfo]
    ) => this.emit(kEvents.getRunningLaunchersInfo, callback);

    overwolf.games.events.setRequiredFeatures = (
      features: string[],
      callback: OverwolfAPIEvents[kEvents.setGameRequiredFeatures]
    ) => this.emit(kEvents.setGameRequiredFeatures, callback);

    overwolf.games.launchers.events.setRequiredFeatures = (
      launcherClassId: number,
      features: string[],
      callback: OverwolfAPIEvents[kEvents.setLauncherRequiredFeatures]
    ) => this.emit(kEvents.setLauncherRequiredFeatures, callback);

    const getInfo = (callback: OverwolfAPIEvents[kEvents.getInfo]) =>
          this.emit(kEvents.getInfo, callback);

    if (this.hasListener(kEvents.getInfo)) {
      this.removeListener(kEvents.getInfo, getInfo);
      this.off([kEvents.getInfo], getInfo);
    }

    overwolf.games.events.getInfo = getInfo;
  }

  fireEvent(e: RecordingEvent) {
    if (isRecordingGameLaunched(e)) {
      this.emit(kEvents.onGameLaunched, e.data);
    } else if (isRecordingGameInfo(e)) {
      this.emit(kEvents.onGameInfoUpdated, e.data);
    } else if (isRecordingGameEvent(e)) {
      this.emit(kEvents.onNewEvents, e.data);
    } else if (isRecordingGameEventError(e)) {
      this.emit(kEvents.onError, e.data);
    } else if (isRecordingInfoUpdate(e)) {
      this.emit(kEvents.onInfoUpdates2, e.data);
    } else if (isRecordingLauncherLaunched(e)) {
      this.emit(kEvents.onLauncherLaunched, e.data);
    } else if (isRecordingLauncherUpdated(e)) {
      this.emit(kEvents.onLauncherUpdated, e.data);
    } else if (isRecordingLauncherTerminated(e)) {
      this.emit(kEvents.onLauncherTerminated, e.data);
    } else if (isRecordingLauncherInfoUpdate(e)) {
      this.emit(kEvents.onLauncherInfoUpdates, e.data);
    } else if (isRecordingLauncherEvent(e)) {
      this.emit(kEvents.onLauncherEvents, e.data);
    } else {
      console.log(
        'Event Player: OverwolfAPIEvents.fireEvent(): not a fireable event:',
        e
      );
    }
  }
}
