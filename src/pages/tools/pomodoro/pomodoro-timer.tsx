import * as React from 'react';
import produce, { enableMapSet } from 'immer';
import classNames from 'classnames/bind';
import styles from './pomodoro-timer.css';
import Pomodoro, { PomodoroInfo, PomodoroType } from './pomodoro';

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

enableMapSet();

const cx = classNames.bind(styles);

enum ActionType {
  StartPomodoro = 1,
  CountDownTime,
  CancelPomodoro,
  SetTimeForPomodoroType
}

type Action =
  | { type: ActionType.CancelPomodoro }
  | { type: ActionType.StartPomodoro; pomodoroType: PomodoroType }
  | {
      type: ActionType.SetTimeForPomodoroType;
      pomodoroType: PomodoroType;
      timeInMinutes: number;
    }
  | { type: ActionType.CountDownTime };

type State = {
  pomodoros: PomodoroInfo[];
  pomodoroTimes: Map<PomodoroType, number>;
};

const minutes = (n: number) =>
  dayjs
    .duration({
      minutes: n
    })
    .asSeconds();

const initialState: State = {
  pomodoros: [],
  pomodoroTimes: new Map([
    [PomodoroType.Pomodoro, minutes(25)],
    [PomodoroType.ShortBrake, minutes(5)],
    [PomodoroType.LongBrake, minutes(20)]
  ])
};

function createNotification(title: string, body: string) {
  return new Notification(title, { body: body });
}

function showNotification(title: string, body: string) {
  const permission = Notification.permission;
  if (permission === 'granted') {
    createNotification(title, body);
  } else if (permission !== 'denied') {
    Notification.requestPermission().then(function (result) {
      if (result === 'granted') {
        createNotification(title, body);
      }
    });
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case ActionType.CancelPomodoro:
      return produce(state, (draftState) => {
        const lastPomodoroIndex = draftState.pomodoros.length - 1;
        if (lastPomodoroIndex >= 0) {
          draftState.pomodoros[lastPomodoroIndex].completed = true;
          draftState.pomodoros[lastPomodoroIndex].completeTime = new Date();
        }
      });
    case ActionType.StartPomodoro: {
      const lastPomodoroIndex = state.pomodoros.length - 1;
      if (lastPomodoroIndex >= 0 && !state.pomodoros[lastPomodoroIndex].completed) {
        return state;
      }
      return produce(state, (draftState) => {
        draftState.pomodoros.push({
          type: action.pomodoroType,
          startTime: new Date(),
          completed: false,
          completeTime: null,
          remainingTime: state.pomodoroTimes.get(action.pomodoroType) || minutes(25)
        });
      });
    }
    case ActionType.CountDownTime:
      return produce(state, (draftState) => {
        const lastPomodoroIndex = draftState.pomodoros.length - 1;
        if (lastPomodoroIndex < 0) {
          return;
        }
        const lastPomodoro = draftState.pomodoros[lastPomodoroIndex];
        if (lastPomodoro.completed) {
          return;
        }
        lastPomodoro.remainingTime--;
        if (lastPomodoro.remainingTime === 0) {
          lastPomodoro.completed = true;
          lastPomodoro.completeTime = new Date();
          showNotification('Completed!', `${lastPomodoro.type.toString()} completed.`);
        }
      });
    case ActionType.SetTimeForPomodoroType: {
      const timeInMinutes = action.timeInMinutes > 0 ? action.timeInMinutes : 1;
      return produce(state, (draftState) => {
        draftState.pomodoroTimes.set(action.pomodoroType, minutes(timeInMinutes));
      });
    }
    default:
      return state;
  }
}

const ONE_SECOND = 1000;

const PomodoroList = (): JSX.Element => {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    stopTimer();
    timer.current = setInterval(() => {
      dispatch({ type: ActionType.CountDownTime });
    }, ONE_SECOND);
  };

  const stopTimer = () => {
    if (timer.current) {
      clearInterval(timer.current);
    }
  };

  const startPomodoro = (type: PomodoroType) => {
    dispatch({ type: ActionType.StartPomodoro, pomodoroType: type });
    startTimer();
  };

  const cancelPomodoro = () => {
    stopTimer();
    dispatch({ type: ActionType.CancelPomodoro });
  };

  const setPomodoroTime = (pomodoroType: PomodoroType, timeInMinutes: number) => {
    dispatch({
      type: ActionType.SetTimeForPomodoroType,
      pomodoroType,
      timeInMinutes
    });
  };

  const { pomodoros } = state;
  const pomodoroStarted =
    pomodoros.length > 0 && !pomodoros[pomodoros.length - 1].completed;

  const renderMinutesInput = (pomodoroType: PomodoroType) => (
    <>
      <input
        id='pomodoro'
        className={cx('minutes-input')}
        type='number'
        value={(state.pomodoroTimes.get(pomodoroType) || 60) / 60.0}
        onChange={(e) => setPomodoroTime(pomodoroType, parseInt(e.target.value))}
      />
      <label htmlFor='pomodoro' className={cx('right-label')}>
        minutes
      </label>
    </>
  );

  return (
    <>
      <div className='grid gap-4 md:grid-cols-2 grid-cols-1'>
        <div>
          {pomodoros
            .slice(0)
            .reverse()
            .map((pomodoro, index) => (
              <Pomodoro key={index} pomodoro={pomodoro} />
            ))}
        </div>
        <div>
          <div>
            <button
              disabled={pomodoroStarted}
              className={cx('button')}
              onClick={() => startPomodoro(PomodoroType.Pomodoro)}
            >
              Start pomodoro
            </button>
            {renderMinutesInput(PomodoroType.Pomodoro)}
          </div>

          <div>
            <button
              disabled={pomodoroStarted}
              className={cx('button')}
              onClick={() => startPomodoro(PomodoroType.ShortBrake)}
            >
              Start short brake
            </button>
            {renderMinutesInput(PomodoroType.ShortBrake)}
          </div>

          <div>
            <button
              disabled={pomodoroStarted}
              className={cx('button')}
              onClick={() => startPomodoro(PomodoroType.LongBrake)}
            >
              Start long brake
            </button>
            {renderMinutesInput(PomodoroType.LongBrake)}
          </div>

          <button
            disabled={pomodoros.length === 0 || !pomodoroStarted}
            className={cx('button')}
            onClick={cancelPomodoro}
          >
            Cancel current pomodoro
          </button>
        </div>
      </div>
    </>
  );
};

export default PomodoroList;
