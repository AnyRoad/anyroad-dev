import * as React from 'react';
import { JsonView, defaultStyles, collapseAllNested, allExpanded } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import classNames from 'classnames/bind';
import jsonViewStyles from './json-view.module.css';

const cx = classNames.bind(jsonViewStyles);

const JsonFormatter = (): JSX.Element => {
  const [json, setJson] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);
  const [jsonData, setJsonData] = React.useState({});
  const [errorText, setErrorText] = React.useState('');

  React.useEffect(() => {
    try {
      json && setJsonData(JSON.parse(json));
      setErrorText('');
    } catch (error: any) {
      setErrorText(error.toString());
    }
  }, [json]);

  return (
    <>
      <div className='md:grid-cols-2 grid grid-cols-1 gap-4'>
        <div>
          <label htmlFor='json' className={cx('label')}>
            Input Json text:
          </label>
          <textarea
            id='json'
            rows={15}
            cols={150}
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
            shouldInitiallyExpand={expanded ? allExpanded : collapseAllNested}
            style={defaultStyles}
          />
        )}
      </div>
    </>
  );
};

export default JsonFormatter;
