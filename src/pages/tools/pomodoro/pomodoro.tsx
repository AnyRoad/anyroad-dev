import * as React from 'react';
import classNames from 'classnames/bind';
import styles from './pomodoro-timer.css';

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(duration);
dayjs.extend(relativeTime);

const cx = classNames.bind(styles);

export enum PomodoroType {
  Pomodoro = 1,
  ShortBrake,
  LongBrake
}

export type PomodoroInfo = {
  type: PomodoroType;
  startTime: Date;
  completed: boolean;
  completeTime: Date | null;
  remainingTime: number;
};

export const titleByPomodoroType = new Map([
  [PomodoroType.Pomodoro, 'Pomodoro'],
  [PomodoroType.ShortBrake, 'Short Brake'],
  [PomodoroType.LongBrake, 'Long Brake']
]);

const ONE_SECOND = 1000;

const Pomodoro = ({ pomodoro }: { pomodoro: PomodoroInfo }): JSX.Element => {
  let pomodoroType = titleByPomodoroType.get(pomodoro.type) || '';
  let className = '';
  let icon;
  switch (pomodoro.type) {
    case PomodoroType.ShortBrake:
      className = 'short-brake';
      icon = 'coffee-mug';
      break;
    case PomodoroType.LongBrake:
      className = 'long-brake';
      icon = 'food-and-drink';
      break;
    default:
      className = 'pomodoro';
      icon = 'working-hours';
      break;
  }
  return (
    <div className={cx(className, { completed: pomodoro.completed })}>
      <div className={cx('pomodoro-title-container')}>
        <div className={cx('pomodoro-image-container')}>
          <img src={`/icons/${icon}.svg`} className={cx('pomodoro-image')} />
        </div>
        <div className={cx('pomodoro-title')}>{pomodoroType}</div>
      </div>
      {!pomodoro.completed && (
        <div>
          <span className={cx('pomodoro-label')}>Remaining Time: </span>
          <span className={cx('pomodoro-remaining')}>
            {dayjs.duration(pomodoro.remainingTime * ONE_SECOND).format('mm:ss')}
          </span>
        </div>
      )}
      <div className={cx('pomodoro-value')}>
        <span className={cx('pomodoro-label')}>Started At: </span>
        {dayjs(pomodoro.startTime).format('HH:mm:ss')}
      </div>
      {pomodoro.completed && (
        <div className={cx('pomodoro-value')}>
          <span className={cx('pomodoro-label')}>Completed at: </span>
          {dayjs(pomodoro.completeTime || new Date()).format('HH:mm:ss')}
        </div>
      )}
    </div>
  );
};

export default Pomodoro;
