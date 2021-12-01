import * as React from 'react';
import { JsonView, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import classNames from 'classnames/bind';
import styles from './json-view.css';

const cx = classNames.bind(styles);

const fullyExpanded = () => true;
const firstLevelCollapsed = (level: number) => level < 1;

const JsonFormatter = (): JSX.Element => {
  const [json, setJson] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);
  const [jsonData, setJsonData] = React.useState({});
  const [errorText, setErrorText] = React.useState('');

  React.useEffect(() => {
    try {
      json && setJsonData(JSON.parse(json));
      setErrorText('');
    } catch (error) {
      setErrorText(error.toString());
    }
  }, [json]);

  return (
    <>
      <div className='grid gap-4 md:grid-cols-2 grid-cols-1'>
        <div>
          <label htmlFor='json' className={cx('label')}>
            Input Json text:
          </label>
          <textarea
            id='json'
            rows={10}
            cols={100}
            className={cx('json-input')}
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
        </div>
        <div>{errorText && <span className={cx('error-label')}>{errorText}</span>}</div>
      </div>
      <div>
        <button className={cx('button')} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      <div className='mr-2'>
        {!errorText && (
          <JsonView
            data={jsonData}
            shouldInitiallyExpand={expanded ? fullyExpanded : firstLevelCollapsed}
            style={defaultStyles}
          />
        )}
      </div>
    </>
  );
};

export default JsonFormatter;
