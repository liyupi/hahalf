import React from 'react';
import { Container, Icon, Popup } from 'semantic-ui-react';

export default function NavBarContainer() {

  return (
    <Container className='nav-bar-container'>
      <div className='bd'>
        <a href='https://github.com/liyupi/hahalf' className='github-corner animated fadeInDown'
          title='Star me on GitHub'
          target='_blank' rel='noopener noreferrer'>
          <Icon name='github square' />
        </a>
      </div>
    </Container>
  )
}
