import { useMemo, useState } from 'react';

import { classNames } from '../../utils';
import { eventBus } from '../../services/event-bus';

import './SetClient.scss';

export function SetClient() {
  const [uid, setUid] = useState('');
  const [inputted, setInputted] = useState(false);

  const isValid = useMemo(() => {
    return (uid.length === 40 && /^[a-z]+$/.test(uid));
  }, [uid]);

  function handleClick() {
    if (isValid) {
      eventBus.emit('setClientUID', uid);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setUid(e.target.value);
    setInputted(true);
  }

  return (
    <div className="SetClient">
      <h3>Please set a client app</h3>

      <p>
        Input a recipient app's UID.
        It will receive all the events from the recording.
        You can get it from the Packages window.
      </p>
      <p>It reads like «<b>fibomngcacbbghgcjjlolojddapoipoaafjlgpoc</b>».</p>

      <div className={classNames(
        'input-field',
        { invalid: (!isValid && inputted) }
      )}>
        <input
          type="text"
          maxLength={40}
          placeholder="fibomngcacbbghgcjjlolojddapoipoaafjlgpoc"
          value={uid}
          onChange={handleInput}
          spellCheck={false}
        />

        {!isValid && inputted && <div className="error">Invalid UID</div>}

        <button onClick={handleClick} disabled={!isValid}>Set</button>
      </div>
    </div>
  );
}
