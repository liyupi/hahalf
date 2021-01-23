import React from 'react';
import { Button, Popup } from 'semantic-ui-react';
import * as Tools from '../utils/Tools';

export default function VariableItem(props) {
  const clipboardId = `clipboardId-${Tools.uuid()}`;
  const variable = props.variable;
  let clipboard = null;

  function handlePopOnMount() {
    clipboard = new ClipboardJS(`#${clipboardId}`);
  }

  function handlePopUnmount() {
    clipboard && clipboard.destroy();
  }

  return (
    <Popup style={{ padding: '0' }}
      position='top center'
      trigger={
        <img src={variable.locImageLink} className="myImg" style={{height: '100px', margin: 10}} />
      }
      onMount={handlePopOnMount}
      onUnmount={handlePopUnmount}
      hoverable={true}>
      <Button.Group vertical basic style={{ border: 0 }}>
        <Button compact data-clipboard-text={variable.locImageLink} id={clipboardId}>Copy</Button>
      </Button.Group>
    </Popup>
  );
}
