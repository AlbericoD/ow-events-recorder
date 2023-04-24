import { classNames } from '../../utils';
import { kMainScreens } from '../../constants/config';

import Logo from '../../images/logo.svg';

import './AppHeader.scss';

export type AppHeaderProps = {
  className?: string
  screen: kMainScreens
  onChangeScreen(screen: kMainScreens): void
  onDrag(): void
  onMinimize(): void
  onClose(): void
}

export function AppHeader({
  className,
  screen,
  onChangeScreen,
  onDrag,
  onMinimize,
  onClose,
}: AppHeaderProps) {
  const handleOnDrag = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.button === 0) {
      onDrag();
    }
  };

  const handleOnChangeScreen = (e: React.MouseEvent, screen: kMainScreens) => {
    e.stopPropagation();
    onChangeScreen(screen);
  };

  const handleOnMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMinimize();
  };

  const handleOnClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={classNames('AppHeader', className)}
      onMouseDown={handleOnDrag}
    >
      <img src={Logo} className="logo" />

      <nav className="tabs" onMouseDown={stopPropagation}>
        <button
          className={classNames(
            'tab',
            { active: screen === kMainScreens.Record }
          )}
          onClick={e => handleOnChangeScreen(e, kMainScreens.Record)}
        >Record</button>
        <button
          className={classNames(
            'tab',
            { active: screen === kMainScreens.Play }
          )}
          onClick={e => handleOnChangeScreen(e, kMainScreens.Play)}
        >Play</button>
      </nav>

      <div className="window-controls" onMouseDown={stopPropagation}>
        <button
          className="window-control minimize"
          onClick={handleOnMinimize}
        />
        <button
          className="window-control close"
          onClick={handleOnClose}
        />
      </div>
    </div>
  );
}
