import React, { useEffect, useRef, useState } from 'react';
import { Icon, Input } from 'semantic-ui-react';

export default function SearchBar(props) {
  const inputEl = useRef(null);
  const inputSize = useInputSize('huge');
  const [state, setState] = useState({
    lang: props.searchLang || [],
    valChanged: false
  });

  function updateState(vals) {
    setState(prevState => {
      return { ...prevState, ...vals };
    });
  }

  function handleSearch() {
    props.onSearch(inputEl.current.inputRef.current.value, state.lang);
    inputEl.current.inputRef.current.blur();
    updateState({ valChanged: false });
  }

  return (
    <div className='search-bar'>
      <div className='search-bar__desc' style={{marginBottom: 10}}>
        一键从全网搜索表情包
      </div>
      <form action="javascript:void(0);">
        <Input ref={inputEl}
          onChange={() => updateState({ valChanged: true })}
          className='search-bar__input'
          icon fluid placeholder={props.placeholder} size={inputSize}>
          <input type='search' name='search' defaultValue={props.searchValue} list='search-data-list'
            onKeyPress={e => {
              e.key === 'Enter' && handleSearch()
            }} />
          <Icon name={(props.variableList.length && !state.valChanged) ? 'search plus' : 'search'}
            link onClick={handleSearch} />
          <datalist id='search-data-list'>
            {props.luckyKeyWords.map((item, i) => <option value={item} key={i} />)}
          </datalist>
        </Input>
      </form>
    </div>
  )
}

function useInputSize(val) {
  const [size, setSize] = useState(val);

  useEffect(() => {
    resizeInput();
    window.addEventListener('resize', resizeInput, false);
    return () => window.removeEventListener('resize', resizeInput, false);
  }, []);// run an effect and clean it up only once (on mount and unmount), you can pass an empty array ([])

  function resizeInput() {
    setSize(document.body.offsetWidth < 800 ? '' : val);
  }

  return size;
}
